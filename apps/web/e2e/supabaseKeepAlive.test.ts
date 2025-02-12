import { test } from '@playwright/test';
import { cleanupTestUsers } from './setup/globalTeardown';
import { SupabaseAdmin } from './service/SupabaseAdmin';
import { loginLogout } from './__tests__/loginLogout';

const supabaseAdmin = new SupabaseAdmin();

test.afterEach(({ context }) => {
  cleanupTestUsers(context, supabaseAdmin);
});

test('Supabase keep alive', async ({ browser }, { title }) => {
  const testUsers = await supabaseAdmin.generateTestUsers(1, browser, title);
  await loginLogout(testUsers[0], supabaseAdmin);
});
