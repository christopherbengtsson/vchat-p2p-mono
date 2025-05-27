import { Redis } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import type { RedisTestOptions } from './model/RedisTestOptions.js';
import type { TestRedisSetup } from './model/TestRedisSetup.js';

/**
 * Sets up a Redis instance for testing.
 * In CI environment, connects to the external Redis service.
 * In local development, uses RedisMemoryServer.
 */
export async function setupTestRedis(
  options: RedisTestOptions = {},
): Promise<TestRedisSetup> {
  // const isCI = process.env.CI === 'true';

  // if (isCI) {
  //   console.log('Setting up Redis for CI environment...');
  //   // In CI, use the Redis service configured in GitHub Actions
  //   const redisClient = new Redis({
  //     maxRetriesPerRequest: 0,
  //     lazyConnect: false,
  //   });

  //   return {
  //     redisClient,
  //     cleanup: async () => {
  //       redisClient.disconnect();
  //     },
  //   };
  // }

  // For local development, use RedisMemoryServer
  const redisServerConfig = {
    instance: {
      args: [
        '--maxmemory',
        options.localConfig?.maxMemory || '128mb',
        ...(options.localConfig?.args || []),
      ],
    },
    autoStart: true,
  };

  const redisServer = new RedisMemoryServer(redisServerConfig);

  const host = await redisServer.getHost();
  const port = await redisServer.getPort();

  const redisClient = new Redis({
    host,
    port,
    maxRetriesPerRequest: 0,
    lazyConnect: false,
  });

  return {
    redisServer,
    redisClient,
    cleanup: async () => {
      await redisClient.quit();
      await redisServer.stop();
    },
  };
}
