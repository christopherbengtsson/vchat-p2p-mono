import { test } from '@playwright/test';
import { cleanupTestUsers } from './setup/globalTeardown';
import { SupabaseAdmin } from './service/SupabaseAdmin';
import { videoCallActions } from './__tests__/videoCallActions';
import { reportUser } from './__tests__/reportUser';

test.describe.configure({ mode: 'serial' });
test.afterEach(cleanupTestUsers);

/**
 * We can't run tests in parallel since the tests are expecting specific users to match
 */

test('Report User', async ({ browser }, { title }) => {
  const testUsers = await SupabaseAdmin.generateTestUsers(3, browser, title);
  await reportUser(testUsers);
});

test('Video Call Actions', async ({ browser }, { title }) => {
  const testUsers = await SupabaseAdmin.generateTestUsers(2, browser, title);
  await videoCallActions(testUsers);
});
