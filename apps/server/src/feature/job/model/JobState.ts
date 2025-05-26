import type { Maybe } from '@mono/common-dto';
import type { JobStatus } from './JobStatus.js';

export interface JobState {
  jobId: string;
  status: JobStatus;
  intervalId: Maybe<NodeJS.Timeout>;
  renewLockIntervalId: Maybe<NodeJS.Timeout>;
}
