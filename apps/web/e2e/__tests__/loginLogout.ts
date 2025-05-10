import { expect } from '@playwright/test';
import type { TestUser } from '../model/TestUser';
import { loginTestUser } from '../utils/loginTestUser';
import type { SupabaseAdmin } from '../service/SupabaseAdmin';

export const loginLogout = async (
  testUser: TestUser,
  supabaseAdmin: SupabaseAdmin,
) => {
  await loginTestUser(testUser.page, testUser.email, supabaseAdmin);
  await testUser.page.getByRole('button', { name: 'Open settings' }).click();
  await testUser.page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(
    testUser.page.getByRole('button', { name: 'Login with email' }),
  ).toBeVisible();
};
