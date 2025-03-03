import { expect } from '@playwright/test';
import { loginTestUser } from '../utils/loginTestUser';
import type { TestUser } from '../model/TestUser';
import type { SupabaseAdmin } from '../service/SupabaseAdmin';

export const videoCallActions = async (
  testUsers: TestUser[],
  supabaseAdmin: SupabaseAdmin,
) => {
  const [user, partner] = testUsers;

  /** Start page */
  await loginTestUser(user.page, user.email, supabaseAdmin);

  await loginTestUser(partner.page, partner.email, supabaseAdmin);

  /** Start and cancel queue */

  await user.page.getByRole('button', { name: 'Find match' }).click();
  await user.page.getByRole('button', { name: 'Cancel' }).click();

  await partner.page.getByRole('button', { name: 'Find match' }).click();
  await partner.page.getByRole('button', { name: 'Cancel' }).click();

  /** Start call and match */

  await user.page.getByRole('button', { name: 'Find match' }).click();
  await expect(user.page.getByRole('button', { name: 'Cancel' })).toBeVisible();

  const promises = [
    expect(user.page.getByText(/Match with/)).toBeVisible(),
    expect(partner.page.getByText(/Match with/)).toBeVisible(),
  ];

  await partner.page.getByRole('button', { name: 'Find match' }).click();

  await Promise.all(promises);

  // /** Camera toggle */

  // // Toggle camera for user
  await user.page.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(
    user.page.getByRole('button', { name: 'Turn camera on' }),
  ).toBeEnabled();
  await expect(
    user.page.locator('[aria-label="Your camera is off"]'),
  ).toBeVisible();
  await expect(partner.page.getByText("Partner's camera is off")).toBeVisible();

  await user.page.getByRole('button', { name: 'Turn camera on' }).click();
  await expect(
    user.page.getByRole('button', { name: 'Turn camera off' }),
  ).toBeEnabled();
  // TODO: Check overlay not visible insted

  // Toggle camera for partner
  await partner.page.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(
    partner.page.getByRole('button', { name: 'Turn camera on' }),
  ).toBeEnabled();
  await expect(
    partner.page.locator('[aria-label="Your camera is off"]'),
  ).toBeVisible();
  await expect(user.page.getByText("Partner's camera is off")).toBeVisible();

  await partner.page.getByRole('button', { name: 'Turn camera on' }).click();
  await expect(
    partner.page.getByRole('button', { name: 'Turn camera off' }),
  ).toBeEnabled();
  // TODO: Check overlay not visible insted

  /** Microphone toggle */

  // Toggle microphone for user
  await user.page.getByRole('button', { name: 'Turn microphone off' }).click();
  await expect(
    user.page.getByRole('button', { name: 'Turn microphone on' }),
  ).toBeEnabled();

  await user.page.getByRole('button', { name: 'Turn microphone on' }).click();
  await expect(
    user.page.getByRole('button', { name: 'Turn microphone off' }),
  ).toBeEnabled();

  // Toggle microphone for partner
  await partner.page
    .getByRole('button', { name: 'Turn microphone off' })
    .click();
  await expect(
    partner.page.getByRole('button', { name: 'Turn microphone on' }),
  ).toBeEnabled();

  await partner.page
    .getByRole('button', { name: 'Turn microphone on' })
    .click();
  await expect(
    partner.page.getByRole('button', { name: 'Turn microphone off' }),
  ).toBeEnabled();

  /**  End of call */
  const cancelPromises = [
    expect(user.page.getByRole('button', { name: 'Cancel' })).toBeVisible(),
    expect(partner.page.getByRole('button', { name: 'Cancel' })).toBeVisible(),
  ];

  const matchPromises = [
    expect(user.page.getByText(/Match with/)).toBeVisible(),
    expect(partner.page.getByText(/Match with/)).toBeVisible(),
  ];

  await user.page.getByRole('button', { name: 'End call' }).click();

  await Promise.all([...cancelPromises, ...matchPromises]);

  await user.page.reload();

  await expect(
    partner.page.getByRole('button', { name: 'Cancel' }),
  ).toBeVisible();
  await partner.page.getByRole('button', { name: 'Cancel' }).click();

  await expect(
    user.page.getByText('Currently 1 more users online', {
      exact: true,
    }),
  ).toBeVisible({ timeout: 6_000 });
  await expect(
    partner.page.getByText('Currently 1 more users online', { exact: true }),
  ).toBeVisible();

  // Clean up
  await user.page.context().close();
  await partner.page.context().close();
};
