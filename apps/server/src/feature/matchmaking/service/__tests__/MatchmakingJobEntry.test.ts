import type { Job } from 'bullmq';
import { noop } from '@mono/common-util';
import { QueueService } from '../queue/QueueService.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';
import { SocketServer } from '../../../socket-io/server/SocketServer.js';
import { MetricsUtil } from '../../util/MetricsUtil.js';
import { MatchmakingMetricsService } from '../metrics/MatchmakingMetricsService.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { MatchmakingJobEntry } from '../job/MatchmakingJobEntry.js';
import { CleanupJobEntry } from '../job/CleanupJobEntry.js';
import { REDIS_KEY } from '../../model/RedisKey.js';

// Mock external dependencies
vi.mock('../../../../common/service/SupabaseService.js');

// Mock SocketServer properly to avoid initialization issues
vi.mock('../../../socket-io/server/SocketServer.js', () => ({
  SocketServer: {
    io: {
      of: vi.fn().mockReturnValue({
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      }),
    },
  },
}));

// Mock metrics services
vi.mock('../metrics/MatchmakingMetricsService.js', () => ({
  MatchmakingMetricsService: {
    recordJobMetrics: vi.fn(),
    recordJobFailure: vi.fn(),
  },
}));

describe('MatchMakingJobEntry Integration Tests', () => {
  const mockJob: Job = {
    id: 'test-job-123',
    queueName: 'test-queue',
    updateProgress: vi.fn(),
    updateData: vi.fn(),
    data: {
      workerId: 'test-worker-1',
    },
  } as unknown as Job;

  beforeAll(() => {
    ServerConfigService.init(process.env);
  });

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock SupabaseService with empty data by default
    vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);
    vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([]);

    // Reset metrics service mocks
    vi.mocked(MatchmakingMetricsService.recordJobMetrics).mockImplementation(
      noop,
    );
    vi.mocked(MatchmakingMetricsService.recordJobFailure).mockImplementation(
      noop,
    );
  });

  afterEach(() => {
    // Restore all spies to prevent test interference
    vi.restoreAllMocks();
  });

  describe('Job Processing (create function)', () => {
    it('should process matchmaking job successfully with mocked orchestrator', async () => {
      // Mock the orchestrator result with proper interface
      const mockResult = {
        earlyReturnDuration: null,
        completeDuration: null,
        matchCount: 2,
      };

      // Mock MetricsUtil
      vi.spyOn(MetricsUtil, 'calculateTotalDuration').mockReturnValue(100);

      // Mock the MatchmakingOrchestrator.processQueue
      const { MatchmakingOrchestrator } = await import(
        '../orchestrator/MatchmakingOrchestrator.js'
      );
      vi.spyOn(MatchmakingOrchestrator, 'processQueue').mockResolvedValue(
        mockResult,
      );

      // Execute
      await MatchmakingJobEntry.create(mockJob);

      // Verify: Orchestrator was called with correct parameters
      expect(MatchmakingOrchestrator.processQueue).toHaveBeenCalledWith(
        SocketServer.io,
        expect.any(Object), // matchmakingProcessConfig
        mockJob,
      );

      // Verify: Metrics were recorded
      expect(MatchmakingMetricsService.recordJobMetrics).toHaveBeenCalledWith(
        'test-queue',
        mockResult,
      );
    });

    it('should handle job processing errors and record failure metrics', async () => {
      // Mock the orchestrator to throw an error
      const { MatchmakingOrchestrator } = await import(
        '../orchestrator/MatchmakingOrchestrator.js'
      );
      const testError = new Error('Processing failed');
      vi.spyOn(MatchmakingOrchestrator, 'processQueue').mockRejectedValue(
        testError,
      );

      // Execute and expect error to be re-thrown for BullMQ
      await expect(MatchmakingJobEntry.create(mockJob)).rejects.toThrow(
        'Processing failed',
      );

      // Verify: Failure metrics were recorded
      expect(MatchmakingMetricsService.recordJobFailure).toHaveBeenCalledWith(
        'test-queue',
      );
    });
  });

  describe('Expired Matches Cleanup', () => {
    it('should clean up expired match assignments', async () => {
      const redis = globalThis.redisClient;
      const assignmentKey = REDIS_KEY.MATCH_ASSIGNMENT_KEY;

      // Setup: Add some assignments with different timestamps
      const currentTime = Date.now();
      const expiredTime = currentTime - 5 * 60 * 1000; // 5 minutes ago (expired)
      const recentTime = currentTime - 1 * 60 * 1000; // 1 minute ago (valid)

      const expiredAssignment = JSON.stringify({
        roomId: 'room-1',
        partnerSocketId: 'socket-2',
        createdAt: expiredTime,
      });

      const recentAssignment = JSON.stringify({
        roomId: 'room-2',
        partnerSocketId: 'socket-4',
        createdAt: recentTime,
      });

      const noTimestampAssignment = JSON.stringify({
        roomId: 'room-3',
        partnerSocketId: 'socket-6',
        // No createdAt timestamp
      });

      await redis.hset(assignmentKey, {
        'socket-1': expiredAssignment,
        'socket-3': recentAssignment,
        'socket-5': noTimestampAssignment,
        'socket-7': 'invalid-json',
      });

      // Execute cleanup
      await CleanupJobEntry.expiredMatchesCleanup();

      // Verify: Expired and invalid assignments were removed
      const remainingAssignments = await redis.hgetall(assignmentKey);
      expect(remainingAssignments).toEqual({
        'socket-3': recentAssignment, // Only recent assignment should remain
      });
    });

    it('should handle empty assignments gracefully', async () => {
      // Execute cleanup on empty assignments
      await expect(
        CleanupJobEntry.expiredMatchesCleanup(),
      ).resolves.not.toThrow();

      // Verify: No errors occurred
      const assignments = await globalThis.redisClient.hgetall(
        REDIS_KEY.MATCH_ASSIGNMENT_KEY,
      );
      expect(assignments).toEqual({});
    });

    it('should handle Redis errors gracefully during cleanup', async () => {
      const redis = globalThis.redisClient;
      const originalHscanStream = redis.hscanStream;

      // Mock Redis hscanStream to fail
      redis.hscanStream = vi.fn().mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      // Execute: Should throw error for BullMQ
      await expect(CleanupJobEntry.expiredMatchesCleanup()).rejects.toThrow(
        'Redis connection failed',
      );

      // Restore Redis function
      redis.hscanStream = originalHscanStream;
    });
  });

  describe('Stale Connections Cleanup', () => {
    it('should clean up stale processing claims', async () => {
      const redis = globalThis.redisClient;
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const processingKey = `${queueKey}:processing`;

      // Setup: Create processing claims with different TTL states
      const staleKey1 = `${processingKey}:worker-1`;
      const staleKey2 = `${processingKey}:worker-2`;
      const validKey = `${processingKey}:worker-3`;

      // Create keys with no TTL (stale)
      await redis.set(staleKey1, 'claim-data-1');
      await redis.set(staleKey2, 'claim-data-2');

      // Create key with proper TTL (valid)
      await redis.setex(validKey, 300, 'claim-data-3');

      // Execute cleanup
      await CleanupJobEntry.staleConnectionsCleanup();

      // Verify: Stale keys were removed, valid key remains
      const stale1Exists = await redis.exists(staleKey1);
      const stale2Exists = await redis.exists(staleKey2);
      const validExists = await redis.exists(validKey);

      expect(stale1Exists).toBe(0);
      expect(stale2Exists).toBe(0);
      expect(validExists).toBe(1);
    });

    it('should handle no stale connections gracefully', async () => {
      // Execute cleanup when no processing claims exist
      await expect(
        CleanupJobEntry.staleConnectionsCleanup(),
      ).resolves.not.toThrow();

      // Verify: No errors occurred
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const processingKey = `${queueKey}:processing`;
      const claimKeys = await globalThis.redisClient.keys(`${processingKey}:*`);
      expect(claimKeys).toEqual([]);
    });
  });

  describe('Orphaned Claims Cleanup', () => {
    it('should clean up orphaned processing claims', async () => {
      const redis = globalThis.redisClient;
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const processingKey = `${queueKey}:processing`;

      // Setup: Create orphaned claims (expired keys)
      const orphanedKey1 = `${processingKey}:orphaned-1`;
      const orphanedKey2 = `${processingKey}:orphaned-2`;
      const validKey = `${processingKey}:valid-1`;

      // Create and immediately expire keys to simulate orphaned state
      await redis.setex(orphanedKey1, 1, 'orphaned-data-1');
      await redis.setex(orphanedKey2, 1, 'orphaned-data-2');
      await redis.setex(validKey, 300, 'valid-data');

      // Wait for orphaned keys to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Execute cleanup
      await CleanupJobEntry.orphanedClaimsCleanup();

      // Verify: Orphaned references are cleaned up, valid key remains
      const validExists = await redis.exists(validKey);
      expect(validExists).toBe(1);

      // Check that orphaned keys don't exist
      const orphaned1Exists = await redis.exists(orphanedKey1);
      const orphaned2Exists = await redis.exists(orphanedKey2);
      expect(orphaned1Exists).toBe(0);
      expect(orphaned2Exists).toBe(0);
    });
  });

  describe('Integration Test - Real World Scenario', () => {
    it('should handle complete maintenance cycle', async () => {
      const redis = globalThis.redisClient;

      // Setup: Create realistic scenario with expired matches and stale claims
      const assignmentKey = REDIS_KEY.MATCH_ASSIGNMENT_KEY;
      const queueKey = QueueService.getRegionSpecificQueueKey();
      const processingKey = `${queueKey}:processing`;

      // Add expired assignment
      const expiredAssignment = JSON.stringify({
        roomId: 'room-1',
        partnerSocketId: 'socket-2',
        createdAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
      });
      await redis.hset(assignmentKey, 'socket-1', expiredAssignment);

      // Add stale processing claim
      const staleKey = `${processingKey}:stale-worker`;
      await redis.set(staleKey, 'stale-data');

      // Execute complete maintenance cycle
      await CleanupJobEntry.expiredMatchesCleanup();
      await CleanupJobEntry.staleConnectionsCleanup();

      // Verify: All cleanups were performed
      const remainingAssignments = await redis.hgetall(assignmentKey);
      expect(remainingAssignments).toEqual({});

      const staleExists = await redis.exists(staleKey);
      expect(staleExists).toBe(0);
    });
  });
});
