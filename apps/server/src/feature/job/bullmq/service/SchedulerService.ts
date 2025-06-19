import type { Queue } from 'bullmq';
import type { QueueConfig } from '../model/QueueConfig.js';
import { log } from '../../../../common/util/logger.js';

const setup = async (queue: Queue, config: QueueConfig): Promise<void> => {
  if (config.schedulers.length === 0) return;

  log.debug(
    `Setting up ${config.schedulers.length} schedulers for queue: ${config.queueName}`,
  );

  for (const { schedulerId, repeatOptions, jobTemplate } of config.schedulers) {
    try {
      await queue.upsertJobScheduler(schedulerId, repeatOptions, jobTemplate);
      log.debug(`Scheduler '${schedulerId}' configured successfully`);
    } catch (error) {
      log.error({ error }, `Failed to setup scheduler '${schedulerId}'`);
      throw error;
    }
  }
};
export const SchedulerService = {
  setup,
};
