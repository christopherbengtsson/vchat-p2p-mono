import { log } from '../../../common/util/logger.js';
import type { ServerConfig } from '../../../common/config/model/ServerConfig.js';
import type { JobEntryPoint } from '../model/JobEntryPoint.js';
import type { JobType } from '../model/JobType.js';
import type { JobConfig } from '../model/JobConfig.js';
import type { JobState } from '../model/JobState.js';
import { JobFactoryService } from './JobFactoryService.js';

interface RegisteredJob {
  jobId: string;
  baseJobType: JobType;
  effectiveJobType: string;
  serverRegion: string;
  config: JobConfig;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  destroy: () => Promise<void>;
  getState: () => JobState;
}

const registeredJobs = new Map<string, RegisteredJob>();

// TODO: Add an optional parameter for periodic cleanup jobs? Or how can that be handled?
const registerJob = (
  baseJobType: JobType,
  jobEntryPoint: JobEntryPoint,
  overrides?: Partial<JobConfig>,
): string => {
  const jobInstance = JobFactoryService.init(
    baseJobType,
    jobEntryPoint,
    overrides,
  );

  registeredJobs.set(jobInstance.jobId, jobInstance);

  return jobInstance.jobId;
};

const _startJob = async (jobId: string): Promise<void> => {
  const jobInstance = registeredJobs.get(jobId);

  if (jobInstance) {
    try {
      await jobInstance.start(); // This internally calls JobRunnerService.start
    } catch (error) {
      log.error(
        { error, jobId, effectiveJobType: jobInstance.effectiveJobType },
        `[JobManagerService] Failed to start job '${jobInstance.effectiveJobType}' (ID: ${jobInstance.jobId})`,
      );
      throw error;
    }
  } else {
    log.error({ jobId }, '[JobManagerService] Job not found. Cannot start.');
  }
};

const _stopJob = async (jobId: string): Promise<void> => {
  const jobInstance = registeredJobs.get(jobId);

  if (jobInstance) {
    try {
      await jobInstance.stop();
      log.info(
        {
          effectiveJobType: jobInstance.effectiveJobType,
          jobId: jobInstance.jobId,
        },
        '[JobManagerService] Job stopped successfully via manager.',
      );
    } catch (error) {
      log.error(
        { error, jobId, effectiveJobType: jobInstance.effectiveJobType },
        `[JobManagerService] Failed to stop job '${jobInstance.effectiveJobType}' (ID: ${jobInstance.jobId})`,
      );
      throw error;
    }
  } else {
    log.warn({ jobId }, '[JobManagerService] Job not found. Cannot stop.');
  }
};

const _destroyJobAndUnregister = async (jobId: string): Promise<void> => {
  const jobInstance = registeredJobs.get(jobId);
  if (jobInstance) {
    log.info(
      {
        effectiveJobType: jobInstance.effectiveJobType,
        jobId: jobInstance.jobId,
      },
      `[JobManagerService] Destroying and unregistering job '${jobId}'.`,
    );

    let destructionError: Error | undefined;

    try {
      await jobInstance.destroy(); // This calls the destroy method in JobFactoryService

      log.info(
        {
          effectiveJobType: jobInstance.effectiveJobType,
          jobId: jobInstance.jobId,
        },
        '[JobManagerService] Job destroyed successfully via manager during unregistration.',
      );
    } catch (error) {
      log.error(
        { error, jobId, effectiveJobType: jobInstance.effectiveJobType },
        `[JobManagerService] Failed to destroy job '${jobInstance.effectiveJobType}' (ID: ${jobInstance.jobId}) during unregistration attempt.`,
      );
      destructionError =
        error instanceof Error ? error : new Error(String(error));
    } finally {
      registeredJobs.delete(jobId);
      log.info({ jobId }, '[JobManagerService] Job removed from registry.');
      // If an error occurred during destruction, re-throw it after unregistration
      if (destructionError) {
        // eslint-disable-next-line no-unsafe-finally
        throw destructionError;
      }
    }
  } else {
    log.warn(
      { jobId },
      '[JobManagerService] Job not found for destruction and unregistration. Already unregistered?',
    );
    // Ensure it's removed from the registry if somehow it was missed but an attempt to destroy was made
    if (registeredJobs.has(jobId)) {
      registeredJobs.delete(jobId);
      log.info(
        { jobId },
        '[JobManagerService] Job found and removed from registry during cleanup of not-found job.',
      );
    }
  }
};

const startAllJobs = async (): Promise<void> => {
  for (const job of registeredJobs.values()) {
    try {
      await _startJob(job.jobId);
    } catch (error) {
      log.error(
        {
          error,
          jobId: job.jobId,
          effectiveJobType: job.effectiveJobType,
        },
        '[JobManagerService] Error during startAllJobs iteration, continuing with next job.',
      );
    }
  }
};

const _stopAllJobs = async (): Promise<void> => {
  log.info(
    { count: registeredJobs.size },
    `[JobManagerService] Stopping all ${registeredJobs.size} registered jobs...`,
  );
  await Promise.allSettled(
    Array.from(registeredJobs.values()).map((job) => _stopJob(job.jobId)),
  );
};

const destroyAllJobs = async (): Promise<void> => {
  log.info(
    { count: registeredJobs.size },
    `[JobManagerService] Destroying all ${registeredJobs.size} registered jobs...`,
  );
  await Promise.allSettled(
    Array.from(registeredJobs.keys()).map((jobId) =>
      _destroyJobAndUnregister(jobId),
    ),
  );
};

const _getJobDetails = (jobId: string): RegisteredJob | undefined => {
  return registeredJobs.get(jobId);
};

const _getAllJobDetails = (): RegisteredJob[] => {
  return Array.from(registeredJobs.values());
};

const periodicCleanupTask = () => {
  log.info('[JobManagerService] Starting periodic cleanup task for jobs.');

  registeredJobs.forEach((job) => {
    try {
      const state = job.getState();
      if (state.status === 'FAILED_MAX_RETRIES') {
        log.warn(
          { jobId: job.jobId, effectiveJobType: job.effectiveJobType },
          `[JobManagerService] Job '${job.jobId}' found in FAILED_MAX_RETRIES state. Scheduling for destruction and unregistration.`,
        );

        // Asynchronously destroy and unregister to not block the loop
        _destroyJobAndUnregister(job.jobId).catch((error) => {
          log.error(
            { error, jobId: job.jobId },
            `[JobManagerService] Error during async destroyJobAndUnregister for job '${job.jobId}' in periodic cleanup.`,
          );
        });
      } else if (state.status === 'STOPPED' || state.status === 'IDLE') {
        // TODO: Consider if long-idle or stopped jobs should also be cleaned up
        // For now, only FAILED_MAX_RETRIES triggers automatic unregistration.
        log.debug(
          { jobId: job.jobId, status: state.status },
          `[JobManagerService] Job '${job.jobId}' is currently '${state.status}'. No cleanup action taken.`,
        );
      }
    } catch (error) {
      // This catch is for errors getting state, which might mean the job was already removed or its state service is unavailable.
      log.error(
        { error, jobId: job.jobId },
        `[JobManagerService] Error accessing state for job '${job.jobId}' during periodic cleanup. It might have been removed concurrently.`,
      );
    }
  });

  log.info('[JobManagerService] Periodic cleanup task finished.');
};

let cleanupIntervalId: NodeJS.Timeout | null = null;

const startPeriodicCleanup = (serverConfig: ServerConfig) => {
  if (cleanupIntervalId) {
    log.warn('[JobManagerService] Periodic cleanup task already started.');
    return;
  }

  log.info('[JobManagerService] Starting periodic cleanup task scheduler.');

  const intervalMs = serverConfig.config.jobConfig.periodicCleanupInterval;
  cleanupIntervalId = setInterval(periodicCleanupTask, intervalMs);
  // Run once immediately as well
  periodicCleanupTask();
};

const stopPeriodicCleanup = () => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;

    log.info('[JobManagerService] Stopped periodic cleanup task scheduler.');
  }
};

export const JobManagerService = {
  registerJob,
  startAllJobs,
  startPeriodicCleanup,
  stopPeriodicCleanup,
  destroyAllJobs,

  // For testing purposes
  _startJob,
  _stopJob,
  _destroyJobAndUnregister,
  _stopAllJobs,
  _getJobDetails,
  _getAllJobDetails,
};
