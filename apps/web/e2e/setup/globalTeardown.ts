import type { BrowserContext } from '@playwright/test';
import type { SupabaseAdmin } from '../service/SupabaseAdmin';

export const cleanupTestUsers = async (
  context: BrowserContext,
  supabaseAdmin: SupabaseAdmin,
) => {
  context.close();
  await supabaseAdmin.removeAllGeneratedUsers();
  await supabaseAdmin.removeAllTestGeneratedFingerprints();
};
