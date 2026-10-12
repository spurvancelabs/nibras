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

/**
 * Sends an email via Resend. No-ops (with a log) if RESEND_API_KEY is missing,
 * so dev environments don't need it set.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.log('[email] skipped (no RESEND_API_KEY):', input.subject);
    return;
  }

  const settings = await getSettings();
  const appUrl =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';

  const cta = input.link
    ? `<p style="margin:24px 0"><a href="${absolute(input.link, appUrl)}"
        style="background:${settings.light.primary};color:${settings.light.primaryFg};
        padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;
        font-weight:500">${escapeHtml(input.ctaLabel ?? 'Open')}</a></p>`
    : '';

  const html = `<!doctype html>
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

  try {
    await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html,
    });
  } catch (err) {
    console.error('[email] send failed', err);
  }
}

function absolute(link: string, base: string): string {
  if (/^https?:\/\//i.test(link)) return link;
  return `${base.replace(/\/$/, '')}${link.startsWith('/') ? '' : '/'}${link}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}