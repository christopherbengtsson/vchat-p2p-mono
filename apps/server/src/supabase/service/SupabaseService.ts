import { AdminAuthService } from '@mono/be-supabase';
import type { DeviceSignature } from '@mono/common-dto';
import { DatabaseService } from '@mono/common-supabase';
import { SupabaseClient } from '../client.js';
import type { VChatSocket } from '../../model/VChatSocket.js';
import { FingerprintUtil } from '../../utils/FingerprintUtil.js';
import logger from '../../utils/logger.js';

async function partnersNotIgnored(userId1: string, userId2: string) {
  return await DatabaseService.partnersNotIgnored(
    SupabaseClient.instance,
    userId1,
    userId2,
  );
}

function handleUserBan(
  socket: VChatSocket,
  partnerUserId: string,
  banDuration: number,
  deviceSignature: DeviceSignature,
) {
  void AdminAuthService.banUser(
    SupabaseClient.instance,
    partnerUserId,
    banDuration,
  ).catch((err) => {
    logger.error({ err }, 'Failed to ban user');
  });

  const ip = FingerprintUtil.extractIpFromHeaders(socket.request.headers);

  if (!ip) {
    return logger.warn(
      'Failed to extract IP address from forwarded header, will not blacklist fingerprint',
    );
  }

  const fingerprint = FingerprintUtil.generateHash(deviceSignature, ip);
  void DatabaseService.blacklistFingerprint(
    SupabaseClient.instance,
    fingerprint,
  );
}

export const SupabaseService = {
  partnersNotIgnored,
  handleUserBan,
};
