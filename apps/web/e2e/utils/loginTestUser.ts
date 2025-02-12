import type { Page } from '@playwright/test';
import type { SupabaseAdmin } from '../service/SupabaseAdmin';

export const loginTestUser = async (
  page: Page,
  email: string,
  supabaseAdmin: SupabaseAdmin,
) => {
  const user = supabaseAdmin.getGeneratedUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  if (!page.url().endsWith('/auth')) {
    throw new Error('User already logged in');
  }

  await page.getByRole('textbox', { name: 'email' }).fill(email);
  await page.getByRole('textbox', { name: 'password' }).fill(user.password);
  await page.getByRole('button', { name: 'Login with email' }).click();
};
