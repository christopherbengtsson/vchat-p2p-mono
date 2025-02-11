import type { SupabaseClient } from '@supabase/supabase-js';
import { BanDuration, UserMetadata, UserMetadataKeys } from '@mono/common-dto';

async function banUserFromLogin(
  client: SupabaseClient,
  userId: string,
  banDurationHours: BanDuration,
  permanentBan: boolean,
) {
  // TODO: Create cron job to lift ban
  const userMetaData: UserMetadata = {
    [UserMetadataKeys.PERMANENT_BAN]: permanentBan,
  };

  return client.auth.admin.updateUserById(userId, {
    ban_duration: `${banDurationHours}h`,
    user_metadata: userMetaData,
  });
}

async function getAllUsers(client: SupabaseClient) {
  return client.auth.admin.listUsers();
}

export const AdminAuthService = {
  banUserFromLogin,
  getAllUsers,
};
