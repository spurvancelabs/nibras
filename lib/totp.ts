// =============================================================================
// FILE: lib/totp.ts   (NEW FILE — server only)
// Time-based one-time passwords (RFC 6238 / RFC 4226) for two-step sign-in.
// Works with Google Authenticator, Microsoft Authenticator, Authy, 1Password…
// SHA-1, 6 digits, 30-second steps (the settings every app supports).
// =============================================================================

import 'server-only';
import crypto from 'crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const STEP_SECONDS = 30;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** New random secret (160 bits, base32). */
export function newSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac('sha1', secret).update(msg).digest();
  const off = mac[mac.length - 1] & 0x0f;
  const code = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/**
 * Check a 6-digit code. Accepts the current step ±1 (clock drift).
 * Returns the matched step, or null. Constant-time comparison.
 */
export function verifyTotp(secretB32: string, code: string, now = Date.now()): number | null {
  const c = (code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(c)) return null;
  const secret = base32Decode(secretB32);
  const step = currentStep(now);
  let matched: number | null = null;
  for (const s of [step - 1, step, step + 1]) {
    const expected = Buffer.from(hotp(secret, s));
    if (crypto.timingSafeEqual(expected, Buffer.from(c)) && matched === null) matched = s;
  }
  return matched;
}

/** For tests: the code for a given time. */
export function totpAt(secretB32: string, now = Date.now()): string {
  return hotp(base32Decode(secretB32), currentStep(now));
}

/** otpauth:// link for the QR code. */
export function otpauthUrl(secretB32: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret: secretB32, issuer, algorithm: 'SHA1', digits: '6', period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Recovery codes: 10 × "XXXX-XXXX", stored only as SHA-256 hashes.
// ---------------------------------------------------------------------------

const RC_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newRecoveryCodes(n = 10): string[] {
  const codes: string[] = [];
  const limit = 256 - (256 % RC_ALPHABET.length);
  while (codes.length < n) {
    let s = '';
    while (s.length < 8) {
      for (const b of crypto.randomBytes(16)) {
        if (b < limit && s.length < 8) s += RC_ALPHABET[b % RC_ALPHABET.length];
      }
    }
    codes.push(`${s.slice(0, 4)}-${s.slice(4)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(code: string): string {
  const c = (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : '';
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(`nibras-rc:${normalizeRecoveryCode(code)}`).digest('hex');
}
