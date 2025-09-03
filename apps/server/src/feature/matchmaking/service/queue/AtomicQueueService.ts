import { SocketNamespace } from '@mono/common-dto';
import { isDefined } from '@mono/common-util';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import { SocketServer } from '../../../socket-io/server/SocketServer.js';
import type { MatchmakingProcessConfig } from '../../model/MatchmakingProcessConfig.js';
import type { QueueUser } from '../../model/QueueUser.js';
import { REDIS_KEY } from '../../model/RedisKey.js';
import { QueueService } from './QueueService.js';

/**
 * Lua script to atomically claim users from the queue
 * Prevents race conditions between concurrent workers
 */
const CLAIM_USERS_LUA = `
local queue_key = KEYS[1]
local processing_key = KEYS[2]
local batch_size = tonumber(ARGV[1])
local worker_id = ARGV[2]
local ttl_seconds = tonumber(ARGV[3])

-- Get oldest users from waiting queue
local users = redis.call('ZRANGE', queue_key, 0, batch_size - 1, 'WITHSCORES')
if #users == 0 then
    return {}
end

local claimed_users = {}
local users_to_remove = {}

-- Process pairs (member, score)
for i = 1, #users, 2 do
    local member = users[i]
    local score = users[i + 1]
    
    -- Try to claim this user (atomic SET with NX)
    local claim_key = processing_key .. ':' .. member
    local claimed = redis.call('SET', claim_key, worker_id, 'NX', 'EX', ttl_seconds)
    
    if claimed then
        -- Successfully claimed user
        table.insert(claimed_users, member)
        table.insert(claimed_users, score)
        table.insert(users_to_remove, member)
    end
end

-- Remove claimed users from waiting queue
if #users_to_remove > 0 then
    redis.call('ZREM', queue_key, unpack(users_to_remove))
end

return claimed_users
`;

/**
 * Lua script to release claimed users (error recovery)
 * No need to cleanup ignore_list
 */
const RELEASE_USERS_LUA = `
local queue_key = KEYS[1]
local processing_key = KEYS[2]
local worker_id = ARGV[1]

local released_count = 0
local cursor = "0"

repeat
    local scan_result = redis.call('SCAN', cursor, 'MATCH', processing_key .. ':*')
    cursor = scan_result[1]
    local keys = scan_result[2]
    
    for _, key in ipairs(keys) do
        local owner = redis.call('GET', key)
        if owner == worker_id then
            -- Extract user key from claim key
            local member = string.sub(key, #processing_key + 2)
            
            -- Return user to queue with current timestamp
            redis.call('ZADD', queue_key, redis.call('TIME')[1], member)
            
            -- Remove claim
            redis.call('DEL', key)
            released_count = released_count + 1
        end
    end
until cursor == "0"

return released_count
`;

/**
 * Lua script to atomically release specific claimed users (unmatched) back to the queue
 * Only releases claims owned by this worker for security
 * No need to cleanup ignore_list
 */
const RELEASE_SPECIFIC_USERS_LUA = `
local queue_key = KEYS[1]
local processing_key = KEYS[2]
local worker_id = ARGV[1]
local released_count = 0
for i = 2, #ARGV, 2 do
  local member = ARGV[i]
  local score = tonumber(ARGV[i+1])
  local claim_key = processing_key .. ':' .. member
  local owner = redis.call('GET', claim_key)
  if owner == worker_id then
    redis.call('ZADD', queue_key, score, member)
    redis.call('DEL', claim_key)
    released_count = released_count + 1
  end
end
return released_count
`;

/**
 * Generate unique worker ID for this job instance
 */
const generateWorkerId = (jobId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `worker:${jobId}:${timestamp}:${random}`;
};

/**
 * Atomically claim users from the queue for processing
 * Safe for concurrent workers - no race conditions
 */
const claimUsersFromQueue = async (
  config: MatchmakingProcessConfig,
  workerId: string,
): Promise<QueueUser[]> => {
  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}${REDIS_KEY.PROCESSING_SUFFIX}`;
  const claimTtlSeconds = 5; // Auto-expire claims after 5 seconds TODO make configurable

  // Step 1: Claim users with LUA
  const result = (await redis.eval(
    CLAIM_USERS_LUA,
    2,
    queueKey,
    processingKey,
    config.batchSize.toString(),
    workerId,
    claimTtlSeconds.toString(),
  )) as string[];

  if (result.length === 0) {
    return [];
  }

  // Step 2: Parse and batch fetch ignore lists in single pipeline
  const pipeline = redis.pipeline();
  const memberData: {
    member: string;
    socketId: string;
    userId: string;
    score: number;
  }[] = [];

  for (let i = 0; i < result.length; i += 2) {
    const member = result[i];
    const score = parseFloat(result[i + 1]);
    const { socketId, userId } = QueueService.splitRedisKey(member);

    if (isDefined(socketId) && isDefined(userId)) {
      memberData.push({ member, socketId, userId, score });
      pipeline.smembers(REDIS_KEY.getIgnoreKey(member));
    }
  }

  const ignoreListResults = await pipeline.exec();

  // Step 3: Combine results
  const queueUsers: QueueUser[] = [];

  for (let i = 0; i < memberData.length; i++) {
    const { socketId, userId, score } = memberData[i];
    const ignoreListResult = ignoreListResults?.[i];
    const ignoreList = (ignoreListResult?.[1] as string[]) ?? []; // // Pipeline results are [error, result]

    queueUsers.push({
      socketId,
      userId,
      score,
      ignoreList,
    });
  }

  return queueUsers;
};

/**
 * Release claimed users back to queue (error recovery)
 * TODO: Released users should keep their original score
 */
const releaseClaimedUsers = async (workerId: string): Promise<number> => {
  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}${REDIS_KEY.PROCESSING_SUFFIX}`;

  const releasedCount = (await redis.eval(
    RELEASE_USERS_LUA,
    2, // 2 keys
    queueKey,
    processingKey,
    workerId,
  )) as number;

  return releasedCount;
};

/**
 * Atomically release only specific claimed users (unmatched) back to the queue
 * Only releases claims owned by this worker for security
 */
const releaseSpecificClaimedUsers = async (
  users: readonly QueueUser[],
  workerId: string,
): Promise<number> => {
  if (users.length === 0) return 0;
  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}${REDIS_KEY.PROCESSING_SUFFIX}`;

  const args = users.flatMap((user) => [
    QueueService.composeKey({ socketId: user.socketId, userId: user.userId }),
    user.score,
  ]);
  const releasedCount = (await redis.eval(
    RELEASE_SPECIFIC_USERS_LUA,
    2,
    queueKey,
    processingKey,
    workerId,
    ...args,
  )) as number;

  return releasedCount;
};

/**
 * Complete processing for claimed users (remove claims)
 * Only removes claims owned by this worker for security
 * Also cleans up user's ignore_list
 */
const completeUserProcessing = async (
  queueUsers: readonly QueueUser[],
  workerId: string,
): Promise<void> => {
  if (queueUsers.length === 0) return;

  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}${REDIS_KEY.PROCESSING_SUFFIX}`;

  const pipeline = redis.pipeline();

  for (const user of queueUsers) {
    const member = QueueService.composeKey({
      socketId: user.socketId,
      userId: user.userId,
    });
    const claimKey = `${processingKey}:${member}`;
    const ignoreListKey = REDIS_KEY.getIgnoreKey(member);

    // Only delete if we own this claim (security check)
    pipeline.eval(
      `
      local claim_key = KEYS[1]
      local ignore_key = KEYS[2]
      local worker_id = ARGV[1]
      local member = ARGV[2]
      
      local owner = redis.call('GET', claim_key)
      if owner == worker_id then
          redis.call('DEL', claim_key)
          redis.call('DEL', ignore_key)
          return 1
      else
          return 0
      end
      `,
      2,
      claimKey,
      ignoreListKey,
      workerId,
    );
  }

  await pipeline.exec();
};

/**
 * Recovers users who want matchmaking but were lost due to system failures or crashes.
 * Identifies users in ALL_KNOWN_USERS_KEY who aren't in queue or being processed.
 * Re-adds still-connected users without match assignments back to queue.
 * Removes disconnected users or those with active matches from tracking.
 * Runs periodically to ensure queue consistency and prevent stranded users.
 */
const recoverLostUsers = async (): Promise<{
  recovered: string[];
  removed: string[];
}> => {
  const redis = RedisClient.get();
  const queueKey = QueueService.getRegionSpecificQueueKey();
  const processingKey = `${queueKey}${REDIS_KEY.PROCESSING_SUFFIX}`;
  const recoveredUsers: string[] = [];
  const removedUsers: string[] = [];

  // Use zscanStream to safely iterate through potentially large queue
  const usersInQueue = new Set<string>();

  const queueStream = redis.zscanStream(queueKey, {
    count: 100, // Process queue members in batches of 100
  });

  for await (const members of queueStream) {
    // zscanStream returns arrays of alternating [member1, score1, member2, score2, ...]
    // We only need the member names (every other element)
    for (let i = 0; i < members.length; i += 2) {
      usersInQueue.add(members[i]);
    }
  }

  // Use sscanStream to safely iterate through potentially large ALL_KNOWN_USERS set
  const usersToCheck: string[] = [];
  const usersStream = redis.sscanStream(REDIS_KEY.ALL_KNOWN_USERS_KEY, {
    count: 100,
  });

  for await (const members of usersStream) {
    // Filter out users who are already in queue
    const notInQueue = (members as string[]).filter(
      (member) => !usersInQueue.has(member),
    );
    usersToCheck.push(...notInQueue);
  }

  if (usersToCheck.length === 0) {
    return { recovered: [], removed: [] };
  }

  // Batch get all claim keys at once
  const claimKeys = usersToCheck.map((member) => `${processingKey}:${member}`);
  const claimResults = await redis.mget(claimKeys);

  // Filter to only users with no claims
  const lostUsers = usersToCheck.filter(
    (_member, index) => !claimResults[index],
  );

  if (lostUsers.length === 0) {
    return { recovered: [], removed: [] };
  }

  // Get active socket connections as a set for quick lookup
  const connectedSocketIds = new Set(
    Array.from(SocketServer.io.of(SocketNamespace.VIDEO_CHAT).sockets.keys()),
  );

  // Batch get all match assignments
  const socketIds = lostUsers.map((member) => {
    const { socketId } = QueueService.splitRedisKey(member);
    return socketId;
  });

  // Use pipeline to get all match assignments in one round trip
  const pipeline = redis.pipeline();
  socketIds.forEach((socketId) => {
    pipeline.hget(REDIS_KEY.MATCH_ASSIGNMENT_KEY, socketId);
  });
  const assignmentResults = await pipeline.exec();

  // Process each lost user with batch results
  const recoverPipeline = redis.pipeline();
  const removePipeline = redis.pipeline();

  lostUsers.forEach((member, index) => {
    const { socketId } = QueueService.splitRedisKey(member);
    const isConnected = connectedSocketIds.has(socketId);
    const hasAssignment = Boolean(assignmentResults?.[index]?.[1]);

    if (isConnected && !hasAssignment) {
      // Socket is connected and user is not matched - recover by adding back to queue
      recoverPipeline.zadd(queueKey, Date.now(), member);
      recoveredUsers.push(member);
    } else {
      // Socket disconnected or user is already matched - clean up
      removePipeline.srem(REDIS_KEY.ALL_KNOWN_USERS_KEY, member);
      removedUsers.push(member);
    }
  });

  // Execute both pipelines
  if (recoveredUsers.length > 0) {
    await recoverPipeline.exec();
  }

  if (removedUsers.length > 0) {
    await removePipeline.exec();
  }

  return {
    recovered: recoveredUsers,
    removed: removedUsers,
  };
};

export const AtomicQueueService = {
  generateWorkerId,
  claimUsersFromQueue,
  releaseClaimedUsers,
  releaseSpecificClaimedUsers,
  completeUserProcessing,
  recoverLostUsers,
};
