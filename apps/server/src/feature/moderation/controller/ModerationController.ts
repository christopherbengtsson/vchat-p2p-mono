import type { VChatSocket } from '../../../common/model/VChatSocket.js';
import { log } from '../../../common/util/logger.js';
import { IgnoredUsersService } from '../../matchmaking/service/IgnoredUsersService.js';
import { ModerationService } from '../service/ModerationService.js';

const register = (
  socket: VChatSocket,
  wrapHandler: <T extends unknown[], R extends Promise<void> | void>(
    handler: (...args: T) => R,
  ) => (...args: T) => Promise<void>,
) => {
  socket.on(
    'user-reported',
    wrapHandler(async (partnerUserId, userId) => {
      log.debug({ partnerUserId }, 'Received user reported');
      socket.to(partnerUserId).emit('user-reported');

      // Clear cache to ensure fresh data from database on next lookup
      // (Database is updated via RPC script)
      await IgnoredUsersService.clearUsersIgnoreCache([userId, partnerUserId]);
    }),
  );

  socket.on(
    'ban-user',
    wrapHandler(async ({ partnerUserId, partnerSocketId, banDuration }) => {
      log.debug(
        { partnerSocketId, partnerUserId, banDuration },
        'Received ban user',
      );

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
      log.debug({ browserSignature }, 'Received browser signature');

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
