/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Redis } from 'ioredis';
import { log } from '../../../../common/util/logger.js';

/**
 * Validates Redis configuration for BullMQ production requirements
 * Based on BullMQ v5 best practices documentation
 */
const validateRedisConfig = async (redisClient: Redis): Promise<void> => {
  try {
    // Check max memory policy
    const maxMemoryPolicy: any = await redisClient.config(
      'GET',
      'maxmemory-policy',
    );

    if (maxMemoryPolicy[1] !== 'noeviction') {
      log.warn(
        {
          currentPolicy: maxMemoryPolicy[1],
          recommendedPolicy: 'noeviction',
        },
        'Redis maxmemory-policy should be set to "noeviction" for BullMQ. ' +
          'Current policy may cause queue corruption if Redis evicts keys.',
      );
    }

    // Check AOF persistence
    const aofEnabled: any = await redisClient.config('GET', 'appendonly');

    if (aofEnabled[1] !== 'yes') {
      log.warn(
        'Redis AOF persistence is not enabled. ' +
          'Consider enabling AOF for data durability: "appendonly yes"',
      );
    }

    // Check save configuration for RDB
    const saveConfig: any = await redisClient.config('GET', 'save');

    if (!saveConfig[1] || saveConfig[1] === '') {
      log.warn(
        'Redis RDB snapshots are disabled. ' +
          'Consider enabling RDB snapshots for backup purposes.',
      );
    }

    log.info('Redis configuration validation completed');
  } catch (error) {
    log.warn(
      { error },
      'Failed to validate Redis configuration. This may indicate permission issues.',
    );
  }
};

export const RedisValidation = {
  validateRedisConfig,
};
