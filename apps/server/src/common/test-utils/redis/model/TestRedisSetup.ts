import type { Redis } from 'ioredis';
import type { RedisMemoryServer } from 'redis-memory-server';

export interface TestRedisSetup {
  redisServer?: RedisMemoryServer;
  redisClient: Redis;
  cleanup: () => Promise<void>;
}
