import type { Redis } from 'ioredis';
import type { RedisTestOptions } from './model/RedisTestOptions.js';
import type { TestRedisSetup } from './model/TestRedisSetup.js';
import { setupTestRedis } from './setup.js';

export function useRedisTestHooks(options: RedisTestOptions = {}) {
  let testRedisSetup: TestRedisSetup;
  let redisClient: Redis;

  beforeAll(async () => {
    testRedisSetup = await setupTestRedis(options);
    redisClient = testRedisSetup.redisClient;
  });

  afterAll(async () => {
    if (testRedisSetup) {
      await testRedisSetup.cleanup();
    }
  });

  beforeEach(async () => {
    await redisClient.flushall();
  });

  return {
    /**
     * Get the Redis client instance for use in tests
     */
    getRedisClient: () => {
      if (!redisClient) {
        throw new Error(
          'Redis client not initialized. Make sure useRedisTestHooks is called in a test suite.',
        );
      }
      return redisClient;
    },

    /**
     * Get the full test setup (including server if running locally)
     */
    getTestSetup: () => {
      if (!testRedisSetup) {
        throw new Error(
          'Redis test setup not initialized. Make sure useRedisTestHooks is called in a test suite.',
        );
      }
      return testRedisSetup;
    },

    /**
     * Manually flush all data from Redis
     */
    flushAll: async () => {
      await redisClient.flushall();
    },
  };
}
