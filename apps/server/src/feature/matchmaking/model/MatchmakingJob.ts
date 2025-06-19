export const MATCHMAKING_JOB = {
  PROCESS_QUEUE: 'matchmaking:process-queue',

  // Cleanups
  CLEANUP_EXPIRED: 'matchmaking:cleanup-expired',
  CLEANUP_STALE: 'matchmaking:cleanup-stale',
  CLEANUP_ORPHANED: 'matchmaking:cleanup-orphaned',
  CLEANUP_LOST: 'matchmaking:cleanup-lost',

  // Maintenance
  OPTIMIZE_BLOOM_FILTER: 'matchmaking:optimize-bloom-filter',
  WARMUP_GLOBAL_MATRIX: 'matchmaking:warmup-global-matrix',
  REFRESH_GLOBAL_MATRIX: 'matchmaking:refresh-global-matrix',

  // Monitoring
  IGNORE_CACHE_HEALTH_CHECK: 'matchmaking:ignore-cache-health-check',
  GLOBAL_MATRIX_HEALTH_CHECK: 'matchmaking:global-matrix-health-check',
} as const;

export type MatchmakingJob =
  (typeof MATCHMAKING_JOB)[keyof typeof MATCHMAKING_JOB];
