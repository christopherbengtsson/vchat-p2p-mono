import type { Maybe } from '@mono/common-dto';
import { isDefined } from '@mono/common-util';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { TimeUtils } from '../../util/TimeUtils.js';
import { REDIS_KEY } from '../../model/RedisKey.js';
import { MatchmakingMetricsService } from '../metrics/MatchmakingMetricsService.js';
import type { QueueExitReason } from '../../model/MatchmakingMetrics.js';

/**
 * Helper to get the region-specific queue key.
 */
const getRegionSpecificQueueKey = (): string => {
  const serverRegion = ServerConfigService.getConfig().config.serverRegion;
  return `${REDIS_KEY.WAITING_QUEUE_KEY_PREFIX}:${serverRegion}`;
};

/**
 * Helper to get the entry time of a user in the queue.
 * @param key The Redis queue key.
 * @param member The user's Redis key.
 * @returns A promise that resolves to the entry time in seconds or null if not found.
 */
const _getUserEntryTime = async (
  key: string,
  member: string,
): Promise<Maybe<number>> => {
  const score = await RedisClient.get().zscore(key, member);

  if (score === null) return null;

  // Convert score to timestamp (it's stored as a UNIX timestamp in seconds)
  return parseFloat(score);
};

/**
 * Adds a user to the region-specific waiting queue.
 * Uses Redis multi() for atomic transaction - all operations must succeed or fail together.
 * This prevents race conditions where a user might be partially added to the queue.
 * @param socketId The user's socket ID.
 * @param userId The user's ID.
 * @param ignoreList The user's ignore list.
 */
const addToQueue = async (
  socketId: string,
  userId: string,
  ignoreList: string[],
) => {
  const redis = RedisClient.get();
  // Use multi() for atomic transaction - ensures data consistency
  const multi = redis.multi();

  const key = getRegionSpecificQueueKey();
  const score = TimeUtils.getCurrentTimeAsScore();
  const member = composeKey({ socketId, userId });

  multi.zadd(key, score, member);

  const ignoreListKey = REDIS_KEY.getIgnoreKey(member);
  const ignoreListTTL = 3600; // 1 hour TODO: Should probably match some cleanup interval?

  if (ignoreList.length) {
    multi.sadd(ignoreListKey, ...ignoreList);
    multi.expire(ignoreListKey, ignoreListTTL);
  }

  multi.sadd(REDIS_KEY.ALL_KNOWN_USERS_KEY, member);

  await multi.exec();

  // Record metric for queue entry
  const queueName = ServerConfigService.getConfig().config.serverRegion;
  MatchmakingMetricsService.recordQueueEntry(queueName);
};

/**
 * Removes a user from the region-specific waiting queue.
 * Uses Redis multi() for atomic transaction to ensure consistent queue state.
 * Batches member lookup and entry time retrieval for better performance.
 * @param socketId The user's socket ID.
 * @param userId Maybe: The user's ID.
 * @param reason Optional: The reason for removal (for metrics).
 */
const removeFromQueue = async (
  socketId: string,
  userId: Maybe<string>,
  reason: QueueExitReason = 'cancel-match',
) => {
  const key = getRegionSpecificQueueKey();
  let member: Maybe<string>;
  let entryTimestamp: Maybe<number>;

  if (userId) {
    member = composeKey({ socketId, userId });
    // Batch the entry time lookup with the member we already know
    entryTimestamp = await _getUserEntryTime(key, member);
  } else {
    // Need to find the member first, then get entry time
    const match = await _findByMatchPatternInRegion(
      composeKey({ socketId, userId: undefined }),
    );

    if (!match) {
      return;
    }

    member = composeKey({ socketId: match.socketId, userId: match.userId });
    entryTimestamp = await _getUserEntryTime(key, member);
  }

  const ignoreListKey = REDIS_KEY.getIgnoreKey(member);

  await RedisClient.get()
    .multi()
    .zrem(key, member)
    .del(ignoreListKey)
    .srem(REDIS_KEY.ALL_KNOWN_USERS_KEY, member)
    .exec();

  const queueName = ServerConfigService.getConfig().config.serverRegion;

  if (isDefined(entryTimestamp)) {
    const exitTimestampSeconds = TimeUtils.getCurrentTimeAsScore();
    const durationSeconds = exitTimestampSeconds - entryTimestamp;
    MatchmakingMetricsService.recordQueueExit(
      queueName,
      reason,
      durationSeconds,
    );
  } else {
    MatchmakingMetricsService.recordQueueExit(queueName, reason);
  }
};

/**
 * Gets the total number of users in the region-specific waiting queue.
 * @returns A promise that resolves to the queue count.
 */
const _getQueueCount = async () => {
  const key = getRegionSpecificQueueKey();
  return await RedisClient.get().zcard(key);
};

/**
 * Retrieves the user at a specific position in the region-specific queue.
 * @param position The position in the queue (default is 0 for the first user).
 * @returns A promise that resolves to the user details or null if not found.
 */
const _getFirstInQueue = async (
  position = 0,
): Promise<
  Maybe<{
    socketId: string;
    userId: string;
  }>
> => {
  const key = getRegionSpecificQueueKey();
  const result = await RedisClient.get().zrange(key, position, position);
  if (result.length === 0) return null;
  return splitRedisKey(result[0]);
};

/**
 * Retrieves multiple users from the region-specific queue with their scores.
 * @param start The starting index (0-based).
 * @param count The number of users to retrieve.
 * @returns A promise that resolves to an array of users with their keys and scores.
 */
const getMultipleFromQueue = async (
  start: number,
  count: number,
): Promise<{ key: string; score: number }[]> => {
  const key = getRegionSpecificQueueKey();
  const results = await RedisClient.get().zrange(
    key,
    start,
    start + count - 1,
    'WITHSCORES',
  );

  if (results.length === 0) return [];

  const items: { key: string; score: number }[] = [];
  for (let i = 0; i < results.length; i += 2) {
    items.push({
      key: results[i],
      score: parseFloat(results[i + 1]),
    });
  }
  return items;
};

/**
 * Finds a user in the region-specific queue by a pattern.
 * @param pattern The pattern to match against user keys within that region.
 * @returns A promise that resolves to the user details or null if not found.
 */
const _findByMatchPatternInRegion = async (
  pattern: string,
): Promise<Maybe<{ socketId: string; userId: string }>> => {
  const key = getRegionSpecificQueueKey();
  let cursor = '0';
  do {
    const [nextCursor, results] = await RedisClient.get().zscan(
      key,
      cursor,
      'MATCH',
      pattern,
    );
    if (results.length > 0) {
      return splitRedisKey(results[0]);
    }
    cursor = nextCursor;
  } while (cursor !== '0');
  return null;
};

/**
 * Composes a Redis key for a user.
 * Handles cases where userId or socketId might be undefined for pattern matching.
 * @param ids Object containing socketId and/or userId.
 * @returns The composed Redis key string.
 */
function composeKey({
  socketId,
  userId,
}:
  | { socketId: string; userId: string }
  | { socketId: string; userId: Maybe<string> } // For patterns like "socketId__:__*"
  | { socketId: Maybe<string>; userId: string }) {
  // For patterns like "*__:__userId"
  if (!userId && socketId) {
    // Pattern for finding by socketId only.
    return `${socketId}${REDIS_KEY.DELIMITER}*`;
  }

  if (userId && !socketId) {
    // Pattern for finding by userId only (less common for queue).
    return `*${REDIS_KEY.DELIMITER}${userId}*`; // Note: ZSCAN with leading wildcard can be slow.
  }

  // Standard key with both socketId and userId.
  return `${socketId}${REDIS_KEY.DELIMITER}${userId}`;
}

/**
 * Splits a Redis key back into socketId and userId.
 * @param key The Redis key string.
 * @returns An object containing socketId and userId.
 */
function splitRedisKey(key: string) {
  const [socketId, userId] = key.split(REDIS_KEY.DELIMITER);
  return { socketId, userId };
}

/**
 * Retrieves all users from the region-specific waiting queue.
 * @returns A promise that resolves to an array of all user keys in the queue.
 */
const _getQueue = async (): Promise<string[]> => {
  const key = getRegionSpecificQueueKey();
  return await RedisClient.get().zrange(key, 0, -1);
};

/**
 * Service for managing the user waiting queue in Redis.
 */
export const QueueService = {
  getRegionSpecificQueueKey,
  addToQueue,
  removeFromQueue,
  getMultipleFromQueue,
  composeKey,
  splitRedisKey,

  // For testing purposes
  _getQueueCount,
  _getFirstInQueue,
  _getQueue,
  _findByMatchPatternInRegion,
  _getUserEntryTime,
};
