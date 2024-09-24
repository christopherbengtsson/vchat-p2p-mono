import logger from '../utils/logger.js';
import type { VChatSocket } from '../models/VChatSocket.js';

export function setupRoomManagement(
  socket: VChatSocket,
  wrapHandler: Function,
) {
  socket.on(
    'join-room',
    wrapHandler((roomId: string, userId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', userId); // TODO: user-joined

      logger.debug({ roomId, userId }, 'User joined room');
    }),
  );

  socket.on(
    'leave-room',
    wrapHandler((roomId: string, userId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-disconnected', userId); // TODO: user-left

      logger.debug({ roomId, userId }, 'User left room');
    }),
  );

  socket.on(
    'audio-toggle',
    wrapHandler((enabled: boolean, roomId: string) => {
      logger.debug({ enabled, roomId }, 'Recevied audio toggle');
      socket.to(roomId).emit('audio-toggle', enabled);
    }),
  );

  socket.on(
    'video-toggle',
    wrapHandler((enabled: boolean, roomId: string) => {
      logger.debug({ enabled, roomId }, 'Recevied video toggle');
      socket.to(roomId).emit('video-toggle', enabled);
    }),
  );
}
