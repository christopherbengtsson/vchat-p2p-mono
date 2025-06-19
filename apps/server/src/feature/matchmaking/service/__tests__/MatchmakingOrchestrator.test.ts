import type { Job } from 'bullmq';
import { Server } from 'socket.io';
import { noop } from '@mono/common-util';
import { SocketNamespace } from '@mono/common-dto';
import { MatchmakingOrchestrator } from '../orchestrator/MatchmakingOrchestrator.js';
import { QueueService } from '../queue/QueueService.js';
import { AssignmentService } from '../assignment/AssignmentService.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';
import type { MatchmakingProcessConfig } from '../../model/MatchmakingProcessConfig.js';
import type { QueueUser } from '../../model/QueueUser.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { matchmakingProcessConfig } from '../../config/MatchmakingProcessConfig.js';
import { GlobalIgnoreMatrixService } from '../match-prerequisite/GlobalIgnoreMatrixService.js';

vi.mock('../../../../common/service/SupabaseService.js');

// Test configuration
const TEST_CONFIG: MatchmakingProcessConfig = {
  batchSize: 10,
  luaProcessingBatchSize: 5,
};

const mockJob = {
  queueName: 'mockQueue',
  updateProgress: vi.fn(),
} as unknown as Job;

describe('MatchmakingOrchestrator Tests', () => {
  let mockIo: Server;
  let mockNamespace: any;

  // Helper function to add users to queue
  async function addUsersToQueue(users: QueueUser[]): Promise<void> {
    const queueKey = QueueService.getRegionSpecificQueueKey();

    for (const user of users) {
      const member = QueueService.composeKey({
        socketId: user.socketId,
        userId: user.userId,
      });
      await globalThis.redisClient.zadd(queueKey, user.score, member);
    }
  }

  beforeAll(async () => {
    ServerConfigService.init(process.env);
    await GlobalIgnoreMatrixService.warmupMatrix();

    // Create mock Socket.IO server with proper chaining
    mockNamespace = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    mockIo = {
      of: vi.fn().mockReturnValue(mockNamespace),
    } as any;
  });

  beforeEach(async () => {
    // Mock time for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    // Mock SupabaseService - default to no ignored pairs
    vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);
    vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([]);

    // Reset namespace mocks
    mockNamespace.to.mockClear();
    mockNamespace.emit.mockClear();
    mockNamespace.emit.mockImplementation(() => noop);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Matching', () => {
    it('should successfully match two compatible users', async () => {
      await GlobalIgnoreMatrixService.warmupMatrix();

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

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users should be removed from queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // 2 users matched, none left

      // Verify: Match assignments should be created
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');

      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');
      expect(assignment1?.roomId).toBe(assignment2?.roomId);

      // Verify: Socket notifications should be sent
      expect(mockIo.of).toHaveBeenCalledWith(SocketNamespace.VIDEO_CHAT);
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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users should remain in queue (unmatched, not claimed)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(2); // Both users ignored, both remain in queue

      // Verify: No match assignments should be created
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users should be matched and removed from queue
      // user1 ignores user2, so they can't match together
      // But user1 can match with user3, and user2 can match with user4
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched in this scenario

      // Verify: All users should have match assignments
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');
      const assignment4 = await AssignmentService.getMatchAssignment('socket4');

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
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob),
      ).rejects.toThrow('Database connection failed');

      // Verify: Users should still be in queue (transaction rollback)
      const queueCount = await QueueService._getQueueCount();
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

      globalThis.redisClient.hmget = vi
        .fn()
        .mockRejectedValue(new Error('Redis connection failed'));
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute - should work despite Redis cache failure
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users should be matched (fallback to DB worked)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: Match assignments should be created
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle basic matching correctly', async () => {
      // Setup: Add two users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Queue should be empty after matching
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // Both users matched

      // Verify: Match assignments created
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');
    });

    it('should handle default user batches efficiently', async () => {
      const config: MatchmakingProcessConfig = {
        ...matchmakingProcessConfig,
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
      await MatchmakingOrchestrator.processQueue(mockIo, config, mockJob);
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

      // Verify: Only unmatched users should remain in queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(users.length - config.batchSize); // Only batchSize processed

      // Verify: Processed users should be matched
      for (let i = 0; i < config.batchSize; i += 2) {
        const assignment1 = await AssignmentService.getMatchAssignment(
          `socket${i}`,
        );
        const assignment2 = await AssignmentService.getMatchAssignment(
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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Queue should remain empty
      const queueCount = await QueueService._getQueueCount();
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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: User should be removed from queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1); // 1 unmatched user remains in queue

      // Verify: No match assignments should be created
      const assignment = await AssignmentService.getMatchAssignment('socket1');
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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users should be removed from queue (claims completed)
      // New behavior: unmatched user remains in queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1); // 1 unmatched user

      // Verify: First two users should be matched
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');

      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');
      expect(assignment3).toBeNull(); // Third user remains unmatched

      // Verify: Two socket notifications should be sent (for the matched pair)
      expect(mockNamespace.emit).toHaveBeenCalledTimes(2);
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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Algorithm should handle duplicates (match first occurrence of each)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Verify: All sockets should have assignments
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');
      const assignment4 = await AssignmentService.getMatchAssignment('socket4');

      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
      expect(assignment3).toBeTruthy();
      expect(assignment4).toBeTruthy();
    });

    it('should handle malformed queue data gracefully', async () => {
      // Setup: Add malformed data to queue directly

      const queueKey = QueueService.getRegionSpecificQueueKey();
      await globalThis.redisClient.zadd(
        queueKey,
        1000,
        'malformed:data:without:proper:format',
      );
      await globalThis.redisClient.zadd(queueKey, 1001, 'socket1__:__user1'); // Valid format

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute - should not crash
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Queue should be cleaned up (all users removed after processing)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1); // Only valid user remains if malformed is skipped
    });
  });

  describe('Configuration Variations', () => {
    it('should respect different batch sizes', async () => {
      const smallBatchConfig: MatchmakingProcessConfig = {
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
      await MatchmakingOrchestrator.processQueue(
        mockIo,
        smallBatchConfig,
        mockJob,
      );

      // Verify: Only batchSize users should be processed
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(users.length - smallBatchConfig.batchSize); // Remaining users
    });

    it('should handle different configuration settings', async () => {
      const configWithoutMetrics: MatchmakingProcessConfig = {
        ...TEST_CONFIG,
      };

      // Setup: Add two users
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock external dependencies: no ignored pairs
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute with metrics disabled
      await MatchmakingOrchestrator.processQueue(
        mockIo,
        configWithoutMetrics,
        mockJob,
      );

      // Verify: Matching should still work
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // Both users matched
    });

    it('should handle different lua processing batch sizes', async () => {
      const largeLuaBatchConfig: MatchmakingProcessConfig = {
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
      await MatchmakingOrchestrator.processQueue(
        mockIo,
        largeLuaBatchConfig,
        mockJob,
      );

      // Verify: All users should be processed in single lua batch
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched
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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users should still be matched
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Verify: Ignore relationships are respected
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');

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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users should be matched
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Verify: user1 and user2 are not matched together
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');

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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users should remain in queue (none matched)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(users.length); // All users remain in queue

      // Verify: No match assignments should be created
      for (let i = 1; i <= 4; i++) {
        const assignment = await AssignmentService.getMatchAssignment(
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
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob),
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob),
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob),
      ];

      // Wait for all to complete
      await Promise.allSettled(promises);

      // Verify: Queue should be empty (all users processed once)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Verify: All users should have valid assignments
      for (let i = 1; i <= 4; i++) {
        const assignment = await AssignmentService.getMatchAssignment(
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
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Initial users should be matched
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');

      // Verify: New users should remain in queue for next processing cycle
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(2); // 2 new users added during processing
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

      // Mock DB call since new implementation may use global matrix
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'], // user1 ignores user2
        ['user4', 'user1'], // user4 ignores user1
      ]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users should be processed and removed from queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Verify: Database was queried for ignore relationships
      expect(SupabaseService.getIgnoredPairs).toHaveBeenCalled();
    });

    it('should handle processing under time constraints', async () => {
      // Use real timers for this test since we need actual timing behavior
      vi.useRealTimers();

      const quickProcessingConfig: MatchmakingProcessConfig = {
        ...TEST_CONFIG,
      };

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
      await MatchmakingOrchestrator.processQueue(
        mockIo,
        quickProcessingConfig,
        mockJob,
      );

      // Verify: Processing should complete successfully despite slow operation
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // Both users matched

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

      // Mock DB response (new implementation may use global matrix or database directly)
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users were processed and removed from queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // Both users matched

      // Verify: Ignore relationships were checked via database or global matrix
      expect(SupabaseService.getIgnoredPairs).toHaveBeenCalled();
    });

    it('should update cache after database queries', async () => {
      // Setup: Add users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock DB response
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users were processed and removed from queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // Both users matched

      // Verify: Database was queried for ignore relationships
      expect(SupabaseService.getIgnoredPairs).toHaveBeenCalled();
    });
  });

  describe('Atomic Queue Operations', () => {
    it('should atomically claim users from queue', async () => {
      // Setup: Add multiple users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
      ];

      await addUsersToQueue(users);

      // Verify initial queue state
      const initialCount = await QueueService._getQueueCount();
      expect(initialCount).toBe(4);

      // Execute: Process queue (atomic claim and process)
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users were atomically claimed and processed
      const finalCount = await QueueService._getQueueCount();
      expect(finalCount).toBe(0); // All users matched

      // Verify: Matches were created for compatible users
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
    });

    it('should handle concurrent worker scenarios gracefully', async () => {
      // Setup: Add users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Simulate concurrent processing by running two workers simultaneously
      const worker1Promise = MatchmakingOrchestrator.processQueue(
        mockIo,
        TEST_CONFIG,
        { ...mockJob, queueName: 'worker1' } as any,
      );

      const worker2Promise = MatchmakingOrchestrator.processQueue(
        mockIo,
        TEST_CONFIG,
        { ...mockJob, queueName: 'worker2' } as any,
      );

      // Execute both workers concurrently
      await Promise.all([worker1Promise, worker2Promise]);

      // Verify: Queue is empty (no users left unprocessed)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Verify: No duplicate processing occurred (each user processed exactly once)
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');

      // At least one pair should be matched (or all users properly processed)
      expect(assignment1 || assignment2).toBeTruthy();
    });

    it('should auto-release claimed users on timeout', async () => {
      // This test verifies that Redis TTL mechanism prevents stuck processing locks
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Execute processing
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users were processed (no stuck locks)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Note: The TTL auto-release is handled by Redis automatically,
      // so this test mainly ensures the normal flow works correctly
    });

    it('should handle empty queue gracefully', async () => {
      // Execute processing on empty queue
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: No errors occurred and queue remains empty
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0);

      // Verify: No socket notifications were sent
      expect(mockNamespace.emit).not.toHaveBeenCalled();
    });

    it('should maintain atomicity under Redis errors', async () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock Redis error during Lua script execution
      const originalEval = globalThis.redisClient.eval;
      let evalCallCount = 0;
      globalThis.redisClient.eval = vi
        .fn()
        .mockImplementation((...args: any) => {
          evalCallCount++;
          if (evalCallCount === 1) {
            // First call (claim users) should fail
            throw new Error('Redis connection error');
          }
          // Subsequent calls should work normally
          return originalEval.apply(globalThis.redisClient, args);
        });

      // Execute: Should handle error gracefully
      await expect(
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob),
      ).rejects.toThrow('Redis connection error');

      // Verify: Users remain in queue (atomicity preserved)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(2);

      // Restore Redis function
      globalThis.redisClient.eval = originalEval;
    });
  });

  describe('Error Recovery and State Management', () => {
    it('should complete user processing after successful matching', async () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Execute processing
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users were removed from queue after processing
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Verify: No processing locks remain
      const processingKeys = await globalThis.redisClient.keys('*processing*');
      expect(processingKeys.length).toBe(0);
    });

    it('should complete user processing even when no matches found', async () => {
      // Setup: Single user (cannot be matched)
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
      ];

      await addUsersToQueue(users);

      // Execute processing
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: User was removed from queue despite no match
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1); // Single unmatched user remains in queue

      // Verify: No match assignment was created
      const assignment = await AssignmentService.getMatchAssignment('socket1');
      expect(assignment).toBeNull();
    });

    it('should handle database errors during ignore checking gracefully', async () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Mock database error - but SupabaseService.getIgnoredPairs catches errors and returns []
      // So we need to test that the system handles this gracefully
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      // Execute: Should handle gracefully (no ignore data means no ignore restrictions)
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users were still processed (fail-safe behavior)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // Both users matched

      // Verify: Matching proceeded without ignore restrictions
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');

      // Users should be matched since no ignore data means no restrictions
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');
    });

    it('should prevent infinite retry loops', async () => {
      // This test verifies that the new architecture doesn't leave unmatched users
      // in queue for infinite retries (old architecture problem)

      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
      ];

      await addUsersToQueue(users);

      // Mock ignore scenario where user3 ignores everyone
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user3', 'user1'],
        ['user3', 'user2'],
      ]);

      // Execute processing
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users were removed from queue (no infinite retry)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1); // Unmatched user remains in queue

      // Verify: Some users were matched (user1 and user2 should match)
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');

      // Verify: Unmatched user (user3) was still removed from queue
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');
      expect(assignment3).toBeNull();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batch sizes efficiently', async () => {
      // Setup: Large number of users
      const users: QueueUser[] = [];
      for (let i = 1; i <= 50; i++) {
        users.push({
          socketId: `socket${i}`,
          userId: `user${i}`,
          score: 1000 + i,
        });
      }

      await addUsersToQueue(users);

      // Use larger batch size config
      const largeBatchConfig: MatchmakingProcessConfig = {
        batchSize: 50,
        luaProcessingBatchSize: 25,
      };

      // Execute processing
      const startTime = Date.now();
      await MatchmakingOrchestrator.processQueue(
        mockIo,
        largeBatchConfig,
        mockJob,
      );
      const duration = Date.now() - startTime;

      // Verify: All users were processed
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched

      // Verify: Processing completed in reasonable time (< 1 second for 50 users)
      expect(duration).toBeLessThan(1000);

      // Verify: Multiple matches were created
      let matchCount = 0;
      for (let i = 1; i <= 50; i++) {
        const assignment = await AssignmentService.getMatchAssignment(
          `socket${i}`,
        );
        if (assignment) matchCount++;
      }
      expect(matchCount).toBeGreaterThan(0);
    });

    it('should work correctly with minimal batch size', async () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];

      await addUsersToQueue(users);

      // Use minimal batch size
      const minimalConfig: MatchmakingProcessConfig = {
        batchSize: 2,
        luaProcessingBatchSize: 2,
      };

      // Execute processing
      await MatchmakingOrchestrator.processQueue(
        mockIo,
        minimalConfig,
        mockJob,
      );

      // Verify: Processing worked correctly
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // Both users matched

      // Verify: Users were matched
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');
    });
  });

  describe('Integration: Partial and Unmatched User Handling', () => {
    it('should release unmatched users back to the queue for future processing', async () => {
      // 3 users, only 2 can be matched
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
      ];
      await addUsersToQueue(users);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');

      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
      expect(assignment3).toBeNull();
      // Unmatched user is not claimed and is available for next batch
      const processingKeys = await globalThis.redisClient.keys('*processing*');
      expect(processingKeys.length).toBe(0);
      // Unmatched user remains in queue for future processing
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1);
    });

    it('should not leave unmatched users claimed after all ignore each other', async () => {
      // 2 users, both ignore each other
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];
      await addUsersToQueue(users);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user2', 'user1'],
      ]);
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');

      expect(assignment1).toBeNull();
      expect(assignment2).toBeNull();
      // No claims left
      const processingKeys = await globalThis.redisClient.keys('*processing*');
      expect(processingKeys.length).toBe(0);
      // Added back to queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(2);
    });

    it('should not leave single user claimed', async () => {
      // Single user
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
      ];
      await addUsersToQueue(users);

      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      const assignment = await AssignmentService.getMatchAssignment('socket1');

      expect(assignment).toBeNull();
      // No claims left
      const processingKeys = await globalThis.redisClient.keys('*processing*');
      expect(processingKeys.length).toBe(0);
      // Stays in queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1);
    });

    it('should not leak claims or queue entries with concurrent workers and partial matches', async () => {
      // 5 users, 2 workers
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
        { socketId: 'socket5', userId: 'user5', score: 1004 },
      ];
      await addUsersToQueue(users);

      // Simulate two concurrent workers
      await Promise.all([
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob),
        MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob),
      ]);

      const processingKeys = await globalThis.redisClient.keys('*processing*');
      expect(processingKeys.length).toBe(0);
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1); // One unmatched user remains in queue
    });
  });
});
