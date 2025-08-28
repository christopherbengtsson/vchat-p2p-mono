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
 * Lua script to atomically get and remove match assignments for both users
 * Prevents race conditions where assignment might be modified between read and delete
 */
const CLEANUP_MATCH_LUA = `
local assignment_key = KEYS[1]
local socket_id = ARGV[1]

-- Get the assignment data
local assignment_data = redis.call('HGET', assignment_key, socket_id)
if not assignment_data then
    return nil
end

-- Parse the assignment to get partner socket ID
local assignment = cjson.decode(assignment_data)
local partner_socket_id = assignment.partnerSocketId

-- Atomically remove both assignments
redis.call('HDEL', assignment_key, socket_id)
redis.call('HDEL', assignment_key, partner_socket_id)

return assignment_data
`;

/**
 * Cleans up match assignments for a user and their partner.
 * Retrieves the match assignment, then removes assignments for both involved users.
 * Uses fire-and-forget pattern for cleanup to avoid blocking the response.
 * @param socketId The socket ID of one user in the match.
 * @returns A promise that resolves to the match data if found and cleaned, or null otherwise.
 */
const cleanupMatchAssignments = async (socketId: string) => {
  const matchData = await getMatchAssignment(socketId);

  if (matchData) {
    // Fire-and-forget cleanup with atomic Lua script to prevent race conditions
    RedisClient.get()
      .eval(CLEANUP_MATCH_LUA, 1, REDIS_KEY.MATCH_ASSIGNMENT_KEY, socketId)
      .catch((error) => {
        log.error(
          { error, socketId, partnerSocketId: matchData.partnerSocketId },
          '[MatchAssignmentService]: Error cleaning up match assignment',
        );
      });

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
 * Uses Redis multi() for atomic transaction to ensure both assignments are removed together.
 * @param socketId The user's socket ID.
 * @param partnerSocketId The partner's socket ID.
 */
const _removeMatchAssignment = async (
  socketId: string,
  partnerSocketId: string,
) => {
  const redis = RedisClient.get();
  // Atomic transaction ensures both assignments are removed together
  const multi = redis.multi();

  multi.hdel(REDIS_KEY.MATCH_ASSIGNMENT_KEY, socketId);
  multi.hdel(REDIS_KEY.MATCH_ASSIGNMENT_KEY, partnerSocketId);

  await multi.exec();
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
