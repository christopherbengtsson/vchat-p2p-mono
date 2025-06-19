import { log } from '../../../../common/util/logger.js';
import { IgnoreSystemMetricsService } from '../metrics/IgnoreSystemMetricsService.js';
import { GlobalIgnoreMatrixService } from '../match-prerequisite/GlobalIgnoreMatrixService.js';
import { MATCHMAKING_JOB } from '../../model/MatchmakingJob.js';

const ignoreCacheHealthCheckMonitoring = async () => {
  const startTime = performance.now();

  try {
    // Record cache health metrics
    await IgnoreSystemMetricsService.recordCacheHealthMetrics();

    // Record bloom filter detailed metrics
    await IgnoreSystemMetricsService.recordBloomFilterMetrics();

    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.IGNORE_CACHE_HEALTH_CHECK,
      'success',
      duration,
    );

    log.info(
      { duration },
      '[IgnoreSystemMonitoring] Cache health check completed',
    );
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.IGNORE_CACHE_HEALTH_CHECK,
      'error',
      duration,
    );

    log.error(
      { error, duration },
      '[IgnoreSystemMonitoring] Cache health check failed',
    );

    throw error; // Propagate error to BullMQ
  }
};

const globalMatrixHealthCheckMonitoring = async () => {
  const startTime = performance.now();

  try {
    const status = await GlobalIgnoreMatrixService.getMatrixStatus();

    // Record metrics using the metrics service
    IgnoreSystemMetricsService.recordGlobalMatrixHealthMetrics(status);

    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.GLOBAL_MATRIX_HEALTH_CHECK,
      'success',
      duration,
    );

    // Log summary for debugging/alerting
    const healthSummary = {
      isAvailable: status.isAvailable,
      version: status.version,
      totalPairs: status.stats.totalPairs,
      isWarmedUp: status.stats.isWarmedUp,
      timeSinceWarmup: Date.now() - status.stats.lastWarmupTimestamp,
      lastWarmupDuration: status.stats.lastWarmupDuration,
    };

    log.info(
      { healthSummary, duration },
      '[IgnoreSystemMonitoring] Global matrix health check completed',
    );

    // Alert on degraded state
    if (!status.isAvailable || !status.stats.isWarmedUp) {
      log.warn(
        { status },
        '[IgnoreSystemMonitoring] Global matrix in degraded state',
      );
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.GLOBAL_MATRIX_HEALTH_CHECK,
      'error',
      duration,
    );

    log.error(
      { error, duration },
      '[IgnoreSystemMonitoring] Global matrix health check failed',
    );

    throw error; // Propagate error to BullMQ
  }
};

export const MonitoringJobEntry = {
  ignoreCacheHealthCheckMonitoring,
  globalMatrixHealthCheckMonitoring,
};
