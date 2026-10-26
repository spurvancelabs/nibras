// =============================================================================
// FILE: app/(app)/attendance/export/route.ts   (NEW FILE)
// CSV export of the attendance hub (mentors: their programs; admins: all).
// Audited. Rate-limited to 20 exports per user per hour.
// =============================================================================

import { NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { attendanceOverview, overviewCsv } from '@/lib/attendance-reports';
import { auditBy } from '@/lib/audit';
import { hit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  if (!(await hasPermission(user, 'attendance.reports'))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  if ((await hit(`export:attendance:${user.id}`, 3600)) > 20) return NextResponse.json({ error: 'Too many exports — try again later' }, { status: 429 });

  const url = new URL(req.url);
  const range = url.searchParams.get('range');
  const days = range === '30' ? 30 : range === 'all' ? 0 : 90;
  const programId = url.searchParams.get('program') || undefined;
  const s = await getSettings();
  const o = await attendanceOverview(user, { programId, days: days || undefined, threshold: s.attendanceThreshold, streakAlert: s.absenceStreakAlert });
  await auditBy(user, 'attendance.export', `Attendance CSV (${o.learners.length} learners, ${days ? `${days} days` : 'all time'})`, [], { programId: programId ?? null, days });

  return new NextResponse(overviewCsv(o, s.attendanceThreshold), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="attendance-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
