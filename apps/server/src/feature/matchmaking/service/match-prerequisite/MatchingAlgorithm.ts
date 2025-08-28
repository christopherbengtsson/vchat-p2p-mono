import { v4 as uuid } from 'uuid';
import type { QueueUser } from '../../model/QueueUser.js';
import type { Match } from '../../model/Match.js';

const findMatches = (users: QueueUser[]): Match[] => {
  const matches: Match[] = [];
  const numberOfUsers = users.length;

  if (users.length < 2) return matches;

  // Shuffle for better average case (avoids pathological cases)
  const indices = Array.from({ length: numberOfUsers }, (_, i) => i);
  for (let i = numberOfUsers - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Pre-build ignore sets
  const ignoreSets = new Array(numberOfUsers);
  for (let i = 0; i < numberOfUsers; i++) {
    ignoreSets[i] = new Set(users[i].ignoreList);
  }

  const matched = new Uint8Array(numberOfUsers);
  let unmatchedCount = numberOfUsers;

  // Process in shuffled order for better distribution
  for (let idx = 0; idx < numberOfUsers - 1 && unmatchedCount >= 2; idx++) {
    const i = indices[idx];
    if (matched[i]) continue;

    for (let jdx = idx + 1; jdx < numberOfUsers; jdx++) {
      const j = indices[jdx];
      if (matched[j]) continue;

      if (
        !ignoreSets[i].has(users[j].userId) &&
        !ignoreSets[j].has(users[i].userId)
      ) {
        matches.push({
          roomId: uuid(),
          user1: users[i],
          user2: users[j],
        });

        matched[i] = 1;
        matched[j] = 1;
        unmatchedCount -= 2;
        break;
      }
    }
  }

  return matches;
};

export const MatchingAlgorithm = {
  findMatches,
};
