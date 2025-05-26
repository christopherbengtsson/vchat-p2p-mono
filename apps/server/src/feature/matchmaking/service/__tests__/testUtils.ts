import { Redis } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';

export interface TestRedisSetup {
  redisServer?: RedisMemoryServer;
  redisClient: Redis;
  cleanup: () => Promise<void>;
}

export async function setupTestRedis(): Promise<TestRedisSetup> {
  const isCI = process.env.CI === 'true';

  // Set environment variables to fix pnpm compatibility issues
  if (isCI) {
    process.env.PREFER_GLOBAL_PATH = 'true';
    process.env.DOWNLOAD_DIR = '/tmp/redis-binaries';
  }

  const redisServerConfig = isCI
    ? {
        instance: {
          args: ['--maxmemory', '64mb', '--save', ''],
        },
        binary: {
          version: '6.2.14', // Use older, more stable version for CI
          downloadDir: '/tmp/redis-binaries', // Absolute path for CI
        },
        autoStart: true,
      }
    : {
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
