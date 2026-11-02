import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

try {
  process.loadEnvFile('.env');
} catch {}
if (process.env.DATABASE_URL) {
  throw new Error(
    'Unset DATABASE_URL for tests and configure DB_HOST/PORT/USER/PASSWORD with a separate test database.'
  );
}
const testDb = process.env.TEST_DB_NAME || 'job_tracker_test';
if (testDb === process.env.DB_NAME || !testDb.endsWith('_test')) {
  throw new Error('E2E requires a separate database ending in _test.');
}
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  workers: 1,
  timeout: 60000,
  use: {
    actionTimeout: 15000,
    baseURL: 'http://127.0.0.1:3101',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.TEST_BROWSER_PATH || (existsSync(edge) ? edge : undefined) }
  },
  webServer: {
    command:
      'node --env-file-if-exists=.env server/src/lib/migrate.js && node --env-file-if-exists=.env server/src/server.js',
    url: 'http://127.0.0.1:3101/api/health',
    reuseExistingServer: false,
    timeout: 30000,
    env: { ...process.env, PORT: '3101', DB_NAME: testDb, STORAGE_DIR: '.local/e2e-files' }
  }
});
