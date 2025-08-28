import type { VChatSocket } from '../../../common/model/VChatSocket.js';
import { QueueService } from '../service/queue/QueueService.js';
import { AssignmentService } from '../service/assignment/AssignmentService.js';
import type { wrapSocketHandler } from '../../../common/util/wrapSocketHandler.js';

const register = (
  socket: VChatSocket,
  wrapHandler: typeof wrapSocketHandler,
) => {
  socket.on(
    'find-match',
    wrapHandler(async (socketId, userId, ignoreList) => {
      await QueueService.addToQueue(socketId, userId, ignoreList);
    }),
  );

  socket.on(
    'cancel-match',
    wrapHandler(async (userId) => {
      const matchData = await AssignmentService.getMatchAssignment(socket.id);

      if (matchData) {
        // User was already matched - clean up and notify partner
        await AssignmentService.cleanupMatchAssignments(socket.id);
        socket.to(matchData.partnerSocketId).emit('user-left', userId);
      }

      return await QueueService.removeFromQueue(
        socket.id,
        userId,
        'cancel-match',
      );
    }),
  );

  socket.on(
    'disconnect',
    wrapHandler(async () => {
      // User was already matched - clean up and notify partner
      const matchData = await AssignmentService.cleanupMatchAssignments(
        socket.id,
      );

      if (matchData?.partnerSocketId) {
        socket.to(matchData.partnerSocketId).emit('partner-disconnected');
      }

      return await QueueService.removeFromQueue(
        socket.id,
        undefined,
        'disconnect',
      );
    }),
  );
};

export const MatchmakingController = {
  register,
};
