import { spawnSync } from 'node:child_process';
try { process.loadEnvFile('.env'); } catch {}
if (process.env.DATABASE_URL) throw new Error('Unset DATABASE_URL for tests and configure DB_HOST/PORT/USER/PASSWORD with a separate test database.');
const database = process.env.TEST_DB_NAME || 'job_tracker_test';
if (database === process.env.DB_NAME || !database.endsWith('_test')) throw new Error('Database checks require a separate database ending in _test.');
const result = spawnSync(process.execPath, ['--test', 'server/tests/backend.test.js', 'server/tests/integration.test.js'], {
  stdio: 'inherit', env: { ...process.env, RUN_DB_TESTS: 'true', DB_NAME: database, STORAGE_DIR: '.local/db-test-files' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
