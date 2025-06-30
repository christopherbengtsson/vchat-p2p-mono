import { expect } from '@playwright/test';
import { TestUser } from '../model/TestUser';
import { SupabaseAdmin } from '../service/SupabaseAdmin';
import { loginTestUser } from '../utils/loginTestUser';
import { hijackRemoteVideoStream } from '../utils/hijackRemoteVideoStream';

export const contentModerationNSFWDetection = async (
  testUsers: TestUser[],
  supabaseAdmin: SupabaseAdmin,
) => {
  const [user, partner] = testUsers;

  /** Start page */
  await loginTestUser(user.page, user.email, supabaseAdmin);

  await loginTestUser(partner.page, partner.email, supabaseAdmin);

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
