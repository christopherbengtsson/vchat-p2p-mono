import { RedisMemoryServer } from 'redis-memory-server';
import { Redis } from 'ioredis';
import { QueueOperations } from '../QueueOperations.js';
import { MatchmakingQueueService } from '../MatchmakingQueueService.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import type { MatchmakingConfig } from '../../model/MatchmakingConfig.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';

describe('QueueOperations', () => {
  let redisServer: RedisMemoryServer;
  let redisClient: Redis;

  const TEST_CONFIG: MatchmakingConfig = {
    batchSize: 5,
    luaProcessingBatchSize: 3,
  };

  beforeAll(async () => {
    ServerConfigService.init(process.env);

    // Start Redis memory server
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    // Create Redis client
    redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: 0,
      lazyConnect: false,
    });

    // Mock RedisClient to use our test instance
    vi.spyOn(RedisClient, 'get').mockReturnValue(redisClient);
  });

  afterAll(async () => {
    if (redisClient) {
      redisClient.disconnect();
    }
    if (redisServer) {
      await redisServer.stop();
    }
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await redisClient.flushall();
  });

  describe('fetchQueueBatch', () => {
    it('should fetch users from queue in FIFO order', async () => {
      // Setup: Add users to queue with different scores (timestamps)
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();

      await redisClient.zadd(queueKey, 1000, 'socket1__:__user1'); // Oldest
      await redisClient.zadd(queueKey, 1005, 'socket2__:__user2');
      await redisClient.zadd(queueKey, 1010, 'socket3__:__user3'); // Newest

      // Execute
      const queueUsers = await QueueOperations.fetchQueueBatch(TEST_CONFIG);

      // Verify: Should return users in FIFO order (oldest first)
      expect(queueUsers).toHaveLength(3);
      expect(queueUsers[0]).toEqual({
        socketId: 'socket1',
        userId: 'user1',
        score: 1000,
      });
      expect(queueUsers[1]).toEqual({
        socketId: 'socket2',
        userId: 'user2',
        score: 1005,
      });
      expect(queueUsers[2]).toEqual({
        socketId: 'socket3',
        userId: 'user3',
        score: 1010,
      });
    });

    it('should respect batch size limit', async () => {
      // Setup: Add more users than batch size
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();

      for (let i = 0; i < 10; i++) {
        await redisClient.zadd(queueKey, 1000 + i, `socket${i}__:__user${i}`);
      }

      // Execute with batch size of 5
      const queueUsers = await QueueOperations.fetchQueueBatch(TEST_CONFIG);

      // Verify: Should only return batch size number of users
      expect(queueUsers).toHaveLength(TEST_CONFIG.batchSize);

      // Verify: Should return the oldest users first
      for (let i = 0; i < TEST_CONFIG.batchSize; i++) {
        expect(queueUsers[i]).toEqual({
          socketId: `socket${i}`,
          userId: `user${i}`,
          score: 1000 + i,
        });
      }
    });

    it('should return empty array for empty queue', async () => {
      // Execute on empty queue
      const queueUsers = await QueueOperations.fetchQueueBatch(TEST_CONFIG);

      // Verify: Should return empty array
      expect(queueUsers).toEqual([]);
    });

    it('should handle partial batches correctly', async () => {
      // Setup: Add fewer users than batch size
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();

      await redisClient.zadd(queueKey, 1000, 'socket1__:__user1');
      await redisClient.zadd(queueKey, 1005, 'socket2__:__user2');

      // Execute with batch size of 5
      const queueUsers = await QueueOperations.fetchQueueBatch(TEST_CONFIG);

      // Verify: Should return all available users
      expect(queueUsers).toHaveLength(2);
      expect(queueUsers[0].userId).toBe('user1');
      expect(queueUsers[1].userId).toBe('user2');
    });

    it('should correctly parse Redis keys with complex user IDs', async () => {
      // Setup: Add users with complex IDs containing special characters
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();

      await redisClient.zadd(
        queueKey,
        1000,
        'complex-socket-id__:__user@example.com',
      );
      await redisClient.zadd(
        queueKey,
        1005,
        'socket.with.dots__:__user_with_underscores',
      );

      // Execute
      const queueUsers = await QueueOperations.fetchQueueBatch(TEST_CONFIG);

      // Verify: Should correctly parse complex IDs
      expect(queueUsers).toHaveLength(2);
      expect(queueUsers[0]).toEqual({
        socketId: 'complex-socket-id',
        userId: 'user@example.com',
        score: 1000,
      });
      expect(queueUsers[1]).toEqual({
        socketId: 'socket.with.dots',
        userId: 'user_with_underscores',
        score: 1005,
      });
    });

    it('should handle floating point scores correctly', async () => {
      // Setup: Add users with floating point scores
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();

      await redisClient.zadd(queueKey, 1000.123, 'socket1__:__user1');
      await redisClient.zadd(queueKey, 1000.456, 'socket2__:__user2');

      // Execute
      const queueUsers = await QueueOperations.fetchQueueBatch(TEST_CONFIG);

      // Verify: Should preserve floating point precision
      expect(queueUsers).toHaveLength(2);
      expect(queueUsers[0].score).toBe(1000.123);
      expect(queueUsers[1].score).toBe(1000.456);
    });

    it('should maintain consistent ordering for same scores', async () => {
      // Setup: Add users with identical scores (Redis uses lexicographic ordering for ties)
      const queueKey = MatchmakingQueueService.getRegionSpecificQueueKey();

      await redisClient.zadd(queueKey, 1000, 'socketA__:__userA');
      await redisClient.zadd(queueKey, 1000, 'socketB__:__userB');
      await redisClient.zadd(queueKey, 1000, 'socketC__:__userC');

      // Execute multiple times to ensure consistency
      const queueUsers1 = await QueueOperations.fetchQueueBatch(TEST_CONFIG);
      const queueUsers2 = await QueueOperations.fetchQueueBatch(TEST_CONFIG);

      // Verify: Should return same order consistently
      expect(queueUsers1).toEqual(queueUsers2);
      expect(queueUsers1).toHaveLength(3);

      // Redis ZRANGE uses lexicographic ordering for same scores
      expect(queueUsers1[0].socketId).toBe('socketA');
      expect(queueUsers1[1].socketId).toBe('socketB');
      expect(queueUsers1[2].socketId).toBe('socketC');
    });

    it('should handle Redis connection errors gracefully', async () => {
      // Setup: Create a mock that fails
      const failingRedisClient = {
        zrange: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      } as any;

      vi.spyOn(RedisClient, 'get').mockReturnValue(failingRedisClient);

      // Execute and verify it throws
      await expect(
        QueueOperations.fetchQueueBatch(TEST_CONFIG),
      ).rejects.toThrow('Redis connection failed');
    });

    it('should handle malformed Redis data gracefully', async () => {
      // Setup: Mock Redis to return malformed data
      const malformedRedisClient = {
        zrange: vi.fn().mockResolvedValue(['invalid-key-format', '1000']),
      } as any;

      vi.spyOn(RedisClient, 'get').mockReturnValue(malformedRedisClient);

      // Mock splitRedisKey to handle malformed data
      vi.spyOn(MatchmakingQueueService, 'splitRedisKey').mockImplementation(
        (key: string) => {
          if (key === 'invalid-key-format') {
            return { socketId: 'unknown', userId: 'unknown' };
          }
          const [socketId, userId] = key.split('__:__');
          return { socketId, userId };
        },
      );

      // Execute
      const queueUsers = await QueueOperations.fetchQueueBatch(TEST_CONFIG);

      // Verify: Should handle malformed data gracefully
      expect(queueUsers).toHaveLength(1);
      expect(queueUsers[0]).toEqual({
        socketId: 'unknown',
        userId: 'unknown',
        score: 1000,
      });
    });
  });
});
