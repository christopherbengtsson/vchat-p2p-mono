import { test, expect } from '@playwright/test';

test('happy flow', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const user = await context1.newPage();
  const partner = await context2.newPage();

  /** Start page */
  await user.goto('/');
  await expect(
    user.getByText('Currently 0 more users online', { exact: true }),
  ).toBeVisible();

  await partner.goto('/');
  await expect(
    partner.getByText('Currently 1 more users online', { exact: true }),
  ).toBeVisible();
  await expect(
    user.getByText('Currently 1 more users online', { exact: true }),
  ).toBeVisible();

  /** Start and cancel queue */

  await user.getByRole('link', { name: 'Find match' }).click();
  await user.getByRole('button', { name: 'Cancel' }).click();

  await partner.getByRole('link', { name: 'Find match' }).click();
  await partner.getByRole('button', { name: 'Cancel' }).click();

  /** Start call and match */

  await user.getByRole('link', { name: 'Find match' }).click();
  await expect(user.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await partner.getByRole('link', { name: 'Find match' }).click();

  await expect(user.getByText(/Match with/)).toBeVisible();
  await expect(partner.getByText(/Match with/)).toBeVisible();

  /** Camera toggle */

  // Toggle camera for user
  await user.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(
    user.getByRole('button', { name: 'Turn camera on' }),
  ).toBeEnabled();
  await expect(user.getByText('Your camera is off')).toBeVisible();
  await expect(partner.getByText("Partner's camera is off")).toBeVisible();

  await user.getByRole('button', { name: 'Turn camera on' }).click();
  await expect(
    user.getByRole('button', { name: 'Turn camera off' }),
  ).toBeEnabled();
  // TODO: Check overlay not visible insted

  // Toggle camera for partner
  await partner.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(
    partner.getByRole('button', { name: 'Turn camera on' }),
  ).toBeEnabled();
  await expect(partner.getByText('Your camera is off')).toBeVisible();
  await expect(user.getByText("Partner's camera is off")).toBeVisible();

  await partner.getByRole('button', { name: 'Turn camera on' }).click();
  await expect(
    partner.getByRole('button', { name: 'Turn camera off' }),
  ).toBeEnabled();
  // TODO: Check overlay not visible insted

  /** Microphone toggle */

  // Toggle microphone for user
  await user.getByRole('button', { name: 'Turn microphone off' }).click();
  await expect(
    user.getByRole('button', { name: 'Turn microphone on' }),
  ).toBeEnabled();
  // TODO: Add label for muted users
  //   await expect(user.getByText('Your microphone is off')).toBeVisible();
  //   await expect(partner.getByText("Partner's microphone is off")).toBeVisible();

  await user.getByRole('button', { name: 'Turn microphone on' }).click();
  await expect(
    user.getByRole('button', { name: 'Turn microphone off' }),
  ).toBeEnabled();

  // Toggle microphone for partner
  await partner.getByRole('button', { name: 'Turn microphone off' }).click();
  await expect(
    partner.getByRole('button', { name: 'Turn microphone on' }),
  ).toBeEnabled();
  // TODO: Add label for muted users
  //   await expect(user.getByText('Your microphone is off')).toBeVisible();
  //   await expect(partner.getByText("Partner's microphone is off")).toBeVisible();

  await partner.getByRole('button', { name: 'Turn microphone on' }).click();
  await expect(
    partner.getByRole('button', { name: 'Turn microphone off' }),
  ).toBeEnabled();

  /**  End of call */
  await user.getByRole('button', { name: 'End call' }).click();

  await expect(user.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(partner.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await expect(user.getByText(/Match with/)).toBeVisible();
  await expect(partner.getByText(/Match with/)).toBeVisible();

  // TODO: Redo toggle functionality tests?

  await user.reload();
  await expect(
    user.getByText('Currently 1 more users online', { exact: true }),
  ).toBeVisible();
  await expect(partner.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await partner.getByRole('button', { name: 'Cancel' }).click();
  await expect(
    partner.getByText('Currently 1 more users online', { exact: true }),
  ).toBeVisible();

  // Clean up
  await context1.close();
  await context2.close();
});
