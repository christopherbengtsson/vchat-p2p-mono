import path from 'path';
import { fileURLToPath } from 'url';
import { test as setup, expect } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup.use({ storageState: authFile });
setup('authenticate', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  if (!page.url().endsWith('/auth')) {
    console.log('Already authenticated');
    await page.context().storageState({ path: authFile });
    return;
  }

  console.log('Authenticating...');

  await page.getByRole('button', { name: 'Fast login' }).click();

  // Auhenticated
  await expect(page.getByRole('link', { name: 'Find match' })).toBeVisible();

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
