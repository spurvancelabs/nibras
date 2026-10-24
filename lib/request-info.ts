// =============================================================================
// FILE: lib/request-info.ts   (NEW FILE)
// Client IP / user agent for audit logs and sign-in throttling, and a SAFE
// app origin for links in emails (from env first, not from the Host header,
// so a forged Host header can't make emails link to another site).
// =============================================================================

import 'server-only';
import { headers } from 'next/headers';

export function clientIp(forwardedFor?: string | null, realIp?: string | null): string {
  const first = (forwardedFor ?? '').split(',')[0]?.trim() ?? '';
  return (first || (realIp ?? '').trim()).slice(0, 64);
}

export async function requestInfo(): Promise<{ ip: string; userAgent: string }> {
  try {
    const h = await headers();
    return {
      ip: clientIp(h.get('x-forwarded-for'), h.get('x-real-ip')),
      userAgent: (h.get('user-agent') ?? '').slice(0, 300),
    };
  } catch {
    return { ip: '', userAgent: '' };
  }
}

/** Absolute origin for links in emails, e.g. https://nibras.spurvancelabs.com */
export async function appOrigin(): Promise<string> {
  const fromEnv =
    process.env.NEXTAUTH_URL || process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (/^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/+$/, '');
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  } catch {
    return 'http://localhost:3000';
  }
}
