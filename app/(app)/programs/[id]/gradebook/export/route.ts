// =============================================================================
// FILE: app/(app)/programs/[id]/gradebook/export/route.ts   (NEW FILE)
// Gradebook CSV (staff of the program only).
// =============================================================================

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { hubAccess } from '@/lib/program-hub';
import { computeProgramProgress } from '@/lib/progress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cell(raw: string) {
  let s = raw ?? '';
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user || (await hubAccess(user.orgId, user, id)) !== 'manage') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const data = await computeProgramProgress(user.orgId, id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const header = ['name', 'email', 'member_id', 'attendance_%', 'assignments_%', 'quizzes_%', ...data.columns.map((c) => `${c.kind === 'quiz' ? 'Quiz' : 'Assignment'}: ${c.title}`)];
  const lines = data.students.map((s) =>
    [
      s.name,
      s.email,
      s.memberId,
      s.attendance.percent === null ? '' : String(s.attendance.percent),
      s.assignments.percent === null ? '' : String(s.assignments.percent),
      s.quizzes.percent === null ? '' : String(s.quizzes.percent),
      ...data.columns.map((c) => s.cells[c.id]?.label ?? ''),
    ]
      .map(cell)
      .join(',')
  );
  return new NextResponse(`﻿${header.map(cell).join(',')}\n${lines.join('\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gradebook.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
