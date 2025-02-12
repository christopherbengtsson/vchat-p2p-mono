import { test } from '@playwright/test';
import { cleanupTestUsers } from './setup/globalTeardown';
import { SupabaseAdmin } from './service/SupabaseAdmin';
import { videoCallActions } from './__tests__/videoCallActions';
import { reportUser, reportUserToPermanentBan } from './__tests__/reportUser';

const supabaseAdmin = new SupabaseAdmin();

test.describe.configure({ mode: 'serial', timeout: 60_000 });
test.afterEach(async ({ context }) => {
  await cleanupTestUsers(context, supabaseAdmin);
});

/**
 * We can't run tests in parallel since the tests are expecting specific users to match
 */

test('Report User', async ({ browser }, { title }) => {
  const testUsers = await supabaseAdmin.generateTestUsers(4, browser, title);
  await reportUser(testUsers, supabaseAdmin);
});

test('Report User To Permanent Ban', async ({ browser }, { title }) => {
  const numberOfBansBeforePermanentBan = 9;
  const numberOfTestUsers = 11;

  const testUsers = await supabaseAdmin.generateTestUsers(
    numberOfTestUsers,
    browser,
    title,
    2, // Only test last 2 users
  );

  const reporter = testUsers[numberOfTestUsers - 2];
  const toReport = testUsers[numberOfTestUsers - 1];

  await supabaseAdmin.insertReports(testUsers, numberOfBansBeforePermanentBan);
  await reportUserToPermanentBan(reporter, toReport, supabaseAdmin);
});

test('Video Call Actions', async ({ browser }, { title }) => {
  const testUsers = await supabaseAdmin.generateTestUsers(2, browser, title);
  await videoCallActions(testUsers, supabaseAdmin);
});
