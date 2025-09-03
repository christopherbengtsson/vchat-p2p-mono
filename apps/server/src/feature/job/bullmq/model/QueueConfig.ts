import type { JobSchedulerConfig } from './SchedulerConfig.js';

export type QueueConfig =
  | {
      type: 'job';
      queueName: string;
      schedulers: JobSchedulerConfig[];
      /** Number of worker instances to create for this queue (default: 1) */
      workerCount?: number;
      concurrencyPerWorker: number;
    }
  | {
      type: 'cleanup';
      queueName: string;
      schedulers: JobSchedulerConfig[];
      concurrencyPerWorker: number;
    };
