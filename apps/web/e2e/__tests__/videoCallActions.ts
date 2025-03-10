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

  const matchPromises1 = [
    expect(user.page.getByText(/Match with/)).toBeVisible(),
    expect(partner.page.getByText(/Match with/)).toBeVisible(),
  ];

  await partner.page.getByRole('button', { name: 'Find match' }).click();

  await Promise.all(matchPromises1);

  /** Camera toggle */

  // Toggle camera for user
  await user.page.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(
    user.page.getByRole('button', { name: 'Turn camera on' }),
  ).toBeEnabled();

  await Promise.all([
    expect(
      user.page.locator('[aria-label="Your camera is off"]'),
    ).toBeVisible(),
    expect(partner.page.getByText("Partner's camera is off")).toBeVisible(),
  ]);

  await user.page.getByRole('button', { name: 'Turn camera on' }).click();
  await expect(
    user.page.getByRole('button', { name: 'Turn camera off' }),
  ).toBeEnabled();
  // TODO: Check overlay not visible instead?

  // Toggle camera for partner
  await partner.page.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(
    partner.page.getByRole('button', { name: 'Turn camera on' }),
  ).toBeEnabled();
  await Promise.all([
    expect(
      partner.page.locator('[aria-label="Your camera is off"]'),
    ).toBeVisible(),
    expect(user.page.getByText("Partner's camera is off")).toBeVisible(),
  ]);

  await partner.page.getByRole('button', { name: 'Turn camera on' }).click();
  await expect(
    partner.page.getByRole('button', { name: 'Turn camera off' }),
  ).toBeEnabled();
  // TODO: Check overlay not visible instead?

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

  const matchPromises2 = [
    expect(user.page.getByText(/Match with/)).toBeVisible(),
    expect(partner.page.getByText(/Match with/)).toBeVisible(),
  ];

  await user.page.getByRole('button', { name: 'End call' }).click();

  await Promise.all([...cancelPromises, ...matchPromises2]);

  await Promise.all([
    expect(user.page.getByRole('button', { name: 'End call' })).toBeVisible(),
    expect(
      partner.page.getByRole('button', { name: 'End call' }),
    ).toBeVisible(),
  ]);

  await user.page.reload();

  await expect(
    partner.page.getByRole('button', { name: 'Cancel' }),
  ).toBeVisible();

  await user.page.waitForURL('/');
  await expect(
    user.page.getByRole('button', { name: 'Find match' }),
  ).toBeVisible();

  await partner.page.getByRole('button', { name: 'Cancel' }).click();

  await expect(
    partner.page.getByRole('button', { name: 'Find match' }),
  ).toBeVisible();

  /** Clean up */
  await user.page.context().close();
  await partner.page.context().close();
};
