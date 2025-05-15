import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

const host = process.env.REDIS_URL;
const port = process.env.REDIS_PORT
  ? Number(process.env.REDIS_PORT)
  : undefined;
const username = process.env.REDIS_USERNAME;
const password = process.env.REDIS_PASSWORD;

const redisClient = new Redis({
  host,
  port,
  username,
  password,
  lazyConnect: true,

  // Connection optimization
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Command optimization
  commandTimeout: 5000, // 5s timeout for commands
  keepAlive: 30000, // Keep connections alive

  // Connection pool for better concurrent performance
  // Only needed if high concurrent loads
  // enableReadyCheck: false,
});

redisClient.on('connecting', () => {
  logger.info('Connecting to Redis');
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis connection reconnecting');
});

redisClient.on('ready', () => {
  logger.info('Redis connection ready');
});

redisClient.on('close', () => {
  logger.info('Redis connection closed');
});

redisClient.on('error', (error) =>
  logger.error({ error }, 'Redis Client Error'),
);

export { redisClient };
