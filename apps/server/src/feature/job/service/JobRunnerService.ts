import { isDefined } from '@mono/common-util';
import { log } from '../../../common/util/logger.js';
import type { JobEntryPoint } from '../model/JobEntryPoint.js';
import type { JobStatus } from '../model/JobStatus.js';
import type { JobConfig } from '../model/JobConfig.js';
import { JobDistributedLockService } from './JobDistributedLockService.js';
import { JobStateService } from './JobStateService.js';
import { JobConfigService } from './JobConfigService.js';

const LOCK_TTL_FACTOR = 3; // Lock TTL will be 3 times the job interval
const LOCK_RENEW_INTERVAL_FACTOR = 0.5; // Renew lock at 50% of TTL
const MAX_JOB_RETRIES = 3; // Maximum number of retries for a failing job
const JOB_RETRY_DELAY_MS = 5000; // Delay between job retries in milliseconds

const start = async (
  jobId: string,
  jobType: string,
  jobEntryPoint: JobEntryPoint,
  maybeJobConfig?: JobConfig,
): Promise<void> => {
  let jobState;
  try {
    jobState = JobStateService.get(jobId);
    JobStateService.update(jobId, { status: 'STARTING' });
  } catch (error) {
    JobStateService.update(jobId, { status: 'ERROR_STATE' });
    log.error(
      { error, jobId, jobType },
      '[JobRunnerService] Failed to get job state. Cannot start job.',
    );
    return;
  }

  const jobConfig = isDefined(maybeJobConfig)
    ? maybeJobConfig
    : JobConfigService.get(jobId);

  // Check if the job is already in an active state
  if (JobStateService.isJobStatusActive(jobState.status)) {
    log.warn(
      { jobId, jobType, status: jobState.status },
      `[JobRunnerService] Job '${jobId}' of type '${jobType}' is already active with status '${jobState.status}'. Skipping start.`,
    );
    return;
  }

  const lockTtl = jobConfig.interval * LOCK_TTL_FACTOR;
  let acquiredLock = false;
  try {
    acquiredLock = await JobDistributedLockService.acquireLock(
      jobType,
      jobId,
      lockTtl,
    );
  } catch (redisError) {
    log.error(
      { error: redisError, jobId, jobType, lockTtl },
      `[JobRunnerService] Redis error while trying to acquire lock for job '${jobId}'. Job will not start.`,
    );
    // Set status to ERROR_STATE if lock acquisition fails due to Redis error
    JobStateService.update(jobId, { status: 'ERROR_STATE' });
    return;
  }

  if (!acquiredLock) {
    // If lock not acquired, job goes back to IDLE, as it didn't truly start.
    JobStateService.update(jobId, { status: 'IDLE' });
    return;
  }

  // Set status to RUNNING now that lock is acquired and we are proceeding
  JobStateService.update(jobId, { status: 'RUNNING' });

  const renewLockTask = async () => {
    try {
      const renewed = await JobDistributedLockService.renewLock(
        jobType,
        jobId,
        lockTtl,
      );
      if (!renewed) {
        log.warn(
          { jobId, jobType },
          `[JobRunnerService] Failed to renew lock for job '${jobId}'. Lock might have expired or been taken. Stopping job.`,
        );
        await stop(jobId, jobType, true); // Pass lockLost = true
      } else {
        // Ensure status is RUNNING if lock is renewed successfully and job is supposed to be active
        const currentJobState = JobStateService.get(jobId);
        if (JobStateService.isJobStatusActive(currentJobState.status)) {
          JobStateService.update(jobId, { status: 'RUNNING' });
        }
      }
    } catch (redisError) {
      log.error(
        { error: redisError, jobId, jobType },
        `[JobRunnerService] Redis error during lock renewal for job '${jobId}'. Stopping job to be safe.`,
      );
      // Update status to ERROR_STATE before stopping if renewal fails due to Redis error
      try {
        JobStateService.update(jobId, { status: 'ERROR_STATE' });
      } catch (stateError) {
        log.error(
          { error: stateError, jobId },
          '[JobRunnerService] Failed to update job state to ERROR_STATE during lock renewal error.',
        );
      }
      await stop(jobId, jobType, true); // Stop job if renewal fails due to Redis error
    }
  };

  const renewLockIntervalId = setInterval(
    renewLockTask,
    lockTtl * LOCK_RENEW_INTERVAL_FACTOR,
  );

  JobStateService.update(jobId, { renewLockIntervalId });

  let jobExecutionTimeoutId: NodeJS.Timeout | null = null;

  const runJob = async (currentAttempt = 1) => {
    if (jobExecutionTimeoutId) clearTimeout(jobExecutionTimeoutId);
    jobExecutionTimeoutId = null;

    let currentJobState;
    try {
      currentJobState = JobStateService.get(jobId); // Can throw if state is removed
    } catch (error) {
      log.error(
        { error, jobId, jobType },
        `[JobRunnerService] Failed to get job state before execution for job '${jobId}'. Job might have been removed. Stopping attempts.`,
      );
      return;
    }

    // Check if the job is supposed to be active before executing
    if (!JobStateService.isJobStatusActive(currentJobState.status)) {
      log.info(
        { jobId, jobType, status: currentJobState.status },
        `[JobRunnerService] Job '${jobId}' is in status '${currentJobState.status}'. Skipping execution.`,
      );
      return;
    }
    // Explicitly set to RUNNING if it was, for example, RETRYING and now is about to run.
    // Or if it was STARTING and this is the first run.
    JobStateService.update(jobId, { status: 'RUNNING' });

    log.debug(
      { jobId, jobType, attempt: currentAttempt },
      `[JobRunnerService] Executing job '${jobId}'.`,
    );
    try {
      await jobEntryPoint();
      log.debug(
        { jobId, jobType },
        `[JobRunnerService] Job '${jobId}' executed successfully.`,
      );
      const stateAfterRun = JobStateService.get(jobId);
      // Only reschedule if the job is still in an active status (e.g. RUNNING)
      if (JobStateService.isJobStatusActive(stateAfterRun.status)) {
        jobExecutionTimeoutId = setTimeout(() => runJob(1), jobConfig.interval);
        JobStateService.update(jobId, {
          intervalId: jobExecutionTimeoutId,
          status: 'RUNNING', // Ensure it's RUNNING for the next scheduled execution
        });
      }
    } catch (error) {
      log.error(
        { error, jobId, jobType, attempt: currentAttempt },
        `[JobRunnerService] Error executing job '${jobId}'.`,
      );
      let stateBeforeRetryHandling;
      try {
        stateBeforeRetryHandling = JobStateService.get(jobId);
      } catch (stateError) {
        log.error(
          { error: stateError, jobId, jobType },
          `[JobRunnerService] Failed to get job state for job '${jobId}' during error handling. Cannot proceed with retry logic.`,
        );
        // If we can't get state, we can't safely proceed.
        // The job might have been stopped and its state removed.
        return;
      }

      // If the job is no longer active (e.g., was stopped externally), don't attempt retry.
      if (!JobStateService.isJobStatusActive(stateBeforeRetryHandling.status)) {
        log.info(
          { jobId, jobType, status: stateBeforeRetryHandling.status },
          `[JobRunnerService] Job '${jobId}' was in status '${stateBeforeRetryHandling.status}' during error handling. Not retrying.`,
        );
        return;
      }

      if (currentAttempt < MAX_JOB_RETRIES) {
        jobExecutionTimeoutId = setTimeout(
          () => runJob(currentAttempt + 1),
          JOB_RETRY_DELAY_MS,
        );

        JobStateService.update(jobId, {
          intervalId: jobExecutionTimeoutId,
          status: 'RETRYING',
        });
      } else {
        log.error(
          { jobId, jobType, attempts: MAX_JOB_RETRIES },
          `[JobRunnerService] Job '${jobId}' failed after ${MAX_JOB_RETRIES} retries. Setting status to FAILED_MAX_RETRIES and stopping.`,
        );
        try {
          JobStateService.update(jobId, {
            status: 'FAILED_MAX_RETRIES',
          });

          await stop(jobId, jobType);
        } catch (cleanupError) {
          log.error(
            { error: cleanupError, jobId, jobType },
            `[JobRunnerService] Error during stop or subsequent cleanup of job '${jobId}' after max retries. Current status should be FAILED_MAX_RETRIES.`,
          );
          try {
            JobStateService.update(jobId, {
              status: 'FAILED_MAX_RETRIES',
            });
          } catch (finalStateError) {
            log.fatal(
              { error: finalStateError, jobId },
              '[JobRunnerService] Critical: Failed to ensure FAILED_MAX_RETRIES status after cleanup error.',
            );
          }
        }
      }
    }
  };

  log.debug(
    { jobId, jobType },
    `[JobRunnerService] Scheduling initial run for job '${jobId}'.`,
  );
  jobExecutionTimeoutId = setTimeout(() => runJob(1), 0); // Start immediately
  JobStateService.update(jobId, { intervalId: jobExecutionTimeoutId });
};

const stop = async (
  jobId: string,
  jobType: string,
  lockLost = false,
): Promise<void> => {
  let jobState;
  try {
    jobState = JobStateService.get(jobId);

    if (!JobStateService.isJobStopped(jobState.status)) {
      JobStateService.update(jobId, { status: 'STOPPING' });
    }
  } catch (_error) {
    log.warn(
      { jobId, jobType, error: _error },
      `[JobRunnerService] Cannot stop job '${jobId}'. State not found. Might have been already removed.`,
    );
    return;
  }

  // If not active and no timers, it's effectively stopped or was never fully started.
  // Check current status instead of relying on isRunning or timer IDs alone.
  if (
    !JobStateService.isJobStatusActive(jobState.status) &&
    jobState.status !== 'RETRYING' &&
    jobState.status !== 'STARTING' &&
    !jobState.intervalId &&
    !jobState.renewLockIntervalId
  ) {
    log.info(
      { jobId, jobType, status: jobState.status },
      `[JobRunnerService] Job '${jobId}' is already in status '${jobState.status}' or not fully started. No further stop action needed.`,
    );
    if (
      jobState.status !== 'FAILED_MAX_RETRIES' &&
      jobState.status !== 'ERROR_STATE'
    ) {
      JobStateService.update(jobId, { status: 'STOPPED' });
    }
    return;
  }

  log.info(
    { jobId, jobType, lockLost, currentStatus: jobState.status },
    `[JobRunnerService] Stopping job '${jobId}'.`,
  );

  if (jobState.intervalId) clearTimeout(jobState.intervalId);
  if (jobState.renewLockIntervalId) clearInterval(jobState.renewLockIntervalId);

  // Determine final status: preserve FAILED_MAX_RETRIES or ERROR_STATE, otherwise set to STOPPED.
  let finalStatus: JobStatus = 'STOPPED';
  if (
    jobState.status === 'FAILED_MAX_RETRIES' ||
    jobState.status === 'ERROR_STATE'
  ) {
    finalStatus = jobState.status;
  }

  JobStateService.update(jobId, {
    intervalId: null,
    renewLockIntervalId: null,
    status: finalStatus,
  });
  log.info(
    { jobId, jobType, finalStatus },
    `[JobRunnerService] Job '${jobId}' processing loop stopped and state updated to '${finalStatus}'.`,
  );

  if (!lockLost) {
    log.debug(
      { jobId, jobType },
      `[JobRunnerService] Attempting to release lock for job '${jobId}'.`,
    );
    try {
      const released = await JobDistributedLockService.releaseLock(
        jobType,
        jobId,
      );
      if (!released) {
        log.warn(
          { jobId, jobType },
          `[JobRunnerService] Failed to release lock for job '${jobId}'. It might have expired or been taken.`,
        );
      } else {
        log.info(
          { jobId, jobType },
          `[JobRunnerService] Lock released successfully for job '${jobId}'.`,
        );
      }
    } catch (redisError) {
      log.error(
        { error: redisError, jobId, jobType },
        `[JobRunnerService] Redis error while trying to release lock for job '${jobId}'. Status remains '${finalStatus}'.`,
      );
      // If lock release fails, the job is already stopped. The lock will eventually expire.
      // Consider if status should change to ERROR_STATE here, but it might be too aggressive
      // if the job logic itself was fine.
    }
  } else {
    log.warn(
      { jobId, jobType },
      `[JobRunnerService] Lock was lost for job '${jobId}'. Skipping explicit lock release. Status is '${finalStatus}'.`,
    );
  }
};

export const JobRunnerService = {
  start,
  stop,
};
