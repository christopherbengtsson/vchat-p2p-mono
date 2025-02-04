import { test, expect } from '@playwright/test';

test.setTimeout(60_000);

test('reporting users', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const context3 = await browser.newContext();

  const reporter = await context1.newPage();
  const reporter2 = await context3.newPage();

  const toReport = await context2.newPage();

  await reporter.goto('/');
  await reporter.getByRole('button', { name: 'Find match' }).click();

  await toReport.goto('/');
  await toReport.getByRole('button', { name: 'Find match' }).click();

  const reportButton1 = reporter.getByRole('button', { name: 'Report user' });
  await expect(reportButton1).toBeVisible();
  await reportButton1.click();

  await expect(reporter.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(toReport.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await context2.close();

  await reporter2.goto('/');
  await reporter2.getByRole('button', { name: 'Find match' }).click();

  const reportButton2 = reporter2.getByRole('button', { name: 'Report user' });
  await expect(reportButton2).toBeVisible();
  await reportButton2.click();

  await expect(reporter2.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(
    toReport.getByRole('button', { name: 'Fast login' }),
  ).toBeVisible();
});
