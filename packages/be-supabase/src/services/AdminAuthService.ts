import { SupabaseClient } from '@supabase/supabase-js';

async function banUser(
  client: SupabaseClient,
  userId: string,
  banDurationHours = 24,
) {
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
  banUser,
  deleteUser,
  getAllUsers,
};
