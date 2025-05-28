import type { VChatSocket } from '../../../common/model/VChatSocket.js';

const register = (
  socket: VChatSocket,
  wrapHandler: <T extends unknown[], R extends Promise<void> | void>(
    handler: (...args: T) => R,
  ) => (...args: T) => void,
) => {
  socket.on(
    'peer-message',
    wrapHandler((offer, roomId, partnerId) => {
      socket.to(roomId).emit('peer-message', offer, partnerId);
    }),
  );
};

export const SignalingController = {
  register,
};
