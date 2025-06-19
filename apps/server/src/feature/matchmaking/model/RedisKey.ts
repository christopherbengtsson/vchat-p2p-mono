export const REDIS_KEY = {
  ALL_KNOWN_USERS_KEY: 'matchmaking:all_known_users',
  WAITING_QUEUE_KEY_PREFIX: 'waiting_queue',
  MATCH_ASSIGNMENT_KEY: 'match_assignments',

  GLOBAL_MATRIX_KEY: 'global_ignore_matrix',
  GLOBAL_MATRIX_VERSION_KEY: 'global_ignore_matrix_version',
  GLOBAL_MATRIX_WARMUP_LOCK_KEY: 'global_ignore_matrix_warmup_lock',
  GLOBAL_MATRIX_LAST_UPDATE_KEY: 'global_ignore_matrix_last_update',
  GLOBAL_MATRIX_STATS_KEY: 'global_ignore_matrix_stats',

  PROCESSING_SUFFIX: ':processing',
  DELIMITER: '__:__', // Delimiter used in composing Redis keys.
} as const;
