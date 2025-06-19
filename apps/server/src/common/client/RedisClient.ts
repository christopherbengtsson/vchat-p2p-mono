import { Redis } from 'ioredis';
import { CustomError, type Maybe } from '@mono/common-dto';
import { log } from '../util/logger.js';
import { ServerConfigService } from '../config/service/ServerConfigService.js';

let _redisClientInstance: Maybe<Redis>;

const setupListeners = (client: Redis) => {
  client.on('connecting', () => {
    log.info('Connecting to Redis');
  });

  client.on('connect', () => {
    log.info('Connected to Redis');
  });

  client.on('reconnecting', () => {
    log.info('Redis connection reconnecting');
  });

  client.on('ready', () => {
    log.info('Redis connection ready');
  });

  client.on('close', () => {
    log.info('Redis connection closed');
  });

  client.on('error', (error) => log.error({ error }, 'Redis Client Error'));
};

const init = async () => {
  if (_redisClientInstance) {
    log.warn('Redis client already initialized.');
    return;
  }
  const serverConfig = ServerConfigService.getConfig();

  _redisClientInstance = new Redis({
    host: serverConfig.secrets.redis.url,
    port: serverConfig.secrets.redis.port,
    username: serverConfig.secrets.redis.username,
    password: serverConfig.secrets.redis.password,

    // connection pooling
    enableAutoPipelining: true, // Batch Redis commands automatically
    lazyConnect: true,

    // Connection optimization for low-resource server (2 vCPU, 4GB RAM)
    connectTimeout: 5000,
    maxRetriesPerRequest: 3, // Reduced for faster failure detection
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000); // Slightly more aggressive
      return delay;
    },

    commandTimeout: 12000, // Reduced for faster timeouts
    keepAlive: 30000, // Increased to reduce reconnection overhead

    // Memory and performance optimizations for limited resources
    enableOfflineQueue: false, // Fail fast if Redis is down

    // Enhanced connection pool settings for limited CPU
    family: 4, // IPv4 only for performance
    enableReadyCheck: true, // Ensure Redis is ready before use

    // Production optimizations for low-resource environment
    db: 0, // Explicit database selection

    // Network optimizations for ARM server with limited resources
    reconnectOnError: (err: Error) => {
      const targetError = 'READONLY';
      return err.message.includes(targetError);
    },
  });

  setupListeners(_redisClientInstance);

  await _redisClientInstance.connect();
};

const get = (): Redis => {
  if (!_redisClientInstance) {
    throw CustomError.badState(
      'Redis client has not been initialized. Ensure BootstrapService.init() is called before any operations requiring Redis.',
    );
  }
  return _redisClientInstance;
};

export const RedisClient = {
  init,
  get,

  _redisClientInstance,
};
