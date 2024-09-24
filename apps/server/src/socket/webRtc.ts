import type { VChatSocket } from '../models/VChatSocket.js';
import logger from '../utils/logger.js';

export function setupWebRTC(socket: VChatSocket, wrapHandler: Function) {
  socket.on(
    'offer',
    wrapHandler(
      (offer: RTCSessionDescriptionInit, roomId: string, userId: string) => {
        logger.debug({ roomId, userId }, 'Received offer');
        socket.to(roomId).emit('offer', offer, userId);
      },
    ),
  );

  socket.on(
    'answer',
    wrapHandler(
      (answer: RTCSessionDescriptionInit, roomId: string, userId: string) => {
        logger.debug({ roomId, userId }, 'Received answer');
        socket.to(roomId).emit('answer', answer, userId);
      },
    ),
  );

  socket.on(
    'ice-candidate',
    wrapHandler(
      (candidate: RTCIceCandidateInit, roomId: string, userId: string) => {
        logger.debug({ roomId, userId }, 'Received ICE candidate');
        socket.to(roomId).emit('ice-candidate', candidate, userId);
      },
    ),
  );
}
