import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, devices } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PERMISSIONS = ['camera', 'microphone'];

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 4 : 2,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Folder for test results */
  outputDir: './e2e/failed-e2e-results',
  /** Configuration for the expect assertion library */
  expect: {
    timeout: 15_000,
  },
  /* Global timeout for entire test */
  timeout: 120_000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_FRONTEND_URL ?? 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',

    /* Settings for WebRTC to work */
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 },
    channel: 'chrome',
    permissions: PERMISSIONS,
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        // Headless mode optimizations
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
        '--disable-background-media-suspend',
        '--disable-component-update',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        // WebRTC specific flags for headless
        '--allow-running-insecure-content',
        '--disable-component-extensions-with-background-pages',
      ],
    },
    /* Increase action timeout for headless mode */
    actionTimeout: 10_000,
    /* Increase navigation timeout */
    navigationTimeout: 30_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Chrome',
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: !process.env.TEST_FRONTEND_URL
    ? {
        command: 'pnpm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
