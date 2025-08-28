import type { Server } from 'socket.io';
import type { Job } from 'bullmq';
import type { Maybe } from '@mono/common-dto';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { log } from '../../../../common/util/logger.js';
import { MatchmakingMetricsService } from '../metrics/MatchmakingMetricsService.js';
import type { MatchmakingProcessConfig } from '../../model/MatchmakingProcessConfig.js';
import type { QueueUser } from '../../model/QueueUser.js';
import { AtomicQueueService } from '../queue/AtomicQueueService.js';
import { MatchingAlgorithm } from '../match-prerequisite/MatchingAlgorithm.js';
import { AtomicAssignmentService } from '../assignment/AtomicAssignmentService.js';
import { SocketNotifications } from '../notification/SocketNotifications.js';
import { TimeUtils } from '../../util/TimeUtils.js';
import type { Match } from '../../model/Match.js';

const _recordMatchMetrics = (matches: Match[]) => {
  const exitTimeSeconds = TimeUtils.getCurrentTimeAsScore();
  const queueName = ServerConfigService.getConfig().config.serverRegion;

  for (const match of matches) {
    // Score contains the entry timestamp (in seconds)
    const user1EntryTime = match.user1.score;
    const user2EntryTime = match.user2.score;

    const user1DurationSeconds = Math.max(0, exitTimeSeconds - user1EntryTime);
    const user2DurationSeconds = Math.max(0, exitTimeSeconds - user2EntryTime);

    MatchmakingMetricsService.recordQueueExit(
      queueName,
      'matched',
      user1DurationSeconds,
    );

    MatchmakingMetricsService.recordQueueExit(
      queueName,
      'matched',
      user2DurationSeconds,
    );
  }
};

/**
 * Main processing function for random user matching with concurrency safety
 */
const processQueue = async (
  io: Server,
  config: MatchmakingProcessConfig,
  job: Job,
): Promise<{
  earlyReturnDuration: Maybe<number>;
  completeDuration: Maybe<number>;
  matchCount: number;
}> => {
  // Using performance.now() for high-precision metrics about job duration
  const startTime = performance.now();
  const workerId = job.data.workerId;

  let claimedUsers: QueueUser[] = [];

  try {
    // Step 1: Atomically claim users from queue
    claimedUsers = await AtomicQueueService.claimUsersFromQueue(
      config,
      workerId,
    );
    job.updateProgress(20);

    if (claimedUsers.length < 2) {
      // Clean up claims for single user
      await AtomicQueueService.releaseSpecificClaimedUsers(
        claimedUsers,
        workerId,
      );

      return {
        earlyReturnDuration: performance.now() - startTime,
        completeDuration: null,
        matchCount: 0,
      };
    }

    // Priority users first, then combine remaining
    const matches = MatchingAlgorithm.findMatches(claimedUsers);

    job.updateProgress(40);

    // Step 4: Process matches atomically
    if (matches.length > 0) {
      await AtomicAssignmentService.processMatchedUsers(
        matches,
        config.luaProcessingBatchSize,
      );

      job.updateProgress(60);

      SocketNotifications.notifyMatchedUsers(io, matches);

      _recordMatchMetrics(matches);

      job.updateProgress(75);
    }

    // Step 5: Separate matched and unmatched users
    const matchedUserIds = new Set(
      matches.flatMap(({ user1, user2 }) => [user1.userId, user2.userId]),
    );

    const unmatchedUsers = claimedUsers.filter(
      (user) => !matchedUserIds.has(user.userId),
    );
    const matchedUsers = claimedUsers.filter((user) =>
      matchedUserIds.has(user.userId),
    );

    // Step 6: Release unmatched users back to the queue
    if (unmatchedUsers.length > 0) {
      await AtomicQueueService.releaseSpecificClaimedUsers(
        unmatchedUsers,
        workerId,
      );
    }

    job.updateProgress(90);

    // Step 7: Complete processing (clean up claims for matched users only)
    if (matchedUsers.length > 0) {
      await AtomicQueueService.completeUserProcessing(matchedUsers, workerId);
    }

    job.updateProgress(100);

    return {
      completeDuration: performance.now() - startTime,
      earlyReturnDuration: null,
      matchCount: matches.length,
    };
  } catch (error) {
    log.error(
      { error, workerId, claimedUsersCount: claimedUsers.length },
      'Critical error in matchmaking processing',
    );

    // Release claimed users back to queue for retry
    try {
      const releasedCount =
        await AtomicQueueService.releaseClaimedUsers(workerId);
      log.info(
        { releasedCount, workerId },
        'Released claimed users back to queue',
      );
    } catch (releaseError) {
      log.error({ releaseError, workerId }, 'Failed to release claimed users');
    }

    throw error; // Ensure errors are propagated to job framework
  }
};

export const MatchmakingOrchestrator = {
  processQueue,
};
