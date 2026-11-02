import { readFile } from 'node:fs/promises';
import { pool } from './db.js';

export async function migrate() {
  const sql = await readFile(new URL('../../migrations/001-initial.sql', import.meta.url), 'utf8');
  for (const statement of sql.split(';').filter((part) => part.trim())) {
    await pool.query(statement);
  }
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/migrate.js')) {
  try {
    await migrate();
    console.log('Database migration complete.');
  } finally {
    await pool.end();
  }
}
