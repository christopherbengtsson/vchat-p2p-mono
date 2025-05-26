import { Redis } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import { Server } from 'socket.io';
import { noop } from '@mono/common-util';
import { MatchmakingOrchestrator } from '../MatchmakingOrchestrator.js';
import { MatchmakingQueueService } from '../MatchmakingQueueService.js';
import { MatchAssignmentService } from '../MatchAssignmentService.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';
import type { MatchmakingConfig } from '../../model/MatchmakingConfig.js';
import type { QueueUser } from '../../model/QueueUser.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { PerformanceMetrics } from '../PerformanceMetrics.js';
import { MatchMakingJobEntry } from '../MatchmakingJobEntry.js';

vi.mock('../../../../common/client/RedisClient.js');
vi.mock('../../../../common/service/SupabaseService.js');

// Test configuration
const TEST_CONFIG: MatchmakingConfig = {
  batchSize: 10,
  luaProcessingBatchSize: 5,
  performance: {
    enableMetrics: true,
    slowProcessingThreshold: 500,
  },
};

describe('MatchmakingOrchestrator Tests', () => {
  let redisServer: RedisMemoryServer;
  let redisClient: Redis;
  let mockIo: Server;
  let mockNamespace: any;

  // Helper function to add users to queue
  async function addUsersToQueue(users: QueueUser[]): Promise<void> {
    const queueKey = MatchmakingQueueService.getZoneSpecificQueueKey();

    for (const user of users) {
      const member = MatchmakingQueueService.composeKey({
        socketId: user.socketId,
        userId: user.userId,
      });
      await redisClient.zadd(queueKey, user.score, member);
    }
  }

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

    // Create mock Socket.IO server with proper chaining
    mockNamespace = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    mockIo = {
      of: vi.fn().mockReturnValue(mockNamespace),
    } as any;
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
    // Mock time for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    // Mock RedisClient to use our test instance
    vi.mocked(RedisClient.get).mockReturnValue(redisClient);

    // Mock SupabaseService - default to no ignored pairs
    vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

    // Mock Redis cache operations for IgnoredUsersService
    redisClient.hmget = vi.fn().mockResolvedValue([null, null]); // Cache miss by default
    redisClient.hmset = vi.fn().mockResolvedValue('OK');
    redisClient.expire = vi.fn().mockResolvedValue(1);

    // Reset namespace mocks
    mockNamespace.to.mockClear();
    mockNamespace.emit.mockClear();
    mockNamespace.emit.mockImplementation(() => noop);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await redisClient.flushall();
  });

  describe('Basic Matching', () => {
    it('should successfully match two compatible users', async () => {
      // Setup: Add two users to queue
      const user1: QueueUser = {
        socketId: 'socket1',
        userId: 'user1',
        score: 1000,
      };
      const user2: QueueUser = {
        socketId: 'socket2',
        userId: 'user2',
        score: 1001,
      };

      await addUsersToQueue([user1, user2]);

      // Mock external dependencies: no ignored pairs in database
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Users should be removed from queue
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: Match assignments should be created
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');

      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');
      expect(assignment1?.roomId).toBe(assignment2?.roomId);

      // Verify: Socket notifications should be sent
      expect(mockIo.of).toHaveBeenCalledWith('video-chat');
      expect(mockNamespace.emit).toHaveBeenCalledTimes(2);
    });

    it('should not match users who ignore each other', async () => {
      // Setup: Add users where user1 ignores user2
      const user1: QueueUser = {
        socketId: 'socket1',
        userId: 'user1',
        score: 1000,
      };
      const user2: QueueUser = {
        socketId: 'socket2',
        userId: 'user2',
        score: 1001,
      };

      await addUsersToQueue([user1, user2]);

      // Mock external dependencies: user1 ignores user2 in database
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
      ]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Users should remain in queue (no match possible)
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(2);

      // Verify: No match assignments should be created
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');
      expect(assignment1).toBeNull();
      expect(assignment2).toBeNull();

      // Verify: No socket notifications should be sent
      expect(mockNamespace.emit).not.toHaveBeenCalled();
    });

    it('should handle selective ignoring correctly', async () => {
      // Setup: 4 users where user1 ignores user2
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: user1 ignores user2
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
      ]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: All users should be matched and removed from queue
      // user1 ignores user2, so they can't match together
      // But user1 can match with user3, and user2 can match with user4
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: All users should have match assignments
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');
      const assignment3 =
        await MatchAssignmentService.getMatchAssignment('socket3');
      const assignment4 =
        await MatchAssignmentService.getMatchAssignment('socket4');

      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
      expect(assignment3).toBeTruthy();
      expect(assignment4).toBeTruthy();

      // Verify: user1 should be matched with user3 (first compatible match)
      expect(assignment1?.partnerSocketId).toBe('socket3');
      expect(assignment3?.partnerSocketId).toBe('socket1');

      // Verify: user2 should be matched with user4 (remaining users)
      expect(assignment2?.partnerSocketId).toBe('socket4');
      expect(assignment4?.partnerSocketId).toBe('socket2');

      // Verify: user1 and user2 are NOT matched together (due to ignore)
      expect(assignment1?.partnerSocketId).not.toBe('socket2');
      expect(assignment2?.partnerSocketId).not.toBe('socket1');
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase database errors gracefully', async () => {
      // Setup: Add users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock Supabase database error
      vi.mocked(SupabaseService.getIgnoredPairs).mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Execute and verify it throws
      await expect(
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG),
      ).rejects.toThrow('Database connection failed');

      // Verify: Users should still be in queue (transaction rollback)
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(2);
    });

    it('should handle Redis cache errors gracefully', async () => {
      // Setup: Add users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock Redis cache error but successful DB fallback
      redisClient.hmget = vi
        .fn()
        .mockRejectedValue(new Error('Redis connection failed'));
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute - should work despite Redis cache failure
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Users should be matched (fallback to DB worked)
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: Match assignments should be created
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');
      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should track performance metrics correctly', async () => {
      // Spy on PerformanceMetrics.logPerformanceMetrics
      const logPerformanceMetricsSpy = vi.spyOn(
        PerformanceMetrics,
        'logPerformanceMetrics',
      );

      // Setup: Add two users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Performance metrics should be logged
      expect(logPerformanceMetricsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          usersProcessed: 2,
          matchesCreated: 1,
          redisOperations: expect.any(Number),
          ignoredPairsChecked: expect.any(Number),
          processTimeMs: expect.any(Number),
        }),
        'Processing completed successfully',
      );
    });

    it('should handle default user batches efficiently', async () => {
      const config: MatchmakingConfig = {
        ...MatchMakingJobEntry._defaultMatchmakingConfig,
      };
      // Setup: Create many users
      const users: QueueUser[] = [];
      for (let i = 0; i < config.batchSize * 3; i++) {
        users.push({
          socketId: `socket${i}`,
          userId: `user${i}`,
          score: 1000 + i,
        });
      }

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs for clean matching
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      vi.useRealTimers(); // Use real timers for accurate performance measurement

      const startTime = performance.now();
      await MatchmakingOrchestrator.processQueue(mockIo, config);
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      vi.useFakeTimers(); // Restore fake timers

      // Performance assertions: Dynamic thresholds based on batch size and environment
      const isCI = process.env.CI === 'true';
      const baseTimePerUser = isCI ? 0.3 : 0.1; // ms per user (more lenient in CI)
      const baseOverhead = isCI ? 7 : 5; // ms base overhead (setup, teardown)
      const maxExpectedTime = config.batchSize * baseTimePerUser + baseOverhead;
      const minExpectedTime = 0.01; // Minimum sanity check (should take some time)

      expect(durationMs).toBeGreaterThan(minExpectedTime);
      expect(durationMs).toBeLessThan(maxExpectedTime);

      // Verify: Only batchSize users should be processed
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(users.length - config.batchSize);

      // Verify: Processed users should be matched
      for (let i = 0; i < config.batchSize; i += 2) {
        const assignment1 = await MatchAssignmentService.getMatchAssignment(
          `socket${i}`,
        );
        const assignment2 = await MatchAssignmentService.getMatchAssignment(
          `socket${i + 1}`,
        );

        expect(assignment1?.partnerSocketId).toBe(`socket${i + 1}`);
        expect(assignment2?.partnerSocketId).toBe(`socket${i}`);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue gracefully', async () => {
      // Execute with empty queue
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Queue should remain empty
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: No socket notifications should be sent
      expect(mockNamespace.emit).not.toHaveBeenCalled();
    });

    it('should handle single user in queue', async () => {
      // Setup: Add only one user to queue
      const user1: QueueUser = {
        socketId: 'socket1',
        userId: 'user1',
        score: 1000,
      };

      await addUsersToQueue([user1]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: User should remain in queue (no match possible)
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(1);

      // Verify: No match assignments should be created
      const assignment =
        await MatchAssignmentService.getMatchAssignment('socket1');
      expect(assignment).toBeNull();

      // Verify: No socket notifications should be sent
      expect(mockNamespace.emit).not.toHaveBeenCalled();
    });

    it('should handle odd number of users correctly', async () => {
      // Setup: Add 3 users (odd number)
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Two users should be matched, one should remain
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(1);

      // Verify: First two users should be matched
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');
      const assignment3 =
        await MatchAssignmentService.getMatchAssignment('socket3');

      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');
      expect(assignment3).toBeNull(); // Third user remains unmatched
    });

    it('should handle duplicate user IDs gracefully', async () => {
      // Setup: Add users with duplicate user ID but different socket IDs
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user1', score: 1001 }, // Same userId, different socketId
        { socketId: 'socket3', userId: 'user2', score: 1002 },
        { socketId: 'socket4', userId: 'user2', score: 1003 }, // Same userId, different socketId
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Algorithm should handle duplicates (match first occurrence of each)
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: All sockets should have assignments
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');
      const assignment3 =
        await MatchAssignmentService.getMatchAssignment('socket3');
      const assignment4 =
        await MatchAssignmentService.getMatchAssignment('socket4');

      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
      expect(assignment3).toBeTruthy();
      expect(assignment4).toBeTruthy();
    });

    it('should handle malformed queue data gracefully', async () => {
      // Setup: Add malformed data to queue directly
      const queueKey = MatchmakingQueueService.getZoneSpecificQueueKey();
      await redisClient.zadd(
        queueKey,
        1000,
        'malformed:data:without:proper:format',
      );
      await redisClient.zadd(queueKey, 1001, 'socket1__:__user1'); // Valid format

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute - should not crash
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Queue should be cleaned up
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(1); // Valid user remains (can't be matched alone), malformed filtered out
    });
  });

  describe('Configuration Variations', () => {
    it('should respect different batch sizes', async () => {
      const smallBatchConfig: MatchmakingConfig = {
        ...TEST_CONFIG,
        batchSize: 4,
      };

      // Setup: Add 6 users (more than batch size)
      const users: QueueUser[] = [];
      for (let i = 0; i < 6; i++) {
        users.push({
          socketId: `socket${i}`,
          userId: `user${i}`,
          score: 1000 + i,
        });
      }

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute with small batch size
      await MatchmakingOrchestrator.processQueue(mockIo, smallBatchConfig);

      // Verify: Only 4 users should be processed
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(2); // 6 - 4 = 2 remaining

      // Verify: 4 users should be matched (2 pairs)
      for (let i = 0; i < 4; i += 2) {
        const assignment1 = await MatchAssignmentService.getMatchAssignment(
          `socket${i}`,
        );
        const assignment2 = await MatchAssignmentService.getMatchAssignment(
          `socket${i + 1}`,
        );
        expect(assignment1?.partnerSocketId).toBe(`socket${i + 1}`);
        expect(assignment2?.partnerSocketId).toBe(`socket${i}`);
      }
    });

    it('should handle disabled performance metrics', async () => {
      const noMetricsConfig: MatchmakingConfig = {
        ...TEST_CONFIG,
        performance: {
          enableMetrics: false,
          slowProcessingThreshold: 500,
        },
      };

      // Spy on PerformanceMetrics
      const logPerformanceMetricsSpy = vi.spyOn(
        PerformanceMetrics,
        'logPerformanceMetrics',
      );

      // Setup: Add two users
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute with metrics disabled
      await MatchmakingOrchestrator.processQueue(mockIo, noMetricsConfig);

      // Verify: Performance metrics should not be logged
      expect(logPerformanceMetricsSpy).not.toHaveBeenCalled();

      // Verify: Matching should still work
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);
    });

    it('should handle different lua processing batch sizes', async () => {
      const largeLuaBatchConfig: MatchmakingConfig = {
        ...TEST_CONFIG,
        luaProcessingBatchSize: 20,
      };

      // Setup: Add many users
      const users: QueueUser[] = [];
      for (let i = 0; i < 10; i++) {
        users.push({
          socketId: `socket${i}`,
          userId: `user${i}`,
          score: 1000 + i,
        });
      }

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute with large lua batch size
      await MatchmakingOrchestrator.processQueue(mockIo, largeLuaBatchConfig);

      // Verify: All users should be processed in single lua batch
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);
    });
  });

  describe('Complex Ignore Scenarios', () => {
    it('should handle complex ignore chains', async () => {
      // Setup: 6 users with complex ignore relationships
      // user1 ignores user2, user2 ignores user3, user3 ignores user1
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
        { socketId: 'socket5', userId: 'user5', score: 1004 },
        { socketId: 'socket6', userId: 'user6', score: 1005 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: complex ignore chain
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user2', 'user3'],
        ['user3', 'user1'],
      ]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: All users should still be matched
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: Ignore relationships are respected
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');
      const assignment3 =
        await MatchAssignmentService.getMatchAssignment('socket3');

      // user1 should not be matched with user2 or user3
      expect(assignment1?.partnerSocketId).not.toBe('socket2');
      expect(assignment1?.partnerSocketId).not.toBe('socket3');

      // user2 should not be matched with user3
      expect(assignment2?.partnerSocketId).not.toBe('socket3');

      // user3 should not be matched with user1
      expect(assignment3?.partnerSocketId).not.toBe('socket1');
    });

    it('should handle mutual ignoring', async () => {
      // Setup: 4 users where user1 and user2 mutually ignore each other
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: mutual ignoring
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user2', 'user1'],
      ]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: All users should be matched
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: user1 and user2 are not matched together
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');

      expect(assignment1?.partnerSocketId).not.toBe('socket2');
      expect(assignment2?.partnerSocketId).not.toBe('socket1');
    });

    it('should handle all users ignoring each other scenario', async () => {
      // Setup: 4 users where everyone ignores everyone else
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: everyone ignores everyone
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user1', 'user3'],
        ['user1', 'user4'],
        ['user2', 'user1'],
        ['user2', 'user3'],
        ['user2', 'user4'],
        ['user3', 'user1'],
        ['user3', 'user2'],
        ['user3', 'user4'],
        ['user4', 'user1'],
        ['user4', 'user2'],
        ['user4', 'user3'],
      ]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: No users should be matched (no compatible pairs)
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(4);

      // Verify: No match assignments should be created
      for (let i = 1; i <= 4; i++) {
        const assignment = await MatchAssignmentService.getMatchAssignment(
          `socket${i}`,
        );
        expect(assignment).toBeNull();
      }
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent processing attempts', async () => {
      // Setup: Add users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute multiple concurrent processing attempts
      const promises = [
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG),
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG),
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG),
      ];

      // Wait for all to complete
      await Promise.allSettled(promises);

      // Verify: Queue should be empty (users processed only once)
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: All users should have valid assignments
      for (let i = 1; i <= 4; i++) {
        const assignment = await MatchAssignmentService.getMatchAssignment(
          `socket${i}`,
        );
        expect(assignment).toBeTruthy();
      }
    });

    it('should handle users joining during processing', async () => {
      // Setup: Add initial users
      const initialUsers: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(initialUsers);

      // Mock external dependencies with delay to simulate processing time
      vi.mocked(SupabaseService.getIgnoredPairs).mockImplementation(
        async () => {
          // Add new users while processing is happening
          const newUsers: QueueUser[] = [
            { socketId: 'socket3', userId: 'user3', score: 1002 },
            { socketId: 'socket4', userId: 'user4', score: 1003 },
          ];
          await addUsersToQueue(newUsers);

          return [];
        },
      );

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Initial users should be matched
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');

      // Verify: New users should remain in queue for next processing cycle
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(2);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle mixed cache hit/miss scenarios', async () => {
      // Setup: Add multiple users
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
      ];

      await addUsersToQueue(users);

      // Mock mixed cache scenario
      redisClient.hmget = vi.fn().mockResolvedValue([
        JSON.stringify(['user2']), // user1 cache hit - ignores user2
        null, // user2 cache miss
        JSON.stringify([]), // user3 cache hit - ignores no one
        null, // user4 cache miss
      ]);

      // Mock DB call for cache misses
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user4', 'user1'], // user4 ignores user1
      ]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: All users should be matched respecting ignore rules
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: Cache was used and updated appropriately
      expect(redisClient.hmget).toHaveBeenCalled();
      expect(SupabaseService.getIgnoredPairs).toHaveBeenCalledWith([
        'user2',
        'user4',
      ]);
      expect(redisClient.hmset).toHaveBeenCalled(); // Cache update for misses
    });

    it('should handle performance threshold violations', async () => {
      // Use real timers for this test since we need actual timing behavior
      vi.useRealTimers();

      const slowProcessingConfig: MatchmakingConfig = {
        ...TEST_CONFIG,
        performance: {
          enableMetrics: true,
          slowProcessingThreshold: 1, // Very low threshold
        },
      };

      // Spy on PerformanceMetrics
      const logPerformanceMetricsSpy = vi.spyOn(
        PerformanceMetrics,
        'logPerformanceMetrics',
      );

      // Setup: Add users
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock slow external dependency
      vi.mocked(SupabaseService.getIgnoredPairs).mockImplementation(
        async () => {
          // Simulate slow operation
          await new Promise((resolve) => setTimeout(resolve, 10));
          return [];
        },
      );

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, slowProcessingConfig);

      // Verify: Slow processing should be logged
      expect(logPerformanceMetricsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          processTimeMs: expect.any(Number),
        }),
        expect.stringContaining('slow'), // Should contain warning about slow processing
      );

      // Restore fake timers for other tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });
  });

  describe('Cache Integration', () => {
    it('should use Redis cache when available', async () => {
      // Setup: Add users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock Redis cache hit (user1 has cached ignore data)
      redisClient.hmget = vi.fn().mockResolvedValue([
        JSON.stringify([]), // user1 ignores no one
        null, // user2 cache miss
      ]);

      // Mock DB call for cache miss
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Redis cache was checked
      expect(redisClient.hmget).toHaveBeenCalled();

      // Verify: Database was queried for cache miss
      expect(SupabaseService.getIgnoredPairs).toHaveBeenCalledWith(['user2']);

      // Verify: Users were matched
      const queueCount = await MatchmakingQueueService._getQueueCount();
      expect(queueCount).toBe(0);
    });

    it('should update cache after database queries', async () => {
      // Setup: Add users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock cache miss for both users
      redisClient.hmget = vi.fn().mockResolvedValue([null, null]);

      // Mock DB response
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG);

      // Verify: Cache was updated after DB query
      expect(redisClient.hmset).toHaveBeenCalled();
      expect(redisClient.expire).toHaveBeenCalled();
    });
  });
});
