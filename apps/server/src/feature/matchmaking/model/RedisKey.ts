export const REDIS_KEY = {
  ALL_KNOWN_USERS_KEY: 'matchmaking:all_known_users',
  WAITING_QUEUE_KEY_PREFIX: 'waiting_queue',
  MATCH_ASSIGNMENT_KEY: 'match_assignments',

  PROCESSING_SUFFIX: ':processing',
  DELIMITER: '__:__', // Delimiter used in composing Redis keys.

  getIgnoreKey: (member: string) => `ignore_list:${member}`,
} as const;
