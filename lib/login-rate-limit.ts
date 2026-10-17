// =============================================================================
// FILE: lib/login-rate-limit.ts
// In-memory sliding-window rate limiter for login attempts.
//
// NOTE ON VERCEL: each serverless function instance has its own memory.
// This slows brute force significantly but isn't bulletproof — an attacker
// who forces cold starts can partly bypass it. For strong protection, swap
// to Upstash Redis (free tier) via @upstash/ratelimit. This is a stopgap.
// =============================================================================

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();

  // Opportunistic cleanup — no interval needed
  if (store.size > 5000) {
    for (const [k, v] of store.entries()) {
      if (v.resetAt < now) store.delete(k);
    }
  }

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

export function recordSuccessfulLogin(key: string): void {
  store.delete(key);
}