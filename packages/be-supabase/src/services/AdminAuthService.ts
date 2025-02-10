import type { SupabaseClient } from '@supabase/supabase-js';
import { BanDuration } from '@mono/common-dto';

async function banUserFromLogin(
  client: SupabaseClient,
  userId: string,
  banDurationHours: BanDuration,
) {
  console.log('AdminAuthService.banUserFromLogin', userId, banDurationHours);
  return client.auth.admin.updateUserById(userId, {
    ban_duration: `${banDurationHours}h`,
  });
}

async function getAllUsers(client: SupabaseClient) {
  return client.auth.admin.listUsers();
}

async function deleteUser(client: SupabaseClient, userId: string) {
  return client.auth.admin.deleteUser(userId);
}

export const AdminAuthService = {
  banUserFromLogin,
  deleteUser,
  getAllUsers,
};
