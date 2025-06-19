import type { Queue, Worker } from 'bullmq';

export interface BullMQInstances {
  queues: ReadonlyMap<string, Queue>;
  workers: Worker[];
}
