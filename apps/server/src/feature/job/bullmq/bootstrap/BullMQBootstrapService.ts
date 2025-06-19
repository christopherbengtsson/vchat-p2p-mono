import type { Maybe } from '@mono/common-dto';
import { log } from '../../../../common/util/logger.js';
import type { BullMQInstances } from '../model/BullMQInstances.js';
import type { WorkerHandler } from '../model/WorkerHandler.js';
import { QueueService } from '../service/QueueService.js';
import { matchmakingConfig } from '../../../matchmaking/config/MatchmakingJobConfig.js';
import { RedisValidation } from '../config/RedisValidation.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';

const featureConfigs = [matchmakingConfig] as const;

let _bullMQInstances: Maybe<BullMQInstances[]>;

const _reset = (): void => {
  _bullMQInstances = undefined;
};

const shutdown = async (instances: BullMQInstances): Promise<void> => {
  try {
    // Close all queues and workers with timeout
    const shutdownPromises = [
      ...Array.from(instances.queues.values()).map((queue) => queue.close()),
      ...instances.workers.map((worker) => worker.close()),
    ];

    // Wait for graceful shutdown with timeout
    await Promise.race([
      Promise.allSettled(shutdownPromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Shutdown timeout')), 30000),
      ),
    ]);
  } catch (error) {
    log.error('Error during BullMQ shutdown:', error);
    // Don't rethrow - we want shutdown to be graceful
  }
};

const initialize = async (): Promise<void> => {
  log.info('Initializing BullMQ...');

  // Validate Redis configuration for production
  try {
    await RedisValidation.validateRedisConfig(RedisClient.get());
  } catch (error) {
    log.warn(
      { error },
      'Redis configuration validation failed, continuing with initialization',
    );
  }

  // Flatten all queue configs from all features
  const allQueueConfigs = featureConfigs.flat();

  const results = await Promise.all(
    allQueueConfigs.map<Promise<BullMQInstances>>(async (config) => {
      // Extract handlers from scheduler configs
      const handlers: WorkerHandler[] = [];

      for (const scheduler of config.schedulers) {
        if (scheduler.jobTemplate && scheduler.jobTemplate.name) {
          handlers.push({
            jobName: scheduler.jobTemplate.name,
            handler: scheduler.handler,
          });
        }
      }

      const result = await QueueService.init(config, handlers);
      log.info(
        `Queue '${config.queueName}' (${config.type}) has ${result.workers.length} workers`,
      );
      return {
        queues: new Map([[config.queueName, result.queue]]),
        workers: result.workers,
      };
    }),
  );

  // Store results for shutdown
  _bullMQInstances = [...results];
};

export const BullMQBootstrapService = {
  initialize,
  shutdown,

  get bullMQInstances(): BullMQInstances[] {
    if (!_bullMQInstances) {
      throw new Error('BullMQ instances are not initialized');
    }
    return _bullMQInstances;
  },

  /** For test purposes only */
  _reset,
};
