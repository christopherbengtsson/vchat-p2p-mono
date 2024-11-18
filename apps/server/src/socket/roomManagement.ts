import logger from '../utils/logger.js';
import type { VChatSocket } from '../models/VChatSocket.js';

export function setupRoomManagement(
  socket: VChatSocket,
  wrapHandler: <T extends unknown[], R extends Promise<void> | void>(
    handler: (...args: T) => R,
  ) => (...args: T) => void,
) {
  socket.on(
    'join-room',
    wrapHandler((roomId, userId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', userId);

      logger.debug({ roomId, userId }, 'User joined room');
    }),
  );

  socket.on(
    'leave-room',
    wrapHandler((roomId, userId) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', userId);

      logger.debug({ roomId, userId }, 'User left room');
    }),
  );

  socket.on(
    'audio-toggle',
    wrapHandler((enabled, roomId) => {
      logger.debug({ enabled, roomId }, 'Recevied audio toggle');
      socket.to(roomId).emit('audio-toggle', enabled);
    }),
  );

  socket.on(
    'video-toggle',
    wrapHandler((enabled, roomId) => {
      logger.debug({ enabled, roomId }, 'Recevied video toggle');
      socket.to(roomId).emit('video-toggle', enabled);
    }),
  );

  socket.on(
    'send-game-invite',
    wrapHandler((roomId) => {
      logger.debug({ roomId }, 'Recevied send game invite');
      socket.to(roomId).emit('send-game-invite');
    }),
  );

  socket.on(
    'answer-game-invite',
    wrapHandler((roomId, accept) => {
      logger.debug({ roomId, accept }, 'Recevied answer game invite');
      socket.to(roomId).emit('answer-game-invite', accept);
    }),
  );

  socket.on(
    'round-game-over',
    wrapHandler((roomId, round, userScore) => {
      logger.debug({ roomId, round, userScore }, 'Recevied round game over');
      socket.to(roomId).emit('round-game-over', round, userScore);
    }),
  );
}
