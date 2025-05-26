import type { Server } from 'socket.io';
import type { MatchmakingConfig } from '../model/MatchmakingConfig.js';
import { IgnoredUsersService } from './IgnoredUsersService.js';
import { QueueOperations } from './QueueOperations.js';
import { MatchingAlgorithm } from './MatchingAlgorithm.js';
import { RedisOperations } from './RedisOperations.js';
import { SocketNotifications } from './SocketNotifications.js';
import { PerformanceMetrics } from './PerformanceMetrics.js';

/**
 * Main processing function for random user matching
 * Optimized for speed and simplicity
 */
const processQueue = async (
  io: Server,
  config: MatchmakingConfig,
): Promise<void> => {
  const metrics = PerformanceMetrics.createInitialMetrics();

  try {
    // Step 1: Fetch users from queue (already sorted by wait time)
    const queueUsers = await QueueOperations.fetchQueueBatch(config);
    metrics.usersProcessed = queueUsers.length;
    metrics.redisOperations += 1;

    if (queueUsers.length < 2) {
      const finalMetrics = PerformanceMetrics.finalizeMetrics(metrics);
      PerformanceMetrics.logPerformanceMetrics(
        finalMetrics,
        'Insufficient users for matching',
      );
      return;
    }

    // Step 2: Get ignored pairs using optimized service with adaptive user prioritization
    const userIds = queueUsers.map((user) => user.userId);
    const ignoreInfo = await IgnoredUsersService.getOptimizedIgnoreInfo(
      userIds,
      queueUsers,
    );
    metrics.redisOperations += ignoreInfo.metrics.cacheHits > 0 ? 1 : 0; // Only count Redis ops if cache was accessed
    if (ignoreInfo.metrics.dbQueries > 0) {
      metrics.redisOperations += 1; // Cache update operation
    }
    metrics.ignoredPairsChecked =
      ignoreInfo.metrics.cacheHits + ignoreInfo.metrics.cacheMisses;

    // Step 3: High-performance prioritized matching with single-pass optimization
    const priorityUserSet = new Set(ignoreInfo.priorityUsers);
    const priorityQueueUsers: typeof queueUsers = [];
    const deprioritizedQueueUsers: typeof queueUsers = [];

    // Single-pass O(n) user categorization with O(1) Set lookups
    for (const user of queueUsers) {
      if (priorityUserSet.has(user.userId)) {
        priorityQueueUsers.push(user);
      } else {
        deprioritizedQueueUsers.push(user);
      }
    }

    // Optimized matching: priority users first, then combine all remaining
    const matches = MatchingAlgorithm.findOptimizedMatches(
      [...priorityQueueUsers, ...deprioritizedQueueUsers],
      ignoreInfo.ignoreMatrix,
    );
    metrics.matchesCreated = matches.length;

    // Step 4: Process matches atomically
    if (matches.length > 0) {
      await RedisOperations.processMatchedUsers(
        matches,
        config.luaProcessingBatchSize,
        metrics,
      );

      SocketNotifications.notifyMatchedUsers(io, matches);
    }

    const finalMetrics = PerformanceMetrics.finalizeMetrics(metrics);

    // Check if processing was slow based on configuration
    const isSlowProcessing =
      config.performance.enableMetrics &&
      finalMetrics.processTimeMs > config.performance.slowProcessingThreshold;

    const statusMessage = isSlowProcessing
      ? `Processing completed successfully (slow: ${finalMetrics.processTimeMs}ms > ${config.performance.slowProcessingThreshold}ms threshold)`
      : 'Processing completed successfully';

    if (config.performance.enableMetrics) {
      PerformanceMetrics.logPerformanceMetrics(finalMetrics, statusMessage);
    }
  } catch (error) {
    const finalMetrics = PerformanceMetrics.finalizeMetrics(metrics);
    PerformanceMetrics.logPerformanceMetrics(
      finalMetrics,
      `Critical error: ${error}`,
    );
    throw error; // Ensure errors are propagated to job framework
  }
};

export const MatchmakingOrchestrator = {
  processQueue,
};
