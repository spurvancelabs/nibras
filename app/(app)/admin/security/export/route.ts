// =============================================================================
// FILE: app/(app)/admin/security/export/route.ts   (NEW FILE)
// CSV export of the audit log (current filters, max 5,000 rows). Royal only.
// The export itself is audited.
// =============================================================================

import { NextResponse } from 'next/server';
import { getCurrentUser, isRoyal } from '@/lib/auth-helpers';
import { listAudit, audit } from '@/lib/audit';
import { formatDateTime } from '@/lib/time';
import { parseAuditQuery } from '@/lib/audit-query';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cell(raw: string) {
  let s = raw ?? '';
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || !(await isRoyal(user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const { q } = parseAuditQuery(sp);
  const rows = await listAudit(user.orgId, { ...q, limit: 5000 });

  const header = 'time_pkt,time_utc,event,actor_name,actor_email,summary,target_ids,ip,user_agent,signature';
  const body = rows
    .map((r) =>
      [
        formatDateTime(r.at),
        r.at,
        r.label,
        r.actorName,
        r.actorEmail,
        r.summary,
        r.targetIds.join(' '),
        r.ip,
        r.userAgent,
        r.integrity,
      ]
        .map(cell)
        .join(',')
    )
    .join('\n');

  await audit({
    orgId: user.orgId,
    action: 'security.audit_export',
    actorId: user.id,
    actorEmail: user.email ?? '',
    actorName: user.name ?? '',
    summary: `Exported ${rows.length} audit entries`,
    meta: { filters: sp },
  });

  return new NextResponse(`﻿${header}\n${body}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
