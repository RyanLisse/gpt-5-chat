import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import { config } from 'dotenv';

config({
  path: '.env.local',
});

/* Use process.env.PORT by default and fallback to port 3000 */
const PORT = process.env.PORT ?? 3000;

/**
 * Set webServer.url and use.baseURL with the location
 * of the WebServer respecting the correct set port
 */
const baseURL = `http://localhost:${PORT}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure global timeout for each test - TDD London School optimized */
  timeout: 30 * 1000, // 30 seconds - allow for server startup and initial load
  expect: {
    timeout: 10 * 1000, // 10 seconds - assertions with network requests
  },

  /* Global test setup */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  /* Configure projects */
  projects: [
    {
      name: 'setup:auth',
      testMatch: /auth.setup.ts/,
    },
    {
      name: 'setup:reasoning',
      testMatch: /reasoning.setup.ts/,
      dependencies: ['setup:auth'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/session.json',
      },
    },
    {
      name: 'chat',
      testMatch: /chat.test.ts/,
      dependencies: ['setup:auth'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/session.json',
      },
    },
    {
      name: 'reasoning',
      testMatch: /reasoning.test.ts/,
      dependencies: ['setup:reasoning'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.reasoning/session.json',
      },
    },
    {
      name: 'artifacts',
      testMatch: /artifacts.test.ts/,
      dependencies: ['setup:auth'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/session.json',
      },
    },
    {
      name: 'e2e-basic',
      testMatch: /e2e-test.playwright.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'guest-e2e',
      testMatch: /guest-chat.e2e.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // No storageState to ensure the session is unauthenticated
      },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun dev',
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI, // Always reuse existing server in dev
    stderr: 'pipe',
    stdout: 'pipe',
  },
});
