export interface MatchmakingProcessorOptions {
  /** Interval for processing matches in milliseconds. */
  interval: number;
  /** Number of users to process in a single batch. */
  batchSize: number;
  /** Number of segments to divide the user queue for processing. */
  segmentCount: number;
  /** Maximum number of users to look ahead for potential pairs. */
  maxLookAhead: number;
  /** Minimum number of users required for tiered bucketing. */
  minUsersForTieredBucketing?: number;
  /** Maximum number of users allowed in each wait-time bucket. */
  bucketSizeLimits: {
    critical: number;
    high: number;
    medium: number;
    normal: number;
  };
  /** Optional: Batch size for processing matches using Lua script. */
  luaProcessingBatchSize?: number;
  /** Optional: Maximum time a user can wait in the queue in seconds before being considered stale. */
  maxUserWaitTimeInQueueSeconds?: number;
  /** Optional: Max points a user's wait time contributes to compatibility score. */
  maxWaitTimeScorePoints?: number;
  /** Optional: Seconds of waiting required to earn 1 point in compatibility score. */
  secondsPerWaitScorePoint?: number;

  // Locking
  /** Duration for holding Redis locks in milliseconds. */
  lockDuration: number;

  // Data & Cache Management
  /** Time-to-live for match data in Redis in seconds. */
  matchDataTTL: number;
  /** Time-to-live for the compatibility cache in milliseconds. */
  compabilityCacheTtlMS: number;

  // Cleanup Tasks
  /** Interval for cleaning up zombie matches and orphaned locks in milliseconds. */
  cleanupInterval: number;
  /** Optional: Count for HSCAN command during zombie cleanup. */
  hscanCountForCleanup?: number;
}
