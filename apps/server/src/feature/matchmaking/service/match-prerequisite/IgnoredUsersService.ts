import { log } from '../../../../common/util/logger.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { TimeUtils } from '../../util/TimeUtils.js';
import { GlobalIgnoreMatrixService } from './GlobalIgnoreMatrixService.js';
/**
 * TODO: Optimizations:
 * 1. Pre-compute More Aggressively
 * // Cache the expensive matrix computation
 * const IGNORE_MATRIX_CACHE_KEY = 'ignore_matrix_v2';
 * const MATRIX_CACHE_TTL = 300; // 5 minutes
 *
 * const getCachedIgnoreMatrix = async (userIds: string[]): Promise<Set<string> | null> => {
 *   try {
 *     const redis = RedisClient.get();
 *     const cacheKey = `${IGNORE_MATRIX_CACHE_KEY}:${userIds.sort().join(',')}`;
 *     const cached = await redis.get(cacheKey);
 *
 *     if (cached) {
 *       return new Set(JSON.parse(cached));
 *     }
 *     return null;
 *   } catch {
 *     return null;
 *   }
 * };
 *
 * 2. Reduce String Operations
 * // Use numeric hash instead of string concatenation
 * const createIgnoreKey = (userId1: string, userId2: string): string => {
 *   // Pre-compute hash to avoid repeated string operations
 *   const [min, max] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
 *   return `${min}:${max}`; // Still string, but with consistent ordering
 * };
 *
 * 3. Algorithmic Optimization
 * // Early termination for small batches
 * const _buildIgnoreMatrix = (ignoreData: Map<string, Set<string>>): Set<string> => {
 *   const totalRelationships = Array.from(ignoreData.values())
 *     .reduce((sum, set) => sum + set.size, 0);
 *
 *   // Skip matrix building for very small ignore sets
 *   if (totalRelationships < 10) {
 *     return new Set();
 *   }
 *
 *   // ... existing logic
 * };
 */

/**
 * Result for matchmaking ignore processing
 * Simplified to focus on what matchmaking actually needs
 */
interface MatchmakingIgnoreInfo {
  /** Users that should be matched first (high priority) */
  priorityUsers: string[];
  /** Users that should be matched second (lower priority) */
  deprioritizedUsers: string[];
  /** Pre-computed ignore relationships for fast lookup during matching */
  ignoreMatrix: Set<string>;
  /** Optional bloom filter key for memory optimization (legacy) */
  bloomFilterKey?: string;
}

/**
 * Build ignore matrix using single-direction keys
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
 * Redis Bloom filter key for ignore relationships
 */
const IGNORE_BLOOM_FILTER_KEY = 'ignore_bloom_filter';
const PENDING_INVALIDATIONS_KEY = 'ignore_invalidations_pending';
const BLOOM_FILTER_LAST_REBUILD_KEY = 'bloom_filter_last_rebuild';

/**
 * Debounce time for Bloom filter rebuilds (30 seconds)
 */
const BLOOM_FILTER_REBUILD_DEBOUNCE_MS = 30000;

/**
 * Check if Bloom filter needs rebuild and do it efficiently
 */
const _shouldRebuildBloomFilter = async (): Promise<boolean> => {
  try {
    const redis = RedisClient.get();

    // Check if there are pending invalidations
    const pendingCount = await redis.scard(PENDING_INVALIDATIONS_KEY);

    if (pendingCount === 0) {
      return false; // No changes, no rebuild needed
    }

    // Check when filter was last rebuilt
    const lastRebuild = await redis.get(BLOOM_FILTER_LAST_REBUILD_KEY);
    const now = Date.now();
    const timeSinceRebuild = now - parseInt(lastRebuild || '0', 10);

    // Only rebuild if enough time has passed (debouncing)
    if (timeSinceRebuild < BLOOM_FILTER_REBUILD_DEBOUNCE_MS) {
      return false;
    }

    return true;
  } catch (error) {
    log.warn({ error }, '[IgnoredUsersService] Failed to check rebuild status');
    return false;
  }
};

/**
 * Create or update Redis bloom filter for preliminary ignore checks
 * Uses Redis Stack's built-in Bloom filter for optimal performance
 */
const _createIgnoreBloomFilter = async (
  ignoreData: Map<string, Set<string>>,
  forceRebuild = false,
): Promise<string | undefined> => {
  const totalPairs = Array.from(ignoreData.values()).reduce(
    (sum, set) => sum + set.size,
    0,
  );

  // Only use bloom filter if we have enough ignore relationships to benefit
  if (totalPairs < 100) {
    return undefined;
  }

  const redis = RedisClient.get();
  const filterKey = IGNORE_BLOOM_FILTER_KEY;

  try {
    // Check if rebuild is actually needed
    if (!forceRebuild && !(await _shouldRebuildBloomFilter())) {
      const exists = await redis.exists(filterKey);
      if (exists) {
        return filterKey; // Use existing filter
      }
    }

    // Clear pending invalidations since we're rebuilding
    await redis.del(PENDING_INVALIDATIONS_KEY);

    // Mark rebuild timestamp
    await redis.set(BLOOM_FILTER_LAST_REBUILD_KEY, Date.now());

    // Delete existing filter if rebuilding
    const exists = await redis.exists(filterKey);
    if (exists) {
      await redis.del(filterKey);
    }

    // Create new bloom filter with 1% false positive rate
    // Capacity set to 2x current pairs to allow growth
    await redis.call('BF.RESERVE', filterKey, 0.01, totalPairs * 2);

    // Add all ignore relationships to the bloom filter
    const pairs: string[] = [];
    for (const [userId, ignoredSet] of ignoreData) {
      for (const ignoredId of ignoredSet) {
        const key =
          userId < ignoredId
            ? `${userId}:${ignoredId}`
            : `${ignoredId}:${userId}`;
        pairs.push(key);
      }
    }

    if (pairs.length > 0) {
      // Use MADD for batch insertion
      await redis.call('BF.MADD', filterKey, ...pairs);
    }

    log.info(
      { totalPairs, filterKey, rebuiltDueToPending: !forceRebuild },
      '[IgnoredUsersService] Created/updated bloom filter efficiently',
    );

    return filterKey;
  } catch (error) {
    log.warn(
      { error, totalPairs },
      '[IgnoredUsersService] Failed to create/update bloom filter',
    );
    return undefined;
  }
};

/**
 * Configuration for adaptive filtering thresholds
 */
interface AdaptiveThresholds {
  /** Minimum threshold for ignore filtering (0.0 - 1.0) */
  minThreshold: number;
  /** Maximum threshold for ignore filtering (0.0 - 1.0) */
  maxThreshold: number;
  /** Scale factor for batch size adjustment */
  scaleFactor: number;
  /** Threshold for considering a wait time as "long" (seconds) */
  longWaitThreshold: number;
}

/**
 * Create adaptive thresholds based on batch size and system configuration
 * TODO: Make configurable
 */
const createAdaptiveThresholds = (): AdaptiveThresholds => ({
  minThreshold: 0.5, // Never go below 50% capacity
  maxThreshold: 0.9, // Never exceed 90% capacity
  scaleFactor: 10, // Base scale factor for threshold calculation
  longWaitThreshold: 30, // 30 seconds considered long wait
});

/**
 * Calculate dynamic threshold based on batch size with explicit bounds
 */
const calculateDynamicThreshold = (
  batchSize: number,
  thresholds: AdaptiveThresholds,
): number => {
  // More lenient for smaller batches: threshold = max(min, 1 - scaleFactor/batchSize)
  const dynamicThreshold = Math.max(
    thresholds.minThreshold,
    1 - thresholds.scaleFactor / batchSize,
  );

  // Ensure we don't exceed maximum threshold
  return Math.min(dynamicThreshold, thresholds.maxThreshold);
};

/**
 * Adaptive user filtering strategy that balances performance with fairness
 * Uses explicit configurable thresholds based on queue batch size and user wait times
 */
const _adaptiveUserFiltering = (
  userIds: string[],
  ignoreData: Map<string, Set<string>>,
  queueUsers: { userId: string; score: number }[],
): { priorityUsers: string[]; deprioritizedUsers: string[] } => {
  const thresholds = createAdaptiveThresholds();
  const dynamicThreshold = calculateDynamicThreshold(
    userIds.length,
    thresholds,
  );
  const maxIgnores = Math.floor(userIds.length * dynamicThreshold);

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

  const LONG_WAIT_THRESHOLD_SEC = 30;

  userIds.forEach((userId) => {
    const ignoreCount = ignoreData.get(userId)?.size || 0;
    const waitTime = waitTimeMap.get(userId) || 0;

    // Users who have waited long get priority regardless of ignore count
    if (waitTime > LONG_WAIT_THRESHOLD_SEC) {
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
 * Cache key generation for individual user operations
 */
const _getIgnoreCacheKey = (userId: string): string => {
  return `ignore_list:${userId}`;
};

/**
 * Cache key for tracking user activity for eviction
 */
const CACHE_ACTIVITY_KEY = 'ignore_cache_activity';

/**
 * Get TTL for user based on activity (can be enhanced with actual activity tracking)
 */
const _getTTLForUser = (_userId: string): number => {
  const baseConfig =
    ServerConfigService.getConfig().config.jobConfig.cache.redis;
  // For now, use base TTL. Can be enhanced with activity-based logic
  return baseConfig.ignoredUsersTTL;
};

/**
 * Track cache access for eviction strategy
 */
const _trackCacheAccess = async (userId: string): Promise<void> => {
  try {
    const redis = RedisClient.get();
    const now = Date.now();
    await redis.zadd(CACHE_ACTIVITY_KEY, now, userId);
  } catch (error) {
    // Don't fail if activity tracking fails
    log.debug(
      { error, userId },
      '[IgnoredUsersService] Failed to track cache access',
    );
  }
};

/**
 * Clears the ignore cache and handles full invalidation pipeline
 * Call this when users block/unblock each other - handles everything automatically
 * Enhanced with global matrix refresh support
 * @param userIds Array of user IDs whose caches should be cleared
 */
const clearUsersIgnoreCache = async (userIds: string[]): Promise<void> => {
  if (userIds.length === 0) return;

  const redis = RedisClient.get();

  try {
    // 1. Clear affected user caches immediately (this is fast)
    const cacheKeys = userIds.map(_getIgnoreCacheKey);
    await redis.del(...cacheKeys);

    // 2. Remove from activity tracking
    await redis.zrem(CACHE_ACTIVITY_KEY, ...userIds);

    // 3. Queue bloom filter rebuild (debounced for efficiency)
    await redis.sadd(PENDING_INVALIDATIONS_KEY, ...userIds);
    await redis.expire(PENDING_INVALIDATIONS_KEY, 60);

    // 4. Trigger global matrix refresh if available
    // This is done asynchronously to not block the cache clear operation
    GlobalIgnoreMatrixService.getMatrixStatus()
      .then((status) => {
        if (status.isAvailable) {
          return GlobalIgnoreMatrixService.refreshMatrix();
        }
      })
      .catch((error) => {
        log.warn(
          { error, userIds },
          '[IgnoredUsersService] Failed to refresh global matrix after cache clear',
        );
      });

    log.info(
      { userIds },
      '[IgnoredUsersService] Cleared cache and queued bloom filter rebuild',
    );
  } catch (error) {
    log.error(
      { error, userIds },
      '[IgnoredUsersService] Failed to clear cache and queue invalidation',
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
  // Update cache and local data using individual keys with TTL
  const redis = RedisClient.get();
  const pipeline = redis.pipeline();

  for (const userId of cacheMisses) {
    const ignoredIds = userIgnoreMap.get(userId) || [];
    ignoreData.set(userId, new Set(ignoredIds));

    const cacheKey = _getIgnoreCacheKey(userId);
    const ttl = _getTTLForUser(userId);

    // Set individual cache entry with TTL
    pipeline.setex(cacheKey, ttl, JSON.stringify(ignoredIds));
  }

  // Execute all cache updates in a single pipeline
  if (cacheMisses.length > 0) {
    await pipeline.exec();
  }
};

/**
 * Build ignore matrix from global matrix using batch lookups
 * More efficient than individual lookups for large batches
 */
const buildIgnoreMatrixFromGlobal = async (
  userIds: string[],
): Promise<Set<string>> => {
  try {
    // Generate all possible pairs for batch checking
    const userPairs: [string, string][] = [];
    for (let i = 0; i < userIds.length; i++) {
      for (let j = i + 1; j < userIds.length; j++) {
        userPairs.push([userIds[i], userIds[j]]);
      }
    }

    if (userPairs.length === 0) {
      return new Set();
    }

    // Batch check all pairs against global matrix
    const results = await GlobalIgnoreMatrixService.batchIsIgnored(userPairs);

    // Build matrix set from results
    const matrix = new Set<string>();
    for (let i = 0; i < userPairs.length; i++) {
      if (results[i]) {
        const [userId1, userId2] = userPairs[i];
        const key =
          userId1 < userId2 ? `${userId1}:${userId2}` : `${userId2}:${userId1}`;
        matrix.add(key);
      }
    }

    return matrix;
  } catch (error) {
    log.warn(
      { error, userCount: userIds.length },
      '[IgnoredUsersService] Failed to build matrix from global, falling back to empty',
    );
    return new Set();
  }
};

/**
 * Build ignore data structure from global matrix for adaptive filtering compatibility
 * This is less efficient but needed for existing adaptive filtering logic
 */
const buildIgnoreDataFromGlobal = async (
  userIds: string[],
): Promise<Map<string, Set<string>>> => {
  const ignoreData = new Map<string, Set<string>>();

  try {
    // Initialize empty ignore sets for all users
    for (const userId of userIds) {
      ignoreData.set(userId, new Set());
    }

    // Check each user against all others
    for (const userId of userIds) {
      const otherUsers = userIds.filter((id) => id !== userId);
      if (otherUsers.length === 0) continue;

      // Create pairs with current user
      const pairs: [string, string][] = otherUsers.map((otherId) => [
        userId,
        otherId,
      ]);

      // Batch check against global matrix
      const results = await GlobalIgnoreMatrixService.batchIsIgnored(pairs);

      // Build ignore set for this user
      const userIgnoreSet = ignoreData.get(userId);
      if (userIgnoreSet) {
        for (let i = 0; i < results.length; i++) {
          if (results[i]) {
            userIgnoreSet.add(otherUsers[i]);
          }
        }
      }
    }

    return ignoreData;
  } catch (error) {
    log.warn(
      { error, userCount: userIds.length },
      '[IgnoredUsersService] Failed to build ignore data from global, falling back to empty',
    );

    // Return empty data on error
    for (const userId of userIds) {
      ignoreData.set(userId, new Set());
    }
    return ignoreData;
  }
};

/**
 * Update global ignore matrix when users block/unblock each other
 * This should be called whenever ignore relationships change
 */
const _updateGlobalMatrix = async (
  userId1: string,
  userId2: string,
  isIgnored: boolean,
): Promise<void> => {
  try {
    if (isIgnored) {
      await GlobalIgnoreMatrixService.addIgnoreRelationship(userId1, userId2);
    } else {
      await GlobalIgnoreMatrixService.removeIgnoreRelationship(
        userId1,
        userId2,
      );
    }

    log.debug(
      { userId1, userId2, isIgnored },
      '[IgnoredUsersService] Updated global ignore matrix',
    );
  } catch (error) {
    log.error(
      { error, userId1, userId2, isIgnored },
      '[IgnoredUsersService] Failed to update global ignore matrix',
    );
    // Don't throw - this is a cache update, not critical for immediate operation
  }
};

/**
 * Primary API for matchmaking ignore processing
 * Uses global pre-computed matrix for O(1) lookups when available,
 * falls back to per-batch matrix building for compatibility
 */
const getIgnoreInfo = async (
  userIds: string[],
  queueUsers?: { userId: string; score: number }[],
): Promise<MatchmakingIgnoreInfo> => {
  if (userIds.length < 2) {
    return {
      priorityUsers: userIds,
      deprioritizedUsers: [],
      ignoreMatrix: new Set(),
    };
  }

  // Check if global matrix is available
  const matrixStatus = await GlobalIgnoreMatrixService.getMatrixStatus();

  if (matrixStatus.isAvailable) {
    // Use global matrix for O(1) ignore checking
    log.debug(
      { userCount: userIds.length, matrixVersion: matrixStatus.version },
      '[IgnoredUsersService] Using global ignore matrix',
    );

    // Build ignore matrix from global matrix lookups
    const ignoreMatrix = await buildIgnoreMatrixFromGlobal(userIds);

    // For adaptive filtering, we need the ignore data structure
    // Only build it if we have queue users for prioritization
    if (queueUsers) {
      const ignoreData = await buildIgnoreDataFromGlobal(userIds);
      const { priorityUsers, deprioritizedUsers } = _adaptiveUserFiltering(
        userIds,
        ignoreData,
        queueUsers,
      );

      return {
        priorityUsers,
        deprioritizedUsers,
        ignoreMatrix,
      };
    }

    // No adaptive filtering needed
    return {
      priorityUsers: userIds,
      deprioritizedUsers: [],
      ignoreMatrix,
    };
  } else {
    // Fallback to original per-batch matrix building
    log.debug(
      { userCount: userIds.length },
      '[IgnoredUsersService] Global matrix not available, using per-batch approach',
    );

    // Batch fetch ignore data using Redis cache
    const ignoreData = await batchFetchIgnoreData(userIds);

    // Build ignore matrix
    const ignoreMatrix = _buildIgnoreMatrix(ignoreData);

    // Adaptive user prioritization if queue users provided
    const { priorityUsers, deprioritizedUsers } = queueUsers
      ? _adaptiveUserFiltering(userIds, ignoreData, queueUsers)
      : { priorityUsers: userIds, deprioritizedUsers: [] };

    return {
      priorityUsers,
      deprioritizedUsers,
      ignoreMatrix,
    };
  }
};

/**
 * Batch fetch ignore data using individual Redis keys for better cache management
 */
const batchFetchIgnoreData = async (
  userIds: string[],
): Promise<Map<string, Set<string>>> => {
  const ignoreData = new Map<string, Set<string>>();

  // Track access for cache eviction
  await Promise.all(userIds.map(_trackCacheAccess));

  try {
    const redis = RedisClient.get();
    const cacheKeys = userIds.map(_getIgnoreCacheKey);

    // Use mget for batch retrieval of individual keys
    const cachedValues = await redis.mget(...cacheKeys);
    const cacheMisses: string[] = [];

    // Process cached results
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const cachedValue = cachedValues[i];

      if (cachedValue) {
        try {
          const ignoredIds = JSON.parse(cachedValue) as string[];
          ignoreData.set(userId, new Set(ignoredIds));
        } catch {
          cacheMisses.push(userId);
        }
      } else {
        cacheMisses.push(userId);
      }
    }

    // Handle cache misses with single DB query
    if (cacheMisses.length > 0) {
      const dbPairs = await SupabaseService.getIgnoredPairs(cacheMisses);

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
 * Fast ignore check using the matrix
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
 * Optimize bloom filter capacity - designed for scheduled job execution
 * Analyzes current bloom filter usage and rebuilds with optimal capacity if needed
 * No parameters needed - makes decisions automatically based on current state
 */
const optimizeBloomFilterCapacity = async (): Promise<void> => {
  try {
    const redis = RedisClient.get();

    // Check if bloom filter exists
    const filterExists = await redis.exists(IGNORE_BLOOM_FILTER_KEY);
    if (!filterExists) {
      log.info('[IgnoredUsersService] No bloom filter to optimize');
      return;
    }

    // Get bloom filter metrics
    const info = (await redis.call(
      'BF.INFO',
      IGNORE_BLOOM_FILTER_KEY,
    )) as string[];
    const infoMap = new Map<string, string | number>();
    for (let i = 0; i < info.length; i += 2) {
      infoMap.set(info[i], info[i + 1]);
    }

    const capacity = (infoMap.get('Capacity') as number) || 0;
    const itemCount = (infoMap.get('Size') as number) || 0;
    const utilization = capacity > 0 ? (itemCount / capacity) * 100 : 0;

    log.info(
      { capacity, itemCount, utilization: Math.round(utilization * 100) / 100 },
      '[IgnoredUsersService] Bloom filter capacity analysis',
    );

    // Simple optimization rules:
    // - If utilization > 80%: rebuild with larger capacity
    // - If utilization < 20% and capacity > 1000: rebuild with smaller capacity
    // - If item count < 100: remove filter entirely
    let shouldOptimize = false;
    let action = '';

    if (itemCount < 100) {
      // Clear bloom filter if too few items
      try {
        const redis = RedisClient.get();
        await redis.del(IGNORE_BLOOM_FILTER_KEY);
        log.info('[IgnoredUsersService] Removed bloom filter (too few items)');
      } catch (error) {
        log.error(
          { error },
          '[IgnoredUsersService] Failed to clear bloom filter',
        );
      }
      action = 'removed (too few items)';
    } else if (utilization > 80) {
      shouldOptimize = true;
      action = 'rebuilt (high utilization)';
    } else if (utilization < 20 && capacity > 1000) {
      shouldOptimize = true;
      action = 'rebuilt (low utilization)';
    } else {
      action = 'no action needed';
    }

    if (shouldOptimize) {
      // Get current ignore data
      const pattern = 'ignore_list:*';
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        try {
          const redis = RedisClient.get();
          await redis.del(IGNORE_BLOOM_FILTER_KEY);
          log.info(
            '[IgnoredUsersService] No ignore data found - removed bloom filter',
          );
        } catch (error) {
          log.error(
            { error },
            '[IgnoredUsersService] Failed to clear bloom filter',
          );
        }
        return;
      }

      const userIds = keys.map((key) => key.replace('ignore_list:', ''));
      const ignoreData = await batchFetchIgnoreData(userIds);

      // Force rebuild with existing function
      await _createIgnoreBloomFilter(ignoreData, true);
    }

    log.info(
      { action, utilization: Math.round(utilization * 100) / 100 },
      '[IgnoredUsersService] Bloom filter optimization completed',
    );
  } catch (error) {
    log.error(
      { error },
      '[IgnoredUsersService] Failed to optimize bloom filter',
    );
  }
};

/**
 * Primary service for matchmaking ignore logic
 * Integrates with global ignore matrix for optimal performance
 */
export const IgnoredUsersService = {
  /** Primary function for matchmaking - gets ignore matrix and user prioritization */
  getIgnoreInfo,

  /** Fast ignore check for use with pre-computed matrix during matching */
  isIgnored,

  /** Clear ignore cache for specific users (maintenance) */
  clearUsersIgnoreCache,

  /** Optimize bloom filter capacity (maintenance) */
  optimizeBloomFilterCapacity,

  /** Update global matrix when users block/unblock (internal use) */
  updateGlobalMatrix: _updateGlobalMatrix,
};

/**
 * Internal functions exposed for testing purposes only
 * DO NOT use these in production code - they may change without notice
 */
export const IgnoredUsersServiceInternals = {
  /** Test core matrix building logic with lexicographic ordering */
  buildIgnoreMatrix: _buildIgnoreMatrix,

  /** Test adaptive user filtering algorithm with dynamic thresholds */
  adaptiveUserFiltering: _adaptiveUserFiltering,

  /** Test bloom filter rebuild decision logic with debouncing */
  shouldRebuildBloomFilter: _shouldRebuildBloomFilter,
};
