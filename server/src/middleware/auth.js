import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool, getState, setState } from '../lib/db.js';
import { fail } from '../lib/schemas.js';

const scrypt = promisify(scryptCallback);
let secret;
async function sessionSecret() {
  if (!secret) {
    const stored = await getState('sessionSecret', null);
    secret = process.env.SESSION_SECRET || stored;
    if (!secret) {
      secret = randomBytes(48).toString('hex');
      await setState('sessionSecret', secret);
    }
  }
  return secret;
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hex] = stored.split(':');
  const expected = Buffer.from(hex, 'hex');
  const actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
const digest = (token) => createHash('sha256').update(token).digest('hex');
export async function createSession(res, userId) {
  const token = randomBytes(32).toString('hex');
  const signature = createHmac('sha256', await sessionSecret())
    .update(token)
    .digest('hex');
  await pool.execute('DELETE FROM sessions WHERE expires_at < NOW()', []);
  await pool.execute('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)', [
    digest(token),
    userId,
    new Date(Date.now() + 7 * 86400000)
  ]);
  res.cookie('tracker_session', `${token}.${signature}`, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict',
    maxAge: 7 * 86400000,
    path: '/'
  });
}
export async function readSession(req) {
  const raw = req.headers.cookie
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('tracker_session='))
    ?.slice(16);
  if (!raw || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(raw)) {
    return null;
  }
  const [token, signature] = raw.split('.');
  const expected = createHmac('sha256', await sessionSecret())
    .update(token)
    .digest('hex');
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  const [rows] = await pool.execute(
    'SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>NOW()',
    [digest(token)]
  );
  if (rows[0]) {
    req.sessionHash = digest(token);
  }
  return rows[0] || null;
}
export async function requireAuth(req, res, next) {
  try {
    req.user = await readSession(req);
    if (!req.user) {
      throw fail(401, 'Sign in to continue.');
    }
    next();
  } catch (error) {
    next(error);
  }
}
export function checkOrigin(req, res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
    const allowed = new Set([`${req.protocol}://${req.get('host')}`, process.env.APP_ORIGIN]);
    if (process.env.NODE_ENV !== 'production') {
      for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
        allowed.add(origin);
      }
    }
    if (!allowed.has(req.headers.origin)) {
      return next(fail(403, 'Request origin is not allowed.'));
    }
  }
  next();
}
export async function revokeSession(req, res) {
  await readSession(req);
  if (req.sessionHash) {
    await pool.execute('DELETE FROM sessions WHERE token_hash=?', [req.sessionHash]);
  }
  res.clearCookie('tracker_session', { path: '/', httpOnly: true, sameSite: 'strict' });
}
