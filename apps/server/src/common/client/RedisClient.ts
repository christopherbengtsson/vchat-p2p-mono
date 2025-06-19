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

    enableAutoPipelining: true,
    lazyConnect: true,

    connectTimeout: 5000,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },

    commandTimeout: 12000,
    keepAlive: 30000,

    enableOfflineQueue: false,

    family: 4,
    enableReadyCheck: true,

    db: 0,

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
