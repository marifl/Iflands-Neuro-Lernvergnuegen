import { defineConfig, devices } from '@playwright/test'

const ciChromiumArgs = process.env.CI
  ? ['--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
  : []

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  snapshotDir: 'tests/e2e/__screenshots__',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 900 },
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: { args: ciChromiumArgs },
    },
  }],
  webServer: {
    command: 'pnpm dev --port 5174 --host 127.0.0.1',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
})
