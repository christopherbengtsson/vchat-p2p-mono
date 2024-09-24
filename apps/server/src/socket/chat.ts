import type { VChatSocket } from '../models/VChatSocket.js';

export function setupChat(socket: VChatSocket, wrapHandler: Function) {
  socket.on(
    'send-message',
    wrapHandler((roomId: string, message: string) => {
      socket.to(roomId).emit('receive-message', message);
    }),
  );
}
