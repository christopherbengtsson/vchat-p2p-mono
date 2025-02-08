import { test } from '@playwright/test';
import { cleanupTestUsers } from './setup/globalTeardown';
import { SupabaseAdmin } from './service/SupabaseAdmin';
import { loginLogout } from './__tests__/loginLogout';

test.afterEach(cleanupTestUsers);

test('Supabase keep alive', async ({ browser }, { title }) => {
  const testUsers = await SupabaseAdmin.generateTestUsers(1, browser, title);
  await loginLogout(testUsers[0]);
});
