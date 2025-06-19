import { RedisClient } from '../../../../common/client/RedisClient.js';
import { log } from '../../../../common/util/logger.js';
import { REDIS_KEY } from '../../model/RedisKey.js';

/**
 * Get the match assignment for a user.
 * @param socketId The user's socket ID.
 * @returns A promise that resolves to the match assignment or null if not found.
 */
const getMatchAssignment = async (
  socketId: string,
): Promise<{ roomId: string; partnerSocketId: string } | null> => {
  const result = await RedisClient.get().hget(
    REDIS_KEY.MATCH_ASSIGNMENT_KEY,
    socketId,
  );

  if (!result) return null;

  try {
    return JSON.parse(result);
  } catch (error) {
    log.error(
      { error, socketId },
      '[MatchAssignmentService]: Error parsing match assignment from Redis',
    );

    return null;
  }
};

/**
 * Cleans up match assignments for a user and their partner.
 * Retrieves the match assignment, then removes assignments for both involved users.
 * @param socketId The socket ID of one user in the match.
 * @returns A promise that resolves to the match data if found and cleaned, or null otherwise.
 */
const cleanupMatchAssignments = async (socketId: string) => {
  const matchData = await getMatchAssignment(socketId);

  if (matchData) {
    // Use Redis pipeline for atomic removal of both assignments
    _removeMatchAssignment(socketId, matchData.partnerSocketId).catch(
      (error) => {
        log.error(
          { error, socketId, partnerSocketId: matchData.partnerSocketId },
          '[MatchAssignmentService]: Error cleaning up match assignment',
        );
      },
    );

    return matchData;
  }

  return null;
};

/**
 * Set a match assignment for a user.
 * @param socketId The user's socket ID.
 * @param data The match data including roomId and partnerSocketId.
 */
const _setMatchAssignment = async (
  socketId: string,
  data: { roomId: string; partnerSocketId: string },
) => {
  await RedisClient.get().hset(
    REDIS_KEY.MATCH_ASSIGNMENT_KEY,
    socketId,
    JSON.stringify(data),
  );
};

/**
 * Remove a match assignment for a user.
 * @param socketId The user's socket ID.
 */
const _removeMatchAssignment = async (
  socketId: string,
  partnerSocketId: string,
) => {
  const redis = RedisClient.get();
  const pipeline = redis.pipeline();

  pipeline.hdel(REDIS_KEY.MATCH_ASSIGNMENT_KEY, socketId);
  pipeline.hdel(REDIS_KEY.MATCH_ASSIGNMENT_KEY, partnerSocketId);

  await pipeline.exec();
};

/**
 * Service for managing match assignments in Redis.
 */
export const AssignmentService = {
  getMatchAssignment,
  cleanupMatchAssignments,

  // For testing purposes
  _setMatchAssignment,
  _removeMatchAssignment,
};
