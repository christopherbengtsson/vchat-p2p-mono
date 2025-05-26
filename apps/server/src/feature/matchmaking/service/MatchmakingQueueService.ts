import type { Maybe } from '@mono/common-dto';
import { log } from '../../../common/util/logger.js';
import { RedisClient } from '../../../common/client/RedisClient.js';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import { TimeUtils } from '../util/TimeUtils.js';

const WAITING_QUEUE_KEY_PREFIX = 'waiting_queue' as const;
const DELIMITER = '__:__' as const; // Delimiter used in composing Redis keys.

/**
 * Helper to get the zone-specific queue key.
 */
const getZoneSpecificQueueKey = (): string => {
  const serverRegion = ServerConfigService.getConfig().config.serverRegion;
  return `${WAITING_QUEUE_KEY_PREFIX}:${serverRegion}`;
};

/**
 * Adds a user to the zone-specific waiting queue.
 * @param socketId The user's socket ID.
 * @param userId The user's ID.
 */
const addToQueue = async (socketId: string, userId: string) => {
  const score = TimeUtils.getCurrentTimeAsScore();
  const member = composeKey({ socketId, userId });
  const zoneQueueKey = getZoneSpecificQueueKey();
  await RedisClient.get().zadd(zoneQueueKey, score, member);
};

/**
 * Removes a user from the zone-specific waiting queue.
 * @param socketId The user's socket ID.
 * @param userId Optional: The user's ID.
 */
const removeFromQueue = async (socketId: string, userId: Maybe<string>) => {
  const serverRegion = ServerConfigService.getConfig().config.serverRegion; // For logging
  let member: Maybe<string>;
  const zoneQueueKey = getZoneSpecificQueueKey();

  if (userId) {
    member = composeKey({ socketId, userId });
  } else {
    const match = await _findByMatchPatternInZone(
      composeKey({ socketId, userId: undefined }),
    );

    if (!match) {
      log.debug(
        { socketId, serverRegion }, // serverRegion for logging context
        '[MatchmakingQueueService] User not found in zone-specific queue for removal when userId is missing',
      );
      return;
    }
    member = composeKey({ socketId: match.socketId, userId: match.userId });
  }
  await RedisClient.get().zrem(zoneQueueKey, member);
};

/**
 * Gets the total number of users in the zone-specific waiting queue.
 * @returns A promise that resolves to the queue count.
 */
const _getQueueCount = async () => {
  const zoneQueueKey = getZoneSpecificQueueKey();
  return await RedisClient.get().zcard(zoneQueueKey);
};

/**
 * Retrieves the user at a specific position in the zone-specific queue.
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
  const zoneQueueKey = getZoneSpecificQueueKey();
  const result = await RedisClient.get().zrange(
    zoneQueueKey,
    position,
    position,
  );
  if (result.length === 0) return null;
  return splitRedisKey(result[0]);
};

/**
 * Retrieves multiple users from the zone-specific queue with their scores.
 * @param start The starting index (0-based).
 * @param count The number of users to retrieve.
 * @returns A promise that resolves to an array of users with their keys and scores.
 */
const getMultipleFromQueue = async (
  start: number,
  count: number,
): Promise<{ key: string; score: number }[]> => {
  const zoneQueueKey = getZoneSpecificQueueKey();
  const results = await RedisClient.get().zrange(
    zoneQueueKey,
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
 * Finds a user in the zone-specific queue by a pattern.
 * @param pattern The pattern to match against user keys within that zone.
 * @returns A promise that resolves to the user details or null if not found.
 */
const _findByMatchPatternInZone = async (
  pattern: string,
): Promise<Maybe<{ socketId: string; userId: string }>> => {
  const zoneQueueKey = getZoneSpecificQueueKey();
  let cursor = '0';
  do {
    const [nextCursor, results] = await RedisClient.get().zscan(
      zoneQueueKey,
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
    return `${socketId}${DELIMITER}*`;
  }

  if (userId && !socketId) {
    // Pattern for finding by userId only (less common for queue).
    return `*${DELIMITER}${userId}*`; // Note: ZSCAN with leading wildcard can be slow.
  }

  // Standard key with both socketId and userId.
  return `${socketId}${DELIMITER}${userId}`;
}

/**
 * Splits a Redis key back into socketId and userId.
 * @param key The Redis key string.
 * @returns An object containing socketId and userId.
 */
function splitRedisKey(key: string) {
  const [socketId, userId] = key.split(DELIMITER);
  return { socketId, userId };
}

/**
 * Retrieves all users from the zone-specific waiting queue.
 * @returns A promise that resolves to an array of all user keys in the queue.
 */
const _getQueue = async (): Promise<string[]> => {
  const zoneQueueKey = getZoneSpecificQueueKey();
  return await RedisClient.get().zrange(zoneQueueKey, 0, -1);
};

/**
 * Service for managing the user waiting queue in Redis.
 */
export const MatchmakingQueueService = {
  WAITING_QUEUE_KEY_PREFIX,
  DELIMITER,

  getZoneSpecificQueueKey,
  addToQueue,
  removeFromQueue,
  getMultipleFromQueue,
  composeKey,
  splitRedisKey,

  // For testing purposes
  _getQueueCount,
  _getFirstInQueue,
  _getQueue,
  _findByMatchPatternInZone,
};
