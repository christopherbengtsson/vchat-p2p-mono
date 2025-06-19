import type { VChatSocket } from '../../../common/model/VChatSocket.js';
import { QueueService } from '../service/queue/QueueService.js';
import { AssignmentService } from '../service/assignment/AssignmentService.js';

const register = (
  socket: VChatSocket,
  wrapHandler: <T extends (...args: string[]) => void>(
    handler: T,
  ) => (...args: Parameters<T>) => Promise<void>,
) => {
  socket.on(
    'find-match',
    wrapHandler(async (socketId, userId) => {
      await QueueService.addToQueue(socketId, userId);
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
