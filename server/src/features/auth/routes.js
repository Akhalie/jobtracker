import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../lib/db.js';
import { fail } from '../../lib/schemas.js';
import { createSession, readSession, revokeSession, hashPassword, verifyPassword } from '../../middleware/auth.js';

export const authRouter = Router();
const attempts = new Map();
function rateLimit(req) {
  const now = Date.now();
  for (const [ip, state] of attempts) {
    if (state.until < now) {
      attempts.delete(ip);
    }
  }
  const state = attempts.get(req.ip) || { count: 0, until: now + 15 * 60000 };
  if (++state.count > 20) {
    throw fail(429, 'Too many sign-in attempts. Try again in 15 minutes.');
  }
  attempts.set(req.ip, state);
}
authRouter.get('/session', async (req, res) => res.json({ user: await readSession(req) }));
authRouter.post('/setup', async (req, res) => {
  rateLimit(req);
  const input = z
    .object({ name: z.string().trim().min(1).max(120), password: z.string().min(10).max(200) })
    .parse(req.body);
  try {
    await pool.execute('INSERT INTO users (id,name,password_hash) VALUES (1,?,?)', [
      input.name,
      await hashPassword(input.password)
    ]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw fail(409, 'This installation already has an owner. Sign in instead.');
    }
    throw error;
  }
  await createSession(res, 1);
  res.status(201).json({ user: { id: 1, name: input.name } });
});
authRouter.post('/login', async (req, res) => {
  rateLimit(req);
  const { password } = z.object({ password: z.string().min(1).max(200) }).parse(req.body);
  const [rows] = await pool.execute('SELECT id,name,password_hash FROM users WHERE id=1');
  if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) {
    throw fail(401, 'Incorrect password.');
  }
  attempts.delete(req.ip);
  await createSession(res, rows[0].id);
  res.json({ user: { id: rows[0].id, name: rows[0].name } });
});
authRouter.post('/logout', async (req, res) => {
  await revokeSession(req, res);
  res.json({ ok: true });
});
