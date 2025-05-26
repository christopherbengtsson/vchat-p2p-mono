import type { Server } from 'socket.io';
import { log } from '../../../common/util/logger.js';
import type { MatchmakingConfig } from '../model/MatchmakingConfig.js';
import { IgnoredUsersService } from './IgnoredUsersService.js';
import { QueueOperations } from './QueueOperations.js';
import { MatchingAlgorithm } from './MatchingAlgorithm.js';
import { RedisOperations } from './RedisOperations.js';
import { SocketNotifications } from './SocketNotifications.js';

/**
 * Main processing function for random user matching
 * Optimized for speed and simplicity
 */
const processQueue = async (
  io: Server,
  config: MatchmakingConfig,
): Promise<void> => {
  try {
    // Step 1: Fetch users from queue (already sorted by wait time)
    const queueUsers = await QueueOperations.fetchQueueBatch(config);

    if (queueUsers.length < 2) {
      return;
    }

    // Step 2: Get ignored pairs using adaptive user prioritization
    const userIds = queueUsers.map((user) => user.userId);
    const ignoreInfo = await IgnoredUsersService.getIgnoreInfo(
      userIds,
      queueUsers,
    );

    // Step 3: Prioritized matching
    const priorityUserSet = new Set(ignoreInfo.priorityUsers);
    const priorityQueueUsers: typeof queueUsers = [];
    const deprioritizedQueueUsers: typeof queueUsers = [];

    for (const user of queueUsers) {
      if (priorityUserSet.has(user.userId)) {
        priorityQueueUsers.push(user);
      } else {
        deprioritizedQueueUsers.push(user);
      }
    }

    // Priority users first, then combine all remaining
    const matches = MatchingAlgorithm.findOptimizedMatches(
      [...priorityQueueUsers, ...deprioritizedQueueUsers],
      ignoreInfo.ignoreMatrix,
    );

    // Step 4: Process matches atomically
    if (matches.length > 0) {
      await RedisOperations.processMatchedUsers(
        matches,
        config.luaProcessingBatchSize,
      );

      SocketNotifications.notifyMatchedUsers(io, matches);
    }
  } catch (error) {
    log.error(`Critical error: ${error}`);
    throw error; // Ensure errors are propagated to job framework
  }
};

export const MatchmakingOrchestrator = {
  processQueue,
};
