import type { VChatSocket } from '../models/VChatSocket.js';

export function setupChat(
  socket: VChatSocket,
  wrapHandler: <T extends (roomId: string, message: string) => void>(
    handler: T,
  ) => (...args: Parameters<T>) => void,
) {
  socket.on(
    'send-message',
    wrapHandler((roomId, message) => {
      socket.to(roomId).emit('receive-message', message);
    }),
  );
}
