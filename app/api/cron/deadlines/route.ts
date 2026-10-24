import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Assignment from '@/models/Assignment';
import Submission from '@/models/Submission';
import Program from '@/models/Program';
import { notifyMany } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { formatDateTime } from '@/lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_HOURS = 24;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  // Vercel cron sends "Bearer <CRON_SECRET>" automatically if CRON_SECRET is set.
  if (secret && authHeader !== `Bearer ${secret}`) {
    return unauthorized();
  }

  await db();

  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_HOURS * 3600 * 1000);

  const assignments = await Assignment.find({
    dueAt: { $gt: now, $lte: horizon },
  })
    .select('_id orgId programId title dueAt')
    .lean();

  let sent = 0;

  for (const a of assignments) {
    const program = await Program.findOne({ _id: a.programId })
      .select('students')
      .lean();
    const studentIds = (program?.students ?? []).map(String);
    if (studentIds.length === 0) continue;

    // Exclude students who already submitted
    const submitted = await Submission.find({
      assignmentId: a._id,
      studentId: { $in: studentIds },
    })
      .select('studentId')
      .lean();
    const submittedIds = new Set(submitted.map((s) => String(s.studentId)));

    const pendingIds = studentIds.filter((id: string) => !submittedIds.has(id));
    if (pendingIds.length === 0) continue;

    const dueLabel = formatDateTime(a.dueAt) + ' (PKT)';

    await notifyMany({
      orgId: String(a.orgId),
      userIds: pendingIds,
      type: 'assignment.due_soon',
      title: `Due soon: ${a.title}`,
      body: `This assignment is due on ${dueLabel}. Submit before then.`,
      link: `/assignments/${a._id}`,
      email: true,
      dedupeKeyPrefix: `due:${String(a._id)}`,
    });

    sent += pendingIds.length;
  }

  // Keep `sendEmail` referenced so tree-shaking doesn't strip it in dev
  void sendEmail;

  return NextResponse.json({ ok: true, assignments: assignments.length, sent });
}