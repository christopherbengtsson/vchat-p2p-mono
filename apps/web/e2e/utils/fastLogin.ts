import type { Page } from '@playwright/test';

export const fastLogin = async (page: Page) => {
  await page
    .getByRole('checkbox', { name: 'Accept terms and conditions' })
    .check();
  await page.getByRole('button', { name: 'Fast login' }).click();
};
