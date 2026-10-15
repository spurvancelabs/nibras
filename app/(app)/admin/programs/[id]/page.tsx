// =============================================================================
// FILE: app/(app)/admin/programs/[id]/page.tsx
// Program detail (admin): hero with stats + timeline, quick actions
// (status switch, duplicate), settings form, mentor & student pickers.
// Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-helpers';
import { getProgram } from '@/lib/programs';
import { listUsers } from '@/lib/users';
import ProgramForm from '../ProgramForm';
import MembersPicker from './MembersPicker';
import ProgramQuickActions from './ProgramQuickActions';
import { Badge, Alert, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'success' | 'muted' | 'warning'> = {
  active: 'success',
  archived: 'muted',
  draft: 'warning',
};

function fmtDay(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole('admin');
  const { id } = await params;

  const [program, mentors, students] = await Promise.all([
    getProgram(admin.orgId, id),
    listUsers(admin.orgId, { role: 'mentor' }),
    listUsers(admin.orgId, { role: 'student' }),
  ]);

  if (!program) notFound();

  // Timeline (display only)
  const start = program.startDate ? new Date(program.startDate).getTime() : null;
  const end = program.endDate ? new Date(program.endDate).getTime() : null;
  const now = Date.now();
  let progress: number | null = null;
  let timelineLabel = '';
  if (start && end && end > start) {
    progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
    if (now < start) {
      const d = Math.ceil((start - now) / 86400000);
      timelineLabel = `Starts in ${d} day${d === 1 ? '' : 's'}`;
    } else if (now > end) {
      timelineLabel = 'Ended';
    } else {
      const d = Math.ceil((end - now) / 86400000);
      timelineLabel = `${d} day${d === 1 ? '' : 's'} left`;
    }
  }

  const coverage =
    students.length > 0 ? Math.round((program.studentCount / students.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/programs"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All programs
      </Link>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-5 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-12 -bottom-20 w-64 h-64 rounded-full bg-accent opacity-60" />
        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[program.status] ?? 'muted'} dot>{program.status}</Badge>
              {(program.startDate || program.endDate) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface/80 text-[11px] font-medium">
                  {Icons.calendar}
                  {fmtDay(program.startDate) ?? '…'} – {fmtDay(program.endDate) ?? '…'}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight break-words">
              {program.name}
            </h1>
            {program.description && (
              <p className="mt-2 text-sm text-muted max-w-2xl line-clamp-3">{program.description}</p>
            )}
          </div>

          <ProgramQuickActions
            programId={program.id}
            status={program.status as 'draft' | 'active' | 'archived'}
          />
        </div>

        {/* Stats + timeline */}
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat label="Mentors" value={program.mentorCount} />
          <MiniStat label="Students" value={program.studentCount} />
          <MiniStat
            label="Student coverage"
            value={`${coverage}%`}
            hint={`of ${students.length} students in org`}
          />
          <div className="col-span-2 lg:col-span-1 rounded-[var(--radius-md)] bg-surface/85 border border-border px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-muted">Timeline</p>
            {progress !== null ? (
              <>
                <p className="mt-1 text-sm font-semibold">{timelineLabel}</p>
                <div className="mt-2 h-1.5 rounded-full bg-hero overflow-hidden">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">Set start & end dates</p>
            )}
          </div>
        </div>
      </section>

      {program.status !== 'active' && (
        <Alert tone="info">
          This program is <strong>{program.status}</strong>. Content is read-only until
          you change the status to <strong>active</strong>.
        </Alert>
      )}

      {/* ---------------- Members ---------------- */}
      <section id="members" className="scroll-mt-24 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Members</h2>
        <div className="grid xl:grid-cols-2 gap-6 items-start">
          <MembersPicker
            programId={program.id}
            role="mentor"
            allCandidates={mentors.map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              avatar: m.avatar,
            }))}
            initialSelected={program.mentors.map((m) => m.id)}
          />

          <MembersPicker
            programId={program.id}
            role="student"
            allCandidates={students.map((s) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              avatar: s.avatar,
            }))}
            initialSelected={program.students.map((s) => s.id)}
          />
        </div>
      </section>

      {/* ---------------- Settings ---------------- */}
      <section id="settings" className="scroll-mt-24 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Program settings</h2>
        <ProgramForm initial={program} />
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface/85 border border-border px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}