import { SocketNamespace } from '@mono/common-dto';
import { CleanupJobEntry } from '../job/CleanupJobEntry.js';
import { QueueService } from '../queue/QueueService.js';
import { REDIS_KEY } from '../../model/RedisKey.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { SocketServer } from '../../../socket-io/server/SocketServer.js';

// Mock SocketServer for recoverLostUsers tests
vi.mock('../../../socket-io/server/SocketServer.js', () => ({
  SocketServer: {
    io: {
      of: vi.fn().mockReturnValue({
        sockets: {
          keys: vi.fn().mockReturnValue(['socket1', 'socket2', 'socket3']),
        },
      }),
    },
  },
}));

describe('CleanupJobEntry', () => {
  beforeAll(() => {
    ServerConfigService.init(process.env);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('expiredMatchesCleanup', () => {
    it('should remove expired match assignments', async () => {
      const assignmentKey = REDIS_KEY.MATCH_ASSIGNMENT_KEY;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const oneMinuteAgo = Date.now() - 1 * 60 * 1000;

      // Setup: Add assignments - one expired, one valid
      await globalThis.redisClient.hset(
        assignmentKey,
        'socket1',
        JSON.stringify({
          roomId: 'room1',
          partnerSocketId: 'socket2',
          createdAt: fiveMinutesAgo - 1000, // Expired
        }),
      );
      await globalThis.redisClient.hset(
        assignmentKey,
        'socket2',
        JSON.stringify({
          roomId: 'room1',
          partnerSocketId: 'socket1',
          createdAt: oneMinuteAgo, // Valid
        }),
      );
      await globalThis.redisClient.hset(
        assignmentKey,
        'socket3',
        JSON.stringify({
          roomId: 'room2',
          partnerSocketId: 'socket4',
          // No createdAt - should be considered expired
        }),
      );
      await globalThis.redisClient.hset(
        assignmentKey,
        'socket4',
        'invalid-json',
      ); // Invalid JSON - should be removed

      // Execute
      await CleanupJobEntry.expiredMatchesCleanup();

      // Verify: Only valid assignment remains
      const remainingAssignments =
        await globalThis.redisClient.hgetall(assignmentKey);
      expect(Object.keys(remainingAssignments)).toHaveLength(1);
      expect(remainingAssignments.socket2).toBeDefined();
      expect(remainingAssignments.socket1).toBeUndefined();
      expect(remainingAssignments.socket3).toBeUndefined();
      expect(remainingAssignments.socket4).toBeUndefined();
    });

    it('should handle empty assignments hash', async () => {
      const assignmentKey = REDIS_KEY.MATCH_ASSIGNMENT_KEY;

      // Ensure empty state
      await globalThis.redisClient.del(assignmentKey);

      // Should not throw
      await expect(
        CleanupJobEntry.expiredMatchesCleanup(),
      ).resolves.not.toThrow();
    });
  });

  describe('staleConnectionsCleanup', () => {
    it('should remove stale processing claims', async () => {
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const processingKey = `${queueKey}:processing`;

      // Setup: Create processing claims with different TTL states
      await globalThis.redisClient.set(
        `${processingKey}:user1`,
        'worker1',
        'EX',
        10,
      ); // Valid with TTL
      await globalThis.redisClient.set(`${processingKey}:user2`, 'worker2'); // No TTL (stale)
      await globalThis.redisClient.set(
        `${processingKey}:user3`,
        'worker3',
        'EX',
        1,
      ); // Short TTL

      // Wait for short TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Execute
      await CleanupJobEntry.staleConnectionsCleanup();

      // Verify: Only valid claim remains
      const user1Exists = await globalThis.redisClient.exists(
        `${processingKey}:user1`,
      );
      const user2Exists = await globalThis.redisClient.exists(
        `${processingKey}:user2`,
      );
      const user3Exists = await globalThis.redisClient.exists(
        `${processingKey}:user3`,
      );

      expect(user1Exists).toBe(1); // Should remain
      expect(user2Exists).toBe(0); // Should be removed (no TTL)
      expect(user3Exists).toBe(0); // Should be removed (expired)
    });

    it('should handle empty processing claims', async () => {
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const processingKey = `${queueKey}:processing`;

      // Ensure no processing claims exist
      const keys = await globalThis.redisClient.keys(`${processingKey}:*`);
      if (keys.length > 0) {
        await globalThis.redisClient.del(...keys);
      }

      // Should not throw
      await expect(
        CleanupJobEntry.staleConnectionsCleanup(),
      ).resolves.not.toThrow();
    });
  });

  describe('orphanedClaimsCleanup', () => {
    it('should remove orphaned processing claims', async () => {
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const processingKey = `${queueKey}:processing`;

      // Setup: Create claims in different states
      await globalThis.redisClient.set(
        `${processingKey}:user1`,
        'worker1',
        'EX',
        10,
      ); // Valid
      await globalThis.redisClient.set(
        `${processingKey}:user2`,
        'worker2',
        'EX',
        1,
      ); // Will expire

      // Wait for one to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Execute
      await CleanupJobEntry.orphanedClaimsCleanup();

      // Verify: Only non-orphaned claim remains
      const user1Exists = await globalThis.redisClient.exists(
        `${processingKey}:user1`,
      );
      const user2Exists = await globalThis.redisClient.exists(
        `${processingKey}:user2`,
      );

      expect(user1Exists).toBe(1); // Should remain
      expect(user2Exists).toBe(0); // Should be removed (orphaned)
    });
  });

  describe('recoverLostUsers', () => {
    beforeEach(() => {
      // Reset socket connection mocks
      const mockMap = new Map<string, unknown>();
      mockMap.set('socket1', {});
      mockMap.set('socket2', {});
      vi.mocked(
        SocketServer.io.of(SocketNamespace.VIDEO_CHAT).sockets.keys,
      ).mockReturnValue(mockMap.keys());
    });

    it('should recover connected users without match assignments', async () => {
      const allKnownUsersKey = REDIS_KEY.ALL_KNOWN_USERS_KEY;
      const queueKey = QueueService.getRegionSpecificQueueKey();

      // Setup: Add user to ALL_KNOWN_USERS but not to queue (simulating lost user)
      await globalThis.redisClient.sadd(allKnownUsersKey, 'socket1__:__user1');

      // Ensure no match assignment
      await globalThis.redisClient.hdel(
        REDIS_KEY.MATCH_ASSIGNMENT_KEY,
        'socket1',
      );

      // Execute
      await CleanupJobEntry.recoverLostUsers();

      // Verify: User should be recovered to queue
      const queueMembers = await globalThis.redisClient.zrange(queueKey, 0, -1);
      expect(queueMembers).toContain('socket1__:__user1');
    });

    it('should remove disconnected users from tracking', async () => {
      const allKnownUsersKey = REDIS_KEY.ALL_KNOWN_USERS_KEY;

      // Setup: Add user to ALL_KNOWN_USERS but simulate disconnected socket
      await globalThis.redisClient.sadd(
        allKnownUsersKey,
        'socket999__:__user999',
      );

      // Mock socket as disconnected (not in the keys)
      const mockMap = new Map<string, unknown>();
      mockMap.set('socket1', {});
      vi.mocked(
        SocketServer.io.of(SocketNamespace.VIDEO_CHAT).sockets.keys,
      ).mockReturnValue(mockMap.keys());

      // Execute
      await CleanupJobEntry.recoverLostUsers();

      // Verify: Disconnected user should be removed from ALL_KNOWN_USERS
      const isStillTracked = await globalThis.redisClient.sismember(
        allKnownUsersKey,
        'socket999__:__user999',
      );
      expect(isStillTracked).toBe(0);
    });

    it('should handle empty ALL_KNOWN_USERS set', async () => {
      const allKnownUsersKey = REDIS_KEY.ALL_KNOWN_USERS_KEY;

      // Ensure empty set
      await globalThis.redisClient.del(allKnownUsersKey);

      // Should not throw
      await expect(CleanupJobEntry.recoverLostUsers()).resolves.not.toThrow();
    });
  });

  describe('integration tests', () => {
    it('should handle concurrent cleanup operations', async () => {
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const processingKey = `${queueKey}:processing`;
      const assignmentKey = REDIS_KEY.MATCH_ASSIGNMENT_KEY;

      // Setup mixed state
      await globalThis.redisClient.set(`${processingKey}:user1`, 'worker1'); // Stale claim
      await globalThis.redisClient.hset(
        assignmentKey,
        'socket1',
        'invalid-json',
      ); // Invalid assignment

      // Execute all cleanup operations concurrently
      await Promise.all([
        CleanupJobEntry.expiredMatchesCleanup(),
        CleanupJobEntry.staleConnectionsCleanup(),
        CleanupJobEntry.orphanedClaimsCleanup(),
        CleanupJobEntry.recoverLostUsers(),
      ]);

      // Verify: All cleanup completed successfully
      const staleClaimExists = await globalThis.redisClient.exists(
        `${processingKey}:user1`,
      );
      const invalidAssignmentExists = await globalThis.redisClient.hexists(
        assignmentKey,
        'socket1',
      );

      expect(staleClaimExists).toBe(0);
      expect(invalidAssignmentExists).toBe(0);
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis hscanStream to fail
      const originalHscanStream = globalThis.redisClient.hscanStream;
      vi.spyOn(globalThis.redisClient, 'hscanStream').mockImplementationOnce(
        () => {
          throw new Error('Redis connection failed');
        },
      );

      await expect(CleanupJobEntry.expiredMatchesCleanup()).rejects.toThrow(
        'Redis connection failed',
      );

      // Restore Redis
      globalThis.redisClient.hscanStream = originalHscanStream;
    });
  });
});
