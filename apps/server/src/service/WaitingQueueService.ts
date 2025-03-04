import type { Redis } from 'ioredis';
import type { Maybe } from '@mono/common-dto';
import type { SocketId } from '../model/SocketId.js';
import logger from '../utils/logger.js';

export class WaitingQueueService {
  private readonly queueKey = 'waiting_queue';
  private readonly delimiter = '__:__';
  private readonly matchAssignmentsKey = 'match_assignments';
  private readonly redisClient: Redis;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  async addToQueue(socketId: SocketId, userId: string) {
    const score = Date.now();
    const member = this.composeKey({ socketId, userId });

    await this.redisClient.zadd(this.queueKey, score, member);
  }

  async removeFromQueue(socketId: SocketId, userId: Maybe<string>) {
    let member: Maybe<string>;

    if (userId) {
      member = this.composeKey({ socketId, userId });
    } else {
      const match = await this.findByMatchPattern(
        this.composeKey({ socketId, userId: undefined }),
      );

      if (!match) {
        return;
      }

      member = this.composeKey({
        socketId: match.socketId,
        userId: match.userId,
      });
    }

    await this.redisClient.zrem(this.queueKey, member);
  }

  async getQueueCount() {
    return await this.redisClient.zcard(this.queueKey);
  }

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

  async findByMatchPattern(
    pattern: string,
  ): Promise<Maybe<{ socketId: string; userId: string }>> {
    let cursor = '0';
    do {
      const [nextCursor, results] = await this.redisClient.zscan(
        this.queueKey,
        cursor,
        'MATCH',
        pattern,
      );

      if (results.length > 0) {
        return this.splitRedisKey(results[0]);
      }

      cursor = nextCursor;
    } while (cursor !== '0');

    return null;
  }

  composeKey({
    socketId,
    userId,
  }:
    | { socketId: SocketId; userId: string }
    | { socketId: SocketId; userId: Maybe<string> }
    | { socketId: Maybe<SocketId>; userId: string }) {
    if (!userId && socketId) {
      return `${socketId}${this.delimiter}*`;
    }

    if (userId && !socketId) {
      return `*${this.delimiter}${userId}*`;
    }

    return `${socketId}${this.delimiter}${userId}`;
  }

  private splitRedisKey(key: string) {
    const [socketId, userId] = key.split(this.delimiter);
    return { socketId, userId };
  }

  // Only for debug purposes
  async getQueue(): Promise<SocketId[]> {
    return await this.redisClient.zrange(this.queueKey, 0, -1);
  }

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

  async getMatchAssignment(
    socketId: string,
  ): Promise<{ roomId: string; partnerSocketId: string } | null> {
    const result = await this.redisClient.hget(
      this.matchAssignmentsKey,
      socketId,
    );

    if (!result) return null;

    try {
      return JSON.parse(result);
    } catch (error) {
      logger.error(
        { error },
        '[WaitingQueueService]: Error parsing match assignment',
      );
      return null;
    }
  }

  async removeMatchAssignment(socketId: string) {
    await this.redisClient.hdel(this.matchAssignmentsKey, socketId);
  }

  async cleanupMatchAssignments(socketId: string) {
    const matchData = await this.getMatchAssignment(socketId);

    if (matchData) {
      await this.removeMatchAssignment(socketId);
      await this.removeMatchAssignment(matchData.partnerSocketId);

      return matchData;
    }

    return null;
  }
}
