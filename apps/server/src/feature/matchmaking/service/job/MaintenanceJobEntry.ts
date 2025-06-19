import { log } from '../../../../common/util/logger.js';
import { IgnoreSystemMetricsService } from '../metrics/IgnoreSystemMetricsService.js';
import { GlobalIgnoreMatrixService } from '../match-prerequisite/GlobalIgnoreMatrixService.js';
import { IgnoredUsersService } from '../match-prerequisite/IgnoredUsersService.js';
import { MATCHMAKING_JOB } from '../../model/MatchmakingJob.js';

const optimizeBloomFilterMaintenance = async () => {
  const startTime = performance.now();

  try {
    await IgnoredUsersService.optimizeBloomFilterCapacity();

    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordMaintenanceOperation(
      MATCHMAKING_JOB.OPTIMIZE_BLOOM_FILTER,
      'success',
      duration,
    );

    log.info(
      { duration },
      '[IgnoreSystemMaintenance] Bloom filter optimization completed',
    );
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordMaintenanceOperation(
      MATCHMAKING_JOB.OPTIMIZE_BLOOM_FILTER,
      'error',
      duration,
    );

    log.error(
      { error, duration },
      '[IgnoreSystemMaintenance] Bloom filter optimization failed',
    );

    throw error; // Propagate error to BullMQ
  }
};

const warmupGlobalMatrixMaintenance = async () => {
  const startTime = performance.now();

  try {
    const status = await GlobalIgnoreMatrixService.getMatrixStatus();
    const needsWarmup =
      !status.isAvailable ||
      !status.stats.isWarmedUp ||
      Date.now() - status.stats.lastWarmupTimestamp > 3600000; // 1 hour

    if (needsWarmup) {
      const warmupResult = await GlobalIgnoreMatrixService.warmupMatrix();

      const duration = performance.now() - startTime;

      IgnoreSystemMetricsService.recordMaintenanceOperation(
        MATCHMAKING_JOB.WARMUP_GLOBAL_MATRIX,
        'success',
        duration,
        {
          pairs_loaded: warmupResult.stats.totalPairs,
          version: warmupResult.version,
        },
      );

      log.info(
        {
          duration,
          pairsLoaded: warmupResult.stats.totalPairs,
          version: warmupResult.version,
        },
        '[IgnoreSystemMaintenance] Global matrix warmup completed',
      );
    } else {
      const duration = performance.now() - startTime;

      log.info(
        { duration },
        '[IgnoreSystemMaintenance] Global matrix warmup skipped (not needed)',
      );
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordMaintenanceOperation(
      MATCHMAKING_JOB.WARMUP_GLOBAL_MATRIX,
      'error',
      duration,
    );

    log.error(
      { error, duration },
      '[IgnoreSystemMaintenance] Global matrix warmup failed',
    );

    throw error; // Propagate error to BullMQ
  }
};

const refreshGlobalIgnoreMatrixMaintenance = async () => {
  const startTime = performance.now();

  try {
    const status = await GlobalIgnoreMatrixService.getMatrixStatus();
    const isOld = Date.now() - status.stats.lastWarmupTimestamp > 7200000; // 2 hours

    if (isOld || !status.isAvailable) {
      const refreshResult = await GlobalIgnoreMatrixService.refreshMatrix();

      const duration = performance.now() - startTime;

      IgnoreSystemMetricsService.recordMaintenanceOperation(
        MATCHMAKING_JOB.REFRESH_GLOBAL_MATRIX,
        'success',
        duration,
        {
          pairs_loaded: refreshResult.stats.totalPairs,
          version: refreshResult.version,
        },
      );

      log.info(
        {
          duration,
          pairsLoaded: refreshResult.stats.totalPairs,
          version: refreshResult.version,
        },
        '[IgnoreSystemMaintenance] Global matrix refresh completed',
      );
    } else {
      const duration = performance.now() - startTime;

      log.info(
        { duration },
        '[IgnoreSystemMaintenance] Global matrix refresh skipped (not needed)',
      );
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordMaintenanceOperation(
      MATCHMAKING_JOB.REFRESH_GLOBAL_MATRIX,
      'error',
      duration,
    );

    log.error(
      { error, duration },
      '[IgnoreSystemMaintenance] Global matrix refresh failed',
    );

    throw error; // Propagate error to BullMQ
  }
};

export const MaintenanceJobEntry = {
  optimizeBloomFilterMaintenance,
  warmupGlobalMatrixMaintenance,
  refreshGlobalIgnoreMatrixMaintenance,
};
