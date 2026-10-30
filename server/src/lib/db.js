import mysql from 'mysql2/promise';

export const database = process.env.DB_NAME || 'job_application_tracker';
export const pool = mysql.createPool(process.env.DATABASE_URL || {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database,
  connectionLimit: 8,
  charset: 'utf8mb4',
});

export const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
export async function getState(key, fallback = {}) {
  const [rows] = await pool.execute('SELECT payload FROM state WHERE state_key=?', [key]);
  return rows[0] ? parse(rows[0].payload) : fallback;
}
export async function setState(key, value, db = pool) {
  await db.execute('INSERT INTO state (state_key,payload) VALUES (?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)', [key, JSON.stringify(value)]);
  return value;
}
export async function getRecord(table, id) {
  if (!['applications', 'documents'].includes(table)) throw new Error('Invalid table');
  const [rows] = await pool.execute(`SELECT payload FROM ${table} WHERE id=?`, [id]);
  return rows[0] ? parse(rows[0].payload) : null;
}
export async function listRecords(table) {
  if (!['applications', 'documents'].includes(table)) throw new Error('Invalid table');
  const [rows] = await pool.execute(`SELECT payload FROM ${table} ORDER BY created_at DESC`);
  return rows.map(row => parse(row.payload));
}
export async function putRecord(table, value, db = pool) {
  if (!['applications', 'documents'].includes(table)) throw new Error('Invalid table');
  await db.execute(`INSERT INTO ${table} (id,payload,created_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)`, [value.id, JSON.stringify(value), new Date(value.createdAt)]);
  return value;
}
