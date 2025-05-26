import { MatchingAlgorithm } from '../MatchingAlgorithm.js';
import type { QueueUser } from '../../model/QueueUser.js';
import { IgnoredUsersService } from '../IgnoredUsersService.js';

vi.mock('../IgnoredUsersService.js', () => ({
  IgnoredUsersService: {
    isIgnored: vi.fn(),
  },
}));

describe('MatchingAlgorithm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findOptimizedMatches', () => {
    it('should match two compatible users', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];
      const ignoreMatrix = new Set<string>();

      // Mock isIgnored to return false (users are compatible)
      vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

      const matches = MatchingAlgorithm.findOptimizedMatches(
        users,
        ignoreMatrix,
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].user1).toEqual(users[0]);
      expect(matches[0].user2).toEqual(users[1]);
      expect(matches[0].roomId).toBeTruthy();
      expect(IgnoredUsersService.isIgnored).toHaveBeenCalledWith(
        'user1',
        'user2',
        ignoreMatrix,
      );
    });

    it('should not match incompatible users', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];
      const ignoreMatrix = new Set<string>();

      // Mock isIgnored to return true (users ignore each other)
      vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(true);

      const matches = MatchingAlgorithm.findOptimizedMatches(
        users,
        ignoreMatrix,
      );

      expect(matches).toHaveLength(0);
      expect(IgnoredUsersService.isIgnored).toHaveBeenCalledWith(
        'user1',
        'user2',
        ignoreMatrix,
      );
    });

    it('should match multiple pairs from a larger group', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
      ];
      const ignoreMatrix = new Set<string>();

      // Mock isIgnored to return false for all pairs
      vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

      const matches = MatchingAlgorithm.findOptimizedMatches(
        users,
        ignoreMatrix,
      );

      expect(matches).toHaveLength(2);

      // First match should be user1 and user2
      expect(matches[0].user1.userId).toBe('user1');
      expect(matches[0].user2.userId).toBe('user2');

      // Second match should be user3 and user4
      expect(matches[1].user1.userId).toBe('user3');
      expect(matches[1].user2.userId).toBe('user4');

      // Each match should have a unique room ID
      expect(matches[0].roomId).not.toBe(matches[1].roomId);
    });

    it('should handle selective ignoring correctly', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
        { socketId: 'socket4', userId: 'user4', score: 1003 },
      ];
      const ignoreMatrix = new Set<string>();

      // Mock isIgnored: user1 ignores user2, but user1 can match with user3
      vi.mocked(IgnoredUsersService.isIgnored).mockImplementation(
        (id1, id2) => {
          return (
            (id1 === 'user1' && id2 === 'user2') ||
            (id1 === 'user2' && id2 === 'user1')
          );
        },
      );

      const matches = MatchingAlgorithm.findOptimizedMatches(
        users,
        ignoreMatrix,
      );

      expect(matches).toHaveLength(2);

      // user1 should match with user3 (skipping user2)
      expect(matches[0].user1.userId).toBe('user1');
      expect(matches[0].user2.userId).toBe('user3');

      // user2 should match with user4
      expect(matches[1].user1.userId).toBe('user2');
      expect(matches[1].user2.userId).toBe('user4');
    });

    it('should handle odd number of users', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
        { socketId: 'socket3', userId: 'user3', score: 1002 },
      ];
      const ignoreMatrix = new Set<string>();

      vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

      const matches = MatchingAlgorithm.findOptimizedMatches(
        users,
        ignoreMatrix,
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].user1.userId).toBe('user1');
      expect(matches[0].user2.userId).toBe('user2');
      // user3 remains unmatched
    });

    it('should return empty array for invalid inputs', () => {
      // Test with null users
      expect(
        MatchingAlgorithm.findOptimizedMatches(null as any, new Set()),
      ).toEqual([]);

      // Test with undefined users
      expect(
        MatchingAlgorithm.findOptimizedMatches(undefined as any, new Set()),
      ).toEqual([]);

      // Test with empty array
      expect(MatchingAlgorithm.findOptimizedMatches([], new Set())).toEqual([]);

      // Test with single user
      const singleUser: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
      ];
      expect(
        MatchingAlgorithm.findOptimizedMatches(singleUser, new Set()),
      ).toEqual([]);

      // Test with null ignoreMatrix
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 1000 },
        { socketId: 'socket2', userId: 'user2', score: 1001 },
      ];
      expect(
        MatchingAlgorithm.findOptimizedMatches(users, null as any),
      ).toEqual([]);
    });

    it('should maintain FIFO order (first users get matched first)', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', score: 900 }, // Oldest (lowest score)
        { socketId: 'socket2', userId: 'user2', score: 950 },
        { socketId: 'socket3', userId: 'user3', score: 980 },
        { socketId: 'socket4', userId: 'user4', score: 990 }, // Newest (highest score)
      ];
      const ignoreMatrix = new Set<string>();

      vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

      const matches = MatchingAlgorithm.findOptimizedMatches(
        users,
        ignoreMatrix,
      );

      expect(matches).toHaveLength(2);

      // First match should be the two oldest users
      expect(matches[0].user1.score).toBe(900);
      expect(matches[0].user2.score).toBe(950);

      // Second match should be the remaining users
      expect(matches[1].user1.score).toBe(980);
      expect(matches[1].user2.score).toBe(990);
    });

    it('should generate unique room IDs for each match', () => {
      const users: QueueUser[] = Array.from({ length: 6 }, (_, i) => ({
        socketId: `socket${i + 1}`,
        userId: `user${i + 1}`,
        score: 1000 + i,
      }));
      const ignoreMatrix = new Set<string>();

      vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

      const matches = MatchingAlgorithm.findOptimizedMatches(
        users,
        ignoreMatrix,
      );

      expect(matches).toHaveLength(3);

      const roomIds = matches.map((match) => match.roomId);
      const uniqueRoomIds = new Set(roomIds);

      expect(uniqueRoomIds.size).toBe(3); // All room IDs should be unique

      // Each room ID should be a valid UUID format
      roomIds.forEach((roomId) => {
        expect(roomId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      });
    });

    describe('Edge Cases and Data Validation', () => {
      it('should handle duplicate socketIds gracefully', () => {
        const users: QueueUser[] = [
          { socketId: 'socket1', userId: 'user1', score: 1000 },
          { socketId: 'socket1', userId: 'user2', score: 1001 }, // Duplicate socketId
          { socketId: 'socket3', userId: 'user3', score: 1002 },
        ];
        const ignoreMatrix = new Set<string>();

        vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

        const matches = MatchingAlgorithm.findOptimizedMatches(
          users,
          ignoreMatrix,
        );

        // Should only match unique socketIds - the algorithm matches user1 with the duplicate socket1 user
        expect(matches).toHaveLength(1);
        expect(matches[0].user1.socketId).toBe('socket1');
        expect(matches[0].user1.userId).toBe('user1'); // First occurrence
        expect(matches[0].user2.socketId).toBe('socket1'); // Second user with same socketId
        expect(matches[0].user2.userId).toBe('user2');
      });

      it('should handle duplicate userIds with different socketIds', () => {
        const users: QueueUser[] = [
          { socketId: 'socket1', userId: 'user1', score: 1000 },
          { socketId: 'socket2', userId: 'user1', score: 1001 }, // Duplicate userId
          { socketId: 'socket3', userId: 'user2', score: 1002 },
          { socketId: 'socket4', userId: 'user3', score: 1003 },
        ];
        const ignoreMatrix = new Set<string>();

        vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

        const matches = MatchingAlgorithm.findOptimizedMatches(
          users,
          ignoreMatrix,
        );

        // Should match all users regardless of duplicate userIds
        expect(matches).toHaveLength(2);
        expect(matches[0].user1.socketId).toBe('socket1');
        expect(matches[0].user2.socketId).toBe('socket2');
        expect(matches[1].user1.socketId).toBe('socket3');
        expect(matches[1].user2.socketId).toBe('socket4');
      });

      it('should handle malformed QueueUser objects', () => {
        const users: QueueUser[] = [
          { socketId: '', userId: 'user1', score: 1000 }, // Empty socketId
          { socketId: 'socket2', userId: '', score: 1001 }, // Empty userId
          { socketId: 'socket3', userId: 'user3', score: 1002 },
          { socketId: 'socket4', userId: 'user4', score: 1003 },
        ];
        const ignoreMatrix = new Set<string>();

        vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

        const matches = MatchingAlgorithm.findOptimizedMatches(
          users,
          ignoreMatrix,
        );

        // Should still process valid users
        expect(matches).toHaveLength(2);
        expect(matches[0].user1.socketId).toBe(''); // Empty socketId still processed
        expect(matches[0].user2.socketId).toBe('socket2');
        expect(matches[1].user1.socketId).toBe('socket3');
        expect(matches[1].user2.socketId).toBe('socket4');
      });

      it('should handle users with NaN or negative scores', () => {
        const users: QueueUser[] = [
          { socketId: 'socket1', userId: 'user1', score: NaN },
          { socketId: 'socket2', userId: 'user2', score: -1 },
          { socketId: 'socket3', userId: 'user3', score: Infinity },
          { socketId: 'socket4', userId: 'user4', score: 1000 },
        ];
        const ignoreMatrix = new Set<string>();

        vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

        const matches = MatchingAlgorithm.findOptimizedMatches(
          users,
          ignoreMatrix,
        );

        // Should still create matches regardless of invalid scores
        expect(matches).toHaveLength(2);
        expect(matches[0].user1.socketId).toBe('socket1');
        expect(matches[0].user2.socketId).toBe('socket2');
        expect(matches[1].user1.socketId).toBe('socket3');
        expect(matches[1].user2.socketId).toBe('socket4');
      });

      it('should handle very large user arrays efficiently', () => {
        // Create 1000 users to test performance
        const users: QueueUser[] = Array.from({ length: 1000 }, (_, i) => ({
          socketId: `socket${i}`,
          userId: `user${i}`,
          score: 1000 + i,
        }));
        const ignoreMatrix = new Set<string>();

        vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

        const startTime = performance.now();
        const matches = MatchingAlgorithm.findOptimizedMatches(
          users,
          ignoreMatrix,
        );
        const endTime = performance.now();

        // Should match 500 pairs from 1000 users
        expect(matches).toHaveLength(500);

        // Should complete in reasonable time (< 100ms for 1000 users)
        expect(endTime - startTime).toBeLessThan(100);

        // Verify first and last matches
        expect(matches[0].user1.userId).toBe('user0');
        expect(matches[0].user2.userId).toBe('user1');
        expect(matches[499].user1.userId).toBe('user998');
        expect(matches[499].user2.userId).toBe('user999');
      });

      it('should handle users where all combinations are ignored', () => {
        const users: QueueUser[] = [
          { socketId: 'socket1', userId: 'user1', score: 1000 },
          { socketId: 'socket2', userId: 'user2', score: 1001 },
          { socketId: 'socket3', userId: 'user3', score: 1002 },
          { socketId: 'socket4', userId: 'user4', score: 1003 },
        ];
        const ignoreMatrix = new Set<string>();

        // Mock all users to ignore each other
        vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(true);

        const matches = MatchingAlgorithm.findOptimizedMatches(
          users,
          ignoreMatrix,
        );

        // Should return no matches when all users ignore each other
        expect(matches).toHaveLength(0);
      });

      it('should handle undefined properties in QueueUser objects', () => {
        const users = [
          { socketId: 'socket1', userId: 'user1', score: 1000 },
          { socketId: 'socket2', userId: undefined, score: 1001 }, // undefined userId
          { socketId: undefined, userId: 'user3', score: 1002 }, // undefined socketId
          { socketId: 'socket4', userId: 'user4', score: 1003 },
        ] as QueueUser[];
        const ignoreMatrix = new Set<string>();

        vi.mocked(IgnoredUsersService.isIgnored).mockReturnValue(false);

        const matches = MatchingAlgorithm.findOptimizedMatches(
          users,
          ignoreMatrix,
        );

        // Should handle undefined properties gracefully
        // The algorithm matches in order: user1 with user2, then user3 with user4
        expect(matches).toHaveLength(2);
        expect(matches[0].user1.socketId).toBe('socket1');
        expect(matches[0].user2.socketId).toBe('socket2');
        expect(matches[1].user1.socketId).toBe(undefined);
        expect(matches[1].user2.socketId).toBe('socket4');
      });
    });
  });
});
