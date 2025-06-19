import type { MatchmakingProcessConfig } from '../model/MatchmakingProcessConfig.js';

// TODO: Get config from zod schema
export const matchmakingProcessConfig: MatchmakingProcessConfig = {
  batchSize: 50, // Process 50 users max per cycle (25 potential matches)
  luaProcessingBatchSize: 25, // Process 25 matches per Lua script call
} as const;
