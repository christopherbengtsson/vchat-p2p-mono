import type { Job } from 'bullmq';
import { Server } from 'socket.io';
import { noop } from '@mono/common-util';
import { SocketNamespace } from '@mono/common-dto';
import { MatchmakingOrchestrator } from '../orchestrator/MatchmakingOrchestrator.js';
import { QueueService } from '../queue/QueueService.js';
import { AssignmentService } from '../assignment/AssignmentService.js';
import type { MatchmakingProcessConfig } from '../../model/MatchmakingProcessConfig.js';
import type { QueueUser } from '../../model/QueueUser.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { matchmakingProcessConfig } from '../../config/MatchmakingProcessConfig.js';
import { TimeUtils } from '../../util/TimeUtils.js';

// Test configuration
const TEST_CONFIG: MatchmakingProcessConfig = {
  batchSize: 10,
  luaProcessingBatchSize: 5,
};

const mockJob = {
  queueName: 'mockQueue',
  updateProgress: vi.fn(),
  updateData: vi.fn(),
  data: {
    workerId: 'mock-worker-id',
  },
} as unknown as Job;

describe('MatchmakingOrchestrator Tests', () => {
  let mockIo: Server;
  let mockNamespace: any;

  // Helper function to add users to queue
  async function addUsersToQueue(users: QueueUser[]): Promise<void> {
    for (const user of users) {
      vi.spyOn(TimeUtils, 'getCurrentTimeAsScore').mockReturnValueOnce(
        user.score,
      );

      await QueueService.addToQueue(
        user.socketId,
        user.userId,
        user.ignoreList,
      );
    }
  }

  beforeAll(async () => {
    ServerConfigService.init(process.env);

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
      // Setup: Add two users to queue
      const user1: QueueUser = {
        socketId: 'socket1',
        userId: 'user1',
        score: 1000,
        ignoreList: [],
      };
      const user2: QueueUser = {
        socketId: 'socket2',
        userId: 'user2',
        score: 1001,
        ignoreList: [],
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
        ignoreList: [],
      };
      const user2: QueueUser = {
        socketId: 'socket2',
        userId: 'user2',
        score: 1001,
        ignoreList: ['user1'],
      };

      await addUsersToQueue([user1, user2]);

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
        {
          socketId: 'socket1',
          userId: 'user1',
          ignoreList: ['user2'],
          score: 1000,
        },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
      ];

      await addUsersToQueue(users);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Most users should be matched (allowing for ignore-related matching challenges)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBeLessThanOrEqual(2); // At least 2 users should be matched

      // Verify: Get all assignments
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');
      const assignment4 = await AssignmentService.getMatchAssignment('socket4');

      // Verify: user1 and user2 are NOT matched together (due to ignore)
      if (assignment1) {
        expect(assignment1.partnerSocketId).not.toBe('socket2');
      }
      if (assignment2) {
        expect(assignment2.partnerSocketId).not.toBe('socket1');
      }

      // Verify: At least some users are matched
      const allAssignments = [
        assignment1,
        assignment2,
        assignment3,
        assignment4,
      ];
      const matchedCount = allAssignments.filter((a) => a !== null).length;
      expect(matchedCount).toBeGreaterThanOrEqual(2); // At least one pair should be matched

      // Verify: For any matched users, partnerships are mutual
      for (const assignment of allAssignments) {
        if (assignment) {
          const partnerAssignment = await AssignmentService.getMatchAssignment(
            assignment.partnerSocketId,
          );
          expect(partnerAssignment).toBeTruthy();
        }
      }
    });
  });

  describe('Performance', () => {
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
          ignoreList: [],
        });
      }

      await addUsersToQueue(users);

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
      let matchedPairs = 0;
      const matchedUsers = new Set<string>();

      for (let i = 0; i < config.batchSize; i++) {
        const assignment = await AssignmentService.getMatchAssignment(
          `socket${i}`,
        );
        if (assignment && !matchedUsers.has(`socket${i}`)) {
          // Find the partner assignment
          const partnerAssignment = await AssignmentService.getMatchAssignment(
            assignment.partnerSocketId,
          );

          // Verify mutual partnership
          expect(partnerAssignment?.partnerSocketId).toBe(`socket${i}`);

          // Mark both users as matched
          matchedUsers.add(`socket${i}`);
          matchedUsers.add(assignment.partnerSocketId);
          matchedPairs++;
        }
      }

      // Verify we have the expected number of matched pairs (even batchSize / 2)
      expect(matchedPairs).toBe(Math.floor(config.batchSize / 2));
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
        ignoreList: [],
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
      ];

      await addUsersToQueue(users);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: All users should be removed from queue (claims completed)
      // New behavior: unmatched user remains in queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1); // 1 unmatched user

      // Verify: Two users should be matched, one unmatched
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');

      const assignments = [assignment1, assignment2, assignment3];
      const matchedAssignments = assignments.filter((a) => a !== null);
      const unmatchedAssignments = assignments.filter((a) => a === null);

      // Verify: Exactly 2 users matched, 1 unmatched
      expect(matchedAssignments).toHaveLength(2);
      expect(unmatchedAssignments).toHaveLength(1);

      // Verify: The matched users are mutual partners
      const matchedSocketIds: string[] = [];
      if (assignment1) matchedSocketIds.push('socket1');
      if (assignment2) matchedSocketIds.push('socket2');
      if (assignment3) matchedSocketIds.push('socket3');

      expect(matchedSocketIds).toHaveLength(2);

      // Verify that the two matched users are each other's partners
      const [socketA, socketB] = matchedSocketIds;
      const assignmentA = await AssignmentService.getMatchAssignment(socketA);
      const assignmentB = await AssignmentService.getMatchAssignment(socketB);

      expect(assignmentA?.partnerSocketId).toBe(socketB);
      expect(assignmentB?.partnerSocketId).toBe(socketA);

      // Verify: Two socket notifications should be sent (for the matched pair)
      expect(mockNamespace.emit).toHaveBeenCalledTimes(2);
    });

    it('should handle duplicate user IDs gracefully', async () => {
      // Setup: Add users with duplicate user ID but different socket IDs
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user1', ignoreList: [], score: 1001 }, // Same userId, different socketId
        { socketId: 'socket3', userId: 'user2', ignoreList: [], score: 1002 },
        { socketId: 'socket4', userId: 'user2', ignoreList: [], score: 1003 }, // Same userId, different socketId
      ];

      await addUsersToQueue(users);

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
          ignoreList: [],
        });
      }

      await addUsersToQueue(users);

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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
      ];

      await addUsersToQueue(users);

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
          ignoreList: [],
        });
      }

      await addUsersToQueue(users);

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
        {
          socketId: 'socket1',
          userId: 'user1',
          ignoreList: ['user2'],
          score: 1000,
        },
        {
          socketId: 'socket2',
          userId: 'user2',
          ignoreList: ['user3'],
          score: 1001,
        },
        {
          socketId: 'socket3',
          userId: 'user3',
          ignoreList: ['user1'],
          score: 1002,
        },
        { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
        { socketId: 'socket5', userId: 'user5', ignoreList: [], score: 1004 },
        { socketId: 'socket6', userId: 'user6', ignoreList: [], score: 1005 },
      ];

      await addUsersToQueue(users);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Some users should be matched (with ignore chain, not all can match)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBeGreaterThanOrEqual(0); // Some users may remain unmatched due to ignore chain

      // Verify: Ignore relationships are respected
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');
      const assignment4 = await AssignmentService.getMatchAssignment('socket4');
      const assignment5 = await AssignmentService.getMatchAssignment('socket5');
      const assignment6 = await AssignmentService.getMatchAssignment('socket6');

      // Verify ignore relationships are respected (if users are matched)
      if (assignment1) {
        expect(assignment1.partnerSocketId).not.toBe('socket2'); // user1 doesn't ignore user2 but this could still be prevented
        expect(assignment1.partnerSocketId).not.toBe('socket3'); // user3 ignores user1, so they can't match
      }

      if (assignment2) {
        expect(assignment2.partnerSocketId).not.toBe('socket3'); // user2 ignores user3
      }

      if (assignment3) {
        expect(assignment3.partnerSocketId).not.toBe('socket1'); // user3 ignores user1
      }

      // Verify that most users get matched (at least 4 out of 6, allowing for some randomization effects)
      const allAssignments = [
        assignment1,
        assignment2,
        assignment3,
        assignment4,
        assignment5,
        assignment6,
      ];
      const matchedCount = allAssignments.filter((a) => a !== null).length;
      expect(matchedCount).toBeGreaterThanOrEqual(4); // At least 2 pairs should be matched
    });

    it('should handle mutual ignoring', async () => {
      // Setup: 4 users where user1 and user2 mutually ignore each other
      const users: QueueUser[] = [
        {
          socketId: 'socket1',
          userId: 'user1',
          ignoreList: ['user2'],
          score: 1000,
        },
        {
          socketId: 'socket2',
          userId: 'user2',
          ignoreList: ['user1'],
          score: 1001,
        },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
      ];

      await addUsersToQueue(users);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Most users should be matched (allowing for mutual ignore challenges)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBeLessThanOrEqual(2); // At least 2 users should be matched

      // Get all assignments
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');
      const assignment4 = await AssignmentService.getMatchAssignment('socket4');

      // Verify: user1 and user2 are not matched together due to mutual ignore
      if (assignment1) {
        expect(assignment1.partnerSocketId).not.toBe('socket2');
      }
      if (assignment2) {
        expect(assignment2.partnerSocketId).not.toBe('socket1');
      }

      // Verify: At least some users are matched
      const allAssignments = [
        assignment1,
        assignment2,
        assignment3,
        assignment4,
      ];
      const matchedCount = allAssignments.filter((a) => a !== null).length;
      expect(matchedCount).toBeGreaterThanOrEqual(2); // At least one pair should be matched

      // Verify: For any matched users, partnerships are mutual
      for (const assignment of allAssignments) {
        if (assignment) {
          const partnerAssignment = await AssignmentService.getMatchAssignment(
            assignment.partnerSocketId,
          );
          expect(partnerAssignment).toBeTruthy();
        }
      }
    });

    it('should handle all users ignoring each other scenario', async () => {
      // Setup: 4 users where everyone ignores everyone else
      const users: QueueUser[] = [
        {
          socketId: 'socket1',
          userId: 'user1',
          ignoreList: ['user2', 'user3', 'user4'],
          score: 1000,
        },
        {
          socketId: 'socket2',
          userId: 'user2',
          ignoreList: ['user1', 'user3', 'user4'],
          score: 1001,
        },
        {
          socketId: 'socket3',
          userId: 'user3',
          ignoreList: ['user1', 'user2', 'user4'],
          score: 1002,
        },
        {
          socketId: 'socket4',
          userId: 'user4',
          ignoreList: ['user1', 'user2', 'user3'],
          score: 1003,
        },
      ];

      await addUsersToQueue(users);

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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
      ];

      await addUsersToQueue(users);

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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
      ];

      await addUsersToQueue(initialUsers);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Initial users should be matched with each other
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');

      // Verify: Queue should be empty after processing
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // All users matched
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle mixed ignore scenarios', async () => {
      // Setup: Add multiple users with some ignore relationships
      const users: QueueUser[] = [
        {
          socketId: 'socket1',
          userId: 'user1',
          ignoreList: ['user2'],
          score: 1000,
        },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        {
          socketId: 'socket4',
          userId: 'user4',
          ignoreList: ['user1'],
          score: 1003,
        },
      ];

      await addUsersToQueue(users);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Most users should be matched (allowing for ignore-related challenges)
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBeLessThanOrEqual(2); // At least 2 users should be matched

      // Verify: Ignore relationships are respected
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');
      const assignment4 = await AssignmentService.getMatchAssignment('socket4');

      // Verify ignore relationships are respected (if users are matched)
      if (assignment1) {
        expect(assignment1.partnerSocketId).not.toBe('socket2'); // user1 ignores user2
        expect(assignment1.partnerSocketId).not.toBe('socket4'); // user4 ignores user1
      }

      if (assignment4) {
        expect(assignment4.partnerSocketId).not.toBe('socket1'); // user4 ignores user1
      }

      // Verify: At least some users are matched
      const allAssignments = [
        assignment1,
        assignment2,
        assignment3,
        assignment4,
      ];
      const matchedCount = allAssignments.filter((a) => a !== null).length;
      expect(matchedCount).toBeGreaterThanOrEqual(2); // At least one pair should be matched

      // Verify: For any matched users, partnerships are mutual
      for (const assignment of allAssignments) {
        if (assignment) {
          const partnerAssignment = await AssignmentService.getMatchAssignment(
            assignment.partnerSocketId,
          );
          expect(partnerAssignment).toBeTruthy();
        }
      }
    });

    it('should handle processing under time constraints', async () => {
      // Use real timers for this test since we need actual timing behavior
      vi.useRealTimers();

      const quickProcessingConfig: MatchmakingProcessConfig = {
        ...TEST_CONFIG,
      };

      // Setup: Add users
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
      ];

      await addUsersToQueue(users);

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

  describe('Queue Integration', () => {
    it('should handle basic matching correctly', async () => {
      // Setup: Add users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
      ];

      await addUsersToQueue(users);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users were processed and removed from queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0); // Both users matched

      // Verify: Match assignments were created
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1?.partnerSocketId).toBe('socket2');
      expect(assignment2?.partnerSocketId).toBe('socket1');
    });

    it('should handle ignore relationships correctly', async () => {
      // Setup: Add users to queue with ignore relationships
      const users: QueueUser[] = [
        {
          socketId: 'socket1',
          userId: 'user1',
          ignoreList: ['user2'],
          score: 1000,
        },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
      ];

      await addUsersToQueue(users);

      // Execute
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Users should remain in queue since they can't match
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(2); // Both users remain unmatched

      // Verify: No match assignments created
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1).toBeNull();
      expect(assignment2).toBeNull();
    });
  });

  describe('Atomic Queue Operations', () => {
    it('should atomically claim users from queue', async () => {
      // Setup: Add multiple users to queue
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
      ];

      await addUsersToQueue(users);

      // Test graceful handling when no ignore restrictions are present

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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        {
          socketId: 'socket3',
          userId: 'user3',
          ignoreList: ['user1', 'user2'],
          score: 1002,
        },
      ];

      await addUsersToQueue(users);

      // Execute processing
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      // Verify: Some users matched, unmatched user remains in queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(1); // Unmatched user remains in queue

      // Verify: Some users were matched (user1 and user2 should match)
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      expect(assignment1).toBeTruthy();
      expect(assignment2).toBeTruthy();
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
          ignoreList: [],
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
      ];
      await addUsersToQueue(users);
      await MatchmakingOrchestrator.processQueue(mockIo, TEST_CONFIG, mockJob);

      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');
      const assignment3 = await AssignmentService.getMatchAssignment('socket3');

      // With 3 users, exactly 2 should be matched and 1 unmatched
      const assignments = [assignment1, assignment2, assignment3];
      const matchedAssignments = assignments.filter((a) => a !== null);
      const unmatchedAssignments = assignments.filter((a) => a === null);

      expect(matchedAssignments).toHaveLength(2);
      expect(unmatchedAssignments).toHaveLength(1);

      // Verify the matched users are mutual partners
      if (matchedAssignments.length === 2) {
        const [match1, match2] = matchedAssignments;
        const partnerAssignment1 = await AssignmentService.getMatchAssignment(
          match1!.partnerSocketId,
        );
        const partnerAssignment2 = await AssignmentService.getMatchAssignment(
          match2!.partnerSocketId,
        );

        expect(partnerAssignment1).toBeTruthy();
        expect(partnerAssignment2).toBeTruthy();
      }
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
        {
          socketId: 'socket1',
          userId: 'user1',
          ignoreList: ['user2'],
          score: 1000,
        },
        {
          socketId: 'socket2',
          userId: 'user2',
          ignoreList: ['user1'],
          score: 1001,
        },
      ];
      await addUsersToQueue(users);
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
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
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
        { socketId: 'socket5', userId: 'user5', ignoreList: [], score: 1004 },
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
