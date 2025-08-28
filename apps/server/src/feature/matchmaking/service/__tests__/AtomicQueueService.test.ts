import { SocketNamespace } from '@mono/common-dto';
import { AtomicQueueService } from '../queue/AtomicQueueService.js';
import { QueueService } from '../queue/QueueService.js';
import type { MatchmakingProcessConfig } from '../../model/MatchmakingProcessConfig.js';
import type { QueueUser } from '../../model/QueueUser.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { TimeUtils } from '../../util/TimeUtils.js';
import { AssignmentService } from '../assignment/AssignmentService.js';
import { SocketServer } from '../../../socket-io/server/SocketServer.js';
import { REDIS_KEY } from '../../model/RedisKey.js';

vi.mock('../../util/TimeUtils.js', async () => ({
  ...(await vi.importActual('../../util/TimeUtils.js')),
}));

// Mock the AssignmentService
vi.mock('../assignment/AssignmentService.js', () => ({
  AssignmentService: {
    getMatchAssignment: vi.fn().mockResolvedValue(null),
  },
}));

// Mock the SocketServer
vi.mock('../../../socket-io/server/SocketServer.js', () => ({
  SocketServer: {
    io: {
      of: vi.fn().mockReturnValue({
        sockets: {
          has: vi.fn().mockReturnValue(true),
          keys: vi.fn().mockReturnValue(['socket1', 'socket2', 'socket3']),
        },
      }),
    },
  },
}));

describe('AtomicQueueService - Concurrent Processing Tests', () => {
  const TEST_CONFIG: MatchmakingProcessConfig = {
    batchSize: 5,
    luaProcessingBatchSize: 3,
  };

  // Helper to generate unique job IDs for each test
  const generateTestJobId = (): string => {
    return `test-job-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  };

  // Helper to add users to queue
  const addUsersToQueue = async (count: number): Promise<QueueUser[]> => {
    const users: QueueUser[] = [];
    const queueKey = QueueService.getRegionSpecificQueueKey();

    for (let i = 0; i < count; i++) {
      const socketId = `socket${i}`;
      const userId = `user${i}`;
      const score = 1000 + i;
      const ignoreList: string[] = [];
      const key = QueueService.composeKey({ socketId, userId });

      await globalThis.redisClient.zadd(queueKey, score, key);
      users.push({ socketId, userId, ignoreList, score });
    }

    return users;
  };

  // Helper to check processing claims
  const getProcessingClaims = async (): Promise<string[]> => {
    const queueKey = QueueService.getRegionSpecificQueueKey();
    const processingKey = `${queueKey}:processing`;
    return await globalThis.redisClient.keys(`${processingKey}:*`);
  };

  // Helper to verify queue state
  const getQueueCount = async (): Promise<number> => {
    const queueKey = QueueService.getRegionSpecificQueueKey();
    return await globalThis.redisClient.zcard(queueKey);
  };

  beforeAll(() => {
    ServerConfigService.init(process.env);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Worker Operations', () => {
    it('should claim users from queue successfully', async () => {
      const users = await addUsersToQueue(10);

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );

      // Should claim batch size number of users
      expect(claimedUsers).toHaveLength(TEST_CONFIG.batchSize);

      // Should claim oldest users first (FIFO)
      for (let i = 0; i < TEST_CONFIG.batchSize; i++) {
        expect(claimedUsers[i].socketId).toBe(users[i].socketId);
        expect(claimedUsers[i].userId).toBe(users[i].userId);
        expect(claimedUsers[i].score).toBe(users[i].score);
      }

      // Queue should have remaining users
      const remainingCount = await getQueueCount();
      expect(remainingCount).toBe(users.length - TEST_CONFIG.batchSize);

      // Processing claims should exist
      const claims = await getProcessingClaims();
      expect(claims).toHaveLength(TEST_CONFIG.batchSize);
    });

    it('should return empty array when queue is empty', async () => {
      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );

      expect(claimedUsers).toEqual([]);
      expect(await getQueueCount()).toBe(0);
      expect(await getProcessingClaims()).toHaveLength(0);
    });

    it('should claim partial batch when fewer users available', async () => {
      await addUsersToQueue(3); // Less than batch size

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );

      expect(claimedUsers).toHaveLength(3);
      expect(await getQueueCount()).toBe(0);
      expect(await getProcessingClaims()).toHaveLength(3);
    });

    it('should complete processing and remove claims', async () => {
      await addUsersToQueue(5);

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );
      expect(await getProcessingClaims()).toHaveLength(5);

      await AtomicQueueService.completeUserProcessing(
        claimedUsers,
        'mock-workerId',
      );

      // Claims should be removed
      expect(await getProcessingClaims()).toHaveLength(0);

      // Queue should remain empty (users were already removed during claim)
      expect(await getQueueCount()).toBe(0);
    });

    it('should release claimed users back to queue', async () => {
      await addUsersToQueue(5);

      await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );
      expect(await getQueueCount()).toBe(0);
      expect(await getProcessingClaims()).toHaveLength(5);

      const releasedCount =
        await AtomicQueueService.releaseClaimedUsers('mock-workerId');

      expect(releasedCount).toBe(5);
      expect(await getQueueCount()).toBe(5); // Users returned to queue
      expect(await getProcessingClaims()).toHaveLength(0); // Claims removed
    });
  });

  describe('Concurrent Workers - Race Condition Prevention', () => {
    it('should prevent duplicate claims by concurrent workers', async () => {
      const users = await addUsersToQueue(10);
      const worker1Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());
      const worker2Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());

      // Simulate concurrent claiming
      const [claimed1, claimed2] = await Promise.all([
        AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, worker1Id),
        AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, worker2Id),
      ]);

      // Total claimed should not exceed available users
      const totalClaimed = claimed1.length + claimed2.length;
      expect(totalClaimed).toBeLessThanOrEqual(users.length);

      // No user should be claimed by both workers
      const claimed1Ids = new Set(claimed1.map((u) => u.userId));
      const claimed2Ids = new Set(claimed2.map((u) => u.userId));

      for (const userId of claimed1Ids) {
        expect(claimed2Ids.has(userId)).toBe(false);
      }

      // Queue + claims should equal original count
      const remainingInQueue = await getQueueCount();
      const activeClaims = await getProcessingClaims();
      expect(remainingInQueue + activeClaims.length).toBe(users.length);
    });

    it('should handle multiple workers claiming from same queue', async () => {
      const users = await addUsersToQueue(20);
      const workerCount = 4;
      const workers = Array.from(
        { length: workerCount },
        (i: number) => `workerId-${i}`,
      );

      // All workers claim concurrently
      const claimPromises = workers.map((workerId) =>
        AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, workerId),
      );
      const results = await Promise.all(claimPromises);

      // Collect all claimed users
      const allClaimedUsers = results.flat();
      const claimedUserIds = new Set(allClaimedUsers.map((u) => u.userId));

      // No duplicates should exist
      expect(claimedUserIds.size).toBe(allClaimedUsers.length);

      // Total claimed should not exceed available
      expect(allClaimedUsers.length).toBeLessThanOrEqual(users.length);

      // Verify atomicity: queue + claims = original count
      const remainingInQueue = await getQueueCount();
      const activeClaims = await getProcessingClaims();
      expect(remainingInQueue + activeClaims.length).toBe(users.length);
    });

    it('should maintain FIFO order across concurrent workers', async () => {
      const users = await addUsersToQueue(10);
      const worker1Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());
      const worker2Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());

      const [claimed1, claimed2] = await Promise.all([
        AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, worker1Id),
        AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, worker2Id),
      ]);

      const allClaimed = [...claimed1, ...claimed2].sort(
        (a, b) => a.score - b.score,
      );

      // Verify claimed users are from the beginning of the queue (oldest first)
      for (let i = 0; i < allClaimed.length; i++) {
        expect(allClaimed[i].score).toBe(users[i].score);
      }
    });
  });

  describe('TTL and Auto-Expiry', () => {
    it('should auto-expire claims after TTL', async () => {
      await addUsersToQueue(3);

      await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );

      // Verify claims exist
      expect(await getProcessingClaims()).toHaveLength(3);

      // Wait for TTL expiry (5 seconds + buffer)
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Claims should be expired
      expect(await getProcessingClaims()).toHaveLength(0);
    }, 10000); // Increase test timeout

    it('should allow re-claiming of expired users', async () => {
      await addUsersToQueue(3);
      const worker1Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());
      const worker2Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());

      // Worker 1 claims users
      await AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, worker1Id);
      expect(await getQueueCount()).toBe(0);
      expect(await getProcessingClaims()).toHaveLength(3);

      // Wait for TTL expiry
      await new Promise((resolve) => setTimeout(resolve, 6000));
      expect(await getProcessingClaims()).toHaveLength(0);

      // Worker 2 should be able to process (claims expired, but users were removed from queue)
      // This tests that the system handles TTL expiry correctly
      const claimed2 = await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        worker2Id,
      );
      expect(claimed2).toHaveLength(0); // Users were removed from queue during first claim
    }, 10000);

    it('should verify TTL is set correctly on claims', async () => {
      await addUsersToQueue(2);

      await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );

      const claims = await getProcessingClaims();
      expect(claims).toHaveLength(2);

      // Check TTL on claims
      for (const claimKey of claims) {
        const ttl = await globalThis.redisClient.ttl(claimKey);
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(5); // Should be <= 5 seconds
      }
    });
  });

  describe('Error Recovery and Security', () => {
    it('should only complete processing for owned claims', async () => {
      await addUsersToQueue(4);
      const worker1Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());
      const worker2Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());

      // Worker 1 claims 2 users, Worker 2 claims 2 users
      const config = { ...TEST_CONFIG, batchSize: 2 };
      const [claimed1, claimed2] = await Promise.all([
        AtomicQueueService.claimUsersFromQueue(config, worker1Id),
        AtomicQueueService.claimUsersFromQueue(config, worker2Id),
      ]);

      expect(claimed1).toHaveLength(2);
      expect(claimed2).toHaveLength(2);
      expect(await getProcessingClaims()).toHaveLength(4);

      // Worker 1 tries to complete processing for Worker 2's claims
      await AtomicQueueService.completeUserProcessing(claimed2, worker1Id);

      // Worker 2's claims should still exist (security check prevented deletion)
      const remainingClaims = await getProcessingClaims();
      expect(remainingClaims.length).toBeGreaterThan(0);

      // Worker 2 completes its own processing
      await AtomicQueueService.completeUserProcessing(claimed2, worker2Id);

      // Now Worker 1's claims should remain, Worker 2's should be gone
      const finalClaims = await getProcessingClaims();
      expect(finalClaims).toHaveLength(2); // Only Worker 1's claims remain
    });

    it('should only release owned claims during error recovery', async () => {
      await addUsersToQueue(4);
      const worker1Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());
      const worker2Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());

      const config = { ...TEST_CONFIG, batchSize: 2 };
      await Promise.all([
        AtomicQueueService.claimUsersFromQueue(config, worker1Id),
        AtomicQueueService.claimUsersFromQueue(config, worker2Id),
      ]);

      expect(await getProcessingClaims()).toHaveLength(4);
      expect(await getQueueCount()).toBe(0);

      // Worker 1 releases its claims
      const releasedCount =
        await AtomicQueueService.releaseClaimedUsers(worker1Id);

      expect(releasedCount).toBe(2); // Only released own claims
      expect(await getProcessingClaims()).toHaveLength(2); // Worker 2's claims remain
      expect(await getQueueCount()).toBe(2); // Worker 1's users returned to queue
    });

    it('should handle Redis connection errors gracefully', async () => {
      await addUsersToQueue(3);

      // Mock Redis to fail
      const originalEval = globalThis.redisClient.eval;
      vi.spyOn(globalThis.redisClient, 'eval').mockRejectedValueOnce(
        new Error('Redis connection failed'),
      );

      await expect(
        AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, 'mock-workerId'),
      ).rejects.toThrow('Redis connection failed');

      // Restore Redis
      globalThis.redisClient.eval = originalEval;

      // Queue should remain unchanged
      expect(await getQueueCount()).toBe(3);
      expect(await getProcessingClaims()).toHaveLength(0);
    });

    it('should handle empty user list in completeUserProcessing', async () => {
      // Should not throw with empty array
      await expect(
        AtomicQueueService.completeUserProcessing([], 'mock-workerId'),
      ).resolves.not.toThrow();
    });

    it('should fetch ignore lists when claiming users from queue', async () => {
      // Setup users in queue with ignore lists
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const user1Key = QueueService.composeKey({
        socketId: 'socket1',
        userId: 'user1',
      });
      const user2Key = QueueService.composeKey({
        socketId: 'socket2',
        userId: 'user2',
      });

      await globalThis.redisClient.zadd(queueKey, 1000, user1Key);
      await globalThis.redisClient.zadd(queueKey, 1001, user2Key);

      // Set up ignore lists in Redis
      await globalThis.redisClient.set(
        REDIS_KEY.getIgnoreKey(user1Key),
        JSON.stringify(['user3', 'user4']),
      );
      await globalThis.redisClient.set(
        REDIS_KEY.getIgnoreKey(user2Key),
        JSON.stringify(['user5']),
      );

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        { ...TEST_CONFIG, batchSize: 2 },
        'mock-workerId',
      );

      expect(claimedUsers).toHaveLength(2);

      // Verify ignore lists are populated correctly
      const user1 = claimedUsers.find((u) => u.socketId === 'socket1');
      const user2 = claimedUsers.find((u) => u.socketId === 'socket2');

      expect(user1?.ignoreList).toEqual(['user3', 'user4']);
      expect(user2?.ignoreList).toEqual(['user5']);
    });

    it('should handle missing ignore lists gracefully', async () => {
      // Setup users in queue without ignore lists
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const user1Key = QueueService.composeKey({
        socketId: 'socket1',
        userId: 'user1',
      });

      await globalThis.redisClient.zadd(queueKey, 1000, user1Key);
      // No ignore list set in Redis

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        { ...TEST_CONFIG, batchSize: 1 },
        'mock-workerId',
      );

      expect(claimedUsers).toHaveLength(1);
      expect(claimedUsers[0].ignoreList).toEqual([]); // Should default to empty array
    });

    it('should delete ignore lists when completing user processing', async () => {
      // Setup users in queue with ignore lists
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const user1Key = QueueService.composeKey({
        socketId: 'socket1',
        userId: 'user1',
      });

      await globalThis.redisClient.zadd(queueKey, 1000, user1Key);

      // Set up ignore list in Redis
      const ignoreListKey = REDIS_KEY.getIgnoreKey(user1Key);
      await globalThis.redisClient.set(
        ignoreListKey,
        JSON.stringify(['user3', 'user4']),
      );

      // Verify ignore list exists
      expect(await globalThis.redisClient.get(ignoreListKey)).not.toBeNull();

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        { ...TEST_CONFIG, batchSize: 1 },
        'mock-workerId',
      );

      // Complete processing (should delete ignore list)
      await AtomicQueueService.completeUserProcessing(
        claimedUsers,
        'mock-workerId',
      );

      // Verify ignore list is deleted
      expect(await globalThis.redisClient.get(ignoreListKey)).toBeNull();
    });
  });

  describe('Load Testing and Performance', () => {
    it('should handle high concurrency without race conditions', async () => {
      const userCount = 50;
      const workerCount = 10;

      await addUsersToQueue(userCount);
      const workers = Array.from({ length: workerCount }, () =>
        AtomicQueueService.generateWorkerId(generateTestJobId()),
      );

      // All workers claim concurrently
      const claimPromises = workers.map((workerId) =>
        AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, workerId),
      );
      const results = await Promise.all(claimPromises);

      const allClaimedUsers = results.flat();
      const uniqueUsers = new Set(allClaimedUsers.map((u) => u.userId));

      // Verify no duplicates
      expect(uniqueUsers.size).toBe(allClaimedUsers.length);

      // Verify total consistency
      const remainingInQueue = await getQueueCount();
      const activeClaims = await getProcessingClaims();
      expect(remainingInQueue + activeClaims.length).toBe(userCount);
    });

    it('should maintain performance under concurrent load', async () => {
      const userCount = 100;
      const workerCount = 5;

      await addUsersToQueue(userCount);
      const workers = Array.from({ length: workerCount }, () =>
        AtomicQueueService.generateWorkerId(generateTestJobId()),
      );

      const startTime = performance.now();

      const claimPromises = workers.map((workerId) =>
        AtomicQueueService.claimUsersFromQueue(TEST_CONFIG, workerId),
      );
      await Promise.all(claimPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Integration with Real Queue Scenarios', () => {
    it('should work correctly with MatchmakingQueueService operations', async () => {
      // Add users using actual service
      await QueueService.addToQueue('socket1', 'user1', []);
      await QueueService.addToQueue('socket2', 'user2', []);
      await QueueService.addToQueue('socket3', 'user3', []);

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );

      expect(claimedUsers).toHaveLength(3);
      expect(claimedUsers[0].socketId).toBe('socket1');
      expect(claimedUsers[1].socketId).toBe('socket2');
      expect(claimedUsers[2].socketId).toBe('socket3');

      // Verify users are removed from queue
      const queueCount = await QueueService._getQueueCount();
      expect(queueCount).toBe(0);
    });

    it('should handle complex Redis key formats correctly', async () => {
      const complexUsers = [
        { socketId: 'socket.with.dots', userId: 'user@domain.com' },
        { socketId: 'socket-with-dashes', userId: 'user_with_underscores' },
        { socketId: 'socket:with:colons', userId: 'user/with/slashes' },
      ];

      // Add using service to ensure proper key formatting
      for (const user of complexUsers) {
        await QueueService.addToQueue(user.socketId, user.userId, []);
      }

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );

      expect(claimedUsers).toHaveLength(3);

      // Verify correct parsing of complex keys - create maps for comparison since order may vary
      const claimedMap = new Map(
        claimedUsers.map((u) => [u.socketId, u.userId]),
      );
      const expectedMap = new Map(
        complexUsers.map((u) => [u.socketId, u.userId]),
      );

      expect(claimedMap.size).toBe(expectedMap.size);
      for (const [socketId, userId] of expectedMap) {
        expect(claimedMap.get(socketId)).toBe(userId);
      }

      await AtomicQueueService.completeUserProcessing(
        claimedUsers,
        'mock-workerId',
      );
      expect(await getProcessingClaims()).toHaveLength(0);
    });
  });

  describe('Atomic release of specific claimed users', () => {
    it('should atomically release only specified unmatched users back to the queue', async () => {
      await addUsersToQueue(5);

      const claimedUsers = await AtomicQueueService.claimUsersFromQueue(
        TEST_CONFIG,
        'mock-workerId',
      );
      // Release only the first two users
      const toRelease = claimedUsers.slice(0, 2);
      const toKeep = claimedUsers.slice(2);
      const releasedCount =
        await AtomicQueueService.releaseSpecificClaimedUsers(
          toRelease,
          'mock-workerId',
        );
      expect(releasedCount).toBe(2);
      // The queue should now have 2 users returned
      expect(await getQueueCount()).toBe(2);
      // The remaining claims should be for the other 3 users
      const claims = await getProcessingClaims();
      expect(claims).toHaveLength(3);
      // Clean up remaining claims
      await AtomicQueueService.completeUserProcessing(toKeep, 'mock-workerId');
    });

    it('should not release claims not owned by the worker', async () => {
      await addUsersToQueue(3);
      const worker1Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());
      const worker2Id =
        AtomicQueueService.generateWorkerId(generateTestJobId());
      const claimedBy1 = await AtomicQueueService.claimUsersFromQueue(
        { ...TEST_CONFIG, batchSize: 2 },
        worker1Id,
      );
      const claimedBy2 = await AtomicQueueService.claimUsersFromQueue(
        { ...TEST_CONFIG, batchSize: 1 },
        worker2Id,
      );
      // Worker 1 tries to release all 3 users (should only release its own)
      const releasedCount =
        await AtomicQueueService.releaseSpecificClaimedUsers(
          [...claimedBy1, ...claimedBy2],
          worker1Id,
        );
      expect(releasedCount).toBe(2);
      // Only worker 2's claim should remain
      const claims = await getProcessingClaims();
      expect(claims).toHaveLength(1);
      // Clean up
      await AtomicQueueService.completeUserProcessing(claimedBy2, worker2Id);
    });

    it('should do nothing if given an empty user list', async () => {
      await expect(
        AtomicQueueService.releaseSpecificClaimedUsers([], 'mock-workerId'),
      ).resolves.toBe(0);
    });
  });

  describe('Claim expiration recovery', () => {
    beforeEach(() => {
      // Reset mocks before each test
      vi.mocked(AssignmentService.getMatchAssignment).mockResolvedValue(null);
      // Set up socket connection mocks to include 'socket1' by default
      const mockMap = new Map<string, unknown>();
      mockMap.set('socket1', {});
      mockMap.set('socket2', {});
      mockMap.set('socket3', {});
      vi.mocked(
        SocketServer.io.of(SocketNamespace.VIDEO_CHAT).sockets.keys,
      ).mockReturnValue(mockMap.keys());
    });

    it('should return user to queue after claim expires and recoverLostUsers is called', async () => {
      // Reset socket mocks to include socket1 (connected) for this test
      const mockMap = new Map<string, unknown>();
      mockMap.set('socket1', {});
      mockMap.set('socket2', {});
      mockMap.set('socket3', {});
      vi.mocked(
        SocketServer.io.of(SocketNamespace.VIDEO_CHAT).sockets.keys,
      ).mockReturnValue(mockMap.keys());

      // Reset assignment mock to return null (no assignment)
      vi.mocked(AssignmentService.getMatchAssignment).mockResolvedValue(null);

      vi.spyOn(TimeUtils, 'getCurrentTimeAsScore').mockReturnValue(1000);

      // Use actual Redis to ensure there's no match assignment
      const redis = globalThis.redisClient;
      // Remove any existing assignment for socket1
      await redis.hdel('match_assignments', 'socket1');

      await QueueService.addToQueue('socket1', 'user1', []);

      // Claim the user (removes from queue, sets claim key with TTL)
      const claimed = await AtomicQueueService.claimUsersFromQueue(
        { ...TEST_CONFIG, batchSize: 1 },
        'mock-workerId',
      );
      expect(claimed).toHaveLength(1);
      // User is not in queue now
      expect(await getQueueCount()).toBe(0);
      // Wait for claim to expire (TTL is 5s, add a buffer)
      await new Promise((resolve) => setTimeout(resolve, 6000));
      // User is still not in queue (expired claim does not auto-requeue)
      expect(await getQueueCount()).toBe(0);
      // Run recovery
      const { recovered, removed } =
        await AtomicQueueService.recoverLostUsers();
      expect(recovered.length).toBe(1);
      expect(removed.length).toBe(0);
      // User is now back in queue
      expect(await getQueueCount()).toBe(1);
    });

    it('should remove user when socket is disconnected', async () => {
      // Mock socket disconnection for this test only
      const mockMap = new Map<string, unknown>();
      mockMap.set('socket2', {});
      mockMap.set('socket3', {});
      // socket1 is not in the connected sockets
      vi.mocked(
        SocketServer.io.of(SocketNamespace.VIDEO_CHAT).sockets.keys,
      ).mockReturnValue(mockMap.keys());

      // Use actual Redis to ensure there's no match assignment
      const redis = globalThis.redisClient;
      // Remove any existing assignment for socket1
      await redis.hdel('match_assignments', 'socket1');

      await QueueService.addToQueue('socket1', 'user1', []);

      // Claim the user
      const claimed = await AtomicQueueService.claimUsersFromQueue(
        { ...TEST_CONFIG, batchSize: 1 },
        'mock-workerId',
      );
      expect(claimed).toHaveLength(1);

      // Wait for claim to expire
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Run recovery
      const { recovered, removed } =
        await AtomicQueueService.recoverLostUsers();
      expect(recovered.length).toBe(0);
      expect(removed.length).toBe(1);
      // User should not be added back to queue
      expect(await getQueueCount()).toBe(0);
    });

    it('should remove user when user has a match assignment', async () => {
      // Reset socket connection mocks to include socket1 (connected)
      const mockMap = new Map<string, unknown>();
      mockMap.set('socket1', {});
      mockMap.set('socket2', {});
      mockMap.set('socket3', {});
      vi.mocked(
        SocketServer.io.of(SocketNamespace.VIDEO_CHAT).sockets.keys,
      ).mockReturnValue(mockMap.keys());

      // Use actual Redis to set up the match assignment
      const redis = globalThis.redisClient;
      // First make sure there's no existing assignment that could interfere
      await redis.hdel('match_assignments', 'socket1');
      // Now set up a match assignment for the test
      await redis.hset('match_assignments', 'socket1', 'room1:partner1');

      await QueueService.addToQueue('socket1', 'user1', []);

      // Claim the user
      const claimed = await AtomicQueueService.claimUsersFromQueue(
        { ...TEST_CONFIG, batchSize: 1 },
        'mock-workerId',
      );
      expect(claimed).toHaveLength(1);

      // Wait for claim to expire
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Run recovery
      const { recovered, removed } =
        await AtomicQueueService.recoverLostUsers();

      // Clean up
      await redis.hdel('match_assignments', 'socket1');

      expect(recovered.length).toBe(0);
      expect(removed.length).toBe(1);
      // User should not be added back to queue
      expect(await getQueueCount()).toBe(0);
    });
  }, 10_000);
});
