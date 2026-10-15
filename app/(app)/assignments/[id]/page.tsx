// =============================================================================
// FILE: app/(app)/assignments/[id]/page.tsx
// Assignment detail: hero header, description, reference files, student
// submission OR mentor submissions list, and "Edit assignment".
// Data logic unchanged.
// =============================================================================

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
import {
  Panel,
  Badge,
  FileList,
  FileRow,
  DownloadIcon,
  Icons,
} from '@/components/ui';

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
  if (state === 'graded') return <Badge tone="success" dot>graded</Badge>;
  if (state === 'submitted') return <Badge tone="muted" dot>submitted</Badge>;
  if (state === 'overdue') return <Badge tone="danger" dot>overdue</Badge>;
  return <Badge tone="warning" dot>pending</Badge>;
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
    <div className="space-y-6">
      <Link
        href="/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All assignments
      </Link>

      {/* ---------------- Hero header ---------------- */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-5 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-12 -bottom-20 w-64 h-64 rounded-full bg-accent opacity-60" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface/80 text-[11px] font-medium">
                {assignment.programName}
              </span>
              {state && <StateBadge state={state} />}
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight break-words">
              {assignment.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className={`inline-flex items-center gap-2 ${isOverdue ? 'text-danger font-medium' : ''}`}>
                {Icons.clock}
                Due {fmt(assignment.dueAt)}
              </span>
              {!assignment.allowLate && (
                <span className="inline-flex items-center gap-2 text-muted">
                  · no late submissions
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            <div className="px-5 py-3 rounded-[var(--radius-md)] bg-surface/90 border border-border text-center">
              <p className="text-2xl font-semibold tabular-nums">{assignment.maxMarks}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">marks</p>
            </div>
            {canManage && (
              <div className="px-5 py-3 rounded-[var(--radius-md)] bg-surface/90 border border-border text-center">
                <p className="text-2xl font-semibold tabular-nums">
                  {roster.filter((r) => r.submitted).length}/{roster.length}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-muted">submitted</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- Body ---------------- */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {assignment.description && (
            <Panel title="Description" icon={Icons.clipboard}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
            </Panel>
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
        </div>

        {/* ---------------- Side column ---------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <Panel title="Reference files" icon={Icons.file} bodyClassName="p-3">
            {assignment.attachments.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted">No reference files.</p>
            ) : (
              <FileList>
                {assignment.attachments.map((a, i) => (
                  <FileRow key={i} name={a.originalName} size={a.size} format={a.format}>
                    <a
                      href={cloudinaryDownloadUrl(a.url, a.originalName)}
                      className="btn-ghost h-8 w-8 p-0"
                      aria-label={`Download ${a.originalName}`}
                      title="Download"
                    >
                      {DownloadIcon}
                    </a>
                  </FileRow>
                ))}
              </FileList>
            )}
          </Panel>

          {canManage && (
            <a
              href="#edit-assignment"
              className="flex items-center justify-center gap-2 h-10 rounded-[var(--radius-md)] border border-border bg-surface text-sm font-medium hover:bg-hero transition"
            >
              {Icons.edit}
              Edit assignment
            </a>
          )}
        </aside>
      </div>

      {/* ---------------- Edit ---------------- */}
      {canManage && (
        <section id="edit-assignment" className="scroll-mt-24 space-y-3 pt-6 border-t border-border">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] bg-hero">
              {Icons.edit}
            </span>
            <h2 className="text-lg font-semibold">Edit assignment</h2>
          </div>
          <AssignmentForm
            programs={programOptions}
            initial={assignment}
            canDelete
          />
        </section>
      )}
    </div>
  );
}