export const MATCHMAKING_JOB = {
  PROCESS_QUEUE: 'matchmaking:process-queue',

  // Cleanups
  CLEANUP_EXPIRED: 'matchmaking:cleanup-expired',
  CLEANUP_STALE: 'matchmaking:cleanup-stale',
  CLEANUP_ORPHANED: 'matchmaking:cleanup-orphaned',
  CLEANUP_LOST: 'matchmaking:cleanup-lost',
} as const;

export type MatchmakingJob =
  (typeof MATCHMAKING_JOB)[keyof typeof MATCHMAKING_JOB];
