import { Redis } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';

let globalRedisServer: RedisMemoryServer | null = null;
let globalRedisClient: Redis | null = null;

export async function getGlobalRedis(): Promise<Redis> {
  if (globalRedisClient) {
    return globalRedisClient;
  }

  globalRedisServer = new RedisMemoryServer({
    autoStart: true,
  });

  const host = await globalRedisServer.getHost();
  const port = await globalRedisServer.getPort();

  globalRedisClient = new Redis({
    host,
    port,
    maxRetriesPerRequest: 0,
    lazyConnect: false,
    connectTimeout: 10000,
  });

  // Test connection
  await globalRedisClient.ping();

  return globalRedisClient;
}

export async function cleanupGlobalRedis(): Promise<void> {
  if (globalRedisClient) {
    await globalRedisClient.quit();
    globalRedisClient = null;
  }

  if (globalRedisServer) {
    await globalRedisServer.stop();
    globalRedisServer = null;
  }
}

export async function flushGlobalRedis(): Promise<void> {
  if (globalRedisClient) {
    await globalRedisClient.flushall();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var redisClient: Redis;
}
