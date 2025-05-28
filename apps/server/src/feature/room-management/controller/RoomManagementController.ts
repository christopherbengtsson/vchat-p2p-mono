import type { VChatSocket } from '../../../common/model/VChatSocket.js';
import { log } from '../../../common/util/logger.js';
import { MatchAssignmentService } from '../../matchmaking/service/MatchAssignmentService.js';

const register = (
  socket: VChatSocket,
  wrapHandler: <T extends unknown[], R extends Promise<void> | void>(
    handler: (...args: T) => R,
  ) => (...args: T) => Promise<void>,
) => {
  socket.on(
    'join-room',
    wrapHandler((roomId, userId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', userId);

      log.debug({ roomId, userId }, 'User joined room');
    }),
  );

  socket.on(
    'leave-room',
    wrapHandler(async (roomId, userId) => {
      await MatchAssignmentService.cleanupMatchAssignments(socket.id);

      socket.leave(roomId);
      socket.to(roomId).emit('user-left', userId);

      log.debug({ roomId, userId }, 'User left room');
    }),
  );

  socket.on(
    'disconnecting',
    wrapHandler(async () => {
      await MatchAssignmentService.cleanupMatchAssignments(socket.id);

      Array.from(socket.rooms.values()).forEach((roomId) => {
        if (roomId !== socket.id) {
          socket.to(roomId).emit('partner-disconnected');
        }
      });
    }),
  );
};

export const RoomManagementController = {
  register,
};
