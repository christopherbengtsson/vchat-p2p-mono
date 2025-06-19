import type { Job, Queue } from 'bullmq';

export type UpsertJobScheduler = Parameters<Queue['upsertJobScheduler']>;

export type RepeatOptions = UpsertJobScheduler['1'];

export type JobTemplate = UpsertJobScheduler['2'];

export interface JobSchedulerConfig {
  schedulerId: string;
  repeatOptions: RepeatOptions;
  jobTemplate: JobTemplate;
  handler<T>(job: Job<T>): Promise<void>;
}
