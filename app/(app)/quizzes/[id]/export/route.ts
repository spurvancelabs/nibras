// =============================================================================
// FILE: app/(app)/quizzes/[id]/export/route.ts   (NEW FILE)
// CSV of quiz results (best attempt per student). Staff of the program only.
// =============================================================================

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getQuizResults } from '@/lib/quizzes';
import { formatDateTime } from '@/lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cell(raw: string) {
  let s = raw ?? '';
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const data = await getQuizResults(user.orgId, user, id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const header = 'name,email,member_id,attempts,best_percent,passed,needs_review,last_submitted_pkt';
  const body = data.rows
    .map((r) =>
      [r.name, r.email, r.memberId, String(r.attempts), r.bestPercent === null ? '' : String(r.bestPercent), r.passed ? 'yes' : 'no', r.needsReview ? 'yes' : 'no', r.lastSubmittedAt ? formatDateTime(r.lastSubmittedAt) : '']
        .map(cell)
        .join(',')
    )
    .join('\n');
  const safe = data.quiz.title.replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 60) || 'quiz';
  return new NextResponse(`﻿${header}\n${body}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safe} - results.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
