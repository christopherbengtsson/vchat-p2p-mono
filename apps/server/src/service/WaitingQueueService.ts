import type { Redis } from 'ioredis';
import type { Maybe } from '@mono/common-dto';
import type { SocketId } from '../model/SocketId.js';

export class WaitingQueueService {
  private readonly queueKey = 'waiting_queue';
  private readonly delimiter = '__:__';
  private readonly redisClient: Redis;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  async addToQueue(socketId: SocketId, userId: string) {
    const score = Date.now();
    const member = this.composeKey(socketId, userId);

    await this.redisClient.zadd(this.queueKey, score, member);
  }

  async removeFromQueue(socketId: SocketId, userId: Maybe<string>) {
    let member: Maybe<string>;

    if (userId) {
      member = this.composeKey(socketId, userId);
    } else {
      const match = await this.findBySocketId(socketId);

      if (!match) {
        return;
      }

      member = this.composeKey(match.socketId, match.userId);
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

  private composeKey(socketId: SocketId, userId: Maybe<string>) {
    if (userId) {
      return `${socketId}${this.delimiter}${userId}`;
    }

    return `${socketId}${this.delimiter}*`;
  }

  private splitRedisKey(key: string) {
    const [socketId, userId] = key.split(this.delimiter);
    return { socketId, userId };
  }

  private async findBySocketId(
    socketId: SocketId,
  ): Promise<Maybe<{ socketId: string; userId: string }>> {
    let cursor = '0';
    do {
      const [nextCursor, results] = await this.redisClient.zscan(
        this.queueKey,
        cursor,
        'MATCH',
        this.composeKey(socketId, undefined),
      );

      if (results.length > 0) {
        return this.splitRedisKey(results[0]);
      }

      cursor = nextCursor;
    } while (cursor !== '0');

    return null;
  }

  // Only for debug purposes
  async getQueue(): Promise<SocketId[]> {
    return await this.redisClient.zrange(this.queueKey, 0, -1);
  }
}
