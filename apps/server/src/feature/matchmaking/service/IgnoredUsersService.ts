import { log } from '../../../common/util/logger.js';
import { SupabaseService } from '../../../common/service/SupabaseService.js';
import { RedisClient } from '../../../common/client/RedisClient.js';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import { TimeUtils } from '../util/TimeUtils.js';

interface IgnoreCheckResult {
  /** Users that should be matched first (high priority) */
  priorityUsers: string[];
  /** Users that should be matched second (lower priority) */
  deprioritizedUsers: string[];
  /** Pre-computed ignore relationships for fast lookup during matching */
  ignoreMatrix: Set<string>;
  /** Performance metrics */
  metrics: {
    cacheHits: number;
    cacheMisses: number;
    dbQueries: number;
    filteredUsers: number;
  };
}

/**
 * Build optimized ignore matrix using single-direction keys
 * Uses lexicographic ordering to avoid duplicate checks
 */
const _buildIgnoreMatrix = (
  ignoreData: Map<string, Set<string>>,
): Set<string> => {
  const matrix = new Set<string>();

  for (const [userId, ignoredSet] of ignoreData) {
    for (const ignoredId of ignoredSet) {
      // Use lexicographic ordering to ensure consistent single-direction keys
      // This eliminates the need for bidirectional checking
      const key =
        userId < ignoredId
          ? `${userId}:${ignoredId}`
          : `${ignoredId}:${userId}`;
      matrix.add(key);
    }
  }

  return matrix;
};

/**
 * Adaptive user filtering strategy that balances performance with fairness
 * Uses dynamic thresholds based on queue batch size and user wait times
 */
const _adaptiveUserFiltering = (
  userIds: string[],
  ignoreData: Map<string, Set<string>>,
  queueUsers: { userId: string; score: number }[],
): { priorityUsers: string[]; deprioritizedUsers: string[] } => {
  // Dynamic threshold based on batch size - more lenient for smaller batches
  const baseThreshold = Math.max(0.5, 1 - 10 / userIds.length); // 50% min, scales with batch size
  const maxIgnores = Math.floor(userIds.length * baseThreshold);

  const priorityUsers: string[] = [];
  const deprioritizedUsers: string[] = [];

  // Create wait time map for fairness consideration
  const waitTimeMap = new Map<string, number>();
  queueUsers.forEach((user) => {
    waitTimeMap.set(
      user.userId,
      TimeUtils.getCurrentTimeAsScore() - user.score,
    );
  });

  const LONG_WAIT_THRESHOLD = 30; // 30 seconds

  userIds.forEach((userId) => {
    const ignoreCount = ignoreData.get(userId)?.size || 0;
    const waitTime = waitTimeMap.get(userId) || 0;

    // Users who have waited long get priority regardless of ignore count
    if (waitTime > LONG_WAIT_THRESHOLD) {
      priorityUsers.push(userId);
    } else if (ignoreCount <= maxIgnores) {
      priorityUsers.push(userId);
    } else {
      // Deprioritize but don't exclude - they can still match with each other
      deprioritizedUsers.push(userId);
    }
  });

  return { priorityUsers, deprioritizedUsers };
};

/**
 * Optimized cache key generation for batch operations
 */
const _getOptimizedIgnoreCacheKey = (userId: string): string => {
  return `ign:${userId}`;
};

/**
 * Clears the ignore cache for multiple users in a single Redis operation
 * More efficient than calling clearUserIgnoreCache multiple times
 * @param userIds Array of user IDs whose caches should be cleared
 */
const clearUsersIgnoreCache = async (userIds: string[]): Promise<void> => {
  if (userIds.length === 0) return;

  try {
    const redis = RedisClient.get();
    const cacheKeys = userIds.map(_getOptimizedIgnoreCacheKey);

    // Clear all cache entries in a single Redis operation
    await redis.hdel('ignored_users_batch', ...cacheKeys);

    log.debug(
      { userIds },
      '[IgnoredUsersService] Cleared ignore cache for multiple users',
    );
  } catch (error) {
    log.warn(
      { error, userIds },
      '[IgnoredUsersService] Failed to clear ignore cache for multiple users',
    );
  }
};

const _updateRedisCache = async ({
  cacheMisses,
  userIgnoreMap,
  ignoreData,
}: {
  cacheMisses: string[];
  userIgnoreMap: Map<string, string[]>;
  ignoreData: Map<string, Set<string>>;
}): Promise<void> => {
  // Update cache and local data
  const redis = RedisClient.get();

  const cacheUpdates: [string, string][] = [];
  for (const userId of cacheMisses) {
    const ignoredIds = userIgnoreMap.get(userId) || [];
    ignoreData.set(userId, new Set(ignoredIds));
    cacheUpdates.push([
      _getOptimizedIgnoreCacheKey(userId),
      JSON.stringify(ignoredIds),
    ]);
  }

  // Batch cache update
  if (cacheUpdates.length > 0) {
    const updateArgs = cacheUpdates.flat();
    await redis.hmset('ignored_users_batch', ...updateArgs);
    await redis.expire(
      'ignored_users_batch',
      ServerConfigService.getConfig().config.cache.redis.ignoredUsersTTL,
    );
  }
};

/**
 * Optimized batch ignore checking for matchmaking
 * Uses Redis Hash for O(1) lookups and adaptive user prioritization
 */
const getOptimizedIgnoreInfo = async (
  userIds: string[],
  queueUsers?: { userId: string; score: number }[],
): Promise<IgnoreCheckResult> => {
  const metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    dbQueries: 0,
    filteredUsers: 0,
  };

  // Early return for small batches
  if (userIds.length < 2) {
    return {
      priorityUsers: userIds,
      deprioritizedUsers: [],
      ignoreMatrix: new Set(),
      metrics,
    };
  }

  // Step 1: Batch fetch all ignore data using optimized Redis operations
  const ignoreData = await batchFetchIgnoreData(userIds, metrics);

  // Step 2: Build efficient ignore matrix
  const ignoreMatrix = _buildIgnoreMatrix(ignoreData);

  // Step 3: Adaptive user prioritization (instead of hard filtering)
  const { priorityUsers, deprioritizedUsers } = queueUsers
    ? _adaptiveUserFiltering(userIds, ignoreData, queueUsers)
    : { priorityUsers: userIds, deprioritizedUsers: [] };

  metrics.filteredUsers = deprioritizedUsers.length;

  return {
    priorityUsers,
    deprioritizedUsers,
    ignoreMatrix,
    metrics,
  };
};

/**
 * Batch fetch ignore data using Redis Hash for better performance
 */
const batchFetchIgnoreData = async (
  userIds: string[],
  metrics: { cacheHits: number; cacheMisses: number; dbQueries: number },
): Promise<Map<string, Set<string>>> => {
  const ignoreData = new Map<string, Set<string>>();

  // Use Redis HMGET for batch fetching - much faster than pipeline
  const cacheKeys = userIds.map(_getOptimizedIgnoreCacheKey);

  try {
    const redis = RedisClient.get();
    const redisHmgetStart = Date.now();
    const cachedValues = await redis.hmget('ignored_users_batch', ...cacheKeys);
    const redisHmgetTime = Date.now() - redisHmgetStart;

    const cacheMisses: string[] = [];

    // Process cached results
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const cachedValue = cachedValues[i];

      if (cachedValue) {
        try {
          const ignoredIds = JSON.parse(cachedValue) as string[];
          ignoreData.set(userId, new Set(ignoredIds));
          metrics.cacheHits++;
        } catch {
          cacheMisses.push(userId);
        }
      } else {
        cacheMisses.push(userId);
      }
    }

    // Handle cache misses with single DB query
    if (cacheMisses.length > 0) {
      metrics.cacheMisses += cacheMisses.length;
      metrics.dbQueries++;

      const dbStart = Date.now();
      const dbPairs = await SupabaseService.getIgnoredPairs(cacheMisses);
      const dbTime = Date.now() - dbStart;

      log.debug(
        {
          cacheMissCount: cacheMisses.length,
          redisHmgetTime,
          dbTime,
          dbResultsCount: dbPairs.length,
        },
        '[IgnoredUsersService] Cache miss timing breakdown',
      );

      // Group by user
      const userIgnoreMap = new Map<string, string[]>();
      for (const [userId, ignoredId] of dbPairs) {
        if (!userIgnoreMap.has(userId)) {
          userIgnoreMap.set(userId, []);
        }

        userIgnoreMap.get(userId)?.push(ignoredId);
      }

      void _updateRedisCache({
        cacheMisses,
        userIgnoreMap,
        ignoreData,
      }).catch((error) => {
        log.error({ error }, '[IgnoredUsersService] Failed to update cache');
      });
    }

    return ignoreData;
  } catch (error) {
    log.warn(
      { error, userIds },
      '[IgnoredUsersService] Cache fetch failed, using DB',
    );
    metrics.dbQueries++;

    // Fallback to direct DB fetch
    const dbPairs = await SupabaseService.getIgnoredPairs(userIds);
    const userIgnoreMap = new Map<string, string[]>();

    for (const [userId, ignoredId] of dbPairs) {
      if (!userIgnoreMap.has(userId)) {
        userIgnoreMap.set(userId, []);
      }

      userIgnoreMap.get(userId)?.push(ignoredId);
    }

    for (const [userId, ignoredIds] of userIgnoreMap) {
      ignoreData.set(userId, new Set(ignoredIds));
    }

    return ignoreData;
  }
};

/**
 * Fast ignore check using the optimized matrix
 * O(1) lookup instead of O(n) array includes
 */
const isIgnored = (
  userId1: string,
  userId2: string,
  ignoreMatrix: Set<string>,
): boolean => {
  // Use consistent lexicographic ordering
  const key =
    userId1 < userId2 ? `${userId1}:${userId2}` : `${userId2}:${userId1}`;
  return ignoreMatrix.has(key);
};

/**
 * Unified service for managing user ignore lists, with caching to reduce database load.
 * Supports both legacy moderation operations and optimized matchmaking operations.
 */
export const IgnoredUsersService = {
  clearUsersIgnoreCache,
  getOptimizedIgnoreInfo,
  isIgnored,
};
