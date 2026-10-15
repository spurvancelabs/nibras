// =============================================================================
// FILE: app/(app)/sessions/[id]/page.tsx
// Session detail: hero header, agenda, recording, materials, attendance,
// side info (mentor / join / ask), and an "Edit session" section.
// Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getSession, canManageSession } from '@/lib/sessions';
import { listMaterials } from '@/lib/materials';
import {
  getSessionAttendanceRoster,
  getMySessionAttendance,
} from '@/lib/attendance';
import { youtubeId } from '@/lib/youtube';
import Avatar from '@/components/Avatar';
import Program from '@/models/Program';
import User from '@/models/User';
import { db } from '@/lib/db';
import SessionForm from '../SessionForm';
import MaterialsPanel from './MaterialsPanel';
import AttendancePanel from './AttendancePanel';
import { Panel, SessionStatusBadge, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const session = await getSession(user.orgId, id);
  if (!session) notFound();

  const canManage =
    user.role !== 'student' &&
    (await canManageSession(
      user.orgId,
      user,
      session.mentorId,
      session.programId
    ));

  const [materials, attendanceRoster, myAttendance] = await Promise.all([
    listMaterials(user.orgId, session.id),
    user.role === 'student'
      ? Promise.resolve([])
      : getSessionAttendanceRoster(
          user.orgId,
          session.programId,
          session.id
        ),
    user.role === 'student'
      ? getMySessionAttendance(user.orgId, session.id, user.id)
      : Promise.resolve(null),
  ]);

  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const fmtDay = (d: Date) =>
    d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const sameDay = start.toDateString() === end.toDateString();
  const durationMin = Math.max(0, Math.round((+end - +start) / 60000));
  const duration =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}`
      : `${durationMin}m`;

  const ytId = youtubeId(session.recordingUrl);

  let programOptions: { id: string; name: string }[] = [];
  let mentors: { id: string; name: string }[] = [];
  if (canManage) {
    await db();
    const query: Record<string, unknown> = { orgId: user.orgId };
    if (user.role === 'mentor') query.mentors = user.id;
    const rows = await Program.find(query).select('_id name').sort({ name: 1 }).lean();
    programOptions = rows.map((p) => ({
      id: String(p._id),
      name: p.name as string,
    }));

    // Load mentors for the form
    const mentorRows = await User.find({
      orgId: user.orgId,
      role: 'mentor',
    }).select('_id name').lean();
    mentors = mentorRows.map((m) => ({
      id: String(m._id),
      name: m.name as string,
    }));
  }

  const canJoin = !!session.meetingUrl && session.status === 'scheduled';

  return (
    <div className="space-y-6">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All sessions
      </Link>

      {/* ---------------- Hero header ---------------- */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-5 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-12 -bottom-20 w-64 h-64 rounded-full bg-accent opacity-60" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface/80 text-[11px] font-medium">
                {session.programName}
              </span>
              <SessionStatusBadge status={session.status} />
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight break-words">
              {session.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2">
                {Icons.calendar}
                {fmtDay(start)}
              </span>
              <span className="inline-flex items-center gap-2">
                {Icons.clock}
                {fmtTime(start)} – {sameDay ? fmtTime(end) : `${fmtDay(end)}, ${fmtTime(end)}`}
                <span className="text-muted">· {duration}</span>
              </span>
            </div>
          </div>

          {canJoin && (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[var(--radius-md)] bg-primary text-primary-fg text-sm font-medium hover:opacity-90 transition shrink-0"
            >
              {Icons.video}
              Open meeting link
            </a>
          )}
        </div>
      </section>

      {/* ---------------- Body ---------------- */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {session.agenda && (
            <Panel title="Agenda" icon={Icons.clipboard}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{session.agenda}</p>
            </Panel>
          )}

          {ytId && (
            <Panel title="Recording" icon={Icons.video}>
              <div className="aspect-video w-full rounded-[var(--radius-md)] overflow-hidden bg-black">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={session.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-xs text-muted mt-2">
                If the video says &quot;unavailable&quot;, the owner must allow embedding.
              </p>
            </Panel>
          )}

          <MaterialsPanel
            sessionId={session.id}
            materials={materials}
            canManage={canManage}
          />

          <AttendancePanel
            sessionId={session.id}
            roster={attendanceRoster}
            canManage={canManage}
            myAttendance={myAttendance}
            viewerIsStudent={user.role === 'student'}
          />
        </div>

        {/* ---------------- Side column ---------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Mentor</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={session.mentorName} src={session.mentorAvatar} size={48} />
              <div className="min-w-0">
                <p className="font-medium truncate">{session.mentorName}</p>
                <p className="text-xs text-muted truncate">{session.programName}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Materials</span>
              <span className="font-medium tabular-nums">{materials.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Recording</span>
              <span className="font-medium">{ytId ? 'Available' : '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Duration</span>
              <span className="font-medium">{duration}</span>
            </div>
          </div>

          {user.role === 'student' && (
            <div className="rounded-[var(--radius-lg)] bg-primary text-primary-fg p-5 space-y-3">
              <div>
                <h2 className="font-semibold">Have a question?</h2>
                <p className="text-xs opacity-75 mt-1">
                  Start a thread tied to this session — your mentors will be notified.
                </p>
              </div>
              <Link
                href={`/queries/new?sessionId=${session.id}`}
                className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-[var(--radius-md)] bg-hero text-text text-sm font-medium hover:opacity-90 transition"
              >
                {Icons.chat}
                Ask a question
              </Link>
            </div>
          )}

          {canManage && (
            <a
              href="#edit-session"
              className="flex items-center justify-center gap-2 h-10 rounded-[var(--radius-md)] border border-border bg-surface text-sm font-medium hover:bg-hero transition"
            >
              {Icons.edit}
              Edit session
            </a>
          )}
        </aside>
      </div>

      {/* ---------------- Edit ---------------- */}
      {canManage && (
        <section id="edit-session" className="scroll-mt-24 space-y-3 pt-6 border-t border-border">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] bg-hero">
              {Icons.edit}
            </span>
            <h2 className="text-lg font-semibold">Edit session</h2>
          </div>
          <SessionForm
            programs={programOptions}
            mentors={mentors}
            viewerRole={user.role === 'admin' ? 'admin' : 'mentor'}
            initial={session}
            canDelete
          />
        </section>
      )}
    </div>
  );
}