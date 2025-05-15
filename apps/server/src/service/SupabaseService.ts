import type { IncomingHttpHeaders } from 'node:http';
import { AdminAuthService } from '@mono/be-supabase';
import type { BanDuration, BrowserSignature } from '@mono/common-dto';
import { DatabaseService } from '@mono/common-supabase';
import { SupabaseClient } from '../clients/supabase.js';
import { logger } from '../utils/logger.js';
import { FingerprintService } from './FingerprintService.js';

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

/**
 * Get all users that a specific user has ignored
 * @param userId The ID of the user whose ignored list we want to retrieve
 * @returns Array of user IDs that this user has ignored
 */
const getIgnoredUsers = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await SupabaseClient.instance
      .from('ignored_users')
      .select('ignored_user_id')
      .eq('user_id', userId);

    if (error) {
      logger.error({ error, userId }, 'Failed to fetch ignored users');
      return [];
    }

    // Extract just the ignored_user_id values
    return data.map((item) => item.ignored_user_id as string);
  } catch (error) {
    logger.error({ error, userId }, 'Exception fetching ignored users');
    return [];
  }
};

/**
 * Get all ignored pairs for a batch of users
 * @param userIds Array of user IDs to check
 * @returns Array of [userId, ignoredUserId] tuples
 */
const getIgnoredPairs = async (
  userIds: string[],
): Promise<[string, string][]> => {
  try {
    // Process in smaller batches to avoid huge IN clauses
    const batchSize = 100;
    const batchCount = Math.ceil(userIds.length / batchSize);
    let allResults: [string, string][] = [];

    for (let i = 0; i < batchCount; i++) {
      const batchUserIds = userIds.slice(i * batchSize, (i + 1) * batchSize);

      const { data, error } = await SupabaseClient.instance
        .from('ignored_users')
        .select('user_id, ignored_user_id')
        .in('user_id', batchUserIds);

      if (error) {
        logger.error(
          { error, batchUserIds },
          'Failed to fetch ignored pairs batch',
        );
        continue;
      }

      if (data) {
        // Use proper tuple type assertion
        const batchResults = data.map<[string, string]>((item) => [
          item.user_id as string,
          item.ignored_user_id as string,
        ]);
        allResults = [...allResults, ...batchResults];
      }
    }

    return allResults;
  } catch (error) {
    logger.error({ error, userIds }, 'Exception fetching ignored pairs');
    return [];
  }
};

export const SupabaseService = {
  banUserLoginUntilDuration,
  blacklistDeviceSignature,
  getIgnoredUsers,
  getIgnoredPairs,
};
