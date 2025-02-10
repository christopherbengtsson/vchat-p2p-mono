import type { Page } from '@playwright/test';

export const fastLogin = async (page: Page) => {
  await page
    .getByRole('checkbox', { name: 'I confirm that I am 18 or older' })
    .check();
  await page.getByRole('button', { name: 'Fast login' }).click();
};
