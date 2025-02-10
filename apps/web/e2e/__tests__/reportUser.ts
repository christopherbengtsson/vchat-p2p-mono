import { expect, type Page, type BrowserContext } from '@playwright/test';
import { loginTestUser } from '../utils/loginTestUser';
import type { TestUser } from '../model/TestUser';
import { fastLogin } from '../utils/fastLogin';

const startNewReport = async (page: Page, context: BrowserContext) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Find match' }).click();

  const reportButton1 = page.getByRole('button', { name: 'Report user' });
  await expect(reportButton1).toBeVisible();
  await reportButton1.click();

  await page.getByRole('button', { name: 'Report user' }).click();

  await page.getByRole('button', { name: 'Cancel' }).click();

  await context.close();
};

const expectToBeReported = async (page: Page) => {
  await expect(
    page.getByText('You have been temporarily banned'),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'I understand and I will stop with my inappropriate behavior',
    })
    .click();
  await expect(
    page.getByText('Thank you for your understanding.'),
  ).toBeVisible();
};

const expectNotToBeAbleToLogin = async (page: Page, email: string) => {
  await page.goto('/');
  await page.reload();
  await page.waitForLoadState('networkidle');

  expect(page.url()).toContain('/auth');

  await loginTestUser(page, email);

  await expect(page.getByText('User is banned, try again later')).toBeVisible();

  await page.reload();

  await page.waitForLoadState('networkidle');

  await fastLogin(page);

  await expect(page.getByText('User is banned')).toBeVisible();

  await page.waitForLoadState('networkidle');
};

export const reportUser = async (testUsers: TestUser[]) => {
  const [reporter1, reporter2, reporter3, toReport] = testUsers;

  // Login user to-be-reported
  await loginTestUser(toReport.page, toReport.email);
  await expect(
    toReport.page.getByRole('button', { name: 'Find match' }),
  ).toBeVisible();
  await toReport.page.getByRole('button', { name: 'Find match' }).click();

  // Login reporter 1 and report user
  await loginTestUser(reporter1.page, reporter1.email);
  await expect(
    reporter1.page.getByRole('button', { name: 'Find match' }),
  ).toBeVisible();
  await startNewReport(reporter1.page, reporter1.context);

  await expect(
    toReport.page.getByRole('button', { name: 'Cancel' }),
  ).toBeVisible();

  // Login reporter 2 and report user
  await loginTestUser(reporter2.page, reporter2.email);
  await expect(
    reporter2.page.getByRole('button', { name: 'Find match' }),
  ).toBeVisible();
  await startNewReport(reporter2.page, reporter2.context);

  await expect(
    toReport.page.getByRole('button', { name: 'Cancel' }),
  ).toBeVisible();

  // Login reporter 3 and report user
  await loginTestUser(reporter3.page, reporter3.email);
  await expect(
    reporter3.page.getByRole('button', { name: 'Find match' }),
  ).toBeVisible();
  await startNewReport(reporter3.page, reporter3.context);

  await expectToBeReported(toReport.page);
  await expectNotToBeAbleToLogin(toReport.page, toReport.email);
  await toReport.context.close();
};
