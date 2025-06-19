import type { Job } from 'bullmq';
import type { QueueConfig } from '../../job/bullmq/model/QueueConfig.js';
import { MatchmakingJobEntry } from '../service/job/MatchmakingJobEntry.js';
import { CleanupJobEntry } from '../service/job/CleanupJobEntry.js';
import { MaintenanceJobEntry } from '../service/job/MaintenanceJobEntry.js';
import { MonitoringJobEntry } from '../service/job/MonitoringJobEntry.js';
import { MATCHMAKING_JOB } from '../model/MatchmakingJob.js';

// TODO: Needs to be configurable
// IO-bound workload with 4 workers on 2 vCPUs
const MATCHMAKING_JOB_CONFIG = {
  AVERAGE_PROCESSING_TIME_MS: 1600, // Average time to process a matchmaking job in milliseconds when running E2E tests locally
  WORKER_COUNT: 4, // 2x number of CPUs, it's OK given the job is not CPU intensive but rather I/O bound (DB, Redis, etc.)
  LOAD_FACTOR: 0.85, // Load factor to avoid overloading the system, a bit higher given the job is I/O bound
} as const;

// (1600 / 4) * 0.85 = 340ms
const MATCHMAKING_INTERVAL =
  (MATCHMAKING_JOB_CONFIG.AVERAGE_PROCESSING_TIME_MS /
    MATCHMAKING_JOB_CONFIG.WORKER_COUNT) *
  MATCHMAKING_JOB_CONFIG.LOAD_FACTOR;

export const matchmakingConfig: QueueConfig[] = [
  {
    type: 'job',
    queueName: 'matchmaking',
    workerCount: MATCHMAKING_JOB_CONFIG.WORKER_COUNT,
    schedulers: [
      {
        schedulerId: 'matchmaking-processor',
        handler: async (job: Job): Promise<void> => {
          await MatchmakingJobEntry.create(job);
        },
        repeatOptions: {
          every: MATCHMAKING_INTERVAL,
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
    queueName: 'matchmaking-cleanup',
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
  {
    type: 'maintenance',
    queueName: 'ignore-system-maintenance',
    schedulers: [
      {
        schedulerId: 'optimize-bloom-filter',
        handler: async (): Promise<void> => {
          await MaintenanceJobEntry.optimizeBloomFilterMaintenance();
        },
        repeatOptions: {
          pattern: '0 3,15 * * *', // 3 AM and 3 PM daily
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.OPTIMIZE_BLOOM_FILTER,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 5,
            removeOnFail: 3,
            attempts: 2,
          },
        },
      },
      {
        schedulerId: 'warmup-global-matrix',
        handler: async (_job: Job): Promise<void> => {
          await MaintenanceJobEntry.warmupGlobalMatrixMaintenance();
        },
        repeatOptions: {
          pattern: '0 1 * * *', // 1 AM daily
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.WARMUP_GLOBAL_MATRIX,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 3,
            removeOnFail: 5,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        },
      },
      {
        schedulerId: 'refresh-global-matrix',
        handler: async (_job: Job): Promise<void> => {
          await MaintenanceJobEntry.refreshGlobalIgnoreMatrixMaintenance();
        },
        repeatOptions: {
          pattern: '0 */2 * * *', // Every 2 hours
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.REFRESH_GLOBAL_MATRIX,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 3,
            removeOnFail: 3,
            attempts: 2,
          },
        },
      },
    ],
  },
  {
    type: 'monitoring',
    queueName: 'ignore-system-monitoring',
    schedulers: [
      {
        schedulerId: 'ignore-cache-health-check',
        handler: async (): Promise<void> => {
          await MonitoringJobEntry.ignoreCacheHealthCheckMonitoring();
        },
        repeatOptions: {
          pattern: '0 * * * *', // Every hour
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.IGNORE_CACHE_HEALTH_CHECK,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 10,
            removeOnFail: 5,
            attempts: 1,
          },
        },
      },
      {
        schedulerId: 'global-matrix-health-check',
        handler: async (_job: Job): Promise<void> => {
          await MonitoringJobEntry.globalMatrixHealthCheckMonitoring();
        },
        repeatOptions: {
          pattern: '0 */15 * * * *', // Every 15 minutes
        },
        jobTemplate: {
          name: MATCHMAKING_JOB.GLOBAL_MATRIX_HEALTH_CHECK,
          data: { source: 'scheduler' },
          opts: {
            removeOnComplete: 20,
            removeOnFail: 5,
            attempts: 1,
          },
        },
      },
    ],
  },
] as const;
