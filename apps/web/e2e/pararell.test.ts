import { test } from '@playwright/test';
import { cleanupTestUsers } from './setup/globalTeardown';
import { SupabaseAdmin } from './service/SupabaseAdmin';
import { accountUpgrade } from './__tests__/accountUpgrade';

const supabaseAdmin = new SupabaseAdmin();

test.afterEach(async ({ context }) => {
  await cleanupTestUsers(context, supabaseAdmin);
});

test('Account upgrade', async ({ browser }, { title }) => {
  const testUsers = await supabaseAdmin.prepareAnonymousTestUsers(
    1,
    browser,
    title,
  );
  await accountUpgrade(testUsers[0], supabaseAdmin);
});
