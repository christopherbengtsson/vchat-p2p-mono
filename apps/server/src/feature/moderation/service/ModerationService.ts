import type { IncomingHttpHeaders } from 'http';
import { DatabaseService } from '@mono/common-supabase';
import { AdminAuthService } from '@mono/be-supabase';
import { BanDuration, type BrowserSignature } from '@mono/common-dto';
import { SupabaseClient } from '../../../common/client/SupabaseClient.js';
import { log } from '../../../common/util/logger.js';
import { FingerprintService } from './FingerprintService.js';

const banUserLoginUntilDuration = async (
  userId: string,
  banDuration: BanDuration,
) => {
  await AdminAuthService.banUserFromLogin(
    SupabaseClient.get(),
    userId,
    banDuration,
  ).catch((err) => {
    log.error({ err }, 'Failed to ban user');
  });
};

const blacklistDeviceSignature = async (
  headers: IncomingHttpHeaders,
  browserSignature: BrowserSignature,
) => {
  const fingerprint = FingerprintService.generate(browserSignature, headers);

  if (!fingerprint) {
    return log.warn(
      '[ModerationService]: No fingerprint generated, will not blacklist fingerprint',
    );
  }

  await DatabaseService.blacklistFingerprint(SupabaseClient.get(), fingerprint);
};

const handleUserBan = async (
  banDuration: BanDuration,
  partnerUserId: string,
) => {
  const permanentBan = banDuration === BanDuration.PERMANENT;

  if (permanentBan) {
    // Preventing login until account gets deleted with cron job
    await banUserLoginUntilDuration(partnerUserId, BanDuration.TIER_3);
  } else {
    await banUserLoginUntilDuration(partnerUserId, banDuration);
  }

  return permanentBan;
};

export const ModerationService = {
  blacklistDeviceSignature,
  handleUserBan,
};
