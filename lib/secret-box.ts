// =============================================================================
// FILE: lib/secret-box.ts   (NEW FILE)
// AES-256-GCM encryption for short-lived server data (e.g. import previews
// that contain temporary passwords). Key is derived from NEXTAUTH_SECRET.
// =============================================================================

import 'server-only';
import crypto from 'crypto';

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return crypto.createHash('sha256').update(`nibras-secret-box:v1:${secret}`).digest();
}

export function seal(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function open<T>(sealed: string): T {
  const [v, iv, tag, enc] = sealed.split('.');
  if (v !== 'v1' || !iv || !tag || !enc) throw new Error('Invalid sealed value');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const out = Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]);
  return JSON.parse(out.toString('utf8')) as T;
}

/** Short, non-reversible fingerprint (for rate-limit keys etc.). */
export function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
}
