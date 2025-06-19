import { expect, test } from '@playwright/test';
import { cleanupTestUsers } from './setup/globalTeardown';
import { SupabaseAdmin } from './service/SupabaseAdmin';
import { loginTestUser } from './utils/loginTestUser';

const supabaseAdmin = new SupabaseAdmin();

test.afterEach(async ({ context }) => {
  await cleanupTestUsers(context, supabaseAdmin);
});

// Run this test multiple times in parallel
for (let i = 0; i < 30; i++) {
  test(`Loading testing ${i}`, async ({ browser }) => {
    const users = await supabaseAdmin.generateTestUsers(
      1,
      browser,
      `title-${i}`,
    );

    const user = users[0];

    await loginTestUser(user.page, user.email, supabaseAdmin);

    await user.page.getByRole('button', { name: 'Find match' }).click();

    await expect(
      user.page.getByRole('button', { name: 'End call' }),
    ).toBeVisible({
      timeout: 30_000,
    });
  });
}
