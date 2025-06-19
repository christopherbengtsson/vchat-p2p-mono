import type { Job } from 'bullmq';

export interface WorkerHandler<T = unknown> {
  jobName: string;
  handler: (job: Job<T>) => Promise<void>;
}
