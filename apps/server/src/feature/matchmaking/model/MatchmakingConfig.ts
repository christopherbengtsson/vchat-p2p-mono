export interface MatchmakingConfig {
  /** Number of users to fetch from Redis queue per processing cycle */
  batchSize: number;

  /** Batch size for Redis Lua script atomic operations */
  luaProcessingBatchSize: number;

  /** Performance monitoring configuration */
  performance: {
    /** Enable detailed performance metrics collection */
    enableMetrics: boolean;
    /** Log processing times above this threshold (ms) */
    slowProcessingThreshold: number;
  };
}
