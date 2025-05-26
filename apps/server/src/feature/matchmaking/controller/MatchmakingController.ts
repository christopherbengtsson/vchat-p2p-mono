import type { VChatSocket } from '../../../common/model/VChatSocket.js';
import { log } from '../../../common/util/logger.js';
import { MatchmakingQueueService } from '../service/MatchmakingQueueService.js';
import { MatchAssignmentService } from '../service/MatchAssignmentService.js';

const register = (
  socket: VChatSocket,
  wrapHandler: <T extends (...args: string[]) => void>(
    handler: T,
  ) => (...args: Parameters<T>) => Promise<void>,
) => {
  socket.on(
    'find-match',
    wrapHandler(async (socketId, userId) => {
      await MatchmakingQueueService.addToQueue(socketId, userId);
      log.debug({ socketId, userId }, 'User added to queue');
    }),
  );

  socket.on(
    'cancel-match',
    wrapHandler(async (userId) => {
      const matchData = await MatchAssignmentService.getMatchAssignment(
        socket.id,
      );

      if (matchData) {
        // User was already matched - clean up and notify partner
        await MatchAssignmentService.cleanupMatchAssignments(socket.id);
        socket.to(matchData.partnerSocketId).emit('user-left', userId);
      }

      return await MatchmakingQueueService.removeFromQueue(socket.id, userId);
    }),
  );

  socket.on(
    'disconnect',
    wrapHandler(async () => {
      // User was already matched - clean up and notify partner
      const matchData = await MatchAssignmentService.cleanupMatchAssignments(
        socket.id,
      );

      if (matchData?.partnerSocketId) {
        socket.to(matchData.partnerSocketId).emit('partner-disconnected');
      }

      return await MatchmakingQueueService.removeFromQueue(
        socket.id,
        undefined,
      );
    }),
  );
};

export const MatchmakingController = {
  register,
};
