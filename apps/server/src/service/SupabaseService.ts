import type { IncomingHttpHeaders } from 'node:http';
import { AdminAuthService } from '@mono/be-supabase';
import type { BanDuration, BrowserSignature } from '@mono/common-dto';
import { DatabaseService } from '@mono/common-supabase';
import { SupabaseClient } from '../clients/supabase.js';

import logger from '../utils/logger.js';
import { FingerprintService } from './FingerprintService.js';

async function partnersNotIgnored(userId1: string, userId2: string) {
  return await DatabaseService.partnersNotIgnored(
    SupabaseClient.instance,
    userId1,
    userId2,
  );
}

async function banUserLoginUntilDuration(
  userId: string,
  banDuration: BanDuration,
) {
  await AdminAuthService.banUserFromLogin(
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
  const fingerprint = FingerprintService.generate(browserSignature, headers);

  if (!fingerprint) {
    return logger.warn(
      '[SupabaseService]: No fingerprint generated, will not blacklist fingerprint',
    );
  }

  await DatabaseService.blacklistFingerprint(
    SupabaseClient.instance,
    fingerprint,
  );
}

export const SupabaseService = {
  banUserLoginUntilDuration,
  blacklistDeviceSignature,
  partnersNotIgnored,
};
