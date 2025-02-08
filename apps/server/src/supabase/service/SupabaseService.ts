import type { IncomingHttpHeaders } from 'node:http';
import { AdminAuthService } from '@mono/be-supabase';
import type { BrowserSignature } from '@mono/common-dto';
import { DatabaseService } from '@mono/common-supabase';
import { SupabaseClient } from '../client.js';
import { FingerprintUtil } from '../../utils/FingerprintUtil.js';
import logger from '../../utils/logger.js';

async function partnersNotIgnored(userId1: string, userId2: string) {
  return await DatabaseService.partnersNotIgnored(
    SupabaseClient.instance,
    userId1,
    userId2,
  );
}

async function banUserUntilDuration(userId: string, banDuration: number) {
  await AdminAuthService.banUser(
    SupabaseClient.instance,
    userId,
    banDuration,
  ).catch((err) => {
    logger.error({ err }, 'Failed to ban user');
  });
}

async function blacklistDeviceSignature(
  headers: IncomingHttpHeaders,
  browserSignature: BrowserSignature,
) {
  const deviceSignature = FingerprintUtil.getDeviceSignature(
    browserSignature,
    headers,
  );
  const ip = FingerprintUtil.extractIpFromHeaders(headers);

  if (!ip) {
    return logger.warn(
      'Failed to extract IP address from forwarded header, will not blacklist fingerprint',
    );
  }

  const fingerprint = FingerprintUtil.generateHash(deviceSignature, ip);

  await DatabaseService.blacklistFingerprint(
    SupabaseClient.instance,
    fingerprint,
  );
}

export const SupabaseService = {
  partnersNotIgnored,
  banUserUntilDuration,
  blacklistDeviceSignature,
};
