import { RedisClient } from '../../../../common/client/RedisClient.js';
import type { Match } from '../../model/Match.js';
import { REDIS_KEY } from '../../model/RedisKey.js';
import { QueueService } from '../queue/QueueService.js';

/**
 * Redis Lua script for atomic queue operations
 * Removes matched users and updates assignments atomically
 */
const LUA_REMOVE_MATCHED_USERS = `
local queueKey = KEYS[1]
local assignmentKey = KEYS[2]

-- Parse arguments: userKey1, socketId1, assignmentData1, userKey2, socketId2, assignmentData2, ...
for i = 1, #ARGV, 3 do
  local userKey = ARGV[i]
  local socketId = ARGV[i + 1] 
  local assignmentData = ARGV[i + 2]
  
  -- Remove from queue and set assignment atomically
  redis.call('ZREM', queueKey, userKey)
  redis.call('HSET', assignmentKey, socketId, assignmentData)
end

return #ARGV / 3
`;

/**
 * Processes matched users - remove them from the queue and update assignments
 */
const processMatchedUsers = async (
  matches: Match[],
  luaProcessingBatchSize: number,
): Promise<void> => {
  // Process matches in batches to avoid Redis timeouts and memory issues
  for (let i = 0; i < matches.length; i += luaProcessingBatchSize) {
    const batch = matches.slice(i, i + luaProcessingBatchSize);
    await processMatchBatchWithLua(batch);
  }
};

/**
 * Processes a batch of matches using Lua script for atomicity
 * Optimized to prevent memory bloat from large argument arrays
 */
const processMatchBatchWithLua = async (matches: Match[]): Promise<void> => {
  if (matches.length === 0) return;

  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const assignmentKey = REDIS_KEY.MATCH_ASSIGNMENT_KEY;

  // Pre-allocate array with known size for better memory efficiency
  const args: string[] = new Array(matches.length * 6);
  let argIndex = 0;

  // Prepare arguments for Lua script
  for (const match of matches) {
    const user1Key = QueueService.composeKey({
      socketId: match.user1.socketId,
      userId: match.user1.userId,
    });
    const user2Key = QueueService.composeKey({
      socketId: match.user2.socketId,
      userId: match.user2.userId,
    });

    const assignmentData1 = JSON.stringify({
      roomId: match.roomId,
      partnerSocketId: match.user2.socketId,
    });
    const assignmentData2 = JSON.stringify({
      roomId: match.roomId,
      partnerSocketId: match.user1.socketId,
    });

    // Format: userKey, socketId, assignmentData for each user
    args[argIndex++] = user1Key;
    args[argIndex++] = match.user1.socketId;
    args[argIndex++] = assignmentData1;
    args[argIndex++] = user2Key;
    args[argIndex++] = match.user2.socketId;
    args[argIndex++] = assignmentData2;
  }

  // Execute Lua script atomically
  await redis.eval(
    LUA_REMOVE_MATCHED_USERS,
    2,
    queueKey,
    assignmentKey,
    ...args,
  );
};

export const AtomicAssignmentService = {
  processMatchedUsers,

  // For testing purposes only
  processMatchBatchWithLua,
};
