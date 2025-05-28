import { RedisClient } from '../../../common/client/RedisClient.js';
import { log } from '../../../common/util/logger.js';

// TODO: Centralized placed for redis keys?
const LOCK_KEY_PREFIX = 'queuejob:lock:';

/**
 * Acquires a lock in Redis.
 * @param jobType The type of the job, used to construct the part of the lock key.
 * @param instanceId The unique ID of the current job instance (lock value).
 * @param ttlMilliseconds Time-to-live for the lock in milliseconds.
 * @returns True if the lock was acquired, false otherwise.
 */
const acquireLock = async (
  jobType: string,
  instanceId: string,
  ttlMilliseconds: number,
): Promise<boolean> => {
  const client = RedisClient.get();
  const lockKey = `${LOCK_KEY_PREFIX}${jobType}`;
  try {
    // NX: Only set the key if it does not already exist.
    // PX: Set the specified expire time, in milliseconds.
    const result = await client.set(
      lockKey,
      instanceId,
      'PX',
      ttlMilliseconds,
      'NX',
    );

    return result === 'OK';
  } catch (error) {
    log.error(
      { error, lockKey, instanceId, jobType }, // Added jobType for context
      '[JobDistributedLockService] Error acquiring lock',
    );
    return false;
  }
};

/**
 * Releases a lock in Redis.
 * Uses a Lua script to ensure atomicity: only delete if the key exists and value matches.
 * @param jobType The type of the job.
 * @param instanceId The unique ID of the job instance that should own the lock.
 * @returns True if the lock was released or did not exist, false on error or if not owner.
 */
const releaseLock = async (
  jobType: string, // Changed from jobBaseId to jobType for consistency
  instanceId: string,
): Promise<boolean> => {
  const client = RedisClient.get();
  const lockKey = `${LOCK_KEY_PREFIX}${jobType}`; // Use jobType
  // Lua script:
  // KEYS[1] - the lock key
  // ARGV[1] - the instanceId (expected value of the lock)
  // Returns 1 if the lock was deleted, 0 otherwise.
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  try {
    const result = await client.eval(script, 1, lockKey, instanceId);

    // result is 1 if deleted, 0 if not owner or key didn't exist
    return result === 1;
  } catch (error) {
    log.error(
      { error, lockKey, instanceId, jobType }, // Added jobType
      '[JobDistributedLockService] Error releasing lock',
    );
    return false; // Indicate failure on error
  }
};

/**
 * Renews a lock in Redis.
 * Uses a Lua script to ensure atomicity: only renew if the key exists and value matches.
 * @param jobType The type of the job.
 * @param instanceId The unique ID of the job instance that currently owns the lock.
 * @param ttlMilliseconds The new TTL for the lock in milliseconds.
 * @returns True if the lock was renewed, false otherwise (e.g., lock expired or owned by another instance).
 */
const renewLock = async (
  jobType: string, // Changed from jobBaseId to jobType
  instanceId: string,
  ttlMilliseconds: number,
): Promise<boolean> => {
  const client = RedisClient.get();
  const lockKey = `${LOCK_KEY_PREFIX}${jobType}`; // Use jobType
  // Lua script:
  // KEYS[1] - the lock key
  // ARGV[1] - the instanceId (expected value of the lock)
  // ARGV[2] - the new TTL in milliseconds
  // Returns 1 if the lock was renewed, 0 otherwise.
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  try {
    const result = await client.eval(
      script,
      1,
      lockKey,
      instanceId,
      ttlMilliseconds.toString(),
    );

    // result is 1 if pexpire was successful (key existed and was updated), 0 otherwise
    return result === 1;
  } catch (error) {
    log.error(
      { error, lockKey, instanceId, jobType },
      '[JobDistributedLockService] Error renewing lock',
    );
    return false;
  }
};

export const JobDistributedLockService = {
  acquireLock,
  releaseLock,
  renewLock,
};
