import type { Server } from 'socket.io';
import type { Match } from '../model/Match.js';

/**
 * Sends real-time notifications to matched users via Socket.IO
 * Simple fire-and-forget approach - Socket.IO handles disconnected clients gracefully
 */
const notifyMatchedUsers = (io: Server, matches: Match[]): void => {
  for (const match of matches) {
    // Notify user1 - always impolite peer
    io.of('video-chat') // TODO: Constant
      .to(match.user1.socketId)
      .emit(
        'match-found',
        match.roomId,
        match.user2.socketId,
        match.user2.userId,
        false, // impolite peer
      );

    // Notify user2 - always polite peer
    io.of('video-chat').to(match.user2.socketId).emit(
      'match-found',
      match.roomId,
      match.user1.socketId,
      match.user1.userId,
      true, // polite peer
    );
  }
};

export const SocketNotifications = {
  notifyMatchedUsers,
};
