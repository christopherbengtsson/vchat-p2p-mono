import type { Page } from '@playwright/test';

export const fastLogin = async (page: Page) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  if (!page.url().endsWith('/auth')) {
    throw new Error('User already logged in');
  }

  // Wait for form to be fully loaded
  await page.waitForSelector('input[type="checkbox"]', { timeout: 10_000 });

  await page
    .getByRole('checkbox', { name: 'I confirm that I am 18 or older' })
    .check();
  await page.getByRole('button', { name: 'Fast login' }).click();
};
