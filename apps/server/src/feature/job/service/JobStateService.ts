import { CustomError } from '@mono/common-dto';
import { log } from '../../../common/util/logger.js';
import type { JobStatus } from '../model/JobStatus.js';
import type { JobState } from '../model/JobState.js';

const jobStates = new Map<string, JobState>();

const _set = (jobId: string, newState: JobState): void => {
  jobStates.set(jobId, newState);
};

const get = (jobId: string): JobState => {
  const jobState = jobStates.get(jobId);
  if (!jobState) {
    // This error is thrown and should be caught by the caller.
    // The caller can then decide the log level (e.g., error or fatal).
    throw CustomError.badState(
      `[JobStateService] Queue job state for job ID '${jobId}' not initialized.`,
    );
  }
  return jobState;
};

const update = (
  jobId: string,
  updates: Partial<Omit<JobState, 'jobId'>>,
): void => {
  const currentJobState = jobStates.get(jobId);
  if (currentJobState) {
    jobStates.set(jobId, { ...currentJobState, ...updates });
  } else {
    // This is a significant issue if an update is attempted on a non-existent job state.
    log.error(
      { jobId, updates },
      `[JobStateService]: Cannot update, state for job ID '${jobId}' not initialized.`,
    );
  }
};

const init = (jobId: string): JobState => {
  const initialState: JobState = {
    jobId,
    status: 'IDLE',
    intervalId: null,
    renewLockIntervalId: null,
  };

  _set(jobId, initialState);
  log.info({ jobId }, '[JobStateService] Job state initialized.');
  return initialState;
};

const remove = (jobId: string): void => {
  const deleted = jobStates.delete(jobId);
  if (deleted) {
    log.info({ jobId }, '[JobStateService] Job state removed.');
  } else {
    log.warn(
      { jobId },
      '[JobStateService] Attempted to remove non-existent job state.',
    );
  }
};

const isJobStatusActive = (status: JobStatus): boolean => {
  return status === 'STARTING' || status === 'RUNNING' || status === 'RETRYING';
};

const isJobStopped = (status: JobStatus): boolean => {
  return (
    status === 'FAILED_MAX_RETRIES' ||
    status === 'STOPPED' ||
    status === 'STOPPING' ||
    status === 'ERROR_STATE'
  );
};

export const JobStateService = {
  init,
  get,
  update,
  remove,
  isJobStatusActive,
  isJobStopped,

  // For testing purposes
  _set,
};
