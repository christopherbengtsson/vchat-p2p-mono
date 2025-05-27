import { log } from '../../../common/util/logger.js';
import type { ProcessingMetrics } from '../model/ProcessingMetrics.js';

/**
 * Logs comprehensive performance metrics with granular thresholds
 * - < 10ms: Excellent (debug)
 * - 10-50ms: Good (debug)
 * - 50-200ms: Acceptable but notable (info)
 * - 200-500ms: Slow, needs attention (warn)
 * - > 500ms: Critical performance issue (error)
 */
const logPerformanceMetrics = (
  metrics: ProcessingMetrics,
  status: string,
): void => {
  const { processTimeMs } = metrics;

  let logLevel: 'debug' | 'info' | 'warn' | 'error';
  let performanceCategory: string;

  if (processTimeMs < 10) {
    logLevel = 'debug';
    performanceCategory = 'excellent';
  } else if (processTimeMs < 50) {
    logLevel = 'debug';
    performanceCategory = 'good';
  } else if (processTimeMs < 200) {
    logLevel = 'info';
    performanceCategory = 'acceptable';
  } else if (processTimeMs < 500) {
    logLevel = 'warn';
    performanceCategory = 'slow';
  } else {
    logLevel = 'error';
    performanceCategory = 'critical';
  }

  if (metrics.usersProcessed > 1) {
    log[logLevel](
      {
        status,
        processTimeMs: metrics.processTimeMs,
        performanceCategory,
        usersProcessed: metrics.usersProcessed,
        matchesCreated: metrics.matchesCreated,
        redisOperations: metrics.redisOperations,
        ignoredPairsChecked: metrics.ignoredPairsChecked,
        efficiency:
          metrics.usersProcessed > 0
            ? Math.min(
                100,
                Math.round(
                  ((metrics.matchesCreated * 2) / metrics.usersProcessed) * 100,
                ),
              )
            : 0,
        efficiencyPercent: `${
          metrics.usersProcessed > 0
            ? Math.min(
                100,
                Math.round(
                  ((metrics.matchesCreated * 2) / metrics.usersProcessed) * 100,
                ),
              )
            : 0
        }%`,
      },
      '[MatchmakingProcessor] Performance metrics',
    );
  }
};

/**
 * Creates initial metrics object for tracking performance
 */
const createInitialMetrics = (): ProcessingMetrics => ({
  startTime: Date.now(),
  usersProcessed: 0,
  matchesCreated: 0,
  redisOperations: 0,
  ignoredPairsChecked: 0,
  processTimeMs: 0,
});

/**
 * Finalizes metrics with process time calculation
 */
const finalizeMetrics = (metrics: ProcessingMetrics): ProcessingMetrics => ({
  ...metrics,
  processTimeMs: Date.now() - metrics.startTime,
});

export const PerformanceMetrics = {
  logPerformanceMetrics,
  createInitialMetrics,
  finalizeMetrics,
};
