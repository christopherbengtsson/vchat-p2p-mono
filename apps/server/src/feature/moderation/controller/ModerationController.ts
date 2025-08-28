import type { VChatSocket } from '../../../common/model/VChatSocket.js';
import { ModerationService } from '../service/ModerationService.js';

const register = (
  socket: VChatSocket,
  wrapHandler: <T extends unknown[], R extends Promise<void> | void>(
    handler: (...args: T) => R,
  ) => (...args: T) => Promise<void>,
) => {
  socket.on(
    'user-reported',
    wrapHandler(async (partnerUserId, _userId) => {
      socket.to(partnerUserId).emit('user-reported');
    }),
  );

  socket.on(
    'ban-user',
    wrapHandler(async ({ partnerUserId, partnerSocketId, banDuration }) => {
      const permanentBan = await ModerationService.handleUserBan(
        banDuration,
        partnerUserId,
      );

      socket
        .to(partnerSocketId)
        .emit('request-browser-signature', permanentBan);
    }),
  );

  socket.on(
    'browser-signature',
    wrapHandler(async (browserSignature) => {
      await ModerationService.blacklistDeviceSignature(
        socket.request.headers,
        browserSignature,
      );
    }),
  );
};

export const ModerationController = {
  register,
};
