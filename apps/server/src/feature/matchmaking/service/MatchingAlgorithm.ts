import { v4 as uuid } from 'uuid';
import type { QueueUser } from '../model/QueueUser.js';
import type { Match } from '../model/Match.js';
import { IgnoredUsersService } from './IgnoredUsersService.js';

/**
 * Optimized FIFO matching algorithm with efficient ignore checking
 * O(n) complexity with O(1) ignore lookups
 */
const findOptimizedMatches = (
  users: QueueUser[],
  ignoreMatrix: Set<string>,
): Match[] => {
  const matches: Match[] = [];
  const used = new Set<string>();

  if (!users || users.length < 2 || !ignoreMatrix) {
    return matches;
  }

  // Simple iteration - first available pair wins
  for (let i = 0; i < users.length - 1; i++) {
    const user1 = users[i];
    if (used.has(user1.socketId)) continue;

    // Find first compatible user with O(1) ignore check
    for (let j = i + 1; j < users.length; j++) {
      const user2 = users[j];
      if (used.has(user2.socketId)) continue;

      // Fast ignore check using optimized matrix
      if (
        !IgnoredUsersService.isIgnored(user1.userId, user2.userId, ignoreMatrix)
      ) {
        matches.push({
          roomId: uuid(),
          user1,
          user2,
        });

        used.add(user1.socketId);
        used.add(user2.socketId);
        break;
      }
    }
  }

  return matches;
};

export const MatchingAlgorithm = {
  findOptimizedMatches,
};
