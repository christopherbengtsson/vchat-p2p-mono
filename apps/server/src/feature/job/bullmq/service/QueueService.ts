import { Queue, type Worker } from 'bullmq';
import type { QueueConfig } from '../model/QueueConfig.js';
import type { WorkerHandler } from '../model/WorkerHandler.js';
import { log } from '../../../../common/util/logger.js';
import { ConnectionConfig } from '../config/ConnectionConfig.js';
import { WorkerService } from '../service/WorkerService.js';
import { SchedulerService } from './SchedulerService.js';

const init = async (
  config: QueueConfig,
  handlers: WorkerHandler[],
): Promise<{ queue: Queue; workers: Worker[] }> => {
  try {
    const queueConfig = false;
    const queue = new Queue(config.queueName, {
      connection: ConnectionConfig.getBullMQConnection(queueConfig),
    });

    queue.on('error', (err) => {
      log.error({ err, queueName: config.queueName }, 'Queue error');
    });

    await SchedulerService.setup(queue, config);

    const workerCount = config.type === 'job' ? (config.workerCount ?? 1) : 1;
    const workers: Worker[] = [];

    for (let i = 0; i < workerCount; i++) {
      const worker = WorkerService.create(config.queueName, handlers, i + 1);
      workers.push(worker);
    }

    log.debug(
      `Queue '${config.queueName}' initialized with ${handlers.length} handlers and ${workerCount} workers`,
    );

    return { queue, workers };
  } catch (error) {
    log.error({ error }, `Failed to initialize queue '${config.queueName}'`);
    throw error;
  }
};

export const QueueService = {
  init,
};
