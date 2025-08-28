import { RedisClient } from '../../../../common/client/RedisClient.js';
import { log } from '../../../../common/util/logger.js';
import { REDIS_KEY } from '../../model/RedisKey.js';
import { AtomicQueueService } from '../queue/AtomicQueueService.js';
import { QueueService } from '../queue/QueueService.js';

const expiredMatchesCleanup = async () => {
  const redis = RedisClient.get();
  const assignmentKey = REDIS_KEY.MATCH_ASSIGNMENT_KEY;

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
    // Use multi() for atomic cleanup with logging
    const multi = redis.multi();
    multi.hdel(assignmentKey, ...expiredKeys);
    await multi.exec();

    log.info(
      {
        expiredCount: expiredKeys.length,
      },
      '[MatchmakingCleanup] Cleaned up expired match assignments',
    );
  }
};

const staleConnectionsCleanup = async () => {
  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}:processing`;

  // Find all processing claims
  const claimKeys = await redis.keys(`${processingKey}:*`);

  if (claimKeys.length === 0) {
    return;
  }

  // Use pipeline for performance - batch TTL checks without atomic requirements
  const pipeline = redis.pipeline();
  claimKeys.forEach((key) => pipeline.ttl(key));
  const ttlResults = await pipeline.exec();

  // Identify stale keys - if TTL is -1 (no expiry) or -2 (doesn't exist), it's stale
  const staleKeys: string[] = [];
  ttlResults?.forEach((result, index) => {
    const ttl = result?.[1] as number;
    if (ttl === -1 || ttl === -2) {
      staleKeys.push(claimKeys[index]);
    }
  });

  if (staleKeys.length > 0) {
    // Use multi() for atomic cleanup - ensures consistent cleanup state
    const multi = redis.multi();
    multi.del(...staleKeys);
    await multi.exec();

    log.info(
      {
        staleCount: staleKeys.length,
      },
      '[MatchmakingCleanup] Cleaned up stale processing claims',
    );
  }
};

const orphanedClaimsCleanup = async () => {
  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}:processing`;

  // Find processing claims that have been expired for a while (orphaned)
  const claimKeys = await redis.keys(`${processingKey}:*`);

  if (claimKeys.length === 0) {
    return;
  }

  // Use pipeline for performance - batch TTL checks without atomic requirements
  const pipeline = redis.pipeline();
  claimKeys.forEach((key) => pipeline.ttl(key));
  const ttlResults = await pipeline.exec();

  // Identify orphaned keys - if TTL is -2 (doesn't exist), it's orphaned
  const orphanedKeys: string[] = [];
  ttlResults?.forEach((result, index) => {
    const ttl = result?.[1] as number;
    if (ttl === -2) {
      orphanedKeys.push(claimKeys[index]);
    }
  });

  if (orphanedKeys.length > 0) {
    // Use multi() for atomic cleanup - ensures consistent cleanup state
    const multi = redis.multi();
    multi.del(...orphanedKeys);
    await multi.exec();

    log.info(
      {
        orphanedCount: orphanedKeys.length,
      },
      '[MatchmakingCleanup] Cleaned up orphaned processing claims',
    );
  }
};

const recoverLostUsers = async () => {
  const { recovered, removed } = await AtomicQueueService.recoverLostUsers();

  if (recovered.length > 0 || removed.length > 0) {
    log.info(
      {
        recovered: recovered.length,
        removed: removed.length,
      },
      `[MatchmakingCleanup]: Recovered ${recovered.length} users and removed ${removed.length} disconnected users.`,
    );
  }
};

export const CleanupJobEntry = {
  expiredMatchesCleanup,
  staleConnectionsCleanup,
  orphanedClaimsCleanup,
  recoverLostUsers,
};
