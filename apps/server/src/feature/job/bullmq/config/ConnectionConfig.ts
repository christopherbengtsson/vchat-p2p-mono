import type { ConnectionOptions } from 'bullmq';
import { RedisClient } from '../../../../common/client/RedisClient.js';

const _connectionConfig: ConnectionOptions = {
  host: undefined,
  port: undefined,
};

const getBullMQConnection = (isWorker = false): ConnectionOptions => {
  if (!_connectionConfig.host || !_connectionConfig.port) {
    const redisClient = RedisClient.get();
    _connectionConfig.host = redisClient.options.host;
    _connectionConfig.port = redisClient.options.port;
  }

  const baseConfig = {
    ..._connectionConfig,
    retryStrategy: (times: number) =>
      Math.max(Math.min(Math.exp(times), 20_000), 1000),
  };

  if (isWorker) {
    // Worker-specific configuration for reliability
    return {
      ...baseConfig,
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
    };
  } else {
    // Queue-specific configuration for fast failure
    return {
      ...baseConfig,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    };
  }
};

const _reset = (): void => {
  _connectionConfig.host = undefined;
  _connectionConfig.port = undefined;
};

export const ConnectionConfig = {
  getBullMQConnection,

  /** For test purposes only */
  _reset,
};
