import { SupabaseAdmin } from '../service/SupabaseAdmin';

export const cleanupTestUsers = async () => {
  await SupabaseAdmin.removeAllGeneratedUsers();
};
