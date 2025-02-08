import { expect } from '@playwright/test';
import type { TestUser } from '../model/TestUser';
import { loginTestUser } from '../utils/loginTestUser';

export const loginLogout = async (testUsers: TestUser) => {
  await loginTestUser(testUsers.page, testUsers.email);
  await testUsers.page.getByRole('button', { name: 'Open settings' }).click();
  await testUsers.page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(
    testUsers.page.getByRole('button', { name: 'Login with email' }),
  ).toBeVisible();
};
