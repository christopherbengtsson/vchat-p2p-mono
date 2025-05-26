import { Redis } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';

export interface TestRedisSetup {
  redisServer?: RedisMemoryServer;
  redisClient: Redis;
  cleanup: () => Promise<void>;
}

export async function setupTestRedis(): Promise<TestRedisSetup> {
  const isCI = process.env.CI === 'true';

  if (isCI) {
    // In CI, use the Redis service configured in GitHub Actions
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 0,
      lazyConnect: false,
    });

    return {
      redisClient,
      cleanup: async () => {
        redisClient.disconnect();
      },
    };
  }

  // For local development, use RedisMemoryServer
  const redisServerConfig = {
    instance: {
      args: ['--maxmemory', '128mb'],
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
      redisClient.disconnect();
      await redisServer.stop();
    },
  };
}
