export interface ProcessingMetrics {
  startTime: number;
  usersProcessed: number;
  matchesCreated: number;
  redisOperations: number;
  ignoredPairsChecked: number;
  processTimeMs: number;
}
