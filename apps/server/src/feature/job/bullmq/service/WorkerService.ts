import { Worker } from 'bullmq';
import { CustomError } from '@mono/common-dto';
import { ConnectionConfig } from '../config/ConnectionConfig.js';
import type { WorkerHandler } from '../model/WorkerHandler.js';
import { log } from '../../../../common/util/logger.js';
import type { QueueConfig } from '../model/QueueConfig.js';

const create = (
  queueConfig: QueueConfig,
  handlers: readonly WorkerHandler[],
  workerNumber?: number,
): Worker => {
  const handlerMap = new Map(
    handlers.map(({ jobName, handler }) => [jobName, handler]),
  );

  const workerId = workerNumber
    ? `${queueConfig.queueName}-worker-${workerNumber}`
    : queueConfig.queueName;

  const worker = new Worker(
    queueConfig.queueName,
    async (job) => {
      const handler = handlerMap.get(job.name);

      if (!handler) {
        throw CustomError.badState(`No handler found for job: ${job.name}`);
      }

      // Add worker context to job processing
      job.updateData({ workerId });

      await handler(job);
    },
    {
      connection: ConnectionConfig.getBullMQConnection(true),
      maxStalledCount: 3,
      concurrency: queueConfig.concurrencyPerWorker || 100,
    },
  );

  worker.on('error', (err) => {
    log.error(
      { err, workerId, queueName: queueConfig.queueName },
      'Worker error',
    );
  });
  worker.on('failed', (job, err) => {
    log.warn(
      { jobId: job?.id, err, workerId, queueName: queueConfig.queueName },
      'Job failed',
    );
  });
  worker.on('stalled', (jobId) => {
    log.warn(
      { jobId, workerId, queueName: queueConfig.queueName },
      'Job stalled',
    );
  });

  log.debug(
    `Worker '${workerId}' started for queue '${queueConfig.queueName}'`,
  );

  return worker;
};

export const WorkerService = {
  create,
};
