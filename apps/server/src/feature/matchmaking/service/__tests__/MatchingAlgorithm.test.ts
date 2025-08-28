import type { QueueUser } from '../../model/QueueUser.js';
import { MatchingAlgorithm } from '../match-prerequisite/MatchingAlgorithm.js';

describe('MatchingAlgorithm', () => {
  describe('findMatches', () => {
    it('should match two compatible users', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
      ];

      const matches = MatchingAlgorithm.findMatches(users);

      expect(matches).toHaveLength(1);

      // Verify the matched users are from our input array (order doesn't matter with randomized matching)
      const matchedUsers = [matches[0].user1, matches[0].user2];
      const matchedUserIds = matchedUsers.map((user) => user.userId);
      expect(matchedUserIds).toContain('user1');
      expect(matchedUserIds).toContain('user2');
      expect(matches[0].roomId).toBeTruthy();
    });

    it('should not match incompatible users', () => {
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

      const matches = MatchingAlgorithm.findMatches(users);

      expect(matches).toHaveLength(0);
    });

    it('should match multiple pairs from a larger group', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
      ];

      const matches = MatchingAlgorithm.findMatches(users);

      expect(matches).toHaveLength(2);

      // With randomized matching, we can't guarantee specific pairings
      // Just verify that all users are matched and partnerships are valid
      const matchedUserIds = new Set<string>();
      matches.forEach((match) => {
        matchedUserIds.add(match.user1.userId);
        matchedUserIds.add(match.user2.userId);
      });

      expect(matchedUserIds.size).toBe(4); // All 4 users should be matched
      expect(matchedUserIds).toContain('user1');
      expect(matchedUserIds).toContain('user2');
      expect(matchedUserIds).toContain('user3');
      expect(matchedUserIds).toContain('user4');

      // Each match should have a unique room ID
      expect(matches[0].roomId).not.toBe(matches[1].roomId);
    });

    it('should handle selective ignoring correctly', () => {
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

      const matches = MatchingAlgorithm.findMatches(users);

      // With randomized matching, we might get 1 or 2 matches depending on processing order
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.length).toBeLessThanOrEqual(2);

      // Verify ignore relationship is respected - user1 and user2 should never be matched together
      const matchedPairs = matches.map((match) => [
        match.user1.userId,
        match.user2.userId,
      ]);
      const hasIgnoredPair = matchedPairs.some(
        (pair) =>
          (pair[0] === 'user1' && pair[1] === 'user2') ||
          (pair[0] === 'user2' && pair[1] === 'user1'),
      );
      expect(hasIgnoredPair).toBe(false);

      // Verify matched users have valid partnerships
      matches.forEach((match) => {
        expect(match.user1.socketId).toBeTruthy();
        expect(match.user2.socketId).toBeTruthy();
        expect(match.roomId).toBeTruthy();
      });
    });

    it('should handle odd number of users', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
      ];

      const matches = MatchingAlgorithm.findMatches(users);

      expect(matches).toHaveLength(1);

      // Verify exactly 2 users are matched
      const matchedUserIds = new Set<string>();
      matches.forEach((match) => {
        matchedUserIds.add(match.user1.userId);
        matchedUserIds.add(match.user2.userId);
      });
      expect(matchedUserIds.size).toBe(2);
      // user3 remains unmatched (1 user left out)
    });

    it('should return empty array for invalid inputs', () => {
      // Test with empty array
      expect(MatchingAlgorithm.findMatches([])).toEqual([]);

      // Test with single user
      const singleUser: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
      ];
      expect(MatchingAlgorithm.findMatches(singleUser)).toEqual([]);
    });

    it('should produce different pairings due to randomization', () => {
      const users: QueueUser[] = [
        { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
        { socketId: 'socket2', userId: 'user2', ignoreList: [], score: 1001 },
        { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
      ];

      const results: string[] = [];
      for (let i = 0; i < 20; i++) {
        const matches = MatchingAlgorithm.findMatches([...users]);
        const pairings = matches
          .map((match) => [match.user1.userId, match.user2.userId].sort())
          .sort((a, b) => a[0].localeCompare(b[0]));
        results.push(JSON.stringify(pairings));
      }

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1); // Should have multiple different pairings

      // Verify all results still match all users
      results.forEach((result) => {
        const pairings = JSON.parse(result) as string[][];
        const allMatchedUsers = new Set(pairings.flat());
        expect(allMatchedUsers.size).toBe(4);
        expect(allMatchedUsers).toContain('user1');
        expect(allMatchedUsers).toContain('user2');
        expect(allMatchedUsers).toContain('user3');
        expect(allMatchedUsers).toContain('user4');
      });
    });

    it('should generate unique room IDs for each match', () => {
      const users: QueueUser[] = Array.from({ length: 6 }, (_, i) => ({
        socketId: `socket${i + 1}`,
        userId: `user${i + 1}`,
        ignoreList: [],
        score: 1000 + i,
      }));

      const matches = MatchingAlgorithm.findMatches(users);

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
          { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
          { socketId: 'socket1', userId: 'user2', ignoreList: [], score: 1001 }, // Duplicate socketId
          { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
        ];

        const matches = MatchingAlgorithm.findMatches(users);

        // Should handle duplicate socketIds and create valid matches
        expect(matches).toHaveLength(1);

        // Verify at least 2 users are matched
        const matchedUserIds = new Set<string>();
        matches.forEach((match) => {
          matchedUserIds.add(match.user1.userId);
          matchedUserIds.add(match.user2.userId);
        });
        expect(matchedUserIds.size).toBe(2);
      });

      it('should handle duplicate userIds with different socketIds', () => {
        const users: QueueUser[] = [
          { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
          { socketId: 'socket2', userId: 'user1', ignoreList: [], score: 1001 }, // Duplicate userId
          { socketId: 'socket3', userId: 'user2', ignoreList: [], score: 1002 },
          { socketId: 'socket4', userId: 'user3', ignoreList: [], score: 1003 },
        ];

        const matches = MatchingAlgorithm.findMatches(users);

        // Should match all users regardless of duplicate userIds
        expect(matches).toHaveLength(2);

        // Verify all users are matched
        const matchedSocketIds = new Set<string>();
        matches.forEach((match) => {
          matchedSocketIds.add(match.user1.socketId);
          matchedSocketIds.add(match.user2.socketId);
        });
        expect(matchedSocketIds.size).toBe(4);
        expect(matchedSocketIds).toContain('socket1');
        expect(matchedSocketIds).toContain('socket2');
        expect(matchedSocketIds).toContain('socket3');
        expect(matchedSocketIds).toContain('socket4');
      });

      it('should handle malformed QueueUser objects', () => {
        const users: QueueUser[] = [
          { socketId: '', userId: 'user1', ignoreList: [], score: 1000 }, // Empty socketId
          { socketId: 'socket2', userId: '', ignoreList: [], score: 1001 }, // Empty userId
          { socketId: 'socket3', userId: 'user3', ignoreList: [], score: 1002 },
          { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
        ];

        const matches = MatchingAlgorithm.findMatches(users);

        // Should still process users with empty fields
        expect(matches).toHaveLength(2);

        // Verify 4 users are matched in total
        const matchedUsers = matches.flatMap((match) => [
          match.user1,
          match.user2,
        ]);
        expect(matchedUsers).toHaveLength(4);
      });

      it('should handle users with NaN or negative scores', () => {
        const users: QueueUser[] = [
          { socketId: 'socket1', userId: 'user1', ignoreList: [], score: NaN },
          { socketId: 'socket2', userId: 'user2', ignoreList: [], score: -1 },
          {
            socketId: 'socket3',
            userId: 'user3',
            ignoreList: [],
            score: Infinity,
          },
          { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1000 },
        ];

        const matches = MatchingAlgorithm.findMatches(users);

        // Should still create matches regardless of invalid scores
        expect(matches).toHaveLength(2);

        // Verify all users are matched
        const matchedSocketIds = new Set<string>();
        matches.forEach((match) => {
          matchedSocketIds.add(match.user1.socketId);
          matchedSocketIds.add(match.user2.socketId);
        });
        expect(matchedSocketIds.size).toBe(4);
      });

      it('should handle very large user arrays efficiently', () => {
        // Create 1000 users to test performance
        const users: QueueUser[] = Array.from({ length: 1000 }, (_, i) => ({
          socketId: `socket${i}`,
          userId: `user${i}`,
          ignoreList: [],
          score: 1000 + i,
        }));

        const startTime = performance.now();
        const matches = MatchingAlgorithm.findMatches(users);
        const endTime = performance.now();

        // Should match 500 pairs from 1000 users
        expect(matches).toHaveLength(500);
        // Should complete in reasonable time (< 10ms for 1000 users with randomization)
        expect(endTime - startTime).toBeLessThan(10);

        // Verify all users are matched
        const matchedUserIds = new Set<string>();
        matches.forEach((match) => {
          matchedUserIds.add(match.user1.userId);
          matchedUserIds.add(match.user2.userId);
        });
        expect(matchedUserIds.size).toBe(1000);
      });

      it('should maintain performance characteristics with repeated runs', () => {
        const users: QueueUser[] = Array.from({ length: 100 }, (_, i) => ({
          socketId: `socket${i}`,
          userId: `user${i}`,
          ignoreList: [],
          score: 1000 + i,
        }));

        const iterations = 50;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          const matches = MatchingAlgorithm.findMatches([...users]);
          times.push(performance.now() - start);

          // Verify correctness in each iteration
          expect(matches).toHaveLength(50);
        }

        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const maxTime = Math.max(...times);

        expect(avgTime).toBeLessThan(10); // Should average < 10ms for 100 users
        expect(maxTime).toBeLessThan(50); // No single run should take > 50ms
      });

      it('should handle users where all combinations are ignored', () => {
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

        const matches = MatchingAlgorithm.findMatches(users);

        // Should return no matches when all users ignore each other
        expect(matches).toHaveLength(0);
      });

      it('should handle undefined properties in QueueUser objects', () => {
        const users = [
          { socketId: 'socket1', userId: 'user1', ignoreList: [], score: 1000 },
          {
            socketId: 'socket2',
            userId: undefined,
            ignoreList: [],
            score: 1001,
          }, // undefined userId
          { socketId: undefined, userId: 'user3', ignoreList: [], score: 1002 }, // undefined socketId
          { socketId: 'socket4', userId: 'user4', ignoreList: [], score: 1003 },
        ] as QueueUser[];

        const matches = MatchingAlgorithm.findMatches(users);

        // Should handle undefined properties gracefully with randomized matching
        expect(matches).toHaveLength(2);

        // Verify all users are matched
        const matchedUsers = matches.flatMap((match) => [
          match.user1,
          match.user2,
        ]);
        expect(matchedUsers).toHaveLength(4);

        // Verify matches contain the expected users (in any order)
        const matchedSocketIds = matchedUsers.map((user) => user.socketId);
        expect(matchedSocketIds).toContain('socket1');
        expect(matchedSocketIds).toContain('socket2');
        expect(matchedSocketIds).toContain(undefined);
        expect(matchedSocketIds).toContain('socket4');
      });
    });
  });
});
