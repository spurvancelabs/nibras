// =============================================================================
// FILE: lib/password.ts   (NEW FILE — client-safe)
// One password policy for every place a password is set, and an unbiased
// random generator (the old one used `byte % alphabet`, which slightly
// favoured some characters).
// =============================================================================

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 100;

const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', '11111111', '00000000', 'abcd1234', 'iloveyou',
  'pakistan', 'pakistan123', 'welcome1', 'welcome123', 'admin123', 'letmein1',
]);

/** Error message, or null when the password is acceptable. */
export function validatePassword(pw: string, ctx: { email?: string; name?: string } = {}): string | null {
  const p = pw ?? '';
  if (p.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (p.length > PASSWORD_MAX) return `Password must be ${PASSWORD_MAX} characters or fewer`;
  if (/^(.)\1+$/.test(p)) return 'Password cannot be one repeated character';
  if (COMMON.has(p.toLowerCase())) return 'That password is too common — choose another';
  const email = (ctx.email ?? '').toLowerCase();
  if (email && p.toLowerCase() === email) return 'Password cannot be the email address';
  return null;
}

const SAFE = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Random password from an unambiguous alphabet (no 0/O, 1/l/I). */
export function generatePassword(len = 12): string {
  const out: string[] = [];
  const limit = 256 - (256 % SAFE.length); // rejection sampling → no bias
  const buf = new Uint8Array(len * 2);
  while (out.length < len) {
    globalThis.crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < limit) out.push(SAFE[b % SAFE.length]);
      if (out.length === len) break;
    }
  }
  return out.join('');
}
