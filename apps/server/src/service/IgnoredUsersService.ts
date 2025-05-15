import { redisClient } from '../clients/redis.js';
import { logger } from '../utils/logger.js';
import { SupabaseService } from './SupabaseService.js';

const IGNORED_USERS_REDIS_CACHE_TTL =
  process.env.IGNORED_USERS_REDIS_CACHE_TTL ?? 120;

/**
 * Adds an ignored user to another user's cache. This method only updates the cache
 * and does not write to the persistent database. It's intended for temporary ignore states
 * or to optimistically update the cache before a DB write.
 * @param userId The ID of the user whose ignore list is being modified.
 * @param ignoredUserId The ID of the user to add to the ignore list.
 */
const addToIgnoredCache = async (
  userId: string,
  ignoredUserId: string,
): Promise<void> => {
  const cacheKey = getIgnoredCacheKey(userId);

  try {
    const currentIgnoredListStr = await redisClient.get(cacheKey);
    let currentIgnoredList: string[] = [];

    if (currentIgnoredListStr) {
      try {
        currentIgnoredList = JSON.parse(currentIgnoredListStr);
      } catch (e) {
        logger.warn(
          { userId, error: e },
          '[IgnoredUsersService] Invalid ignored list cache format on add. Resetting list.',
        );
        currentIgnoredList = []; // Reset if format is invalid.
      }
    }

    // Add the new user to ignore if not already present.
    if (!currentIgnoredList.includes(ignoredUserId)) {
      currentIgnoredList.push(ignoredUserId);

      // Update the cache with the modified list and reset TTL.
      await redisClient.set(
        cacheKey,
        JSON.stringify(currentIgnoredList),
        'EX',
        IGNORED_USERS_REDIS_CACHE_TTL,
      );
    }
  } catch (error) {
    logger.warn(
      { error, userId, ignoredUserId },
      '[IgnoredUsersService] Failed to update ignored cache',
    );
  }
};

/**
 * Retrieves the list of user IDs ignored by a specific user.
 * Attempts to fetch from cache first; if not found or invalid, fetches from the database and updates the cache.
 * @param userId The ID of the user whose ignored list is being requested.
 * @returns A promise that resolves to an array of ignored user IDs.
 */
const getIgnoredUserIds = async (userId: string): Promise<string[]> => {
  const cacheKey = getIgnoredCacheKey(userId);

  try {
    // Attempt to retrieve from Redis cache first.
    const cachedValue = await redisClient.get(cacheKey);

    if (cachedValue) {
      try {
        return JSON.parse(cachedValue);
      } catch (e) {
        logger.warn(
          { userId, error: e },
          '[IgnoredUsersService] Invalid ignored list cache format on get. Fetching from DB.',
        );
        // Proceed to fetch from DB if cache is corrupt.
      }
    }

    // Cache miss or invalid format: fetch from the database.
    const ignoredUsers = await SupabaseService.getIgnoredUsers(userId);

    // Update the cache with the list fetched from the database.
    await redisClient.set(
      cacheKey,
      JSON.stringify(ignoredUsers),
      'EX',
      IGNORED_USERS_REDIS_CACHE_TTL,
    );

    return ignoredUsers;
  } catch (error) {
    logger.error(
      { error, userId },
      '[IgnoredUsersService] Failed to get ignored users',
    );
    return [];
  }
};

/**
 * Fetches all ignored pairs for a batch of users.
 * Uses direct DB fetch for small batches and a cached, pipelined approach for larger batches.
 * An ignored pair is represented as [userId, ignoredUserId].
 * @param userIds An array of user IDs for whom to fetch ignored pairs.
 * @returns A promise that resolves to an array of [userId, ignoredUserId] tuples.
 */
const getIgnoredPairsForUsers = async (
  userIds: string[],
): Promise<[string, string][]> => {
  // For small batches, fetching directly from DB might be more efficient than pipelining cache lookups.
  if (userIds.length < 20) {
    return await fetchIgnoredPairsFromDb(userIds);
  }

  const cacheHits: [string, string][] = [];
  const cacheMissUserIds: string[] = []; // Users whose ignored lists were not in cache or were invalid.

  // Use a Redis pipeline to batch cache lookups for efficiency.
  const pipeline = redisClient.pipeline();
  for (const userId of userIds) {
    pipeline.get(getIgnoredCacheKey(userId));
  }
  const results = await pipeline.exec();

  // If pipeline execution fails, fall back to direct DB fetch for all users.
  if (!results) {
    logger.warn(
      '[IgnoredUsersService] Redis pipeline failed for getIgnoredPairsForUsers. Fetching all from DB.',
    );
    return await fetchIgnoredPairsFromDb(userIds);
  }

  // Process pipeline results: sort into cache hits or misses.
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const [err, cachedValue] = results[i];

    if (!err && cachedValue) {
      try {
        const ignoredIds = JSON.parse(cachedValue as string) as string[];
        for (const ignoredId of ignoredIds) {
          // Only include pairs where both users are in the input list.
          if (userIds.includes(ignoredId)) {
            cacheHits.push([userId, ignoredId]);
          }
        }
      } catch {
        // If parsing fails, treat as a cache miss.
        cacheMissUserIds.push(userId);
      }
    } else {
      // Error or no cached value, treat as a cache miss.
      cacheMissUserIds.push(userId);
    }
  }

  // Handle cache misses by fetching from the database.
  if (cacheMissUserIds.length > 0) {
    const dbResults = await fetchIgnoredPairsFromDb(cacheMissUserIds);

    // Update cache for the users whose data was fetched from DB.
    const updatePipeline = redisClient.pipeline();
    const userIgnoreMap = new Map<string, string[]>(); // Temporary map to group ignored IDs by user.

    // Populate the map from DB results.
    for (const [userId, ignoredId] of dbResults) {
      if (!userIgnoreMap.has(userId)) {
        userIgnoreMap.set(userId, []);
      }
      userIgnoreMap.get(userId)?.push(ignoredId);
    }

    // Add cache update commands to the pipeline.
    for (const [userId, ignoredIds] of userIgnoreMap.entries()) {
      updatePipeline.set(
        getIgnoredCacheKey(userId),
        JSON.stringify(ignoredIds),
        'EX',
        IGNORED_USERS_REDIS_CACHE_TTL,
      );
    }
    await updatePipeline.exec(); // Execute cache updates.

    return [...cacheHits, ...dbResults]; // Combine cache hits and new DB results.
  }

  return cacheHits; // Return only cache hits if all were found in cache.
};

/**
 * Helper method to fetch ignored pairs directly from the database.
 * @param userIds An array of user IDs.
 * @returns A promise that resolves to an array of [userId, ignoredUserId] tuples.
 */
const fetchIgnoredPairsFromDb = async (
  userIds: string[],
): Promise<[string, string][]> => {
  try {
    return await SupabaseService.getIgnoredPairs(userIds);
  } catch (error) {
    logger.error(
      { error, userIds },
      '[IgnoredUsersService] Failed to fetch ignored pairs from database',
    );
    return [];
  }
};

/**
 * Generates the Redis cache key for a user's ignored list.
 * @param userId The ID of the user.
 * @returns The Redis cache key string.
 */
const getIgnoredCacheKey = (userId: string): string => {
  return `ignored:${userId}`;
};

/**
 * Service for managing user ignore lists, with caching to reduce database load.
 */
export const IgnoredUsersService = {
  addToIgnoredCache,
  getIgnoredPairsForUsers,
  getIgnoredUserIds,
};
