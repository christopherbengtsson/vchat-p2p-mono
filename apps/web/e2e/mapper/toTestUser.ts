import type { Browser } from '@playwright/test';
import { DatabaseUser } from '../model/DatabaseUser';

const to = async (
  testUsers: DatabaseUser[],
  browser: Browser,
  testTitle: string,
) =>
  await Promise.all(
    testUsers.map(async (user, index) => {
      const context = await browser.newContext({
        userAgent: `VChat E2E test - ${testTitle} - ${user.email}`,
        extraHTTPHeaders: {
          'X-Forwarded-For': `127.0.0.${index}`,
        },
      });
      const page = await context.newPage();

      return {
        ...user,
        context,
        page,
      };
    }),
  );

export const TestUserMapper = {
  to,
};
