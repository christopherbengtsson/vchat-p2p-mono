import { PlaywrightTestArgs } from '@playwright/test';
import { SupabaseAdmin } from '../service/SupabaseAdmin';

export const cleanupTestUsers = async ({ context }: PlaywrightTestArgs) => {
  context.close();
  await SupabaseAdmin.removeAllGeneratedUsers();
  await SupabaseAdmin.removeAllTestGeneratedFingerprints();
};
