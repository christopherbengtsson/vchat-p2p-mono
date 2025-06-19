// ...existing imports...
import { expect } from '@playwright/test';
import { TestUser } from '../model/TestUser';
import { SupabaseAdmin } from '../service/SupabaseAdmin';
import { loginTestUser } from '../utils/loginTestUser';

export const matchmakingPerformance = async (
  testUsers: readonly TestUser[],
  supabaseAdmin: SupabaseAdmin,
) => {
  // Log in all users in parallel
  await Promise.all(
    testUsers.map((user) =>
      loginTestUser(user.page, user.email, supabaseAdmin),
    ),
  );

  // All users click "Find match" in parallel
  await Promise.all(
    testUsers.map((user) =>
      user.page.getByRole('button', { name: 'Find match' }).click(),
    ),
  );

  // All users wait for "Match with" in parallel, with timeout
  await Promise.all(
    testUsers.map((user) =>
      expect(user.page.getByRole('button', { name: 'End call' })).toBeVisible({
        timeout: 20_000,
      }),
    ),
  );

  // All users ends their calls in parallel
  await Promise.all(
    testUsers.map((user) =>
      user.page.getByRole('button', { name: 'End call' }).click(),
    ),
  );
};
