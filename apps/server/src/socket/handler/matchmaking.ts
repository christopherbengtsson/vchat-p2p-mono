import type { VChatSocket } from '../../model/VChatSocket.js';
import type { WaitingQueueService } from '../../service/WaitingQueueService.js';
import { logger } from '../../utils/logger.js';

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
      await redisQueue.addToQueue(socketId, userId);
      logger.debug({ socketId, userId }, 'User added to queue');
    }),
  );

  socket.on(
    'cancel-match',
    wrapHandler(async (userId) => {
      const matchData = await redisQueue.getMatchAssignment(socket.id);

      if (matchData) {
        // User was already matched - clean up and notify partner
        await redisQueue.cleanupMatchAssignments(socket.id);
        socket.to(matchData.partnerSocketId).emit('user-left', userId);
      }

      return await redisQueue.removeFromQueue(socket.id, userId);
    }),
  );

  socket.on(
    'disconnect',
    wrapHandler(async () => {
      // User was already matched - clean up and notify partner
      const matchData = await redisQueue.getMatchAssignment(socket.id);
      if (matchData) {
        await redisQueue.cleanupMatchAssignments(socket.id);
        socket.to(matchData.partnerSocketId).emit('partner-disconnected');
      }

      return await redisQueue.removeFromQueue(socket.id, undefined);
    }),
  );
}
