import { log } from '../util/logger.js';
import { SupabaseClient } from '../client/SupabaseClient.js';

/**
 * Get all ignored pairs for a batch of users
 * @param userIds Array of user IDs to check
 * @returns Array of [userId, ignoredUserId] tuples
 */
const getIgnoredPairs = async (
  userIds: string[],
): Promise<[string, string][]> => {
  try {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await SupabaseClient.get()
      .from('ignored_users')
      .select('user_id, ignored_user_id')
      .in('user_id', userIds);

    if (error) {
      log.error(
        { error, userCount: userIds.length },
        'Failed to fetch ignored pairs',
      );
      return [];
    }

    return (
      data?.map<[string, string]>((item) => [
        item.user_id as string,
        item.ignored_user_id as string,
      ]) || []
    );
  } catch (error) {
    log.error(
      { error, userCount: userIds.length },
      'Exception fetching ignored pairs',
    );
    return [];
  }
};

/**
 * Get all ignored pairs from the database (for global matrix warmup)
 * @returns Array of [userId, ignoredUserId] tuples for all ignore relationships
 */
const getAllIgnorePairs = async (): Promise<[string, string][]> => {
  try {
    const { data, error } = await SupabaseClient.get()
      .from('ignored_users')
      .select('user_id, ignored_user_id');

    if (error) {
      log.error({ error }, 'Failed to fetch all ignored pairs');
      return [];
    }

    return (
      data?.map<[string, string]>((item) => [
        item.user_id as string,
        item.ignored_user_id as string,
      ]) || []
    );
  } catch (error) {
    log.error({ error }, 'Exception fetching all ignored pairs');
    return [];
  }
};

export const SupabaseService = {
  getIgnoredPairs,
  getAllIgnorePairs,
};
