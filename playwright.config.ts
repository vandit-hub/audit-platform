import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Audit Platform Testing
 *
 * This configuration sets up the testing environment for the audit platform.
 * It includes settings for parallel execution, retries, timeouts, and reporting.
 *
 * Prerequisites:
 * - PostgreSQL running on port 5432
 * - Next.js dev server running on port 3005
 * - WebSocket server running on port 3001
 *
 * Run `npm run test:check-env` before running tests to verify all services are up.
 */
export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 2,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 3,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3005',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time each action such as `click()` can take
    actionTimeout: 10000,
  },

  // Global timeout for each test
  timeout: 30000,

  // Timeout for expect() calls
  expect: {
    timeout: 5000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run your local dev server before starting the tests
  // Uncomment if you want Playwright to start the servers automatically
  // webServer: [
  //   {
  //     command: 'npm run dev',
  //     url: 'http://localhost:3005',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000,
  //   },
  //   {
  //     command: 'npm run ws:dev',
  //     url: 'http://localhost:3001',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000,
  //   },
  // ],
});
