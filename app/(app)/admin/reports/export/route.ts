// =============================================================================
// FILE: app/(app)/admin/reports/export/route.ts   (NEW FILE)
// Program summary CSV. Admins with "exports.data"; audited; rate-limited.
// =============================================================================

import { NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth-helpers';
import { programSummaries, programsCsv } from '@/lib/reports';
import { auditBy } from '@/lib/audit';
import { hit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  if (!(await hasPermission(user, 'exports.data'))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  if ((await hit(`export:reports:${user.id}`, 3600)) > 20) return NextResponse.json({ error: 'Too many exports — try again later' }, { status: 429 });
  const rows = await programSummaries(user.orgId);
  await auditBy(user, 'report.export', `Program summary CSV (${rows.length} programs)`);
  return new NextResponse(programsCsv(rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="programs-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
