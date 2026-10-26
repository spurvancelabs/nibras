// =============================================================================
// FILE: app/api/cron/daily/route.ts   (NEW FILE)
// Daily maintenance (vercel.json → crons). Premium notices, attendance
// alerts, inactivity automation and data retention — see lib/daily-jobs.ts.
//
// Security: requires CRON_SECRET. Vercel sends "Authorization: Bearer
// <CRON_SECRET>" automatically when the variable is set. Without it the job
// refuses to run (it can pause accounts, so it must never be public).
// =============================================================================

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { runDailyJobs } from '@/lib/daily-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get('authorization') ?? '';
  const want = `Bearer ${secret}`;
  return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET is not set — daily jobs are disabled' }, { status: 503 });
  }
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    // Fits Vercel's 10 s function limit (vercel.json). Jobs that run out of
    // time continue on the next run — every job is safe to repeat.
    const result = await runDailyJobs(7_500);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error('[cron/daily]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
