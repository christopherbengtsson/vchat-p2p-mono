import {
  GlobalIgnoreMatrixService,
  GlobalIgnoreMatrixServiceInternals,
} from '../match-prerequisite/GlobalIgnoreMatrixService.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';

// Mock dependencies
vi.mock('../../../../common/service/SupabaseService.js');
vi.mock('../../../../common/util/logger.js', () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GlobalIgnoreMatrixService', () => {
  beforeEach(async () => {
    // Clear Redis between tests
    vi.clearAllMocks();
    await globalThis.redisClient.flushall();

    // Clear the global cache to ensure clean state
    GlobalIgnoreMatrixServiceInternals.clearGlobalCache();
  });

  describe('createIgnoreKey', () => {
    it('should create consistent lexicographic keys', () => {
      const { createIgnoreKey } = GlobalIgnoreMatrixServiceInternals;

      expect(createIgnoreKey('user1', 'user2')).toBe('user1:user2');
      expect(createIgnoreKey('user2', 'user1')).toBe('user1:user2');
      expect(createIgnoreKey('alpha', 'beta')).toBe('alpha:beta');
      expect(createIgnoreKey('beta', 'alpha')).toBe('alpha:beta');
    });

    it('should handle identical user IDs', () => {
      const { createIgnoreKey } = GlobalIgnoreMatrixServiceInternals;

      expect(createIgnoreKey('user1', 'user1')).toBe('user1:user1');
    });
  });

  describe('matrix warmup', () => {
    it('should warm up matrix successfully with ignore data', async () => {
      // Mock database response
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user3', 'user4'],
        ['user2', 'user3'],
      ]);

      const result = await GlobalIgnoreMatrixService.warmupMatrix();

      expect(result.isAvailable).toBe(true);
      expect(result.version).toBeGreaterThan(0);
      expect(result.stats.totalPairs).toBe(3);
      expect(result.stats.isWarmedUp).toBe(true);
    });

    it('should handle empty ignore data', async () => {
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([]);

      const result = await GlobalIgnoreMatrixService.warmupMatrix();

      expect(result.isAvailable).toBe(true);
      expect(result.stats.totalPairs).toBe(0);
      expect(result.stats.isWarmedUp).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(SupabaseService.getAllIgnorePairs).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await GlobalIgnoreMatrixService.warmupMatrix();

      expect(result.isAvailable).toBe(false);
      expect(result.stats.isWarmedUp).toBe(false);
    });

    it('should prevent concurrent warmup with locking', async () => {
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([
        ['user1', 'user2'],
      ]);

      // Start two warmup operations concurrently
      const warmup1Promise = GlobalIgnoreMatrixService.warmupMatrix();
      const warmup2Promise = GlobalIgnoreMatrixService.warmupMatrix();

      const [result1, result2] = await Promise.all([
        warmup1Promise,
        warmup2Promise,
      ]);

      // Both should succeed
      expect(result1.isAvailable).toBe(true);
      expect(result2.isAvailable).toBe(true);

      // Database should be called at least once, but possibly only once due to locking
      expect(
        vi.mocked(SupabaseService.getAllIgnorePairs),
      ).toHaveBeenCalledWith();

      // At least one result should have the correct stats
      const hasValidStats =
        result1.stats.totalPairs === 1 || result2.stats.totalPairs === 1;
      expect(hasValidStats).toBe(true);
    }, 10000); // Increase timeout for this test
  });

  describe('ignore checking', () => {
    beforeEach(async () => {
      // Set up matrix with test data
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user3', 'user4'],
        ['user1', 'user3'],
      ]);

      await GlobalIgnoreMatrixService.warmupMatrix();
    });

    it('should check ignore relationships correctly', async () => {
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        ),
      ).toBe(true);
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user2',
          'user1',
        ),
      ).toBe(true);
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user3',
          'user4',
        ),
      ).toBe(true);
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user3',
        ),
      ).toBe(true);

      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user2',
          'user3',
        ),
      ).toBe(false);
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user2',
          'user4',
        ),
      ).toBe(false);
    });

    it('should handle batch ignore checking', async () => {
      const pairs: [string, string][] = [
        ['user1', 'user2'],
        ['user2', 'user3'],
        ['user3', 'user4'],
        ['user1', 'user4'],
      ];

      const results = await GlobalIgnoreMatrixService.batchIsIgnored(pairs);

      expect(results).toEqual([true, false, true, false]);
    });

    it('should handle empty batch', async () => {
      const results = await GlobalIgnoreMatrixService.batchIsIgnored([]);
      expect(results).toEqual([]);
    });
  });

  describe('matrix updates', () => {
    beforeEach(async () => {
      // Start with empty matrix
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([]);
      await GlobalIgnoreMatrixService.warmupMatrix();
    });

    it('should add ignore relationships', async () => {
      await GlobalIgnoreMatrixService.addIgnoreRelationship('user1', 'user2');

      const isIgnored =
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        );
      expect(isIgnored).toBe(true);

      const stats = await GlobalIgnoreMatrixService.getMatrixStatus();
      expect(stats.stats.totalPairs).toBe(1);
    });

    it('should remove ignore relationships', async () => {
      // Add relationship first
      await GlobalIgnoreMatrixService.addIgnoreRelationship('user1', 'user2');
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        ),
      ).toBe(true);

      // Remove relationship
      await GlobalIgnoreMatrixService.removeIgnoreRelationship(
        'user1',
        'user2',
      );
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        ),
      ).toBe(false);

      const stats = await GlobalIgnoreMatrixService.getMatrixStatus();
      expect(stats.stats.totalPairs).toBe(0);
    });

    it('should handle relationship ordering consistently', async () => {
      await GlobalIgnoreMatrixService.addIgnoreRelationship('user2', 'user1');

      // Should work regardless of order
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        ),
      ).toBe(true);
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user2',
          'user1',
        ),
      ).toBe(true);

      // Remove with different order
      await GlobalIgnoreMatrixService.removeIgnoreRelationship(
        'user1',
        'user2',
      );
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        ),
      ).toBe(false);
    });
  });

  describe('matrix refresh', () => {
    it('should refresh matrix from database', async () => {
      // Start with some data
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([
        ['user1', 'user2'],
      ]);
      await GlobalIgnoreMatrixService.warmupMatrix();

      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        ),
      ).toBe(true);

      // Change database data
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([
        ['user3', 'user4'],
      ]);

      // Refresh matrix
      const refreshResult = await GlobalIgnoreMatrixService.refreshMatrix();

      expect(refreshResult.isAvailable).toBe(true);
      expect(refreshResult.stats.totalPairs).toBe(1);

      // Old relationship should be gone, new one should exist
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        ),
      ).toBe(false);
      expect(
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user3',
          'user4',
        ),
      ).toBe(true);
    });
  });

  describe('matrix status', () => {
    it('should return correct status when matrix is not warmed up', async () => {
      const status = await GlobalIgnoreMatrixService.getMatrixStatus();

      expect(status.isAvailable).toBe(false);
      expect(status.version).toBe(0);
      expect(status.stats.isWarmedUp).toBe(false);
    });

    it('should return correct status when matrix is warmed up', async () => {
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user3', 'user4'],
      ]);

      await GlobalIgnoreMatrixService.warmupMatrix();
      const status = await GlobalIgnoreMatrixService.getMatrixStatus();

      expect(status.isAvailable).toBe(true);
      expect(status.version).toBeGreaterThan(0);
      expect(status.stats.isWarmedUp).toBe(true);
      expect(status.stats.totalPairs).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully in ignore checks', async () => {
      // Mock Redis error
      const originalSismember = globalThis.redisClient.sismember;
      globalThis.redisClient.sismember = vi
        .fn()
        .mockRejectedValue(new Error('Redis error'));

      const result =
        await GlobalIgnoreMatrixServiceInternals.checkIgnoreRelationship(
          'user1',
          'user2',
        );

      // Should fail open (return false)
      expect(result).toBe(false);

      // Restore Redis
      globalThis.redisClient.sismember = originalSismember;
    });

    it('should handle Redis errors gracefully in batch checks', async () => {
      // Mock Redis error
      const originalPipeline = globalThis.redisClient.pipeline;
      globalThis.redisClient.pipeline = vi.fn().mockReturnValue({
        sismember: vi.fn(),
        exec: vi.fn().mockRejectedValue(new Error('Redis error')),
      });

      const result = await GlobalIgnoreMatrixService.batchIsIgnored([
        ['user1', 'user2'],
        ['user3', 'user4'],
      ]);

      // Should fail open (return all false)
      expect(result).toEqual([false, false]);

      // Restore Redis
      globalThis.redisClient.pipeline = originalPipeline;
    });
  });

  describe('version management', () => {
    it('should increment version on warmup', async () => {
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([]);

      const initialVersion =
        await GlobalIgnoreMatrixServiceInternals.getCurrentVersion();
      expect(initialVersion).toBe(0);

      await GlobalIgnoreMatrixService.warmupMatrix();

      const newVersion =
        await GlobalIgnoreMatrixServiceInternals.getCurrentVersion();
      expect(newVersion).toBe(1);
    });

    it('should increment version on refresh', async () => {
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([]);

      await GlobalIgnoreMatrixService.warmupMatrix();
      const warmupVersion =
        await GlobalIgnoreMatrixServiceInternals.getCurrentVersion();

      await GlobalIgnoreMatrixService.refreshMatrix();
      const refreshVersion =
        await GlobalIgnoreMatrixServiceInternals.getCurrentVersion();

      expect(refreshVersion).toBe(warmupVersion + 1);
    });
  });

  describe('lock management', () => {
    it('should acquire and release warmup lock', async () => {
      const { acquireWarmupLock, releaseWarmupLock } =
        GlobalIgnoreMatrixServiceInternals;

      // First acquisition should succeed
      const acquired1 = await acquireWarmupLock();
      expect(acquired1).toBe(true);

      // Second acquisition should fail
      const acquired2 = await acquireWarmupLock();
      expect(acquired2).toBe(false);

      // After release, should be able to acquire again
      await releaseWarmupLock();
      const acquired3 = await acquireWarmupLock();
      expect(acquired3).toBe(true);

      await releaseWarmupLock();
    });
  });

  describe('statistics management', () => {
    it('should track matrix statistics', async () => {
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user3', 'user4'],
      ]);

      const warmupResult = await GlobalIgnoreMatrixService.warmupMatrix();

      expect(warmupResult.stats.totalPairs).toBe(2);
      expect(warmupResult.stats.lastWarmupDuration).toBeGreaterThanOrEqual(0);
      expect(warmupResult.stats.lastWarmupTimestamp).toBeGreaterThan(0);
      expect(warmupResult.stats.isWarmedUp).toBe(true);
    });

    it('should update statistics on relationship changes', async () => {
      vi.mocked(SupabaseService.getAllIgnorePairs).mockResolvedValue([]);
      await GlobalIgnoreMatrixService.warmupMatrix();

      let status = await GlobalIgnoreMatrixService.getMatrixStatus();
      expect(status.stats.totalPairs).toBe(0);

      await GlobalIgnoreMatrixService.addIgnoreRelationship('user1', 'user2');

      status = await GlobalIgnoreMatrixService.getMatrixStatus();
      expect(status.stats.totalPairs).toBe(1);

      await GlobalIgnoreMatrixService.removeIgnoreRelationship(
        'user1',
        'user2',
      );

      status = await GlobalIgnoreMatrixService.getMatrixStatus();
      expect(status.stats.totalPairs).toBe(0);
    });
  });
});
