import { Worker } from 'bullmq';
import { CustomError } from '@mono/common-dto';
import { ConnectionConfig } from '../config/ConnectionConfig.js';
import type { WorkerHandler } from '../model/WorkerHandler.js';
import { log } from '../../../../common/util/logger.js';

const create = (
  queueName: string,
  handlers: readonly WorkerHandler[],
  workerNumber?: number,
): Worker => {
  const handlerMap = new Map(
    handlers.map(({ jobName, handler }) => [jobName, handler]),
  );

  const workerId = workerNumber
    ? `${queueName}-worker-${workerNumber}`
    : queueName;

  const workerConfig = true;
  const worker = new Worker(
    queueName,
    async (job) => {
      log.debug(`BullMQ worker '${workerId}' picked up job '${job.id}'`);

      const handler = handlerMap.get(job.name);

      if (!handler) {
        throw CustomError.badState(`No handler found for job: ${job.name}`);
      }

      // Add worker context to job processing
      job.data.workerId = workerId;

      await handler(job);
    },
    {
      connection: ConnectionConfig.getBullMQConnection(workerConfig),
      maxStalledCount: 3,
      concurrency: 100,
    },
  );

  worker.on('error', (err) => {
    log.error({ err, workerId, queueName }, 'Worker error');
  });
  worker.on('failed', (job, err) => {
    log.warn({ jobId: job?.id, err, workerId, queueName }, 'Job failed');
  });
  worker.on('stalled', (jobId) => {
    log.warn({ jobId, workerId, queueName }, 'Job stalled');
  });

  log.debug(`Worker '${workerId}' started for queue '${queueName}'`);

  return worker;
};

export const WorkerService = {
  create,
};
