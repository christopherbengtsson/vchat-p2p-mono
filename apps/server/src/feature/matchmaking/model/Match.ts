import type { QueueUser } from './QueueUser.js';

export interface Match {
  roomId: string;
  user1: QueueUser;
  user2: QueueUser;
}
