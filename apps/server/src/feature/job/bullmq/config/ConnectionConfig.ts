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

  // BullMQ-specific configuration based on component type
  const baseConfig = {
    ..._connectionConfig,
    // Use exponential backoff with min 1s, max 20s as recommended
    retryStrategy: (times: number) =>
      Math.max(Math.min(Math.exp(times), 20000), 1000),
  };

  if (isWorker) {
    // Worker-specific configuration for reliability
    return {
      ...baseConfig,
      maxRetriesPerRequest: null, // Critical: Workers need unlimited retries
      enableOfflineQueue: true, // Workers should wait for reconnection
    };
  } else {
    // Queue-specific configuration for fast failure
    return {
      ...baseConfig,
      maxRetriesPerRequest: 3, // Queues should fail fast
      enableOfflineQueue: false, // Queues should not queue commands offline
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
