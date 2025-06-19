import { Gauge, Counter, Histogram, register } from 'prom-client';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import { log } from '../../../../common/util/logger.js';
import type { MatchmakingJob } from '../../model/MatchmakingJob.js';

// Gauge for ignore cache health metrics
const ignoreCacheHealthGauge = new Gauge({
  name: 'ignore_cache_health',
  help: 'Health metrics for the ignore cache system',
  labelNames: ['metric_type', 'cache_type'] as const,
  registers: [register],
});

// Gauge for global matrix health metrics
const globalMatrixHealthGauge = new Gauge({
  name: 'global_ignore_matrix_health',
  help: 'Health metrics for the global ignore matrix',
  labelNames: ['metric_type'] as const,
  registers: [register],
});

// Gauge for bloom filter metrics
const bloomFilterMetricsGauge = new Gauge({
  name: 'ignore_bloom_filter_metrics',
  help: 'Metrics for the ignore bloom filter',
  labelNames: ['metric_type'] as const,
  registers: [register],
});

// Counter for cleanup operations
const cleanupOperationsCounter = new Counter({
  name: 'ignore_system_cleanup_operations_total',
  help: 'Total number of cleanup operations performed',
  labelNames: ['jobName', 'status'] as const,
  registers: [register],
});

// Histogram for cleanup operation durations
const cleanupDurationHistogram = new Histogram({
  name: 'ignore_system_cleanup_duration_seconds',
  help: 'Duration of cleanup operations in seconds',
  labelNames: ['jobName'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // 10ms to 10s
  registers: [register],
});

/**
 * Record cache health metrics
 */
const recordCacheHealthMetrics = async (): Promise<void> => {
  try {
    const redis = RedisClient.get();

    // Count individual cache entries
    const cacheKeys = await redis.keys('ignore_list:*');
    const cacheEntryCount = cacheKeys.length;

    // Check cache activity tracking
    const activityCount = await redis.zcard('ignore_cache_activity');

    // Check pending invalidations
    const pendingInvalidations = await redis.scard(
      'ignore_invalidations_pending',
    );

    // Check bloom filter existence
    const bloomFilterExists = await redis.exists('ignore_bloom_filter');

    // Record metrics
    ignoreCacheHealthGauge
      .labels({ metric_type: 'entry_count', cache_type: 'individual' })
      .set(cacheEntryCount);

    ignoreCacheHealthGauge
      .labels({ metric_type: 'activity_count', cache_type: 'tracking' })
      .set(activityCount);

    ignoreCacheHealthGauge
      .labels({
        metric_type: 'pending_invalidations',
        cache_type: 'invalidation',
      })
      .set(pendingInvalidations);

    bloomFilterMetricsGauge
      .labels({ metric_type: 'exists' })
      .set(bloomFilterExists ? 1 : 0);

    log.debug(
      {
        cacheEntryCount,
        activityCount,
        pendingInvalidations,
        bloomFilterExists: Boolean(bloomFilterExists),
      },
      '[IgnoreSystemMetrics] Recorded cache health metrics',
    );
  } catch (error) {
    log.error(
      { error },
      '[IgnoreSystemMetrics] Failed to record cache health metrics',
    );
  }
};

/**
 * Record global matrix health metrics
 */
const recordGlobalMatrixHealthMetrics = (matrixStatus: {
  isAvailable: boolean;
  version: number;
  stats: {
    totalPairs: number;
    lastWarmupDuration: number;
    lastWarmupTimestamp: number;
    isWarmedUp: boolean;
  };
}): void => {
  try {
    globalMatrixHealthGauge
      .labels({ metric_type: 'available' })
      .set(matrixStatus.isAvailable ? 1 : 0);

    globalMatrixHealthGauge
      .labels({ metric_type: 'version' })
      .set(matrixStatus.version);

    globalMatrixHealthGauge
      .labels({ metric_type: 'total_pairs' })
      .set(matrixStatus.stats.totalPairs);

    globalMatrixHealthGauge
      .labels({ metric_type: 'warmup_duration_ms' })
      .set(matrixStatus.stats.lastWarmupDuration);

    globalMatrixHealthGauge
      .labels({ metric_type: 'warmed_up' })
      .set(matrixStatus.stats.isWarmedUp ? 1 : 0);

    // Calculate time since last warmup
    const timeSinceWarmup = Date.now() - matrixStatus.stats.lastWarmupTimestamp;
    globalMatrixHealthGauge
      .labels({ metric_type: 'time_since_warmup_ms' })
      .set(timeSinceWarmup);

    log.debug(
      {
        isAvailable: matrixStatus.isAvailable,
        version: matrixStatus.version,
        totalPairs: matrixStatus.stats.totalPairs,
        timeSinceWarmup,
      },
      '[IgnoreSystemMetrics] Recorded global matrix health metrics',
    );
  } catch (error) {
    log.error(
      { error },
      '[IgnoreSystemMetrics] Failed to record global matrix health metrics',
    );
  }
};

/**
 * Record bloom filter detailed metrics
 */
const recordBloomFilterMetrics = async (): Promise<void> => {
  try {
    const redis = RedisClient.get();

    const filterExists = await redis.exists('ignore_bloom_filter');
    if (!filterExists) {
      bloomFilterMetricsGauge.labels({ metric_type: 'capacity' }).set(0);
      bloomFilterMetricsGauge.labels({ metric_type: 'size' }).set(0);
      bloomFilterMetricsGauge
        .labels({ metric_type: 'utilization_percent' })
        .set(0);
      return;
    }

    // Get bloom filter info
    const info = (await redis.call(
      'BF.INFO',
      'ignore_bloom_filter',
    )) as string[];
    const infoMap = new Map<string, string | number>();
    for (let i = 0; i < info.length; i += 2) {
      infoMap.set(info[i], info[i + 1]);
    }

    const capacity = (infoMap.get('Capacity') as number) || 0;
    const size = (infoMap.get('Size') as number) || 0;
    const utilization = capacity > 0 ? (size / capacity) * 100 : 0;

    bloomFilterMetricsGauge.labels({ metric_type: 'capacity' }).set(capacity);
    bloomFilterMetricsGauge.labels({ metric_type: 'size' }).set(size);
    bloomFilterMetricsGauge
      .labels({ metric_type: 'utilization_percent' })
      .set(utilization);

    log.debug(
      {
        capacity,
        size,
        utilization: Math.round(utilization * 100) / 100,
      },
      '[IgnoreSystemMetrics] Recorded bloom filter metrics',
    );
  } catch (error) {
    // This might fail if Redis doesn't have bloom filter module
    log.debug(
      { error },
      '[IgnoreSystemMetrics] Could not record bloom filter metrics (module may not be available)',
    );
    bloomFilterMetricsGauge.labels({ metric_type: 'capacity' }).set(0);
    bloomFilterMetricsGauge.labels({ metric_type: 'size' }).set(0);
    bloomFilterMetricsGauge
      .labels({ metric_type: 'utilization_percent' })
      .set(0);
  }
};

/**
 * Record cleanup operation metrics
 * @param jobName - Name of the cleanup job
 * @param status - Status of the operation (success/error)
 * @param durationMs - Duration in milliseconds (from performance.now())
 * @param itemsProcessed - Optional count of items processed
 */
const recordCleanupOperation = (
  jobName: MatchmakingJob,
  status: 'success' | 'error',
  durationMs: number,
  itemsProcessed?: number,
): void => {
  try {
    cleanupOperationsCounter.labels({ jobName, status }).inc();
    cleanupDurationHistogram.labels({ jobName }).observe(durationMs / 1000);

    if (itemsProcessed !== undefined) {
      ignoreCacheHealthGauge
        .labels({
          metric_type: 'last_cleanup_items',
          cache_type: jobName,
        })
        .set(itemsProcessed);
    }

    log.debug(
      {
        job: jobName,
        status,
        durationMs,
        itemsProcessed,
      },
      '[IgnoreSystemMetrics] Recorded cleanup operation metrics',
    );
  } catch (error) {
    log.error(
      { error },
      '[IgnoreSystemMetrics] Failed to record cleanup operation metrics',
    );
  }
};

/**
 * Record maintenance operation metrics
 * @param jobName - Name of the maintenance job
 * @param status - Status of the operation (success/error)
 * @param durationMs - Duration in milliseconds (from performance.now())
 * @param additionalData - Optional additional metrics data
 */
const recordMaintenanceOperation = (
  jobName: MatchmakingJob,
  status: 'success' | 'error',
  durationMs: number,
  additionalData?: Record<string, number>,
): void => {
  try {
    cleanupOperationsCounter.labels({ jobName, status }).inc();

    cleanupDurationHistogram.labels({ jobName }).observe(durationMs / 1000);

    // Record additional data as separate metrics
    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        globalMatrixHealthGauge
          .labels({ metric_type: `${jobName}_${key}` })
          .set(value);
      }
    }

    log.debug(
      {
        jobName,
        status,
        durationMs,
        additionalData,
      },
      '[IgnoreSystemMetrics] Recorded maintenance operation metrics',
    );
  } catch (error) {
    log.error(
      { error },
      '[IgnoreSystemMetrics] Failed to record maintenance operation metrics',
    );
  }
};

export const IgnoreSystemMetricsService = {
  recordCacheHealthMetrics,
  recordGlobalMatrixHealthMetrics,
  recordBloomFilterMetrics,
  recordCleanupOperation,
  recordMaintenanceOperation,
};
