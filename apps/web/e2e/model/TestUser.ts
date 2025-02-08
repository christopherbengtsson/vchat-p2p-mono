import type { BrowserContext, Page } from '@playwright/test';
import type { DatabaseUser } from './DatabaseUser';

export interface TestUser extends DatabaseUser {
  context: BrowserContext;
  page: Page;
}
