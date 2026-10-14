import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { cloudinaryDownloadUrl } from '@/lib/cloudinary-url';
import {
  getAssignment,
  canManageProgramAssignments,
  canViewAssignment,
} from '@/lib/assignments';
import {
  getMySubmission,
  getAssignmentRoster,
} from '@/lib/submissions';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import AssignmentForm from '../AssignmentForm';
import StudentSubmission from './StudentSubmission';
import SubmissionsList from './SubmissionsList';
import type { SubmissionState } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function stateFor(
  dueAt: string,
  sub: { gradedAt: string | null } | null,
  now = Date.now()
): SubmissionState {
  if (sub?.gradedAt) return 'graded';
  if (sub) return 'submitted';
  return new Date(dueAt).getTime() < now ? 'overdue' : 'pending';
}

function StateBadge({ state }: { state: SubmissionState }) {
  if (state === 'graded') return <span className="badge-success">graded</span>;
  if (state === 'submitted') return <span className="badge-muted">submitted</span>;
  if (state === 'overdue') return <span className="badge-danger">overdue</span>;
  return <span className="badge-warning">pending</span>;
}

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const assignment = await getAssignment(user.orgId, id);
  if (!assignment) notFound();

  const canView = await canViewAssignment(user.orgId, user, assignment.programId);
  if (!canView) notFound();

  const canManage =
    user.role !== 'student' &&
    (await canManageProgramAssignments(user.orgId, user, assignment.programId));

  const dueAt = new Date(assignment.dueAt);

  // Student data
  let mySubmission = null as Awaited<ReturnType<typeof getMySubmission>> | null;
  if (user.role === 'student') {
    mySubmission = await getMySubmission(
      user.orgId,
      assignment.id,
      user.id,
      dueAt,
      assignment.maxMarks
    );
  }

  // Mentor data
  let roster: Awaited<ReturnType<typeof getAssignmentRoster>> = [];
  if (canManage) {
    roster = await getAssignmentRoster(
      user.orgId,
      assignment.programId,
      assignment.id,
      dueAt,
      assignment.maxMarks
    );
  }

  // Programs for edit form
  let programOptions: { id: string; name: string }[] = [];
  if (canManage) {
    await db();
    const q: Record<string, unknown> = { orgId: user.orgId };
    if (user.role === 'mentor') q.mentors = user.id;
    const ps = await Program.find(q).select('_id name').sort({ name: 1 }).lean();
    programOptions = ps.map((p) => ({ id: String(p._id), name: p.name as string }));
  }

  const state = user.role === 'student'
    ? stateFor(assignment.dueAt, mySubmission ? { gradedAt: mySubmission.gradedAt } : null)
    : null;

  const isOverdue = Date.now() > dueAt.getTime();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/assignments" className="text-sm text-muted hover:underline">
          ← All assignments
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          <p className="text-sm text-muted">
            {assignment.programName} · {assignment.maxMarks} marks
          </p>
          <p
            className={`text-sm mt-1 ${
              isOverdue ? 'text-danger font-medium' : 'text-muted'
            }`}
          >
            Due {fmt(assignment.dueAt)}
            {!assignment.allowLate && ' · no late submissions'}
          </p>
        </div>
        {state && <StateBadge state={state} />}
      </div>

      {assignment.description && (
        <div className="card">
          <h2 className="font-semibold mb-2">Description</h2>
          <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
        </div>
      )}

      {assignment.attachments.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">Reference files</h2>
          <ul className="divide-y divide-border">
            {assignment.attachments.map((a, i) => (
              <li key={i} className="py-2 flex items-center gap-3">
                <span className="truncate flex-1 text-sm">{a.originalName}</span>
                <a
                  href={cloudinaryDownloadUrl(a.url, a.originalName)}
                  className="btn-outline text-sm"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Student section */}
      {user.role === 'student' && (
        <StudentSubmission
          assignmentId={assignment.id}
          maxMarks={assignment.maxMarks}
          dueAt={assignment.dueAt}
          allowLate={assignment.allowLate}
          submission={mySubmission}
          state={state!}
        />
      )}

      {/* Mentor/admin section */}
      {canManage && (
        <SubmissionsList
          assignmentId={assignment.id}
          maxMarks={assignment.maxMarks}
          dueAt={assignment.dueAt}
          roster={roster}
        />
      )}

      {canManage && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold pt-4 border-t border-border">
            Edit assignment
          </h2>
          <AssignmentForm
            programs={programOptions}
            initial={assignment}
            canDelete
          />
        </div>
      )}
    </div>
  );
}