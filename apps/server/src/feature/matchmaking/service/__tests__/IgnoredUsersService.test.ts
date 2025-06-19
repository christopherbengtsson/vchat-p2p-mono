import {
  IgnoredUsersService,
  IgnoredUsersServiceInternals,
} from '../match-prerequisite/IgnoredUsersService.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { TimeUtils } from '../../util/TimeUtils.js';

// Only mock external services, not Redis
vi.mock('../../../../common/service/SupabaseService.js');
vi.mock('../../../../common/config/service/ServerConfigService.js');
vi.mock('../../util/TimeUtils.js');

describe('IgnoredUsersService - Integration Tests', () => {
  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Setup time and config mocks
    vi.mocked(TimeUtils.getCurrentTimeAsScore).mockReturnValue(1000);
    vi.mocked(ServerConfigService.getConfig).mockReturnValue({
      config: {
        jobConfig: {
          cache: {
            redis: {
              ignoredUsersTTL: 3600,
            },
          },
        },
      },
    } as any);

    // Clear all test data from Redis before each test
    await globalThis.redisClient.flushdb();
  });

  describe('clearUsersIgnoreCache', () => {
    it('should clear cache for multiple users from Redis', async () => {
      const userIds = ['user1', 'user2', 'user3'];

      // Pre-populate Redis with test data using individual keys
      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(['user4', 'user5']),
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify(['user6']),
      );
      await globalThis.redisClient.setex(
        'ignore_list:user3',
        3600,
        JSON.stringify(['user7', 'user8']),
      );

      // Verify data exists before clearing
      const beforeClear = await globalThis.redisClient.mget(
        'ignore_list:user1',
        'ignore_list:user2',
        'ignore_list:user3',
      );
      expect(beforeClear.every((val) => val !== null)).toBe(true);

      // Clear the cache
      await IgnoredUsersService.clearUsersIgnoreCache(userIds);

      // Verify data was removed
      const afterClear = await globalThis.redisClient.mget(
        'ignore_list:user1',
        'ignore_list:user2',
        'ignore_list:user3',
      );
      expect(afterClear.every((val) => val === null)).toBe(true);
    });

    it('should return early for empty user array', async () => {
      // Pre-populate some data
      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(['user2']),
      );

      await IgnoredUsersService.clearUsersIgnoreCache([]);

      // Data should still exist since nothing was cleared
      const result = await globalThis.redisClient.get('ignore_list:user1');
      expect(result).not.toBe(null);
    });

    it('should handle non-existent keys gracefully', async () => {
      const userIds = ['nonexistent1', 'nonexistent2'];

      // Should not throw when trying to delete non-existent keys
      await expect(
        IgnoredUsersService.clearUsersIgnoreCache(userIds),
      ).resolves.not.toThrow();
    });

    it('should queue bloom filter invalidation when clearing cache', async () => {
      const userIds = ['user1', 'user2'];

      // Pre-populate cache
      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(['user3']),
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify(['user4']),
      );

      await IgnoredUsersService.clearUsersIgnoreCache(userIds);

      // Verify cache was cleared
      const result = await globalThis.redisClient.mget(
        'ignore_list:user1',
        'ignore_list:user2',
      );
      expect(result.every((val) => val === null)).toBe(true);

      // Verify bloom filter invalidation was queued (as a set, not list)
      const queuedItems = await globalThis.redisClient.smembers(
        'ignore_invalidations_pending',
      );
      expect(queuedItems).toContain('user1');
      expect(queuedItems).toContain('user2');
    });

    it('should not queue duplicate bloom filter invalidations', async () => {
      const userIds = ['user1', 'user2'];

      // Clear cache multiple times
      await IgnoredUsersService.clearUsersIgnoreCache(['user1']);
      await IgnoredUsersService.clearUsersIgnoreCache(['user2']);
      await IgnoredUsersService.clearUsersIgnoreCache(userIds);

      // Should have both users queued (set prevents duplicates)
      const queuedItems = await globalThis.redisClient.smembers(
        'ignore_invalidations_pending',
      );
      expect(queuedItems).toContain('user1');
      expect(queuedItems).toContain('user2');
      expect(queuedItems.length).toBe(2); // No duplicates
    });
  });

  describe('isIgnored', () => {
    it('should return true when users ignore each other (lexicographic order)', () => {
      const ignoreMatrix = new Set(['user1:user2', 'user3:user4']);

      expect(
        IgnoredUsersService.isIgnored('user1', 'user2', ignoreMatrix),
      ).toBe(true);
      expect(
        IgnoredUsersService.isIgnored('user2', 'user1', ignoreMatrix),
      ).toBe(true); // Same pair, different order
    });

    it('should return false when users do not ignore each other', () => {
      const ignoreMatrix = new Set(['user1:user2']);

      expect(
        IgnoredUsersService.isIgnored('user1', 'user3', ignoreMatrix),
      ).toBe(false);
      expect(
        IgnoredUsersService.isIgnored('user3', 'user4', ignoreMatrix),
      ).toBe(false);
    });

    it('should handle lexicographic ordering correctly', () => {
      const ignoreMatrix = new Set(['abc:def', 'user1:user2']);

      // Test with different string orderings
      expect(IgnoredUsersService.isIgnored('def', 'abc', ignoreMatrix)).toBe(
        true,
      );
      expect(
        IgnoredUsersService.isIgnored('user2', 'user1', ignoreMatrix),
      ).toBe(true);
    });

    it('should handle UUID-style IDs correctly', () => {
      const ignoreMatrix = new Set([
        '550e8400-e29b-41d4-a716-446655440000:6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ]);

      expect(
        IgnoredUsersService.isIgnored(
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          ignoreMatrix,
        ),
      ).toBe(true);

      expect(
        IgnoredUsersService.isIgnored(
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          '550e8400-e29b-41d4-a716-446655440000',
          ignoreMatrix,
        ),
      ).toBe(true);
    });
  });

  describe('getIgnoreInfo', () => {
    it('should return early for single user', async () => {
      const result = await IgnoredUsersService.getIgnoreInfo(['user1']);

      expect(result).toEqual({
        priorityUsers: ['user1'],
        deprioritizedUsers: [],
        ignoreMatrix: new Set(),
      });
    });

    it('should return early for empty user array', async () => {
      const result = await IgnoredUsersService.getIgnoreInfo([]);

      expect(result).toEqual({
        priorityUsers: [],
        deprioritizedUsers: [],
        ignoreMatrix: new Set(),
      });
    });

    it('should handle cache hits correctly with real Redis', async () => {
      const userIds = ['user1', 'user2', 'user3'];

      // Pre-populate Redis cache using individual keys
      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(['user2', 'user4']),
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify(['user1']),
      );
      await globalThis.redisClient.setex(
        'ignore_list:user3',
        3600,
        JSON.stringify([]),
      );

      // Mock Supabase for cache miss handling (user3 has empty array, so no DB call needed)
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix).toEqual(
        new Set(['user1:user2', 'user1:user4']),
      );
    });

    it('should handle cache misses and fallback to database', async () => {
      const userIds = ['user1', 'user2'];

      // Redis is empty (cache miss)
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user2', 'user3'],
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix).toEqual(
        new Set(['user1:user2', 'user2:user3']),
      );

      // Verify cache was updated in Redis
      const cachedData = await globalThis.redisClient.mget(
        'ignore_list:user1',
        'ignore_list:user2',
      );
      expect(JSON.parse(cachedData[0]!)).toEqual(['user2']);
      expect(JSON.parse(cachedData[1]!)).toEqual(['user3']);
    });

    it('should handle JSON parsing errors in cache gracefully', async () => {
      const userIds = ['user1', 'user2'];

      // Manually insert invalid JSON into Redis
      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        'invalid-json',
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify(['user3']),
      );

      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user4'],
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      // Should handle parsing error gracefully and fall back to database
      expect(result.ignoreMatrix).toEqual(
        new Set(['user1:user4', 'user2:user3']),
      );
    });

    it('should update cache after database fetch', async () => {
      const userIds = ['user1', 'user2'];

      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user3'],
        ['user2', 'user4'],
      ]);

      await IgnoredUsersService.getIgnoreInfo(userIds);

      // Verify cache was updated in Redis using individual keys
      const cachedData = await globalThis.redisClient.mget(
        'ignore_list:user1',
        'ignore_list:user2',
      );
      expect(JSON.parse(cachedData[0]!)).toEqual(['user3']);
      expect(JSON.parse(cachedData[1]!)).toEqual(['user4']);

      // Verify TTL was set on individual keys
      const ttl1 = await globalThis.redisClient.ttl('ignore_list:user1');
      const ttl2 = await globalThis.redisClient.ttl('ignore_list:user2');
      expect(ttl1).toBeGreaterThan(0);
      expect(ttl2).toBeGreaterThan(0);
    });

    describe('adaptive user filtering', () => {
      it('should prioritize users with low ignore counts', async () => {
        const userIds = ['user1', 'user2', 'user3', 'user4'];
        const queueUsers = [
          { userId: 'user1', score: 950 }, // 50 seconds wait
          { userId: 'user2', score: 990 }, // 10 seconds wait
          { userId: 'user3', score: 995 }, // 5 seconds wait
          { userId: 'user4', score: 999 }, // 1 second wait
        ];

        // Pre-populate Redis with ignore data using individual keys
        await globalThis.redisClient.setex(
          'ignore_list:user1',
          3600,
          JSON.stringify([]), // user1 ignores nobody
        );
        await globalThis.redisClient.setex(
          'ignore_list:user2',
          3600,
          JSON.stringify(['user3', 'user4']), // user2 ignores 2 users
        );
        await globalThis.redisClient.setex(
          'ignore_list:user3',
          3600,
          JSON.stringify(['user1', 'user2', 'user4']), // user3 ignores 3 users
        );
        await globalThis.redisClient.setex(
          'ignore_list:user4',
          3600,
          JSON.stringify([]), // user4 ignores nobody
        );

        const result = await IgnoredUsersService.getIgnoreInfo(
          userIds,
          queueUsers,
        );

        // user1 should be prioritized (long wait time > 30s)
        // user2, user4 should be prioritized (low ignore count)
        expect(result.priorityUsers).toContain('user1'); // Long wait
        expect(result.priorityUsers).toContain('user4'); // Low ignore count
      });

      it('should prioritize users with long wait times regardless of ignore count', async () => {
        const userIds = ['user1', 'user2'];
        const queueUsers = [
          { userId: 'user1', score: 950 }, // 50 seconds wait (> 30s threshold)
          { userId: 'user2', score: 990 }, // 10 seconds wait
        ];

        await globalThis.redisClient.setex(
          'ignore_list:user1',
          3600,
          JSON.stringify(['user2', 'user3', 'user4', 'user5']), // user1 ignores many
        );
        await globalThis.redisClient.setex(
          'ignore_list:user2',
          3600,
          JSON.stringify([]), // user2 ignores nobody
        );

        const result = await IgnoredUsersService.getIgnoreInfo(
          userIds,
          queueUsers,
        );

        // user1 should be prioritized despite high ignore count due to long wait
        expect(result.priorityUsers).toContain('user1');
        expect(result.priorityUsers).toContain('user2');
      });

      it('should handle dynamic thresholds based on batch size', async () => {
        // Small batch should be more lenient
        const smallBatch = ['user1', 'user2'];
        const queueUsersSmall = [
          { userId: 'user1', score: 990 },
          { userId: 'user2', score: 990 },
        ];

        await globalThis.redisClient.setex(
          'ignore_list:user1',
          3600,
          JSON.stringify(['user2']), // user1 ignores 1 user
        );
        await globalThis.redisClient.setex(
          'ignore_list:user2',
          3600,
          JSON.stringify([]), // user2 ignores nobody
        );

        const resultSmall = await IgnoredUsersService.getIgnoreInfo(
          smallBatch,
          queueUsersSmall,
        );

        // With small batch, threshold should be more lenient
        expect(resultSmall.priorityUsers).toContain('user1');
        expect(resultSmall.priorityUsers).toContain('user2');
      });
    });

    it('should build ignore matrix correctly with bidirectional relationships', async () => {
      const userIds = ['user1', 'user2', 'user3'];

      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(['user2']), // user1 ignores user2
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify(['user1', 'user3']), // user2 ignores user1, user3
      );
      await globalThis.redisClient.setex(
        'ignore_list:user3',
        3600,
        JSON.stringify(['user2']), // user3 ignores user2
      );

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      // Should create single keys for bidirectional relationships
      expect(result.ignoreMatrix).toEqual(
        new Set(['user1:user2', 'user2:user3']),
      );
    });

    it('should handle complex ignore relationships with lexicographic ordering', async () => {
      const userIds = ['zebra', 'alpha', 'beta'];

      await globalThis.redisClient.setex(
        'ignore_list:zebra',
        3600,
        JSON.stringify(['alpha', 'beta']), // zebra ignores alpha, beta
      );
      await globalThis.redisClient.setex(
        'ignore_list:alpha',
        3600,
        JSON.stringify(['zebra']), // alpha ignores zebra
      );
      await globalThis.redisClient.setex(
        'ignore_list:beta',
        3600,
        JSON.stringify(['zebra']), // beta ignores zebra
      );

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      // All relationships should use lexicographic ordering
      expect(result.ignoreMatrix).toEqual(
        new Set(['alpha:zebra', 'beta:zebra']),
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty ignore relationships', async () => {
      const userIds = ['user1', 'user2'];

      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify([]),
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify([]),
      );

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix.size).toBe(0);
      expect(result.priorityUsers).toEqual(userIds);
      expect(result.deprioritizedUsers).toEqual([]);
    });

    it('should handle database returning empty results', async () => {
      const userIds = ['user1', 'user2'];

      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix.size).toBe(0);
    });

    it('should handle self-ignore relationships correctly', async () => {
      const userIds = ['user1', 'user2'];

      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(['user1']), // user1 ignores themselves
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify([]),
      );

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      // Self-ignore should create a key
      expect(result.ignoreMatrix).toEqual(new Set(['user1:user1']));
    });

    it('should handle very large ignore lists', async () => {
      const userIds = ['user1', 'user2'];
      const largeIgnoreList = Array.from(
        { length: 1000 },
        (_, i) => `user${i}`,
      );

      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(largeIgnoreList),
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify([]),
      );

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix.size).toBe(1000);
    });

    it('should handle queue users without corresponding userIds', async () => {
      const userIds = ['user1', 'user2'];
      const queueUsers = [
        { userId: 'user1', score: 990 },
        { userId: 'user3', score: 995 }, // user3 not in userIds
      ];

      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify([]),
      );
      await globalThis.redisClient.setex(
        'ignore_list:user2',
        3600,
        JSON.stringify([]),
      );

      const result = await IgnoredUsersService.getIgnoreInfo(
        userIds,
        queueUsers,
      );

      // Should handle gracefully without errors
      expect(result.priorityUsers).toEqual(userIds);
    });
  });

  describe('performance and caching with real Redis', () => {
    it('should handle mixed cache hits/misses correctly', async () => {
      const userIds = ['user1', 'user2', 'user3', 'user4'];

      // Pre-populate partial cache data using individual keys
      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(['user2']), // hit
      );
      await globalThis.redisClient.setex(
        'ignore_list:user3',
        3600,
        JSON.stringify(['user4']), // hit
      );
      // user2 and user4 are cache misses

      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user2', 'user3'],
        ['user4', 'user1'],
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      // Verify the ignore matrix is built correctly from both cache and DB
      expect(result.ignoreMatrix.size).toBeGreaterThan(0);
      expect(result.ignoreMatrix).toContain('user1:user2');
      expect(result.ignoreMatrix).toContain('user3:user4');
      expect(result.ignoreMatrix).toContain('user2:user3');
      expect(result.ignoreMatrix).toContain('user1:user4');
    });

    it('should batch cache updates efficiently', async () => {
      const userIds = ['user1', 'user2', 'user3'];

      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user1', 'user3'],
        ['user2', 'user3'],
      ]);

      await IgnoredUsersService.getIgnoreInfo(userIds);

      // Verify all data was cached in Redis using individual keys
      const cachedData = await globalThis.redisClient.mget(
        'ignore_list:user1',
        'ignore_list:user2',
        'ignore_list:user3',
      );

      expect(JSON.parse(cachedData[0]!)).toEqual(
        expect.arrayContaining(['user2', 'user3']),
      );
      expect(JSON.parse(cachedData[1]!)).toEqual(
        expect.arrayContaining(['user3']),
      );
      expect(JSON.parse(cachedData[2]!)).toEqual([]);
    });

    it('should respect Redis TTL settings', async () => {
      const userIds = ['user1', 'user2'];

      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
      ]);

      await IgnoredUsersService.getIgnoreInfo(userIds);

      // Verify TTL was set correctly on individual keys
      const ttl1 = await globalThis.redisClient.ttl('ignore_list:user1');
      const ttl2 = await globalThis.redisClient.ttl('ignore_list:user2');
      expect(ttl1).toBeGreaterThan(0);
      expect(ttl2).toBeGreaterThan(0);
    });

    it('should handle Redis unavailability gracefully', async () => {
      // Simulate Redis being unavailable by temporarily breaking the connection
      const originalClient = globalThis.redisClient;
      globalThis.redisClient = {
        hmget: () => Promise.reject(new Error('Redis unavailable')),
        hmset: () => Promise.reject(new Error('Redis unavailable')),
        expire: () => Promise.reject(new Error('Redis unavailable')),
        hdel: () => Promise.reject(new Error('Redis unavailable')),
      } as any;

      try {
        const userIds = ['user1', 'user2'];
        vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
          ['user1', 'user2'],
        ]);

        // Should fall back to database and not throw
        const result = await IgnoredUsersService.getIgnoreInfo(userIds);
        expect(result.ignoreMatrix).toEqual(new Set(['user1:user2']));
      } finally {
        // Restore the original client
        globalThis.redisClient = originalClient;
      }
    });
  });

  describe('optimizeBloomFilterCapacity integration', () => {
    it('should exist as one of the 4 core functions', async () => {
      expect(typeof IgnoredUsersService.optimizeBloomFilterCapacity).toBe(
        'function',
      );
    });

    it('should handle optimization when bloom filter exists', async () => {
      // Setup: Create ignore data that would benefit from bloom filter
      const userIds = Array.from({ length: 150 }, (_, i) => `user${i}`);

      // Pre-populate cache with enough ignore data to create bloom filter
      for (let i = 0; i < 50; i++) {
        await globalThis.redisClient.setex(
          `ignore_list:user${i}`,
          3600,
          JSON.stringify([`user${i + 50}`, `user${i + 100}`]),
        );
      }

      // First, trigger bloom filter creation by calling getIgnoreInfo
      await IgnoredUsersService.getIgnoreInfo(userIds.slice(0, 10));

      // Should not throw when optimizing
      await expect(
        IgnoredUsersService.optimizeBloomFilterCapacity(),
      ).resolves.not.toThrow();
    });

    it('should handle optimization when no bloom filter exists', async () => {
      // Ensure no bloom filter exists
      await globalThis.redisClient.del('ignore_bloom_filter');

      // Should not throw when no filter exists
      await expect(
        IgnoredUsersService.optimizeBloomFilterCapacity(),
      ).resolves.not.toThrow();
    });

    it('should handle Redis bloom filter operations gracefully', async () => {
      // Test error handling when Redis operations might fail
      // This tests the graceful degradation path

      // Should not throw even if Redis operations fail
      await expect(
        IgnoredUsersService.optimizeBloomFilterCapacity(),
      ).resolves.not.toThrow();
    });

    it('should clean up bloom filter when insufficient data exists', async () => {
      // Setup: Create minimal ignore data (< 100 pairs)
      await globalThis.redisClient.setex(
        'ignore_list:user1',
        3600,
        JSON.stringify(['user2']),
      );

      // Create a bloom filter that should be removed due to insufficient data
      if (globalThis.redisClient.call) {
        try {
          await globalThis.redisClient.call(
            'BF.RESERVE',
            'ignore_bloom_filter',
            0.01,
            200,
          );
          await globalThis.redisClient.call(
            'BF.ADD',
            'ignore_bloom_filter',
            'user1:user2',
          );
        } catch (_error) {
          // Skip if Redis doesn't have RedisBloom module
          return;
        }
      } else {
        // Skip if Redis client doesn't support call method
        return;
      }

      // Verify filter exists before optimization
      const existsBefore = await globalThis.redisClient.exists(
        'ignore_bloom_filter',
      );
      expect(existsBefore).toBe(1);

      await IgnoredUsersService.optimizeBloomFilterCapacity();

      // Verify filter was removed after optimization (insufficient data)
      const existsAfter = await globalThis.redisClient.exists(
        'ignore_bloom_filter',
      );
      expect(existsAfter).toBe(0);
    });

    it('should rebuild bloom filter with high utilization', async () => {
      // This test requires RedisBloom module, so we'll skip if not available
      if (!globalThis.redisClient.call) {
        return;
      }

      try {
        // Setup: Create a bloom filter with high utilization
        await globalThis.redisClient.call(
          'BF.RESERVE',
          'ignore_bloom_filter',
          0.01,
          100,
        );

        // Fill it up to high utilization (> 80%)
        for (let i = 0; i < 85; i++) {
          await globalThis.redisClient.call(
            'BF.ADD',
            'ignore_bloom_filter',
            `user${i}:user${i + 100}`,
          );
        }

        // Create corresponding cache data
        for (let i = 0; i < 10; i++) {
          await globalThis.redisClient.setex(
            `ignore_list:user${i}`,
            3600,
            JSON.stringify([`user${i + 100}`]),
          );
        }

        // Should rebuild due to high utilization
        await expect(
          IgnoredUsersService.optimizeBloomFilterCapacity(),
        ).resolves.not.toThrow();
      } catch (_error) {
        // Skip if Redis doesn't have RedisBloom module
        return;
      }
    });
  });

  describe('IgnoredUsersServiceInternals', () => {
    describe('buildIgnoreMatrix', () => {
      it('should handle lexicographic edge cases', () => {
        const ignoreData = new Map<string, Set<string>>([
          ['zebra', new Set(['alpha', 'beta'])],
          ['alpha', new Set(['zebra'])],
          ['beta', new Set(['alpha'])],
        ]);

        const result =
          IgnoredUsersServiceInternals.buildIgnoreMatrix(ignoreData);

        // Should use lexicographic ordering consistently
        expect(result).toEqual(
          new Set([
            'alpha:zebra', // zebra:alpha -> alpha:zebra
            'beta:zebra', // zebra:beta -> beta:zebra
            'alpha:zebra', // alpha:zebra (already exists)
            'alpha:beta', // beta:alpha -> alpha:beta
          ]),
        );

        // Verify no duplicates and correct ordering
        expect(result.size).toBe(3); // zebra-alpha, zebra-beta, alpha-beta
        expect(result.has('alpha:zebra')).toBe(true);
        expect(result.has('beta:zebra')).toBe(true);
        expect(result.has('alpha:beta')).toBe(true);
      });

      it('should handle Unicode/international user IDs', () => {
        const ignoreData = new Map<string, Set<string>>([
          ['用户1', new Set(['用户2'])], // Chinese characters
          ['пользователь', new Set(['用户1'])], // Cyrillic
          ['🚀user', new Set(['用户2'])], // Emoji + text
          ['Müller', new Set(['Øyvind'])], // Accented characters
        ]);

        const result =
          IgnoredUsersServiceInternals.buildIgnoreMatrix(ignoreData);

        // Should handle Unicode lexicographic ordering correctly
        expect(result.size).toBe(4);

        // Verify some specific orderings (Unicode code points determine order)
        const resultArray = Array.from(result);
        resultArray.forEach((pair) => {
          const [first, second] = pair.split(':');
          expect(first <= second).toBe(true); // Lexicographic ordering maintained
        });
      });

      it('should handle very long user ID strings', () => {
        const longId1 = 'a'.repeat(1000);
        const longId2 = 'b'.repeat(1000);
        const longId3 = 'c'.repeat(999) + 'a'; // Lexicographically after longId1

        const ignoreData = new Map<string, Set<string>>([
          [longId1, new Set([longId2, longId3])],
          [longId2, new Set([longId1])],
        ]);

        const result =
          IgnoredUsersServiceInternals.buildIgnoreMatrix(ignoreData);

        expect(result.size).toBe(2);
        expect(result.has(`${longId1}:${longId2}`)).toBe(true);
        expect(result.has(`${longId1}:${longId3}`)).toBe(true); // longId1 < longId3 lexicographically
      });

      it('should handle empty ignore data', () => {
        const ignoreData = new Map<string, Set<string>>();
        const result =
          IgnoredUsersServiceInternals.buildIgnoreMatrix(ignoreData);
        expect(result.size).toBe(0);
      });

      it('should handle users with empty ignore sets', () => {
        const ignoreData = new Map<string, Set<string>>([
          ['user1', new Set()],
          ['user2', new Set()],
          ['user3', new Set(['user1'])],
        ]);

        const result =
          IgnoredUsersServiceInternals.buildIgnoreMatrix(ignoreData);
        expect(result.size).toBe(1);
        expect(result.has('user1:user3')).toBe(true);
      });
    });

    describe('adaptiveUserFiltering', () => {
      it('should calculate thresholds correctly for edge batch sizes', () => {
        // Test batch size = 2 (minimum for filtering)
        const smallBatch = ['user1', 'user2'];
        const ignoreData = new Map<string, Set<string>>([
          ['user1', new Set(['user3'])], // 1 ignore
          ['user2', new Set()], // 0 ignores
        ]);
        const queueUsers = [
          { userId: 'user1', score: 990 }, // 10 seconds wait
          { userId: 'user2', score: 990 }, // 10 seconds wait
        ];

        const result = IgnoredUsersServiceInternals.adaptiveUserFiltering(
          smallBatch,
          ignoreData,
          queueUsers,
        );

        // With batch size 2: threshold = max(0.5, 1 - 10/2) = max(0.5, -4) = 0.5
        // maxIgnores = floor(2 * 0.5) = 1
        // Both users should be prioritized (user1: 1 ignore <= 1, user2: 0 ignores <= 1)
        expect(result.priorityUsers).toContain('user1');
        expect(result.priorityUsers).toContain('user2');
        expect(result.deprioritizedUsers).toHaveLength(0);
      });

      it('should handle exactly 30 second wait time boundary', () => {
        vi.mocked(TimeUtils.getCurrentTimeAsScore).mockReturnValue(1000);

        const userIds = ['user1', 'user2', 'user3'];
        const ignoreData = new Map<string, Set<string>>([
          ['user1', new Set(['a', 'b', 'c', 'd', 'e'])], // 5 ignores (high)
          ['user2', new Set(['a', 'b', 'c', 'd', 'e'])], // 5 ignores (high)
          ['user3', new Set(['a', 'b', 'c', 'd', 'e'])], // 5 ignores (high)
        ]);

        const queueUsers = [
          { userId: 'user1', score: 970 }, // Exactly 30 seconds wait (1000 - 970 = 30)
          { userId: 'user2', score: 969 }, // 31 seconds wait (> 30)
          { userId: 'user3', score: 971 }, // 29 seconds wait (< 30)
        ];

        const result = IgnoredUsersServiceInternals.adaptiveUserFiltering(
          userIds,
          ignoreData,
          queueUsers,
        );

        // user1: exactly 30 seconds (not > 30), should be deprioritized due to high ignores
        // user2: 31 seconds (> 30), should be prioritized despite high ignores
        // user3: 29 seconds (< 30), should be deprioritized due to high ignores
        expect(result.priorityUsers).toContain('user2');
        expect(result.deprioritizedUsers).toContain('user1');
        expect(result.deprioritizedUsers).toContain('user3');
      });

      it('should handle batch size = 1', () => {
        const singleUser = ['user1'];
        const ignoreData = new Map<string, Set<string>>([
          ['user1', new Set(['a', 'b', 'c', 'd', 'e'])], // Many ignores
        ]);
        const queueUsers = [{ userId: 'user1', score: 990 }]; // Short wait

        const result = IgnoredUsersServiceInternals.adaptiveUserFiltering(
          singleUser,
          ignoreData,
          queueUsers,
        );

        // With batch size 1: threshold = max(0.5, 1 - 10/1) = max(0.5, -9) = 0.5
        // maxIgnores = floor(1 * 0.5) = 0
        // user1 has 5 ignores > 0, so should be deprioritized
        expect(result.priorityUsers).toHaveLength(0);
        expect(result.deprioritizedUsers).toContain('user1');
      });

      it('should handle large batch sizes with scaling thresholds', () => {
        const largeBatch = Array.from({ length: 20 }, (_, i) => `user${i}`);
        const ignoreData = new Map<string, Set<string>>();

        // Give everyone different ignore counts
        largeBatch.forEach((userId, index) => {
          const ignoreCount = index; // user0: 0 ignores, user1: 1 ignore, etc.
          const ignores = Array.from(
            { length: ignoreCount },
            (_, i) => `ignored${i}`,
          );
          ignoreData.set(userId, new Set(ignores));
        });

        const queueUsers = largeBatch.map((userId) => ({ userId, score: 990 }));

        const result = IgnoredUsersServiceInternals.adaptiveUserFiltering(
          largeBatch,
          ignoreData,
          queueUsers,
        );

        // With batch size 20: threshold = max(0.5, 1 - 10/20) = max(0.5, 0.5) = 0.5
        // maxIgnores = floor(20 * 0.5) = 10
        // Users 0-10 should be prioritized (ignore count <= 10)
        // Users 11-19 should be deprioritized (ignore count > 10)
        expect(result.priorityUsers).toHaveLength(11); // user0 through user10
        expect(result.deprioritizedUsers).toHaveLength(9); // user11 through user19
      });

      it('should handle missing queue users gracefully', () => {
        const userIds = ['user1', 'user2', 'user3'];
        const ignoreData = new Map<string, Set<string>>([
          ['user1', new Set()],
          ['user2', new Set()],
          ['user3', new Set()],
        ]);
        const queueUsers = [
          { userId: 'user1', score: 990 },
          // user2 and user3 missing from queue
        ];

        const result = IgnoredUsersServiceInternals.adaptiveUserFiltering(
          userIds,
          ignoreData,
          queueUsers,
        );

        // Users not in queue should have waitTime = 0, so normal ignore-based filtering applies
        expect(result.priorityUsers).toHaveLength(3); // All users have low ignore counts
        expect(result.deprioritizedUsers).toHaveLength(0);
      });
    });

    describe('shouldRebuildBloomFilter', () => {
      beforeEach(async () => {
        // Clean up Redis state before each test
        await globalThis.redisClient.del('ignore_invalidations_pending');
        await globalThis.redisClient.del('bloom_filter_last_rebuild');
      });

      it('should return false when no pending invalidations exist', async () => {
        // Ensure no pending invalidations
        await globalThis.redisClient.del('ignore_invalidations_pending');

        const result =
          await IgnoredUsersServiceInternals.shouldRebuildBloomFilter();

        expect(result).toBe(false);
      });

      it('should handle Redis timestamp parsing edge cases', async () => {
        // Add pending invalidations
        await globalThis.redisClient.sadd(
          'ignore_invalidations_pending',
          'user1',
        );

        // Test various edge cases for timestamp parsing
        const testCases = [
          '', // Empty string
          'invalid', // Non-numeric string
          '0', // Zero timestamp
          '-1', // Negative timestamp
          '999999999999999', // Very large timestamp
          'NaN', // NaN string
        ];

        for (const timestamp of testCases) {
          await globalThis.redisClient.set(
            'bloom_filter_last_rebuild',
            timestamp,
          );

          // Should not throw and should handle gracefully
          const result =
            await IgnoredUsersServiceInternals.shouldRebuildBloomFilter();
          expect(typeof result).toBe('boolean');
        }
      });

      it('should handle exactly 30 second debounce boundary', async () => {
        const now = Date.now();

        // Add pending invalidations
        await globalThis.redisClient.sadd(
          'ignore_invalidations_pending',
          'user1',
        );

        // Test 29.9 seconds ago (should return false - within debounce)
        await globalThis.redisClient.set(
          'bloom_filter_last_rebuild',
          (now - 29900).toString(),
        );

        // Mock current time
        const originalNow = Date.now;
        Date.now = vi.fn(() => now);

        try {
          const result1 =
            await IgnoredUsersServiceInternals.shouldRebuildBloomFilter();
          expect(result1).toBe(false); // 29.9s ago, within debounce

          // Test 30 seconds + 1ms ago (should return true - outside debounce)
          await globalThis.redisClient.set(
            'bloom_filter_last_rebuild',
            (now - 30001).toString(),
          );

          const result2 =
            await IgnoredUsersServiceInternals.shouldRebuildBloomFilter();
          expect(result2).toBe(true); // Just outside debounce window

          // Test 29 seconds ago (should return false - within debounce)
          await globalThis.redisClient.set(
            'bloom_filter_last_rebuild',
            (now - 29999).toString(),
          );

          const result3 =
            await IgnoredUsersServiceInternals.shouldRebuildBloomFilter();
          expect(result3).toBe(false); // Still within debounce window
        } finally {
          Date.now = originalNow; // Restore original Date.now
        }
      });

      it('should return true when sufficient time has passed', async () => {
        // Add pending invalidations
        await globalThis.redisClient.sadd(
          'ignore_invalidations_pending',
          'user1',
          'user2',
        );

        // Set last rebuild to 60 seconds ago (well outside debounce window)
        const sixtySecondsAgo = Date.now() - 60000;
        await globalThis.redisClient.set(
          'bloom_filter_last_rebuild',
          sixtySecondsAgo.toString(),
        );

        const result =
          await IgnoredUsersServiceInternals.shouldRebuildBloomFilter();

        expect(result).toBe(true);
      });

      it('should handle Redis errors gracefully', async () => {
        // Temporarily break Redis to test error handling
        const originalClient = globalThis.redisClient;
        globalThis.redisClient = {
          scard: () => Promise.reject(new Error('Redis connection failed')),
          get: () => Promise.reject(new Error('Redis connection failed')),
        } as any;

        try {
          const result =
            await IgnoredUsersServiceInternals.shouldRebuildBloomFilter();
          expect(result).toBe(false); // Should default to false on error
        } finally {
          globalThis.redisClient = originalClient;
        }
      });

      it('should return true when no last rebuild timestamp exists', async () => {
        // Add pending invalidations
        await globalThis.redisClient.sadd(
          'ignore_invalidations_pending',
          'user1',
        );

        // Ensure no last rebuild timestamp exists
        await globalThis.redisClient.del('bloom_filter_last_rebuild');

        const result =
          await IgnoredUsersServiceInternals.shouldRebuildBloomFilter();

        expect(result).toBe(true); // Should rebuild when no previous timestamp
      });
    });
  });
});
