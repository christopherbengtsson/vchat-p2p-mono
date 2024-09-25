import type { VChatSocket } from '../models/VChatSocket.js';
import logger from '../utils/logger.js';

export function setupWebRTC(
  socket: VChatSocket,
  wrapHandler: <T extends unknown[], R extends Promise<void> | void>(
    handler: (...args: T) => R,
  ) => (...args: T) => void,
) {
  socket.on(
    'offer',
    wrapHandler((offer, roomId, userId) => {
      logger.debug({ roomId, userId }, 'Received offer');
      socket.to(roomId).emit('offer', offer, userId);
    }),
  );

  socket.on(
    'answer',
    wrapHandler((answer, roomId, userId) => {
      logger.debug({ roomId, userId }, 'Received answer');
      socket.to(roomId).emit('answer', answer, userId);
    }),
  );

  socket.on(
    'ice-candidate',
    wrapHandler((candidate, roomId, userId) => {
      logger.debug({ roomId, userId }, 'Received ICE candidate');
      socket.to(roomId).emit('ice-candidate', candidate, userId);
    }),
  );
}
