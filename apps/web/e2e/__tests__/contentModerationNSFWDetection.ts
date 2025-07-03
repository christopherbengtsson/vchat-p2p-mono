import { expect, Page } from '@playwright/test';
import { TestUser } from '../model/TestUser';
import { SupabaseAdmin } from '../service/SupabaseAdmin';
import { loginTestUser } from '../utils/loginTestUser';
import { hijackRemoteVideoStream } from '../utils/hijackRemoteVideoStream';

const waitForModelFetch = async (page: Page) => {
  await page.waitForResponse(
    (response) => response.url().endsWith('/model.json'),
    { timeout: 20_000 },
  );
};

const enableContentModeration = async (page: Page) => {
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).rootStore.contentModerationStore.setConfig({
      enabled: true,
      threshold: 0.01,
    });
  });
};

export const contentModerationNSFWDetection = async (
  testUsers: TestUser[],
  supabaseAdmin: SupabaseAdmin,
) => {
  const [user, partner] = testUsers;

  /** Start page */
  await loginTestUser(user.page, user.email, supabaseAdmin);
  await enableContentModeration(user.page);
  await waitForModelFetch(user.page);

  await loginTestUser(partner.page, partner.email, supabaseAdmin);
  await enableContentModeration(partner.page);
  await waitForModelFetch(partner.page);

  /** Start call and match */

  await user.page
    .getByRole('button', { name: 'Find match' })
    .click({ timeout: 20_000 });
  await expect(user.page.getByRole('button', { name: 'Cancel' })).toBeVisible();

  const matchPromises1 = [
    expect(user.page.getByText(/Match with/)).toBeVisible(),
    expect(partner.page.getByText(/Match with/)).toBeVisible(),
  ];

  await partner.page.getByRole('button', { name: 'Find match' }).click();

  await Promise.all(matchPromises1);

  /** Alter remote stream with NSFW content */

  await hijackRemoteVideoStream(user.page);

  await user.page.waitForSelector('[data-testid="nsfw-warning-overlay"]', {
    state: 'visible',
    timeout: 15000,
  });

  /** Block flow */

  await user.page.getByRole('button', { name: 'Block and report' }).click();
  await expect(user.page.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await expect(
    partner.page.getByRole('button', { name: 'Cancel' }),
  ).toBeVisible();
  await partner.page.getByRole('button', { name: 'I understand' }).click();

  // getByRole('button', { name: 'End call' })
  // getByRole('button', { name: 'Continue call' })
  // getByRole('button', { name: 'Close' })
};
