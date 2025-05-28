export type JobStatus =
  | 'IDLE'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'RETRYING'
  | 'FAILED_MAX_RETRIES'
  | 'ERROR_STATE';
