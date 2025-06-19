import { RedisClient } from '../../../../common/client/RedisClient.js';
import { log } from '../../../../common/util/logger.js';
import { REDIS_KEY } from '../../model/RedisKey.js';
import { MATCHMAKING_JOB } from '../../model/MatchmakingJob.js';
import { AtomicQueueService } from '../queue/AtomicQueueService.js';
import { QueueService } from '../queue/QueueService.js';
import { IgnoreSystemMetricsService } from '../metrics/IgnoreSystemMetricsService.js';

const expiredMatchesCleanup = async () => {
  const redis = RedisClient.get();
  const assignmentKey = REDIS_KEY.MATCH_ASSIGNMENT_KEY;
  const startTime = performance.now();

  try {
    // Get all current assignments
    const assignments = await redis.hgetall(assignmentKey);
    const expiredKeys: string[] = [];

    // Check for assignments older than 10 minutes (matches should complete faster)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    for (const [socketId, assignmentData] of Object.entries(assignments)) {
      try {
        const assignment = JSON.parse(assignmentData);
        // If assignment doesn't have a timestamp, consider it old
        if (!assignment.createdAt || assignment.createdAt < tenMinutesAgo) {
          expiredKeys.push(socketId);
        }
      } catch {
        // Invalid JSON, mark for cleanup
        expiredKeys.push(socketId);
      }
    }

    if (expiredKeys.length > 0) {
      await redis.hdel(assignmentKey, ...expiredKeys);
      log.info(
        {
          expiredCount: expiredKeys.length,
        },
        '[MatchmakingCleanup] Cleaned up expired match assignments',
      );
    }

    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.CLEANUP_EXPIRED,
      'success',
      duration,
      expiredKeys.length,
    );
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.CLEANUP_EXPIRED,
      'error',
      duration,
    );

    log.error(
      { error },
      '[MatchmakingCleanup] Failed to clean expired matches',
    );

    throw error; // Propagate error to BullMQ
  }
};

const staleConnectionsCleanup = async () => {
  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}:processing`;
  const startTime = performance.now();

  try {
    // Find all processing claims
    const claimKeys = await redis.keys(`${processingKey}:*`);
    const staleKeys: string[] = [];

    // Check TTL on each claim - if TTL is -1 (no expiry) or -2 (doesn't exist), it's stale
    for (const claimKey of claimKeys) {
      const ttl = await redis.ttl(claimKey);
      if (ttl === -1 || ttl === -2) {
        staleKeys.push(claimKey);
      }
    }

    if (staleKeys.length > 0) {
      await redis.del(...staleKeys);
      log.info(
        {
          staleCount: staleKeys.length,
        },
        '[MatchmakingCleanup] Cleaned up stale processing claims',
      );
    }

    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.CLEANUP_STALE,
      'success',
      duration,
      staleKeys.length,
    );
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.CLEANUP_STALE,
      'error',
      duration,
    );

    log.error(
      {
        error,
      },
      '[MatchmakingCleanup] Failed to clean stale connections',
    );

    throw error; // Propagate error to BullMQ
  }
};

const orphanedClaimsCleanup = async () => {
  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}:processing`;
  const startTime = performance.now();

  try {
    // Find processing claims that have been expired for a while (orphaned)
    const claimKeys = await redis.keys(`${processingKey}:*`);
    const orphanedKeys: string[] = [];

    for (const claimKey of claimKeys) {
      const ttl = await redis.ttl(claimKey);
      // If key has no TTL or has been expired (TTL = -2), it's orphaned
      if (ttl === -2) {
        orphanedKeys.push(claimKey);
      }
    }

    if (orphanedKeys.length > 0) {
      await redis.del(...orphanedKeys);
      log.info(
        {
          orphanedCount: orphanedKeys.length,
        },
        '[MatchmakingCleanup] Cleaned up orphaned processing claims',
      );
    }

    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.CLEANUP_ORPHANED,
      'success',
      duration,
      orphanedKeys.length,
    );
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.CLEANUP_ORPHANED,
      'error',
      duration,
    );

    log.error(
      {
        error,
      },
      '[MatchmakingCleanup] Failed to clean orphaned claims',
    );

    throw error; // Propagate error to BullMQ
  }
};

const recoverLostUsers = async () => {
  const startTime = performance.now();

  try {
    const { recovered, removed } = await AtomicQueueService.recoverLostUsers();

    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.CLEANUP_LOST,
      'success',
      duration,
      recovered.length + removed.length,
    );

    if (recovered.length > 0 || removed.length > 0) {
      log.info(
        {
          duration,
          recovered: recovered.length,
          removed: removed.length,
        },
        `[MatchmakingCleanup]: Recovered ${recovered.length} users and removed ${removed.length} disconnected users.`,
      );
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    IgnoreSystemMetricsService.recordCleanupOperation(
      MATCHMAKING_JOB.CLEANUP_LOST,
      'error',
      duration,
    );

    log.error(
      { error, duration },
      '[MatchmakingCleanup] Failed to recover lost users',
    );

    throw error; // Propagate error to BullMQ
  }
};

export const CleanupJobEntry = {
  expiredMatchesCleanup,
  staleConnectionsCleanup,
  orphanedClaimsCleanup,
  recoverLostUsers,
};
