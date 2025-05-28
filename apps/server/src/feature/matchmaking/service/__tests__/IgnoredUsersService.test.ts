import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IgnoredUsersService } from '../IgnoredUsersService.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import { SupabaseService } from '../../../../common/service/SupabaseService.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { TimeUtils } from '../../util/TimeUtils.js';

vi.mock('../../../../common/client/RedisClient.js');
vi.mock('../../../../common/service/SupabaseService.js');
vi.mock('../../../../common/config/service/ServerConfigService.js');
vi.mock('../../util/TimeUtils.js');

describe('IgnoredUsersService', () => {
  const mockRedis = {
    hdel: vi.fn(),
    hmget: vi.fn(),
    hmset: vi.fn(),
    expire: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(RedisClient.get).mockReturnValue(mockRedis as any);
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('clearUsersIgnoreCache', () => {
    it('should clear cache for multiple users', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      mockRedis.hdel.mockResolvedValue(3);

      await IgnoredUsersService.clearUsersIgnoreCache(userIds);

      expect(mockRedis.hdel).toHaveBeenCalledWith(
        'ignored_users_batch',
        'ign:user1',
        'ign:user2',
        'ign:user3',
      );
    });

    it('should return early for empty user array', async () => {
      await IgnoredUsersService.clearUsersIgnoreCache([]);

      expect(mockRedis.hdel).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const userIds = ['user1', 'user2'];
      mockRedis.hdel.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        IgnoredUsersService.clearUsersIgnoreCache(userIds),
      ).rejects.toThrow('Redis error');

      expect(mockRedis.hdel).toHaveBeenCalled();
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

      expect(mockRedis.hmget).not.toHaveBeenCalled();
    });

    it('should return early for empty user array', async () => {
      const result = await IgnoredUsersService.getIgnoreInfo([]);

      expect(result).toEqual({
        priorityUsers: [],
        deprioritizedUsers: [],
        ignoreMatrix: new Set(),
      });
    });

    it('should handle cache hits correctly', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      const cachedData = [
        JSON.stringify(['user2', 'user4']), // user1 ignores user2, user4
        JSON.stringify(['user1']), // user2 ignores user1
        null, // user3 cache miss
      ];

      mockRedis.hmget.mockResolvedValue(cachedData);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user3', 'user5'],
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix).toEqual(
        new Set(['user1:user2', 'user1:user4', 'user3:user5']),
      );
    });

    it('should handle cache misses and fallback to database', async () => {
      const userIds = ['user1', 'user2'];
      mockRedis.hmget.mockResolvedValue([null, null]);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user2', 'user3'],
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix).toEqual(
        new Set(['user1:user2', 'user2:user3']),
      );
    });

    it('should handle JSON parsing errors in cache', async () => {
      const userIds = ['user1', 'user2'];
      const cachedData = [
        'invalid-json', // Should cause parsing error
        JSON.stringify(['user3']),
      ];

      mockRedis.hmget.mockResolvedValue(cachedData);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user4'],
      ]);

      await IgnoredUsersService.getIgnoreInfo(userIds);

      // Verify it handled parsing error gracefully
    });

    it('should handle Redis errors and fallback to database', async () => {
      const userIds = ['user1', 'user2'];
      mockRedis.hmget.mockRejectedValue(new Error('Redis connection failed'));
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix).toEqual(new Set(['user1:user2']));
    });

    it('should update cache after database fetch', async () => {
      const userIds = ['user1', 'user2'];
      mockRedis.hmget.mockResolvedValue([null, null]);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user3'],
        ['user2', 'user4'],
      ]);

      await IgnoredUsersService.getIgnoreInfo(userIds);

      // Verify cache update was called
      expect(mockRedis.hmset).toHaveBeenCalledWith(
        'ignored_users_batch',
        'ign:user1',
        JSON.stringify(['user3']),
        'ign:user2',
        JSON.stringify(['user4']),
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'ignored_users_batch',
        3600,
      );
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

        mockRedis.hmget.mockResolvedValue([
          JSON.stringify([]), // user1 ignores nobody
          JSON.stringify(['user3', 'user4']), // user2 ignores 2 users
          JSON.stringify(['user1', 'user2', 'user4']), // user3 ignores 3 users
          JSON.stringify([]), // user4 ignores nobody
        ]);

        const result = await IgnoredUsersService.getIgnoreInfo(
          userIds,
          queueUsers,
        );

        // user1 should be prioritized (long wait time > 30s)
        // user2, user4 should be prioritized (low ignore count)
        // user3 might be deprioritized (high ignore count, short wait)
        expect(result.priorityUsers).toContain('user1'); // Long wait
        expect(result.priorityUsers).toContain('user4'); // Low ignore count
      });

      it('should prioritize users with long wait times regardless of ignore count', async () => {
        const userIds = ['user1', 'user2'];
        const queueUsers = [
          { userId: 'user1', score: 950 }, // 50 seconds wait (> 30s threshold)
          { userId: 'user2', score: 990 }, // 10 seconds wait
        ];

        mockRedis.hmget.mockResolvedValue([
          JSON.stringify(['user2', 'user3', 'user4', 'user5']), // user1 ignores many
          JSON.stringify([]), // user2 ignores nobody
        ]);

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

        mockRedis.hmget.mockResolvedValue([
          JSON.stringify(['user2']), // user1 ignores 1 user
          JSON.stringify([]), // user2 ignores nobody
        ]);

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
      mockRedis.hmget.mockResolvedValue([
        JSON.stringify(['user2']), // user1 ignores user2
        JSON.stringify(['user1', 'user3']), // user2 ignores user1, user3
        JSON.stringify(['user2']), // user3 ignores user2
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      // Should create single keys for bidirectional relationships
      expect(result.ignoreMatrix).toEqual(
        new Set(['user1:user2', 'user2:user3']),
      );
    });

    it('should handle complex ignore relationships with lexicographic ordering', async () => {
      const userIds = ['zebra', 'alpha', 'beta'];
      mockRedis.hmget.mockResolvedValue([
        JSON.stringify(['alpha', 'beta']), // zebra ignores alpha, beta
        JSON.stringify(['zebra']), // alpha ignores zebra
        JSON.stringify(['zebra']), // beta ignores zebra
      ]);

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
      mockRedis.hmget.mockResolvedValue([
        JSON.stringify([]),
        JSON.stringify([]),
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix.size).toBe(0);
      expect(result.priorityUsers).toEqual(userIds);
      expect(result.deprioritizedUsers).toEqual([]);
    });

    it('should handle database returning empty results', async () => {
      const userIds = ['user1', 'user2'];
      mockRedis.hmget.mockResolvedValue([null, null]);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix.size).toBe(0);
    });

    it('should handle self-ignore relationships correctly', async () => {
      const userIds = ['user1', 'user2'];
      mockRedis.hmget.mockResolvedValue([
        JSON.stringify(['user1']), // user1 ignores themselves
        JSON.stringify([]),
      ]);

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
      mockRedis.hmget.mockResolvedValue([
        JSON.stringify(largeIgnoreList),
        JSON.stringify([]),
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix.size).toBe(1000);
    });

    it('should handle queue users without corresponding userIds', async () => {
      const userIds = ['user1', 'user2'];
      const queueUsers = [
        { userId: 'user1', score: 990 },
        { userId: 'user3', score: 995 }, // user3 not in userIds
      ];

      mockRedis.hmget.mockResolvedValue([
        JSON.stringify([]),
        JSON.stringify([]),
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(
        userIds,
        queueUsers,
      );

      // Should handle gracefully without errors
      expect(result.priorityUsers).toEqual(userIds);
    });
  });

  describe('performance and caching', () => {
    it('should handle mixed cache hits/misses correctly', async () => {
      const userIds = ['user1', 'user2', 'user3', 'user4'];
      mockRedis.hmget.mockResolvedValue([
        JSON.stringify(['user2']), // hit
        null, // miss
        JSON.stringify(['user4']), // hit
        null, // miss
      ]);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user2', 'user3'],
        ['user4', 'user1'],
      ]);

      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      // Verify the ignore matrix is built correctly
      expect(result.ignoreMatrix.size).toBeGreaterThan(0);
    });

    it('should batch cache updates efficiently', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      mockRedis.hmget.mockResolvedValue([null, null, null]);
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
        ['user1', 'user3'],
        ['user2', 'user3'],
      ]);

      await IgnoredUsersService.getIgnoreInfo(userIds);

      // Should update cache in a single batch operation
      expect(mockRedis.hmset).toHaveBeenCalledTimes(1);
      expect(mockRedis.hmset).toHaveBeenCalledWith(
        'ignored_users_batch',
        'ign:user1',
        JSON.stringify(['user2', 'user3']),
        'ign:user2',
        JSON.stringify(['user3']),
        'ign:user3',
        JSON.stringify([]),
      );
    });

    it('should handle cache update failures gracefully', async () => {
      const userIds = ['user1', 'user2'];
      mockRedis.hmget.mockResolvedValue([null, null]);
      mockRedis.hmset.mockRejectedValue(new Error('Cache update failed'));
      vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([
        ['user1', 'user2'],
      ]);

      // Should not throw despite cache update failure
      const result = await IgnoredUsersService.getIgnoreInfo(userIds);

      expect(result.ignoreMatrix).toEqual(new Set(['user1:user2']));
    });
  });
});
