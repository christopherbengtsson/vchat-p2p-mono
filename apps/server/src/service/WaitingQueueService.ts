import type { Redis } from 'ioredis';
import type { Maybe } from '@mono/common-dto';
import type { SocketId } from '../model/SocketId.js';
import { logger } from '../utils/logger.js';

/**
 * Service for managing the user waiting queue and match assignments in Redis.
 */
export class WaitingQueueService {
  readonly queueKey = 'waiting_queue'; // Redis key for the sorted set storing waiting users.
  readonly matchAssignmentsKey = 'match_assignments'; // Redis key for the hash storing match assignments.
  readonly delimiter = '__:__'; // Delimiter used in composing Redis keys.
  private readonly redisClient: Redis;

  /**
   * Constructs a new WaitingQueueService instance.
   * @param redisClient An ioredis client instance.
   */
  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  /**
   * Adds a user to the waiting queue with a score based on the current time in seconds.
   * @param socketId The user's socket ID.
   * @param userId The user's ID.
   */
  async addToQueue(socketId: SocketId, userId: string) {
    const currentMillis = Date.now();
    const score = currentMillis / 1000;

    const member = this.composeKey({ socketId, userId });
    await this.redisClient.zadd(this.queueKey, score, member);
  }

  /**
   * Removes a user from the waiting queue.
   * If userId is not provided, it attempts to find the user by socketId pattern.
   * @param socketId The user's socket ID.
   * @param userId Optional: The user's ID.
   */
  async removeFromQueue(socketId: SocketId, userId: Maybe<string>) {
    let member: Maybe<string>;

    if (userId) {
      member = this.composeKey({ socketId, userId });
    } else {
      // If userId is unknown, try to find the full key by socketId pattern.
      const match = await this.findByMatchPattern(
        this.composeKey({ socketId, userId: undefined }), // e.g., "socketId__:__*"
      );

      if (!match) {
        logger.warn(
          { socketId },
          '[WaitingQueueService] User not found in queue for removal when userId is missing',
        );
        return;
      }

      member = this.composeKey({
        socketId: match.socketId,
        userId: match.userId,
      });
    }

    await this.redisClient.zrem(this.queueKey, member);
  }

  /**
   * Gets the total number of users in the waiting queue.
   * @returns A promise that resolves to the queue count.
   */
  async getQueueCount() {
    return await this.redisClient.zcard(this.queueKey);
  }

  /**
   * Retrieves the user at a specific position in the queue (0-indexed).
   * @param position The position in the queue (default is 0 for the first user).
   * @returns A promise that resolves to the user details or null if not found.
   */
  async getFirstInQueue(position = 0): Promise<
    Maybe<{
      socketId: string;
      userId: string;
    }>
  > {
    const result = await this.redisClient.zrange(
      this.queueKey,
      position,
      position,
    );
    if (result.length === 0) return null;

    return this.splitRedisKey(result[0]);
  }

  /**
   * Retrieves multiple users from the queue with their scores (join times).
   * Supports pagination through start and count parameters.
   * @param start The starting index (0-based).
   * @param count The number of users to retrieve.
   * @returns A promise that resolves to an array of users with their keys and scores.
   */
  async getMultipleFromQueue(
    start: number,
    count: number,
  ): Promise<{ key: string; score: number }[]> {
    // Retrieve a range of users with their scores (join times).
    const results = await this.redisClient.zrange(
      this.queueKey,
      start,
      start + count - 1, // ZRANGE is inclusive, so adjust count.
      'WITHSCORES',
    );

    if (results.length === 0) return [];

    const items: { key: string; score: number }[] = [];
    // Results array is [key1, score1, key2, score2, ...]
    for (let i = 0; i < results.length; i += 2) {
      items.push({
        key: results[i],
        score: parseFloat(results[i + 1]), // Scores are join timestamps.
      });
    }

    return items;
  }

  /**
   * Finds a user in the queue by a pattern (e.g., socketId only).
   * Uses ZSCAN to iterate through the sorted set.
   * @param pattern The pattern to match against user keys.
   * @returns A promise that resolves to the user details or null if not found.
   */
  async findByMatchPattern(
    pattern: string,
  ): Promise<Maybe<{ socketId: string; userId: string }>> {
    let cursor = '0'; // Initial cursor for ZSCAN.
    do {
      // Scan the sorted set for members matching the pattern.
      const [nextCursor, results] = await this.redisClient.zscan(
        this.queueKey,
        cursor,
        'MATCH',
        pattern,
      );

      if (results.length > 0) {
        // Return the first match found.
        return this.splitRedisKey(results[0]);
      }

      cursor = nextCursor; // Continue scanning if not at the end.
    } while (cursor !== '0');

    return null; // No match found after scanning the entire set.
  }

  /**
   * Composes a Redis key for a user.
   * Handles cases where userId or socketId might be undefined for pattern matching.
   * @param ids Object containing socketId and/or userId.
   * @returns The composed Redis key string.
   */
  composeKey({
    socketId,
    userId,
  }:
    | { socketId: SocketId; userId: string }
    | { socketId: SocketId; userId: Maybe<string> } // For patterns like "socketId__:__*"
    | { socketId: Maybe<SocketId>; userId: string }) {
    // For patterns like "*__:__userId"
    if (!userId && socketId) {
      // Pattern for finding by socketId only.
      return `${socketId}${this.delimiter}*`;
    }

    if (userId && !socketId) {
      // Pattern for finding by userId only (less common for queue).
      return `*${this.delimiter}${userId}*`; // Note: ZSCAN with leading wildcard can be slow.
    }

    // Standard key with both socketId and userId.
    return `${socketId}${this.delimiter}${userId}`;
  }

  /**
   * Splits a Redis key back into socketId and userId.
   * @param key The Redis key string.
   * @returns An object containing socketId and userId.
   */
  splitRedisKey(key: string) {
    const [socketId, userId] = key.split(this.delimiter);
    return { socketId, userId };
  }

  /**
   * Retrieves all users from the waiting queue. (Primarily for debugging purposes)
   * @returns A promise that resolves to an array of all user keys in the queue.
   */
  async getQueue(): Promise<SocketId[]> {
    // Warning: Retrieving the entire queue can be resource-intensive on large queues.
    return await this.redisClient.zrange(this.queueKey, 0, -1);
  }

  /**
   * Sets a match assignment for a user in the Redis hash.
   * @param socketId The user's socket ID.
   * @param data The match data including roomId and partnerSocketId.
   */
  async setMatchAssignment(
    socketId: string,
    data: { roomId: string; partnerSocketId: string },
  ) {
    await this.redisClient.hset(
      this.matchAssignmentsKey,
      socketId,
      JSON.stringify(data),
    );
  }

  /**
   * Retrieves a match assignment for a user from the Redis hash.
   * @param socketId The user's socket ID.
   * @returns A promise that resolves to the match data or null if not found or on parsing error.
   */
  async getMatchAssignment(
    socketId: string,
  ): Promise<{ roomId: string; partnerSocketId: string } | null> {
    const result = await this.redisClient.hget(
      this.matchAssignmentsKey,
      socketId,
    );

    if (!result) return null;

    try {
      // Parse the JSON string stored in the hash field.
      return JSON.parse(result);
    } catch (error) {
      logger.error(
        { error, socketId },
        '[WaitingQueueService]: Error parsing match assignment from Redis',
      );
      return null; // Return null on parsing error to prevent crashes.
    }
  }

  /**
   * Removes a match assignment for a user from the Redis hash.
   * @param socketId The user's socket ID.
   */
  async removeMatchAssignment(socketId: string) {
    await this.redisClient.hdel(this.matchAssignmentsKey, socketId);
  }

  /**
   * Cleans up match assignments for a user and their partner.
   * Retrieves the match assignment, then removes assignments for both involved users.
   * @param socketId The socket ID of one user in the match.
   * @returns A promise that resolves to the match data if found and cleaned, or null otherwise.
   */
  async cleanupMatchAssignments(socketId: string) {
    const matchData = await this.getMatchAssignment(socketId);

    if (matchData) {
      // Atomically remove assignments for both users involved in the match.
      await Promise.all([
        this.removeMatchAssignment(socketId),
        this.removeMatchAssignment(matchData.partnerSocketId),
      ]);

      return matchData; // Return the data of the cleaned match.
    }

    return null; // No match assignment found for the given socketId.
  }
}
