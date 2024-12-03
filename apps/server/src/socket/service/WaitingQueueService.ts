import type { Redis } from 'ioredis';
import type { SocketId } from '../../model/SocketId.js';

export class WaitingQueueService {
  private readonly queueKey = 'waiting_queue';
  private readonly redisClient: Redis;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  async addToQueue(id: SocketId) {
    const score = Date.now();
    await this.redisClient.zadd(this.queueKey, score, id);
  }

  async removeFromQueue(id: SocketId) {
    await this.redisClient.zrem(this.queueKey, id);
  }

  async getQueueCount() {
    return await this.redisClient.zcard(this.queueKey);
  }

  async getFirstInQueue(): Promise<SocketId | null> {
    const result = await this.redisClient.zrange(this.queueKey, 0, 0);
    return result.length > 0 ? result[0] : null;
  }

  // Only for debug purposes
  async getQueue(): Promise<SocketId[]> {
    return await this.redisClient.zrange(this.queueKey, 0, -1);
  }
}
