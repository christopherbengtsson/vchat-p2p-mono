import { log } from '../../../../common/util/logger.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import { REDIS_KEY } from '../../model/RedisKey.js';

/**
 * Global ignore matrix system for O(1) lookup performance
 *
 * This service replaces per-batch matrix building with a global pre-computed matrix
 * that provides O(1) lookups instead of O(n²) matrix building per batch.
 *
 * Key features:
 * - Global matrix warmup during startup
 * - Versioning for cache invalidation
 * - Multi-worker coordination
 * - Incremental updates for new ignore relationships
 * - Redis persistence with TTL management
 */

/**
 * Configuration constants
 */
const MATRIX_TTL_SECONDS = 3600; // 1 hour
const WARMUP_LOCK_TTL_SECONDS = 300; // 5 minutes
const VERSION_EXPIRY_SECONDS = 7200; // 2 hours
const WARMUP_BATCH_SIZE = 1000; // Process users in batches during warmup

/**
 * Safe in-memory cache configuration
 */
const CACHE_MAX_SIZE = 10000; // Maximum ignore relationships to cache in memory
const CACHE_TTL_MS = 300000; // 5 minutes cache TTL
const CACHE_VERSION_CHECK_INTERVAL_MS = 30000; // Check for version updates every 30s

/**
 * Matrix statistics for monitoring
 */
interface MatrixStats {
  totalPairs: number;
  lastWarmupDuration: number;
  lastWarmupTimestamp: number;
  version: number;
  isWarmedUp: boolean;
}

/**
 * Result from matrix lookup operations
 */
interface MatrixLookupResult {
  /** Whether the matrix is available and warmed up */
  isAvailable: boolean;
  /** Current matrix version */
  version: number;
  /** Matrix statistics */
  stats: MatrixStats;
}

/**
 * Safe LRU cache entry for ignore relationships
 */
interface CacheEntry {
  value: boolean;
  timestamp: number;
}

/**
 * Safe bounded cache for frequently accessed ignore relationships
 * Uses LRU eviction and automatic invalidation to prevent memory issues
 */
interface SafeIgnoreCache {
  cache: Map<string, CacheEntry>;
  version: number;
  lastVersionCheck: number;
}

/**
 * Global safe cache instance
 */
let globalCache: SafeIgnoreCache = {
  cache: new Map(),
  version: 0,
  lastVersionCheck: 0,
};

/**
 * Clear the global cache (used for testing and invalidation)
 */
const clearGlobalCache = (): void => {
  globalCache = {
    cache: new Map(),
    version: 0,
    lastVersionCheck: 0,
  };
};

/**
 * Check if cache needs version validation
 */
const shouldCheckVersion = (): boolean => {
  const now = Date.now();
  return now - globalCache.lastVersionCheck > CACHE_VERSION_CHECK_INTERVAL_MS;
};

/**
 * Evict old entries from cache using LRU
 */
const evictOldEntries = (): void => {
  const now = Date.now();
  const maxAge = CACHE_TTL_MS;

  // Remove expired entries
  for (const [key, entry] of globalCache.cache.entries()) {
    if (now - entry.timestamp > maxAge) {
      globalCache.cache.delete(key);
    }
  }

  // If still too large, remove oldest entries (LRU)
  if (globalCache.cache.size > CACHE_MAX_SIZE) {
    const sortedEntries = Array.from(globalCache.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp,
    );

    const toRemove = sortedEntries.slice(
      0,
      globalCache.cache.size - CACHE_MAX_SIZE,
    );
    for (const [key] of toRemove) {
      globalCache.cache.delete(key);
    }
  }
};

/**
 * Safely get ignore relationship from cache or Redis
 * Uses bounded LRU cache to balance performance with memory safety
 */
const safeIsIgnored = async (
  userId1: string,
  userId2: string,
): Promise<boolean> => {
  const key = createIgnoreKey(userId1, userId2);

  try {
    // Check if we need to validate cache version
    if (shouldCheckVersion()) {
      const currentVersion = await getCurrentVersion();

      if (currentVersion !== globalCache.version) {
        // Version changed - invalidate entire cache
        globalCache.cache.clear();
        globalCache.version = currentVersion;
      }

      globalCache.lastVersionCheck = Date.now();
    }

    // Check cache first
    const cacheEntry = globalCache.cache.get(key);
    if (cacheEntry) {
      const now = Date.now();

      // Check if cache entry is still valid
      if (now - cacheEntry.timestamp < CACHE_TTL_MS) {
        return cacheEntry.value;
      } else {
        // Remove expired entry
        globalCache.cache.delete(key);
      }
    }

    // Cache miss or expired - fetch from Redis
    const redis = RedisClient.get();

    // Check what type of key we have in Redis
    const keyType = await redis.type(REDIS_KEY.GLOBAL_MATRIX_KEY);

    let isIgnored: boolean;

    if (keyType === 'string') {
      // Matrix is stored as string (empty matrix case)
      const matrixValue = await redis.get(REDIS_KEY.GLOBAL_MATRIX_KEY);
      isIgnored = matrixValue !== 'EMPTY_MATRIX'; // Should be false for empty matrix
    } else if (keyType === 'set') {
      // Matrix is stored as set (populated matrix case)
      const result = await redis.sismember(REDIS_KEY.GLOBAL_MATRIX_KEY, key);
      isIgnored = result === 1;
    } else {
      // Key doesn't exist or unknown type
      isIgnored = false;
    }

    // Store in cache with bounds checking
    evictOldEntries();

    if (globalCache.cache.size < CACHE_MAX_SIZE) {
      globalCache.cache.set(key, {
        value: isIgnored,
        timestamp: Date.now(),
      });
    }

    return isIgnored;
  } catch (error) {
    log.warn(
      { error, userId1, userId2 },
      '[GlobalIgnoreMatrix] Failed to check ignore status, defaulting to false',
    );
    return false; // Fail open
  }
};

/**
 * Create ignore relationship key using lexicographic ordering
 * Ensures consistent single-direction keys for efficient storage
 */
const createIgnoreKey = (userId1: string, userId2: string): string => {
  return userId1 < userId2 ? `${userId1}:${userId2}` : `${userId2}:${userId1}`;
};

/**
 * Get current matrix version from Redis
 */
const getCurrentVersion = async (): Promise<number> => {
  try {
    const redis = RedisClient.get();
    const version = await redis.get(REDIS_KEY.GLOBAL_MATRIX_VERSION_KEY);
    return version ? parseInt(version, 10) : 0;
  } catch (error) {
    log.warn({ error }, '[GlobalIgnoreMatrix] Failed to get current version');
    return 0;
  }
};

/**
 * Increment matrix version and return new version
 */
const incrementVersion = async (): Promise<number> => {
  try {
    const redis = RedisClient.get();
    const newVersion = await redis.incr(REDIS_KEY.GLOBAL_MATRIX_VERSION_KEY);
    await redis.expire(
      REDIS_KEY.GLOBAL_MATRIX_VERSION_KEY,
      VERSION_EXPIRY_SECONDS,
    );
    return newVersion;
  } catch (error) {
    log.error({ error }, '[GlobalIgnoreMatrix] Failed to increment version');
    throw error;
  }
};

/**
 * Acquire warmup lock to prevent multiple workers from warming up simultaneously
 */
const acquireWarmupLock = async (): Promise<boolean> => {
  try {
    const redis = RedisClient.get();
    const lockAcquired = await redis.set(
      REDIS_KEY.GLOBAL_MATRIX_WARMUP_LOCK_KEY,
      Date.now(),
      'EX',
      WARMUP_LOCK_TTL_SECONDS,
      'NX',
    );
    return lockAcquired === 'OK';
  } catch (error) {
    log.warn({ error }, '[GlobalIgnoreMatrix] Failed to acquire warmup lock');
    return false;
  }
};

/**
 * Release warmup lock
 */
const releaseWarmupLock = async (): Promise<void> => {
  try {
    const redis = RedisClient.get();
    await redis.del(REDIS_KEY.GLOBAL_MATRIX_WARMUP_LOCK_KEY);
  } catch (error) {
    log.warn({ error }, '[GlobalIgnoreMatrix] Failed to release warmup lock');
  }
};

/**
 * Check if matrix exists and is valid
 */
const isMatrixValid = async (): Promise<boolean> => {
  try {
    const redis = RedisClient.get();
    const exists = await redis.exists(REDIS_KEY.GLOBAL_MATRIX_KEY);
    if (!exists) return false;

    const ttl = await redis.ttl(REDIS_KEY.GLOBAL_MATRIX_KEY);
    return ttl > 0; // Matrix exists and hasn't expired
  } catch (error) {
    log.warn({ error }, '[GlobalIgnoreMatrix] Failed to check matrix validity');
    return false;
  }
};

/**
 * Update matrix statistics
 */
const updateMatrixStats = async (
  stats: Partial<MatrixStats>,
): Promise<void> => {
  try {
    const redis = RedisClient.get();
    const current = await getMatrixStats();
    const updated = { ...current, ...stats };
    await redis.setex(
      REDIS_KEY.GLOBAL_MATRIX_STATS_KEY,
      MATRIX_TTL_SECONDS,
      JSON.stringify(updated),
    );
  } catch (error) {
    log.warn({ error }, '[GlobalIgnoreMatrix] Failed to update matrix stats');
  }
};

/**
 * Get matrix statistics
 */
const getMatrixStats = async (): Promise<MatrixStats> => {
  try {
    const redis = RedisClient.get();
    const statsJson = await redis.get(REDIS_KEY.GLOBAL_MATRIX_STATS_KEY);
    if (statsJson) {
      return JSON.parse(statsJson) as MatrixStats;
    }
  } catch (error) {
    log.warn({ error }, '[GlobalIgnoreMatrix] Failed to get matrix stats');
  }

  // Return default stats
  return {
    totalPairs: 0,
    lastWarmupDuration: 0,
    lastWarmupTimestamp: 0,
    version: 0,
    isWarmedUp: false,
  };
};

/**
 * Build ignore matrix from database data
 * Processes ignore relationships and stores them in Redis set
 */
const buildMatrixFromDatabase = async (): Promise<number> => {
  const startTime = performance.now();

  try {
    const redis = RedisClient.get();

    // Get all ignore relationships from database
    const allIgnorePairs = await SupabaseService.getAllIgnorePairs();

    if (allIgnorePairs.length === 0) {
      // No ignore relationships - create empty set with TTL
      // Note: We use a string key instead of a set to persist empty state
      await redis.del(REDIS_KEY.GLOBAL_MATRIX_KEY);
      await redis.setex(
        REDIS_KEY.GLOBAL_MATRIX_KEY,
        MATRIX_TTL_SECONDS,
        'EMPTY_MATRIX',
      );

      const duration = performance.now() - startTime;

      await updateMatrixStats({
        totalPairs: 0,
        lastWarmupDuration: duration,
        lastWarmupTimestamp: Date.now(),
        isWarmedUp: true,
      });

      log.info({ duration }, '[GlobalIgnoreMatrix] Built empty matrix');
      return 0;
    }

    // Build matrix keys using lexicographic ordering
    const matrixKeys = new Set<string>();
    for (const [userId, ignoredId] of allIgnorePairs) {
      const key = createIgnoreKey(userId, ignoredId);
      matrixKeys.add(key);
    }

    // Store matrix in Redis set for O(1) lookups
    const uniqueKeys = Array.from(matrixKeys);
    await redis.del(REDIS_KEY.GLOBAL_MATRIX_KEY);

    if (uniqueKeys.length > 0) {
      // Use pipeline for batch insertion
      const pipeline = redis.pipeline();

      // Add keys in batches to avoid memory issues
      for (let i = 0; i < uniqueKeys.length; i += WARMUP_BATCH_SIZE) {
        const batch = uniqueKeys.slice(i, i + WARMUP_BATCH_SIZE);
        pipeline.sadd(REDIS_KEY.GLOBAL_MATRIX_KEY, ...batch);
      }

      // Set TTL
      pipeline.expire(REDIS_KEY.GLOBAL_MATRIX_KEY, MATRIX_TTL_SECONDS);

      await pipeline.exec();
    } else {
      // Create empty set with TTL - use string key to persist empty state
      await redis.setex(
        REDIS_KEY.GLOBAL_MATRIX_KEY,
        MATRIX_TTL_SECONDS,
        'EMPTY_MATRIX',
      );
    }

    const duration = performance.now() - startTime;

    await updateMatrixStats({
      totalPairs: uniqueKeys.length,
      lastWarmupDuration: duration,
      lastWarmupTimestamp: Date.now(),
      isWarmedUp: true,
    });

    log.info(
      {
        totalPairs: uniqueKeys.length,
        duration,
        uniqueRelationships: matrixKeys.size,
      },
      '[GlobalIgnoreMatrix] Successfully built matrix from database',
    );

    return uniqueKeys.length;
  } catch (error) {
    log.error(
      { error },
      '[GlobalIgnoreMatrix] Failed to build matrix from database',
    );
    throw error;
  }
};

/**
 * Warm up the global ignore matrix
 * Should be called during application startup
 */
const warmupMatrix = async (): Promise<MatrixLookupResult> => {
  log.info('[GlobalIgnoreMatrix] Starting matrix warmup');

  try {
    // Check if matrix is already valid
    if (await isMatrixValid()) {
      const version = await getCurrentVersion();
      const stats = await getMatrixStats();

      log.info({ version }, '[GlobalIgnoreMatrix] Matrix already warmed up');
      return {
        isAvailable: true,
        version,
        stats: { ...stats, isWarmedUp: true },
      };
    }

    // Try to acquire warmup lock
    const lockAcquired = await acquireWarmupLock();
    if (!lockAcquired) {
      log.info('[GlobalIgnoreMatrix] Another worker is warming up, waiting...');

      // Wait for other worker to complete warmup
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (await isMatrixValid()) {
          const version = await getCurrentVersion();
          const stats = await getMatrixStats();

          log.info('[GlobalIgnoreMatrix] Matrix warmed up by another worker');
          return {
            isAvailable: true,
            version,
            stats: { ...stats, isWarmedUp: true },
          };
        }

        attempts++;
      }

      log.warn(
        '[GlobalIgnoreMatrix] Timeout waiting for other worker to warm up',
      );
      const stats = await getMatrixStats();
      return {
        isAvailable: false,
        version: 0,
        stats: { ...stats, isWarmedUp: false },
      };
    }

    try {
      // Build matrix from database
      const totalPairs = await buildMatrixFromDatabase();

      // Increment version to signal successful warmup
      const newVersion = await incrementVersion();

      // Update last update timestamp
      const redis = RedisClient.get();
      await redis.set(REDIS_KEY.GLOBAL_MATRIX_LAST_UPDATE_KEY, Date.now());

      const stats = await getMatrixStats();

      log.info(
        { version: newVersion, totalPairs },
        '[GlobalIgnoreMatrix] Matrix warmup completed successfully',
      );

      return {
        isAvailable: true,
        version: newVersion,
        stats: { ...stats, version: newVersion, isWarmedUp: true },
      };
    } finally {
      await releaseWarmupLock();
    }
  } catch (error) {
    log.error({ error }, '[GlobalIgnoreMatrix] Matrix warmup failed');
    await releaseWarmupLock();

    const stats = await getMatrixStats();
    return {
      isAvailable: false,
      version: 0,
      stats: { ...stats, isWarmedUp: false },
    };
  }
};

/**
 * Internal function for checking ignore relationships (not exported)
 * Use IgnoredUsersService.getIgnoreInfo() for matchmaking purposes
 */
const _checkIgnoreRelationship = async (
  userId1: string,
  userId2: string,
): Promise<boolean> => {
  return safeIsIgnored(userId1, userId2);
};

/**
 * Add ignore relationship to global matrix
 * Used when users block each other
 */
const addIgnoreRelationship = async (
  userId1: string,
  userId2: string,
): Promise<void> => {
  try {
    const redis = RedisClient.get();
    const key = createIgnoreKey(userId1, userId2);

    // Check if matrix is currently in empty state
    const matrixValue = await redis.get(REDIS_KEY.GLOBAL_MATRIX_KEY);

    if (matrixValue === 'EMPTY_MATRIX') {
      // Convert from empty string to set format and add the key
      const pipeline = redis.pipeline();
      pipeline.del(REDIS_KEY.GLOBAL_MATRIX_KEY); // Remove the string
      pipeline.sadd(REDIS_KEY.GLOBAL_MATRIX_KEY, key); // Add as set
      pipeline.expire(REDIS_KEY.GLOBAL_MATRIX_KEY, MATRIX_TTL_SECONDS);
      await pipeline.exec();
    } else {
      // Matrix already exists as set - just add to it
      const pipeline = redis.pipeline();
      pipeline.sadd(REDIS_KEY.GLOBAL_MATRIX_KEY, key);
      pipeline.expire(REDIS_KEY.GLOBAL_MATRIX_KEY, MATRIX_TTL_SECONDS);
      await pipeline.exec();
    }

    // Invalidate cache entry and increment version
    globalCache.cache.delete(key);
    await incrementVersion();

    // Update stats
    const stats = await getMatrixStats();
    await updateMatrixStats({
      totalPairs: stats.totalPairs + 1,
    });

    log.debug(
      { userId1, userId2, key },
      '[GlobalIgnoreMatrix] Added ignore relationship',
    );
  } catch (error) {
    log.error(
      { error, userId1, userId2 },
      '[GlobalIgnoreMatrix] Failed to add ignore relationship',
    );
    throw error;
  }
};

/**
 * Remove ignore relationship from global matrix
 * Used when users unblock each other
 */
const removeIgnoreRelationship = async (
  userId1: string,
  userId2: string,
): Promise<void> => {
  try {
    const redis = RedisClient.get();
    const key = createIgnoreKey(userId1, userId2);

    // Remove from matrix and refresh TTL
    const pipeline = redis.pipeline();
    pipeline.srem(REDIS_KEY.GLOBAL_MATRIX_KEY, key);
    pipeline.expire(REDIS_KEY.GLOBAL_MATRIX_KEY, MATRIX_TTL_SECONDS);
    await pipeline.exec();

    // Check if the set is now empty and convert to empty matrix format if needed
    const setSize = await redis.scard(REDIS_KEY.GLOBAL_MATRIX_KEY);
    if (setSize === 0) {
      // Convert empty set to empty matrix string format
      await redis.del(REDIS_KEY.GLOBAL_MATRIX_KEY);
      await redis.setex(
        REDIS_KEY.GLOBAL_MATRIX_KEY,
        MATRIX_TTL_SECONDS,
        'EMPTY_MATRIX',
      );
    }

    // Invalidate cache entry and increment version
    globalCache.cache.delete(key);
    await incrementVersion();

    // Update stats
    const stats = await getMatrixStats();
    await updateMatrixStats({
      totalPairs: Math.max(0, stats.totalPairs - 1),
    });

    log.debug(
      { userId1, userId2, key },
      '[GlobalIgnoreMatrix] Removed ignore relationship',
    );
  } catch (error) {
    log.error(
      { error, userId1, userId2 },
      '[GlobalIgnoreMatrix] Failed to remove ignore relationship',
    );
    throw error;
  }
};

/**
 * Batch ignore checking for multiple user pairs with safe caching
 * More efficient than individual checks while maintaining memory safety
 */
const batchIsIgnored = async (
  userPairs: [string, string][],
): Promise<boolean[]> => {
  if (userPairs.length === 0) return [];

  try {
    // Check version once for the entire batch
    if (shouldCheckVersion()) {
      const currentVersion = await getCurrentVersion();
      if (currentVersion !== globalCache.version) {
        globalCache.cache.clear();
        globalCache.version = currentVersion;
      }
      globalCache.lastVersionCheck = Date.now();
    }

    const results: boolean[] = [];
    const uncachedPairs: {
      index: number;
      pair: [string, string];
      key: string;
    }[] = [];

    // First pass: check cache
    for (let i = 0; i < userPairs.length; i++) {
      const [userId1, userId2] = userPairs[i];
      const key = createIgnoreKey(userId1, userId2);
      const cacheEntry = globalCache.cache.get(key);

      if (cacheEntry && Date.now() - cacheEntry.timestamp < CACHE_TTL_MS) {
        results[i] = cacheEntry.value;
      } else {
        // Remove expired entry and mark for Redis lookup
        if (cacheEntry) {
          globalCache.cache.delete(key);
        }
        uncachedPairs.push({ index: i, pair: userPairs[i], key });
      }
    }

    // Second pass: batch Redis lookup for cache misses
    if (uncachedPairs.length > 0) {
      const redis = RedisClient.get();

      // Check what type of key we have in Redis
      const keyType = await redis.type(REDIS_KEY.GLOBAL_MATRIX_KEY);

      if (keyType === 'string') {
        // Matrix is stored as string (empty matrix case)
        const matrixValue = await redis.get(REDIS_KEY.GLOBAL_MATRIX_KEY);
        const isEmpty = matrixValue === 'EMPTY_MATRIX';

        uncachedPairs.forEach(({ index, key }) => {
          results[index] = !isEmpty; // false for empty matrix, true if unexpected string

          // Cache the result if we have space
          evictOldEntries();
          if (globalCache.cache.size < CACHE_MAX_SIZE) {
            globalCache.cache.set(key, {
              value: results[index],
              timestamp: Date.now(),
            });
          }
        });
      } else if (keyType === 'set') {
        // Matrix has data - use pipeline for batch sismember
        const pipeline = redis.pipeline();

        uncachedPairs.forEach(({ key }) => {
          pipeline.sismember(REDIS_KEY.GLOBAL_MATRIX_KEY, key);
        });

        const redisResults = await pipeline.exec();

        if (redisResults) {
          // Process Redis results and update cache
          evictOldEntries();

          for (let i = 0; i < uncachedPairs.length; i++) {
            const { index, key } = uncachedPairs[i];
            const [err, result] = redisResults[i];

            if (err) {
              log.warn(
                { error: err },
                '[GlobalIgnoreMatrix] Batch check error',
              );
              results[index] = false; // Fail open
            } else {
              const isIgnored = result === 1;
              results[index] = isIgnored;

              // Cache result if we have space
              if (globalCache.cache.size < CACHE_MAX_SIZE) {
                globalCache.cache.set(key, {
                  value: isIgnored,
                  timestamp: Date.now(),
                });
              }
            }
          }
        } else {
          // Pipeline failed - set all uncached to false
          uncachedPairs.forEach(({ index }) => {
            results[index] = false;
          });
        }
      } else {
        // Key doesn't exist or unknown type - all pairs return false
        uncachedPairs.forEach(({ index, key }) => {
          results[index] = false;

          // Cache the result if we have space
          evictOldEntries();
          if (globalCache.cache.size < CACHE_MAX_SIZE) {
            globalCache.cache.set(key, {
              value: false,
              timestamp: Date.now(),
            });
          }
        });
      }
    }

    return results;
  } catch (error) {
    log.warn(
      { error, pairCount: userPairs.length },
      '[GlobalIgnoreMatrix] Batch ignore check failed, defaulting to false',
    );
    return userPairs.map(() => false); // Fail open
  }
};

/**
 * Get matrix status and statistics
 */
const getMatrixStatus = async (): Promise<MatrixLookupResult> => {
  try {
    const isAvailable = await isMatrixValid();
    const version = await getCurrentVersion();
    const stats = await getMatrixStats();

    return {
      isAvailable,
      version,
      stats: { ...stats, version }, // Don't override isWarmedUp with isAvailable
    };
  } catch (error) {
    log.warn({ error }, '[GlobalIgnoreMatrix] Failed to get matrix status');

    return {
      isAvailable: false,
      version: 0,
      stats: {
        totalPairs: 0,
        lastWarmupDuration: 0,
        lastWarmupTimestamp: 0,
        version: 0,
        isWarmedUp: false,
      },
    };
  }
};

/**
 * Force refresh the matrix from database
 * Used for maintenance or when inconsistencies are detected
 */
const refreshMatrix = async (): Promise<MatrixLookupResult> => {
  log.info('[GlobalIgnoreMatrix] Force refreshing matrix');

  try {
    // Clear existing matrix
    const redis = RedisClient.get();
    await redis.del(REDIS_KEY.GLOBAL_MATRIX_KEY);

    // Rebuild from database
    await buildMatrixFromDatabase();

    // Increment version
    const newVersion = await incrementVersion();

    // Clear in-memory cache to ensure fresh data on next access
    globalCache.cache.clear();
    globalCache.version = newVersion;
    globalCache.lastVersionCheck = Date.now();

    // Update timestamp
    await redis.set(REDIS_KEY.GLOBAL_MATRIX_LAST_UPDATE_KEY, Date.now());

    const stats = await getMatrixStats();

    log.info(
      { version: newVersion },
      '[GlobalIgnoreMatrix] Matrix refresh completed',
    );

    return {
      isAvailable: true,
      version: newVersion,
      stats: { ...stats, version: newVersion, isWarmedUp: true },
    };
  } catch (error) {
    log.error({ error }, '[GlobalIgnoreMatrix] Matrix refresh failed');
    throw error;
  }
};

/**
 * Global ignore matrix service for O(1) ignore checking
 *
 * This service provides a global pre-computed ignore matrix that eliminates
 * the need for per-batch matrix building, improving performance from O(n²) to O(1).
 */
export const GlobalIgnoreMatrixService = {
  /** Initialize and warm up the global matrix - call during application startup */
  warmupMatrix,

  /** Batch ignore checking for multiple user pairs */
  batchIsIgnored,

  /** Add ignore relationship when users block each other */
  addIgnoreRelationship,

  /** Remove ignore relationship when users unblock each other */
  removeIgnoreRelationship,

  /** Get current matrix status and statistics */
  getMatrixStatus,

  /** Force refresh matrix from database - use for maintenance */
  refreshMatrix,
};

/**
 * Internal functions exposed for testing purposes only
 */
export const GlobalIgnoreMatrixServiceInternals = {
  /** Test ignore key creation with lexicographic ordering */
  createIgnoreKey,

  /** Test version management */
  getCurrentVersion,
  incrementVersion,

  /** Test lock management */
  acquireWarmupLock,
  releaseWarmupLock,

  /** Test matrix validation */
  isMatrixValid,

  /** Test statistics management */
  getMatrixStats,
  updateMatrixStats,

  /** Test matrix building from database */
  buildMatrixFromDatabase,

  /** Test cache management - for testing only */
  clearGlobalCache,

  /** Test ignore checking - for testing only */
  checkIgnoreRelationship: _checkIgnoreRelationship,
};
