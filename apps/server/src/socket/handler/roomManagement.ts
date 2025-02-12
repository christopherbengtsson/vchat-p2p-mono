import { BanDuration } from '@mono/common-dto';
import logger from '../../utils/logger.js';
import type { VChatSocket } from '../../model/VChatSocket.js';
import { SupabaseService } from '../../service/SupabaseService.js';

export function setupRoomManagement(
  socket: VChatSocket,
  wrapHandler: <T extends unknown[], R extends Promise<void> | void>(
    handler: (...args: T) => R,
  ) => (...args: T) => Promise<void>,
) {
  socket.on(
    'join-room',
    wrapHandler((roomId, userId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', userId);

      logger.debug({ roomId, userId }, 'User joined room');
    }),
  );

  socket.on(
    'leave-room',
    wrapHandler((roomId, userId) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', userId);

      logger.debug({ roomId, userId }, 'User left room');
    }),
  );

  socket.on(
    'ban-user',
    wrapHandler(async ({ partnerUserId, partnerSocketId, banDuration }) => {
      logger.debug(
        { partnerSocketId, partnerUserId, banDuration },
        'Received ban user',
      );

      const permanentBan = banDuration === BanDuration.PERMANENT;

      if (permanentBan) {
        // Preventing login until account gets deleted with cron job
        await SupabaseService.banUserLoginUntilDuration(
          partnerUserId,
          BanDuration.TIER_3,
        );
      } else {
        await SupabaseService.banUserLoginUntilDuration(
          partnerUserId,
          banDuration,
        );
      }

      socket
        .to(partnerSocketId)
        .emit('request-browser-signature', permanentBan);
    }),
  );

  socket.on(
    'browser-signature',
    wrapHandler(async (browserSignature) => {
      logger.debug({ browserSignature }, 'Received browser signature');

      await SupabaseService.blacklistDeviceSignature(
        socket.request.headers,
        browserSignature,
      );
    }),
  );
}
