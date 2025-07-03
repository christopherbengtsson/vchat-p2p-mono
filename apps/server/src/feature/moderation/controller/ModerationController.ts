import type { VChatSocket } from '../../../common/model/VChatSocket.js';
import { IgnoredUsersService } from '../../matchmaking/service/match-prerequisite/IgnoredUsersService.js';
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

      /**
       * TODO: Add prio BullMQ job instead?
       * TODO: We need immidiate cache update for ignored users, otherwise users can directly re-match
       */
      void IgnoredUsersService.clearUsersIgnoreCache([partnerUserId]);
      /**
       * user 1 ignores, added to queue
       * user 2 ignores, added to queue
       * job triggers, should gather both ignore events above and update matrix?
       */
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
