// =============================================================================
// FILE: lib/email.ts
// Email via Resend.
// FIXES:
//   - Resend returns errors instead of throwing them, so failed sends were
//     silently treated as sent. Errors are now detected and reported.
//   - Bulk sending uses Resend's batch API (100 emails per request) instead of
//     10 parallel requests, which hit Resend's rate limit (2 requests/second)
//     and dropped most welcome emails during imports.
//   - Link URLs are restricted to http(s) and HTML-escaped.
// sendEmail() still works exactly as before for existing callers; it now
// resolves to true/false instead of void.
// =============================================================================

import 'server-only';
import { Resend } from 'resend';
import { getSettings } from './settings';

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM ?? 'LMS <onboarding@resend.dev>';

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!API_KEY) return null;
  if (!client) client = new Resend(API_KEY);
  return client;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  heading: string;
  body: string;
  link?: string; // absolute or app-relative
  ctaLabel?: string;
};

type Settings = Awaited<ReturnType<typeof getSettings>>;

function appUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'
  );
}

function render(input: SendEmailInput, settings: Settings): string {
  const href = input.link ? absolute(input.link, appUrl()) : '';
  const cta = href
    ? `<p style="margin:24px 0"><a href="${escapeHtml(href)}"
        style="background:${escapeHtml(settings.light.primary)};color:${escapeHtml(settings.light.primaryFg)};
        padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;
        font-weight:500">${escapeHtml(input.ctaLabel ?? 'Open')}</a></p>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body style="background:#f6f7f9;margin:0;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
    <p style="font-size:14px;color:#6b7280;margin:0 0 8px">${escapeHtml(settings.orgName)}</p>
    <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(input.heading)}</h2>
    <p style="margin:0;line-height:1.55;white-space:pre-wrap;color:#374151">${escapeHtml(input.body)}</p>
    ${cta}
  </div>
  <p style="max-width:520px;margin:12px auto 0;color:#9ca3af;font-size:12px;text-align:center">
    You received this because you have an account on ${escapeHtml(settings.orgName)}.
  </p>
</body></html>`;
}

/**
 * Sends one email. Resolves to true when Resend accepted it.
 * No-ops (with a log) if RESEND_API_KEY is missing.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    console.log('[email] skipped (no RESEND_API_KEY):', input.subject);
    return false;
  }
  try {
    const settings = await getSettings();
    const res = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: render(input, settings),
    });
    if (res.error) {
      console.error('[email] send failed', res.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] send failed', err);
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends many emails with Resend's batch API (100 per request, ~1 request/sec).
 * Falls back to one-by-one sending if a batch is rejected.
 */
export async function sendEmails(
  inputs: SendEmailInput[]
): Promise<{ sent: number; failed: { to: string; error: string }[] }> {
  const failed: { to: string; error: string }[] = [];
  if (!inputs.length) return { sent: 0, failed };
  const resend = getClient();
  if (!resend) {
    console.log(`[email] skipped ${inputs.length} emails (no RESEND_API_KEY)`);
    return { sent: 0, failed: inputs.map((i) => ({ to: i.to, error: 'Email is not configured (RESEND_API_KEY)' })) };
  }

  const settings = await getSettings();
  let sent = 0;

  for (let i = 0; i < inputs.length; i += 100) {
    const chunk = inputs.slice(i, i + 100);
    if (i > 0) await sleep(1100);
    let batchOk = false;
    for (let attempt = 0; attempt < 2 && !batchOk; attempt++) {
      try {
        const res = await resend.batch.send(
          chunk.map((c) => ({ from: FROM, to: c.to, subject: c.subject, html: render(c, settings) }))
        );
        if (!res.error) {
          batchOk = true;
          sent += chunk.length;
        } else {
          console.error('[email] batch rejected', res.error);
          await sleep(1500);
        }
      } catch (e) {
        console.error('[email] batch failed', e);
        await sleep(1500);
      }
    }
    if (!batchOk) {
      // One by one, slowly, so a single bad address can't sink the rest.
      for (const c of chunk) {
        const ok = await sendEmail(c);
        if (ok) sent++;
        else failed.push({ to: c.to, error: 'Send failed' });
        await sleep(600);
      }
    }
  }
  return { sent, failed };
}

function absolute(link: string, base: string): string {
  if (/^https?:\/\//i.test(link)) return link;
  if (/^[a-z][a-z0-9+.-]*:/i.test(link)) return base; // block javascript:, data:, etc.
  return `${base.replace(/\/$/, '')}${link.startsWith('/') ? '' : '/'}${link}`;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
