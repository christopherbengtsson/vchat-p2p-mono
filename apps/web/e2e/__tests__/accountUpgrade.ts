import { expect } from '@playwright/test';
import type { TestUser } from '../model/TestUser';
import type { SupabaseAdmin } from '../service/SupabaseAdmin';
import { fastLogin } from '../utils/fastLogin';
import { loginTestUser } from '../utils/loginTestUser';

export const accountUpgrade = async (
  testUser: TestUser,
  supabaseAdmin: SupabaseAdmin,
) => {
  await fastLogin(testUser.page);

  /** Open form */
  await testUser.page.getByRole('button', { name: 'Open settings' }).click();
  await testUser.page.getByRole('menuitem', { name: 'Save account' }).click();

  /** Fill form */
  await testUser.page
    .getByRole('textbox', { name: 'email' })
    .fill(testUser.email);
  await testUser.page
    .getByRole('textbox', { name: 'Password', exact: true })
    .fill(testUser.password);
  await testUser.page
    .getByRole('textbox', { name: 'Confirm password', exact: true })
    .fill(testUser.password);
  const userPutPromise = testUser.page.waitForResponse('**/auth/v1/user');
  await testUser.page.getByRole('button', { name: 'Save details' }).click();

  /** Confirm success */
  await expect(
    testUser.page.getByText('Account upgraded successfully'),
  ).toBeVisible();

  /** Intercept PUT request to /auth/v1/user and save userId */
  const userResponse = await userPutPromise;
  const { id } = await userResponse.json();
  testUser.id = id;
  supabaseAdmin.generatedUsers.push({
    id,
    email: testUser.email,
    password: testUser.password,
  });

  /** Confirm profile menu option is visible and logout */
  await testUser.page.getByRole('button', { name: 'Open settings' }).click();
  await expect(
    testUser.page.getByRole('menuitem', { name: 'Profile' }),
  ).toBeVisible();
  await testUser.page.getByRole('menuitem', { name: 'Log out' }).click();

  await expect(
    testUser.page.getByRole('button', { name: 'Login with email' }),
  ).toBeVisible();

  /** Login with new credentials */

  await loginTestUser(testUser.page, testUser.email, supabaseAdmin);

  await expect(
    testUser.page.getByRole('button', { name: 'Find match' }),
  ).toBeVisible();
};
