// =============================================================================
// FILE: app/(app)/grading/report/[id]/export/route.ts   (NEW FILE)
// CSV of the grading report (mentors of the program and admins only).
// =============================================================================

import { NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth-helpers';
import { assignmentReport } from '@/lib/grading';
import { csvCell } from '@/lib/grading-report-core';
import { auditBy } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'grading.review'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const r = await assignmentReport(user, id);
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const header = ['name', 'email', 'status', 'submitted_at', 'late', 'marks', 'max_marks', 'percent', 'ai_suggested', 'ai_assisted', 'edited_by_mentor', 'flags', 'graded_at', 'feedback'];
  const lines = r.rows.map((x) =>
    [
      x.name,
      x.email,
      !x.submittedAt ? 'missing' : x.marks === null ? 'to grade' : 'graded',
      x.submittedAt ?? '',
      x.late ? 'yes' : '',
      x.marks ?? '',
      r.assignment.maxMarks,
      x.percent ?? '',
      x.aiMarks ?? '',
      x.aiAssisted ? 'yes' : '',
      x.edited ? 'yes' : '',
      x.flags.join(' '),
      x.gradedAt ?? '',
      x.feedback.slice(0, 2000),
    ]
      .map(csvCell)
      .join(',')
  );
  await auditBy(user, 'report.export', `Grading report CSV: ${r.assignment.title}`, [], { assignmentId: id });
  const safe = r.assignment.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'assignment';
  return new NextResponse(`﻿${header.join(',')}\n${lines.join('\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="grading-${safe}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
