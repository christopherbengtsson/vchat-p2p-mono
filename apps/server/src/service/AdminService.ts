import { AdminAuthService } from '@mono/be-supabase';
import { SupabaseClient } from '../supabase/client.js';
import logger from '../utils/logger.js';

const client = SupabaseClient.instance;

async function deleteAllUsers() {
  const { data } = await AdminAuthService.getAllUsers(client);

  logger.info(`Deleting ${data.users.length} users...`);

  for (const user of data.users) {
    await AdminAuthService.deleteUser(client, user.id);
  }
}

export const AdminService = {
  deleteAllUsers,
};
