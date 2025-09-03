import type { Job } from 'bullmq';
import type { QueueConfig } from '../../job/bullmq/model/QueueConfig.js';
import { MatchmakingJobEntry } from '../service/job/MatchmakingJobEntry.js';
import { CleanupJobEntry } from '../service/job/CleanupJobEntry.js';
import { MATCHMAKING_JOB } from '../model/MatchmakingJob.js';

// TODO: Needs to be configurable
// IO-bound workload with 4 workers on 2 vCPUs
const MATCHMAKING_JOB_CONFIG = {
  WORKER_COUNT: 4, // 2x number of CPUs, it's OK given the job is not CPU intensive but rather I/O bound (DB, Redis, etc.)
  CONCURRENCY_PER_WORKER: 5,
  INTERVAL: 200,
} as const;

export const matchmakingConfig: QueueConfig[] = [
  {
    type: 'job',
    queueName: '{matchmaking}',
    workerCount: MATCHMAKING_JOB_CONFIG.WORKER_COUNT,
    concurrencyPerWorker: MATCHMAKING_JOB_CONFIG.CONCURRENCY_PER_WORKER,
    schedulers: [
      {
        schedulerId: 'matchmaking-processor',
        handler: async (job: Job): Promise<void> => {
          await MatchmakingJobEntry.create(job);
        },
        repeatOptions: {
          every: MATCHMAKING_JOB_CONFIG.INTERVAL,
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.PROCESS_QUEUE,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 5,
            removeOnFail: 3,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        },
      },
    ],
  },
  {
    type: 'cleanup',
    queueName: '{matchmaking-cleanup}',
    concurrencyPerWorker: 1,
    schedulers: [
      {
        schedulerId: 'expired-matches-cleanup',
        handler: async (): Promise<void> => {
          await CleanupJobEntry.expiredMatchesCleanup();
        },
        repeatOptions: {
          pattern: '0 */10 * * * *', // Every 10 minutes
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.CLEANUP_EXPIRED,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 3,
            removeOnFail: 5,
            attempts: 2,
          },
        },
      },
      {
        schedulerId: 'stale-connections-cleanup',
        handler: async (): Promise<void> => {
          await CleanupJobEntry.staleConnectionsCleanup();
        },
        repeatOptions: {
          pattern: '0 */5 * * * *', // Every 5 minutes
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.CLEANUP_STALE,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 3,
            removeOnFail: 5,
            attempts: 2,
          },
        },
      },
      {
        schedulerId: 'orphaned-claims-cleanup',
        handler: async (_job: Job): Promise<void> => {
          await CleanupJobEntry.orphanedClaimsCleanup();
        },
        repeatOptions: {
          pattern: '0 */15 * * * *', // Every 15 minutes
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.CLEANUP_ORPHANED,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 3,
            removeOnFail: 5,
            attempts: 1,
          },
        },
      },
      {
        schedulerId: 'recover-lost-users-cleanup',
        handler: async (_job: Job): Promise<void> => {
          await CleanupJobEntry.recoverLostUsers();
        },
        repeatOptions: {
          pattern: '0 */5 * * * *', // Every 5 minutes
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.CLEANUP_LOST,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 3,
            removeOnFail: 5,
            attempts: 1,
          },
        },
      },
    ],
  },
] as const;
