import { Redis } from 'ioredis';
import logger from '../utils/logger.js';

const host = process.env.REDIS_URL;
const port = process.env.REDIS_PORT ?? 6379;
const username = process.env.REDIS_USERNAME;
const password = process.env.REDIS_PASSWORD;

const redisClient = new Redis({
  host,
  port: Number(port),
  username,
  password,
  lazyConnect: true,
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

export default redisClient;
