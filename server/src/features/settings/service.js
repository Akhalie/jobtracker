import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { getState, setState } from '../../lib/db.js';
import { z } from 'zod';
import { fail } from '../../lib/schemas.js';

function key() {
  const secret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    throw fail(503, 'Set ENCRYPTION_KEY in the server environment before saving API credentials.');
  }
  return createHash('sha256').update(secret).digest();
}
export function encrypt(value) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key(), iv);
  return [
    iv.toString('hex'),
    Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]).toString('hex'),
    cipher.getAuthTag().toString('hex')
  ].join('.');
}
export function decrypt(value) {
  const [iv, data, tag] = value.split('.');
  const cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'hex'));
  cipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([cipher.update(Buffer.from(data, 'hex')), cipher.final()]).toString('utf8');
}
export async function aiConfig() {
  const settings = await getState('settings', {});
  return {
    aiBaseUrl: settings.aiBaseUrl || process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    aiModel: settings.aiModel || process.env.AI_MODEL || '',
    aiApiKey: settings.encryptedKey ? decrypt(settings.encryptedKey) : process.env.AI_API_KEY || ''
  };
}
export async function publicSettings() {
  const value = await aiConfig();
  return { aiBaseUrl: value.aiBaseUrl, aiModel: value.aiModel, aiConfigured: Boolean(value.aiApiKey && value.aiModel) };
}
export async function saveSettings(input) {
  const value = z
    .object({
      aiBaseUrl: z
        .url()
        .max(2000)
        .refine(
          (value) => value.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(value),
          'Use HTTPS, or a localhost endpoint.'
        ),
      aiModel: z.string().trim().max(200),
      aiApiKey: z.string().max(4000).optional()
    })
    .parse(input);
  const settings = await getState('settings', {});
  await setState('settings', {
    aiBaseUrl: value.aiBaseUrl,
    aiModel: value.aiModel,
    encryptedKey: value.aiApiKey ? encrypt(value.aiApiKey) : settings.encryptedKey || null
  });
  return publicSettings();
}
