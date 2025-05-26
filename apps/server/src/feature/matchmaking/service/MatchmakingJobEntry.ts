import type { Server } from 'socket.io';
import type { JobEntryPoint } from '../../job/model/JobEntryPoint.js';
import type { MatchmakingConfig } from '../model/MatchmakingConfig.js';
import { MatchmakingOrchestrator } from './MatchmakingOrchestrator.js';

// TODO: Get config from zod schema
const _defaultMatchmakingConfig: MatchmakingConfig = {
  batchSize: 50, // Process 50 users max per cycle (25 potential matches)
  luaProcessingBatchSize: 25, // Process 25 matches per Lua script call
};

/**
 * Matchmaking job entry point
 */
const create =
  (
    io: Server,
    config: MatchmakingConfig = _defaultMatchmakingConfig,
  ): JobEntryPoint =>
  async () =>
    MatchmakingOrchestrator.processQueue(io, config);

export const MatchMakingJobEntry = {
  create,

  // For testing purposes
  _defaultMatchmakingConfig,
};
