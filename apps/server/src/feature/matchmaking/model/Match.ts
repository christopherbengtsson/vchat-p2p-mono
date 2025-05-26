import type { QueueUser } from './QueueUser.js';

/**
 * Interface for successful matches
 */
export interface Match {
  roomId: string;
  user1: QueueUser;
  user2: QueueUser;
}
