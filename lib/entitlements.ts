// =============================================================================
// FILE: lib/entitlements.ts   (NEW FILE — client-safe, pure)
// Which themes / design styles are Free and which are Premium, and whether a
// user may use them. Used by the pickers (to show locks) AND by the server
// (saveThemeAction / saveStyleAction / app layout) — the server is the
// authority.
//
// Rules
//   - Premium is OFF by default (Settings → Premium). While off, everything
//     is free, exactly like before.
//   - Tier of a theme  = per-theme override › its category's tier › 'free'.
//     Same for design styles. Royal Admins edit the tiers (delegable).
//   - Admins always have access (they configure and preview themes).
//   - The ORGANISATION theme chosen by admins is never gated — only the
//     personal choice of each user is.
// =============================================================================

export type Tier = 'free' | 'premium';

export type EntitlementPolicy = {
  premiumEnabled: boolean;
  themeTiers?: Record<string, string> | null;
  themeOverrides?: Record<string, string> | null;
  styleTiers?: Record<string, string> | null;
  styleOverrides?: Record<string, string> | null;
};

/** Lifetime memberships are stored with this end date. */
export const LIFETIME = new Date('9999-12-31T00:00:00.000Z');
export const LIFETIME_YEAR = 9999;

export function isLifetime(until: string | Date | null | undefined): boolean {
  if (!until) return false;
  const d = new Date(until);
  return !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= LIFETIME_YEAR;
}

/** True while the membership end date is in the future. */
export function isPremiumActive(until: string | Date | null | undefined, now: number = Date.now()): boolean {
  if (!until) return false;
  const t = new Date(until).getTime();
  return Number.isFinite(t) && t > now;
}

/** Days left (rounded up), Infinity for lifetime, 0 if expired/none. */
export function daysLeft(until: string | Date | null | undefined, now: number = Date.now()): number {
  if (!isPremiumActive(until, now)) return 0;
  if (isLifetime(until)) return Infinity;
  return Math.ceil((new Date(until as string).getTime() - now) / 86_400_000);
}

function asTier(v: unknown): Tier | null {
  return v === 'premium' ? 'premium' : v === 'free' ? 'free' : null;
}

export function themeTier(preset: { id: string; category?: string } | null | undefined, p: EntitlementPolicy): Tier {
  if (!preset || !p.premiumEnabled) return 'free';
  return asTier(p.themeOverrides?.[preset.id]) ?? asTier(p.themeTiers?.[preset.category ?? '']) ?? 'free';
}

export function styleTier(style: { id: string; category?: string } | null | undefined, p: EntitlementPolicy): Tier {
  if (!style || !p.premiumEnabled) return 'free';
  return asTier(p.styleOverrides?.[style.id]) ?? asTier(p.styleTiers?.[style.category ?? '']) ?? 'free';
}

export type EntitledUser = { role: string; premiumUntil?: string | Date | null };

/** Does this user get premium items right now? */
export function hasPremiumAccess(u: EntitledUser | null | undefined, p: EntitlementPolicy, now: number = Date.now()): boolean {
  if (!p.premiumEnabled) return true;
  if (!u) return false;
  if (u.role === 'admin') return true;
  return isPremiumActive(u.premiumUntil, now);
}

export function canUseTier(tier: Tier, u: EntitledUser | null | undefined, p: EntitlementPolicy, now?: number): boolean {
  return tier === 'free' || hasPremiumAccess(u, p, now);
}
