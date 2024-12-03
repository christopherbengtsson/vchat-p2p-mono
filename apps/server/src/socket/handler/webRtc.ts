import type { VChatSocket } from '../../model/VChatSocket.js';
import logger from '../../utils/logger.js';

export function setupWebRTC(
  socket: VChatSocket,
  wrapHandler: <T extends unknown[], R extends Promise<void> | void>(
    handler: (...args: T) => R,
  ) => (...args: T) => void,
) {
  socket.on(
    'peer-message',
    wrapHandler((offer, roomId, partnerId) => {
      logger.debug({ roomId, userId: partnerId }, 'Peer message received');
      socket.to(roomId).emit('peer-message', offer, partnerId);
    }),
  );
}
