import { expect } from '@playwright/test';
import { loginTestUser } from '../utils/loginTestUser';
import type { TestUser } from '../model/TestUser';

export const videoCallActions = async (testUsers: TestUser[]) => {
  const [user, partner] = testUsers;

  /** Start page */
  await loginTestUser(user.page, user.email);

  await loginTestUser(partner.page, partner.email);

  /** Start and cancel queue */

  await user.page.getByRole('button', { name: 'Find match' }).click();
  await user.page.getByRole('button', { name: 'Cancel' }).click();

  await partner.page.getByRole('button', { name: 'Find match' }).click();
  await partner.page.getByRole('button', { name: 'Cancel' }).click();

  /** Start call and match */

  await user.page.getByRole('button', { name: 'Find match' }).click();
  await expect(user.page.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await partner.page.getByRole('button', { name: 'Find match' }).click();

  await expect(user.page.getByText(/Match with/)).toBeVisible();
  await expect(partner.page.getByText(/Match with/)).toBeVisible();

  /** Camera toggle */

  // Toggle camera for user
  await user.page.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(
    user.page.getByRole('button', { name: 'Turn camera on' }),
  ).toBeEnabled();
  await expect(user.page.getByText('Your camera is off')).toBeVisible();
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
  await expect(partner.page.getByText('Your camera is off')).toBeVisible();
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
  // TODO: Add label for muted users
  //   await expect(user.getByText('Your microphone is off')).toBeVisible();
  //   await expect(partner.getByText("Partner's microphone is off")).toBeVisible();

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
  // TODO: Add label for muted users
  //   await expect(user.getByText('Your microphone is off')).toBeVisible();
  //   await expect(partner.getByText("Partner's microphone is off")).toBeVisible();

  await partner.page
    .getByRole('button', { name: 'Turn microphone on' })
    .click();
  await expect(
    partner.page.getByRole('button', { name: 'Turn microphone off' }),
  ).toBeEnabled();

  /**  End of call */
  await user.page.getByRole('button', { name: 'End call' }).click();

  await expect(user.page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(
    partner.page.getByRole('button', { name: 'Cancel' }),
  ).toBeVisible();

  await expect(user.page.getByText(/Match with/)).toBeVisible();
  await expect(partner.page.getByText(/Match with/)).toBeVisible();

  // TODO: Redo toggle functionality tests?

  await expect(
    user.page.getByRole('button', { name: 'Turn camera off' }),
  ).toBeEnabled();
  await expect(
    partner.page.getByRole('button', { name: 'Turn camera off' }),
  ).toBeEnabled();

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
