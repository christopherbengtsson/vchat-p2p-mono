// TODO: zod schema, should be configurable
export interface MatchmakingConfig {
  /** Number of users to fetch from Redis queue per processing cycle */
  batchSize: number;

  /** Batch size for Redis Lua script atomic operations */
  luaProcessingBatchSize: number;
}
