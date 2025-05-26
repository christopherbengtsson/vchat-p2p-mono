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
    // Fallback to memory server with minimal config for CI
    const redisServer = new RedisMemoryServer({
      instance: {
        args: ['--maxmemory', '64mb', '--save', ''],
      },
      binary: {
        version: '6.2.14', // Use older, more stable version for CI
        downloadDir: './tmp',
      },
      autoStart: true,
    });

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
  } else {
    // Local development - use latest version
    const redisServer = new RedisMemoryServer({
      instance: {
        args: ['--maxmemory', '128mb'],
      },
      autoStart: true,
    });

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
}
