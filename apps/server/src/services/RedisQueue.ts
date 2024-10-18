import type { Redis } from 'ioredis';
import type { SocketId } from '../models/SocketId.js';

export class RedisQueue {
  private readonly queueKey = 'waiting_queue';
  private readonly redisClient: Redis;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  async addToQueue(id: SocketId) {
    await this.redisClient.rpush(this.queueKey, id);
  }

  async removeFromQueue(id: SocketId) {
    await this.redisClient.lrem(this.queueKey, 0, id);
  }

  async getQueueCount() {
    return await this.redisClient.llen(this.queueKey);
  }

  async getFirstInQueue(): Promise<SocketId | null> {
    return await this.redisClient.lindex(this.queueKey, 0);
  }

  async getQueue(): Promise<SocketId[]> {
    return await this.redisClient.lrange(this.queueKey, 0, -1);
  }
}
