import type { VChatSocket } from '../../model/VChatSocket.js';
import type { WaitingQueueService } from '../../service/WaitingQueueService.js';
import { MatchService } from '../../service/MatchService.js';

export function setupMatchmaking(
  socket: VChatSocket,
  redisQueue: WaitingQueueService,
  wrapHandler: <T extends (...args: string[]) => void>(
    handler: T,
  ) => (...args: Parameters<T>) => Promise<void>,
) {
  socket.on(
    'find-match',
    wrapHandler(async (socketId, userId) => {
      const roomData = await MatchService.findMatch(
        redisQueue,
        socketId,
        userId,
      );
      if (
        roomData?.roomId &&
        roomData?.partnerSocketId &&
        roomData?.partnerUserId
      ) {
        const { roomId, partnerSocketId, partnerUserId } = roomData;
        // Inform the user that a match was found
        socket.emit(
          'match-found',
          roomId,
          partnerSocketId,
          partnerUserId,
          true,
        );
        // Inform the partner that a match was found
        socket
          .to(partnerSocketId)
          .emit('match-found', roomId, socketId, userId, false);
      }
    }),
  );

  socket.on(
    'cancel-match',
    wrapHandler(async (userId) => {
      return await redisQueue.removeFromQueue(socket.id, userId);
    }),
  );

  socket.on(
    'disconnect',
    wrapHandler(async () => {
      return await redisQueue.removeFromQueue(socket.id, undefined);
    }),
  );
}
