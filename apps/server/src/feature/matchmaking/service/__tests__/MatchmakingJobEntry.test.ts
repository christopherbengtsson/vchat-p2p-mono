import type { Job } from 'bullmq';
import { noop } from '@mono/common-util';
import { QueueService } from '../queue/QueueService.js';
import { IgnoredUsersService } from '../match-prerequisite/IgnoredUsersService.js';
import { IgnoreSystemMetricsService } from '../metrics/IgnoreSystemMetricsService.js';
import { GlobalIgnoreMatrixService } from '../match-prerequisite/GlobalIgnoreMatrixService.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';
import { SocketServer } from '../../../socket-io/server/SocketServer.js';
import { MetricsUtil } from '../../util/MetricsUtil.js';
import { MatchmakingMetricsService } from '../metrics/MatchmakingMetricsService.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { MatchmakingJobEntry } from '../job/MatchmakingJobEntry.js';
import { CleanupJobEntry } from '../job/CleanupJobEntry.js';
import { MaintenanceJobEntry } from '../job/MaintenanceJobEntry.js';
import { MonitoringJobEntry } from '../job/MonitoringJobEntry.js';
import { MATCHMAKING_JOB } from '../../model/MatchmakingJob.js';
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
      const expiredTime = currentTime - 15 * 60 * 1000; // 15 minutes ago
      const recentTime = currentTime - 5 * 60 * 1000; // 5 minutes ago

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
      const originalHgetall = redis.hgetall;

      // Mock Redis error
      redis.hgetall = vi
        .fn()
        .mockRejectedValue(new Error('Redis connection failed'));

      // Execute: Should throw error for BullMQ
      await expect(CleanupJobEntry.expiredMatchesCleanup()).rejects.toThrow(
        'Redis connection failed',
      );

      // Restore Redis function
      redis.hgetall = originalHgetall;
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

  describe('Bloom Filter Optimization Maintenance', () => {
    it('should optimize bloom filter capacity successfully', async () => {
      // Setup: Mock metrics service
      const recordMaintenanceOpSpy = vi.spyOn(
        IgnoreSystemMetricsService,
        'recordMaintenanceOperation',
      );

      // Execute maintenance
      await MaintenanceJobEntry.optimizeBloomFilterMaintenance();

      // Verify: Maintenance operation was recorded as success
      expect(recordMaintenanceOpSpy).toHaveBeenCalledWith(
        MATCHMAKING_JOB.OPTIMIZE_BLOOM_FILTER,
        'success',
        expect.any(Number), // duration
      );
    });

    it('should handle bloom filter optimization errors gracefully', async () => {
      // Setup: Mock IgnoredUsersService to throw error
      const optimizeSpy = vi
        .spyOn(IgnoredUsersService, 'optimizeBloomFilterCapacity')
        .mockRejectedValue(new Error('Bloom filter error'));

      const recordMaintenanceOpSpy = vi.spyOn(
        IgnoreSystemMetricsService,
        'recordMaintenanceOperation',
      );

      // Execute maintenance and expect error to be thrown
      await expect(
        MaintenanceJobEntry.optimizeBloomFilterMaintenance(),
      ).rejects.toThrow('Bloom filter error');

      // Verify: Error was recorded before re-throwing
      expect(recordMaintenanceOpSpy).toHaveBeenCalledWith(
        MATCHMAKING_JOB.OPTIMIZE_BLOOM_FILTER,
        'error',
        expect.any(Number), // duration
      );

      // Restore spies
      optimizeSpy.mockRestore();
      recordMaintenanceOpSpy.mockRestore();
    });
  });

  describe('Global Matrix Warmup Maintenance', () => {
    it('should perform matrix warmup when needed', async () => {
      // Setup: Mock matrix status indicating warmup is needed
      vi.spyOn(GlobalIgnoreMatrixService, 'getMatrixStatus').mockResolvedValue({
        isAvailable: false,
        version: 0,
        stats: {
          totalPairs: 0,
          lastWarmupDuration: 0,
          lastWarmupTimestamp: 0,
          version: 0,
          isWarmedUp: false,
        },
      });

      vi.spyOn(GlobalIgnoreMatrixService, 'warmupMatrix').mockResolvedValue({
        isAvailable: true,
        version: 1,
        stats: {
          totalPairs: 10,
          lastWarmupDuration: 100,
          lastWarmupTimestamp: Date.now(),
          version: 1,
          isWarmedUp: true,
        },
      });

      const recordMaintenanceOpSpy = vi.spyOn(
        IgnoreSystemMetricsService,
        'recordMaintenanceOperation',
      );

      // Execute maintenance
      await MaintenanceJobEntry.warmupGlobalMatrixMaintenance();

      // Verify: Warmup was performed and metrics recorded
      expect(GlobalIgnoreMatrixService.warmupMatrix).toHaveBeenCalled();
      expect(recordMaintenanceOpSpy).toHaveBeenCalledWith(
        MATCHMAKING_JOB.WARMUP_GLOBAL_MATRIX,
        'success',
        expect.any(Number),
        {
          pairs_loaded: 10,
          version: 1,
        },
      );
    });

    it('should skip warmup when not needed', async () => {
      // Setup: Mock matrix status indicating warmup is not needed
      vi.spyOn(GlobalIgnoreMatrixService, 'getMatrixStatus').mockResolvedValue({
        isAvailable: true,
        version: 1,
        stats: {
          totalPairs: 10,
          lastWarmupDuration: 100,
          lastWarmupTimestamp: Date.now() - 1800000, // 30 minutes ago
          version: 1,
          isWarmedUp: true,
        },
      });

      const warmupSpy = vi.spyOn(GlobalIgnoreMatrixService, 'warmupMatrix');

      // Execute maintenance
      await MaintenanceJobEntry.warmupGlobalMatrixMaintenance();

      // Verify: Warmup was skipped
      expect(warmupSpy).not.toHaveBeenCalled();
    });

    it('should handle warmup errors gracefully', async () => {
      // Setup: Mock matrix status to trigger warmup, then make warmup fail
      const getMatrixStatusSpy = vi
        .spyOn(GlobalIgnoreMatrixService, 'getMatrixStatus')
        .mockResolvedValue({
          isAvailable: false,
          version: 0,
          stats: {
            totalPairs: 0,
            lastWarmupDuration: 0,
            lastWarmupTimestamp: 0,
            version: 0,
            isWarmedUp: false,
          },
        });

      const warmupMatrixSpy = vi
        .spyOn(GlobalIgnoreMatrixService, 'warmupMatrix')
        .mockRejectedValue(new Error('Warmup failed'));

      const recordMaintenanceOpSpy = vi.spyOn(
        IgnoreSystemMetricsService,
        'recordMaintenanceOperation',
      );

      // Execute maintenance and expect error to be thrown
      await expect(
        MaintenanceJobEntry.warmupGlobalMatrixMaintenance(),
      ).rejects.toThrow('Warmup failed');

      // Verify: Error was recorded before re-throwing
      expect(recordMaintenanceOpSpy).toHaveBeenCalledWith(
        MATCHMAKING_JOB.WARMUP_GLOBAL_MATRIX,
        'error',
        expect.any(Number),
      );

      // Restore spies
      getMatrixStatusSpy.mockRestore();
      warmupMatrixSpy.mockRestore();
      recordMaintenanceOpSpy.mockRestore();
    });
  });

  describe('Global Matrix Refresh Maintenance', () => {
    it('should refresh matrix when old or unavailable', async () => {
      // Setup: Mock matrix status indicating refresh is needed
      const oldTimestamp = Date.now() - 8 * 60 * 60 * 1000; // 8 hours ago
      vi.spyOn(GlobalIgnoreMatrixService, 'getMatrixStatus').mockResolvedValue({
        isAvailable: true,
        version: 1,
        stats: {
          totalPairs: 5,
          lastWarmupDuration: 100,
          lastWarmupTimestamp: oldTimestamp,
          version: 1,
          isWarmedUp: true,
        },
      });

      vi.spyOn(GlobalIgnoreMatrixService, 'refreshMatrix').mockResolvedValue({
        isAvailable: true,
        version: 2,
        stats: {
          totalPairs: 8,
          lastWarmupDuration: 150,
          lastWarmupTimestamp: Date.now(),
          version: 2,
          isWarmedUp: true,
        },
      });

      const recordMaintenanceOpSpy = vi.spyOn(
        IgnoreSystemMetricsService,
        'recordMaintenanceOperation',
      );

      // Execute maintenance
      await MaintenanceJobEntry.refreshGlobalIgnoreMatrixMaintenance();

      // Verify: Refresh was performed and metrics recorded
      expect(GlobalIgnoreMatrixService.refreshMatrix).toHaveBeenCalled();
      expect(recordMaintenanceOpSpy).toHaveBeenCalledWith(
        MATCHMAKING_JOB.REFRESH_GLOBAL_MATRIX,
        'success',
        expect.any(Number),
        {
          pairs_loaded: 8,
          version: 2,
        },
      );
    });

    it('should skip refresh when not needed', async () => {
      // Setup: Mock matrix status indicating refresh is not needed
      vi.spyOn(GlobalIgnoreMatrixService, 'getMatrixStatus').mockResolvedValue({
        isAvailable: true,
        version: 1,
        stats: {
          totalPairs: 10,
          lastWarmupDuration: 100,
          lastWarmupTimestamp: Date.now() - 3600000, // 1 hour ago
          version: 1,
          isWarmedUp: true,
        },
      });

      const refreshSpy = vi.spyOn(GlobalIgnoreMatrixService, 'refreshMatrix');

      // Execute maintenance
      await MaintenanceJobEntry.refreshGlobalIgnoreMatrixMaintenance();

      // Verify: Refresh was skipped
      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });

  describe('Cache Health Check Monitoring', () => {
    it('should perform cache health check successfully', async () => {
      // Setup: Mock metrics service methods
      const recordCacheHealthSpy = vi
        .spyOn(IgnoreSystemMetricsService, 'recordCacheHealthMetrics')
        .mockResolvedValue();

      const recordBloomFilterSpy = vi
        .spyOn(IgnoreSystemMetricsService, 'recordBloomFilterMetrics')
        .mockResolvedValue();

      const recordCleanupOpSpy = vi.spyOn(
        IgnoreSystemMetricsService,
        'recordCleanupOperation',
      );

      // Execute monitoring
      await MonitoringJobEntry.ignoreCacheHealthCheckMonitoring();

      // Verify: All health checks were performed
      expect(recordCacheHealthSpy).toHaveBeenCalled();
      expect(recordBloomFilterSpy).toHaveBeenCalled();
      expect(recordCleanupOpSpy).toHaveBeenCalledWith(
        MATCHMAKING_JOB.IGNORE_CACHE_HEALTH_CHECK,
        'success',
        expect.any(Number),
      );
    });

    it('should handle health check errors gracefully', async () => {
      // Setup: Mock metrics service to throw error
      vi.spyOn(
        IgnoreSystemMetricsService,
        'recordCacheHealthMetrics',
      ).mockRejectedValue(new Error('Health check failed'));

      const recordCleanupOpSpy = vi.spyOn(
        IgnoreSystemMetricsService,
        'recordCleanupOperation',
      );

      // Execute monitoring and expect error to be thrown
      await expect(
        MonitoringJobEntry.ignoreCacheHealthCheckMonitoring(),
      ).rejects.toThrow('Health check failed');

      // Verify: Error was recorded before re-throwing
      expect(recordCleanupOpSpy).toHaveBeenCalledWith(
        MATCHMAKING_JOB.IGNORE_CACHE_HEALTH_CHECK,
        'error',
        expect.any(Number),
      );
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
        createdAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      });
      await redis.hset(assignmentKey, 'socket-1', expiredAssignment);

      // Add stale processing claim
      const staleKey = `${processingKey}:stale-worker`;
      await redis.set(staleKey, 'stale-data');

      // Mock global matrix service for maintenance
      vi.spyOn(GlobalIgnoreMatrixService, 'getMatrixStatus').mockResolvedValue({
        isAvailable: false,
        version: 0,
        stats: {
          totalPairs: 0,
          lastWarmupDuration: 0,
          lastWarmupTimestamp: 0,
          version: 0,
          isWarmedUp: false,
        },
      });

      vi.spyOn(GlobalIgnoreMatrixService, 'warmupMatrix').mockResolvedValue({
        isAvailable: true,
        version: 1,
        stats: {
          totalPairs: 5,
          lastWarmupDuration: 100,
          lastWarmupTimestamp: Date.now(),
          version: 1,
          isWarmedUp: true,
        },
      });

      // Execute complete maintenance cycle
      await CleanupJobEntry.expiredMatchesCleanup();
      await CleanupJobEntry.staleConnectionsCleanup();
      await MaintenanceJobEntry.warmupGlobalMatrixMaintenance();
      await MonitoringJobEntry.ignoreCacheHealthCheckMonitoring();

      // Verify: All cleanups were performed
      const remainingAssignments = await redis.hgetall(assignmentKey);
      expect(remainingAssignments).toEqual({});

      const staleExists = await redis.exists(staleKey);
      expect(staleExists).toBe(0);

      // Verify: Global matrix warmup was called
      expect(GlobalIgnoreMatrixService.warmupMatrix).toHaveBeenCalled();
    });
  });
});
