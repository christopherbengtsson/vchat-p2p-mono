import { RedisOperations } from '../RedisOperations.js';
import { MatchmakingQueueService } from '../MatchmakingQueueService.js';
import { MatchAssignmentService } from '../MatchAssignmentService.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import type { Match } from '../../model/Match.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { useRedisTestHooks } from '../../../../common/test-utils/redis/hooks.js';

describe('RedisOperations', () => {
  const { getRedisClient } = useRedisTestHooks();

  beforeAll(() => {
    ServerConfigService.init(process.env);
  });

  beforeEach(() => {
    // Mock RedisClient to use our test instance
    vi.spyOn(RedisClient, 'get').mockReturnValue(getRedisClient());
    vi.clearAllMocks();
  });

  describe('processMatchedUsers', () => {
    it('should atomically remove matched users from queue and create assignments', async () => {
      const redisClient = getRedisClient();

      // Setup: Add users to queue
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();
      const assignmentKey = MatchAssignmentService.MATCH_ASSIGNMENT_KEY;

      await redisClient.zadd(queueKey, 1000, 'socket1__:__user1');
      await redisClient.zadd(queueKey, 1001, 'socket2__:__user2');
      await redisClient.zadd(queueKey, 1002, 'socket3__:__user3');
      await redisClient.zadd(queueKey, 1003, 'socket4__:__user4');

      // Verify initial state
      expect(await redisClient.zcard(queueKey)).toBe(4);
      expect(await redisClient.hlen(assignmentKey)).toBe(0);

      // Setup: Create matches
      const matches: Match[] = [
        {
          roomId: 'room1',
          user1: { socketId: 'socket1', userId: 'user1', score: 1000 },
          user2: { socketId: 'socket2', userId: 'user2', score: 1001 },
        },
        {
          roomId: 'room2',
          user1: { socketId: 'socket3', userId: 'user3', score: 1002 },
          user2: { socketId: 'socket4', userId: 'user4', score: 1003 },
        },
      ];

      // Execute
      await RedisOperations.processMatchedUsers(matches, 5);

      // Verify: Users removed from queue
      expect(await redisClient.zcard(queueKey)).toBe(0);

      // Verify: Match assignments created
      expect(await redisClient.hlen(assignmentKey)).toBe(4);

      // Verify: Correct assignment data
      const assignment1 = await redisClient.hget(assignmentKey, 'socket1');
      const assignment2 = await redisClient.hget(assignmentKey, 'socket2');
      const assignment3 = await redisClient.hget(assignmentKey, 'socket3');
      const assignment4 = await redisClient.hget(assignmentKey, 'socket4');

      expect(JSON.parse(assignment1!)).toEqual({
        roomId: 'room1',
        partnerSocketId: 'socket2',
      });
      expect(JSON.parse(assignment2!)).toEqual({
        roomId: 'room1',
        partnerSocketId: 'socket1',
      });
      expect(JSON.parse(assignment3!)).toEqual({
        roomId: 'room2',
        partnerSocketId: 'socket4',
      });
      expect(JSON.parse(assignment4!)).toEqual({
        roomId: 'room2',
        partnerSocketId: 'socket3',
      });
    });

    it('should handle large batches with Lua processing batch size', async () => {
      const redisClient = getRedisClient();

      // Setup: Add many users to queue
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();
      const assignmentKey = MatchAssignmentService.MATCH_ASSIGNMENT_KEY;

      // Create 10 matches (20 users)
      const matches: Match[] = [];
      for (let i = 0; i < 10; i++) {
        const user1SocketId = `socket${i * 2}`;
        const user1UserId = `user${i * 2}`;
        const user2SocketId = `socket${i * 2 + 1}`;
        const user2UserId = `user${i * 2 + 1}`;

        await redisClient.zadd(
          queueKey,
          1000 + i * 2,
          `${user1SocketId}__:__${user1UserId}`,
        );
        await redisClient.zadd(
          queueKey,
          1000 + i * 2 + 1,
          `${user2SocketId}__:__${user2UserId}`,
        );

        matches.push({
          roomId: `room${i}`,
          user1: {
            socketId: user1SocketId,
            userId: user1UserId,
            score: 1000 + i * 2,
          },
          user2: {
            socketId: user2SocketId,
            userId: user2UserId,
            score: 1000 + i * 2 + 1,
          },
        });
      }

      // Execute with small batch size to test batching
      await RedisOperations.processMatchedUsers(matches, 3);

      // Verify: All users removed from queue
      expect(await redisClient.zcard(queueKey)).toBe(0);

      // Verify: All assignments created
      expect(await redisClient.hlen(assignmentKey)).toBe(20);
    });

    it('should handle empty matches array', async () => {
      const redisClient = getRedisClient();

      // Execute with empty matches
      await RedisOperations.processMatchedUsers([], 5);

      // Verify: Queue remains empty (no operations performed)
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();
      expect(await redisClient.zcard(queueKey)).toBe(0);
    });

    it('should maintain atomicity even with Redis errors', async () => {
      const redisClient = getRedisClient();

      // Setup: Add users to queue
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();
      await redisClient.zadd(queueKey, 1000, 'socket1__:__user1');
      await redisClient.zadd(queueKey, 1001, 'socket2__:__user2');

      const matches: Match[] = [
        {
          roomId: 'room1',
          user1: { socketId: 'socket1', userId: 'user1', score: 1000 },
          user2: { socketId: 'socket2', userId: 'user2', score: 1001 },
        },
      ];

      // Mock Redis eval to fail
      const originalEval = redisClient.eval;
      vi.spyOn(redisClient, 'eval').mockRejectedValue(
        new Error('Redis eval failed'),
      );

      // Execute and verify it throws
      await expect(
        RedisOperations.processMatchedUsers(matches, 5),
      ).rejects.toThrow('Redis eval failed');

      // Restore original eval
      redisClient.eval = originalEval;

      // Verify: Users should still be in queue (no partial updates)
      expect(await redisClient.zcard(queueKey)).toBe(2);
    });

    it('should handle matches with identical room IDs correctly', async () => {
      const redisClient = getRedisClient();

      // Setup: Add users to queue
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();
      const assignmentKey = MatchAssignmentService.MATCH_ASSIGNMENT_KEY;

      await redisClient.zadd(queueKey, 1000, 'socket1__:__user1');
      await redisClient.zadd(queueKey, 1001, 'socket2__:__user2');

      const matches: Match[] = [
        {
          roomId: 'same-room-id', // Same room ID for testing
          user1: { socketId: 'socket1', userId: 'user1', score: 1000 },
          user2: { socketId: 'socket2', userId: 'user2', score: 1001 },
        },
      ];

      // Execute
      await RedisOperations.processMatchedUsers(matches, 5);

      // Verify: Both assignments have the same room ID
      const assignment1 = await redisClient.hget(assignmentKey, 'socket1');
      const assignment2 = await redisClient.hget(assignmentKey, 'socket2');

      expect(JSON.parse(assignment1!).roomId).toBe('same-room-id');
      expect(JSON.parse(assignment2!).roomId).toBe('same-room-id');
    });

    it('should handle special characters in socket IDs and user IDs', async () => {
      const redisClient = getRedisClient();

      // Setup: Add users with special characters
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();
      const assignmentKey = MatchAssignmentService.MATCH_ASSIGNMENT_KEY;

      const specialSocket1 = 'socket@#$%^&*()';
      const specialUser1 = 'user.with.dots@domain.com';
      const specialSocket2 = 'socket-with-dashes_and_underscores';
      const specialUser2 = 'user_with_underscores123';

      await redisClient.zadd(
        queueKey,
        1000,
        `${specialSocket1}__:__${specialUser1}`,
      );
      await redisClient.zadd(
        queueKey,
        1001,
        `${specialSocket2}__:__${specialUser2}`,
      );

      const matches: Match[] = [
        {
          roomId: 'room1',
          user1: {
            socketId: specialSocket1,
            userId: specialUser1,
            score: 1000,
          },
          user2: {
            socketId: specialSocket2,
            userId: specialUser2,
            score: 1001,
          },
        },
      ];

      // Execute
      await RedisOperations.processMatchedUsers(matches, 5);

      // Verify: Special characters handled correctly
      const assignment1 = await redisClient.hget(assignmentKey, specialSocket1);
      const assignment2 = await redisClient.hget(assignmentKey, specialSocket2);

      expect(JSON.parse(assignment1!)).toEqual({
        roomId: 'room1',
        partnerSocketId: specialSocket2,
      });
      expect(JSON.parse(assignment2!)).toEqual({
        roomId: 'room1',
        partnerSocketId: specialSocket1,
      });
    });

    it('should process multiple batches correctly', async () => {
      const redisClient = getRedisClient();

      // Setup: Create matches that will require multiple Lua script calls
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();
      const assignmentKey = MatchAssignmentService.MATCH_ASSIGNMENT_KEY;
      const matches: Match[] = [];

      // Create 8 matches (will require 2 Lua calls with batch size 5)
      for (let i = 0; i < 8; i++) {
        const user1SocketId = `socket${i * 2}`;
        const user1UserId = `user${i * 2}`;
        const user2SocketId = `socket${i * 2 + 1}`;
        const user2UserId = `user${i * 2 + 1}`;

        await redisClient.zadd(
          queueKey,
          1000 + i * 2,
          `${user1SocketId}__:__${user1UserId}`,
        );
        await redisClient.zadd(
          queueKey,
          1000 + i * 2 + 1,
          `${user2SocketId}__:__${user2UserId}`,
        );

        matches.push({
          roomId: `room${i}`,
          user1: {
            socketId: user1SocketId,
            userId: user1UserId,
            score: 1000 + i * 2,
          },
          user2: {
            socketId: user2SocketId,
            userId: user2UserId,
            score: 1000 + i * 2 + 1,
          },
        });
      }

      // Execute with batch size 5 (should require 2 Redis operations)
      await RedisOperations.processMatchedUsers(matches, 5);

      // Verify: All users removed from queue
      expect(await redisClient.zcard(queueKey)).toBe(0);

      // Verify: All assignments created
      expect(await redisClient.hlen(assignmentKey)).toBe(16);
    });
  });
});
