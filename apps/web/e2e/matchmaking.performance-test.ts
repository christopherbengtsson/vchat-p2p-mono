import { test } from '@playwright/test';
import { SupabaseAdmin } from './service/SupabaseAdmin';
import { loginTestUser } from './utils/loginTestUser';

const supabaseAdmin = new SupabaseAdmin();

const PARALLEL_TESTS = 10;
const USERS_PER_TEST = 2;

test.setTimeout(60_000 * PARALLEL_TESTS);

test.afterAll(async () => {
  await supabaseAdmin.removeAllGeneratedUsers();
  await supabaseAdmin.removeAllTestGeneratedFingerprints();
});

// Create multiple independent test instances
for (let testInstance = 0; testInstance < PARALLEL_TESTS; testInstance++) {
  test(`Load test ${testInstance + 1}`, async ({ browser }, { title }) => {
    console.log(
      `Starting test instance ${testInstance + 1} with ${USERS_PER_TEST} users`,
    );

    // Create multiple users within this test instance
    const users = await supabaseAdmin.generateTestUsers(
      USERS_PER_TEST,
      browser,
      title,
    );

    // Login all users
    await Promise.all(
      users.map((user) => loginTestUser(user.page, user.email, supabaseAdmin)),
    );

    // Have all users enter matchmaking with slight timing offsets
    for (let i = 0; i < users.length; i++) {
      await users[i].page.getByRole('button', { name: 'Find match' }).click();
      // Add small random delay between users
      await new Promise((resolve) =>
        setTimeout(resolve, 100 + Math.random() * 400),
      );
    }

    // Wait for users to either match or timeout
    const results = await Promise.all(
      users.map(async (user, idx) => {
        try {
          // Wait for either End Call or timeout
          await user.page
            .getByRole('button', { name: 'End call' })
            .waitFor({ timeout: 20_000 });

          // Successfully matched - stay in call briefly
          await new Promise((resolve) =>
            setTimeout(resolve, 3000 + Math.random() * 2000),
          );

          // End the call (only first person in each potential pair)
          if (idx % 2 === 0) {
            await user.page.getByRole('button', { name: 'End call' }).click();
          }

          return { matched: true };
        } catch {
          // Handle case where user didn't match
          return { matched: false };
        }
      }),
    );

    // Report results for this test instance
    const matchedCount = results.filter((r) => r.matched).length;
    console.log(
      `Test instance ${testInstance + 1} completed: ${matchedCount}/${users.length} users matched`,
    );

    // Clean up resources
    for (const user of users) {
      await user.context.close();
    }
  });
}
