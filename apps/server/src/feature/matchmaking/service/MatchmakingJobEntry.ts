import type { Server } from 'socket.io';
import type { JobEntryPoint } from '../../job/model/JobEntryPoint.js';
import type { MatchmakingConfig } from '../model/MatchmakingConfig.js';
import { MatchmakingOrchestrator } from './MatchmakingOrchestrator.js';

const _defaultMatchmakingConfig: MatchmakingConfig = {
  // Optimized for 2 vCPU / 4GB RAM VPS server (159.69.91.6)
  batchSize: 50, // Increased from 40 - process 50 users max per cycle (25 potential matches)
  luaProcessingBatchSize: 25, // Increased from 20 - process 25 matches per Lua script call
  performance: {
    enableMetrics: true,
    slowProcessingThreshold: 1500, // Reduced from 2000ms - more aggressive monitoring
  },
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
