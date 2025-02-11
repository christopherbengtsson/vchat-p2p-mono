import type { Browser, BrowserContext, Page } from '@playwright/test';
import { DatabaseUser } from '../model/DatabaseUser';

const to = async (
  testUsers: DatabaseUser[],
  browser: Browser,
  testTitle: string,
  onlyTestLastNumbers?: number,
) =>
  await Promise.all(
    testUsers.map(async (user, index) => {
      let context = {} as BrowserContext;
      let page = {} as Page;

      if (
        !onlyTestLastNumbers ||
        (onlyTestLastNumbers &&
          index > testUsers.length - onlyTestLastNumbers - 1)
      ) {
        context = await browser.newContext({
          userAgent: `VChat E2E test - ${testTitle} - ${user.email}`,
          extraHTTPHeaders: {
            'X-Forwarded-For': `127.0.0.${index}`,
          },
        });
        page = await context.newPage();
      }

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
