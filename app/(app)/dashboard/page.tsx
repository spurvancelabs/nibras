// =============================================================================
// FILE: app/(app)/dashboard/page.tsx
// Dashboard for all roles (admin / mentor / student). Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listPrograms } from '@/lib/programs';
import { countUsersByRole } from '@/lib/users';
import { listUpcomingForUser } from '@/lib/sessions';
import { listAssignments } from '@/lib/assignments';
import { listOpenQueries } from '@/lib/queries';
import { getStudentAttendanceSummary } from '@/lib/attendance';
import Avatar from '@/components/Avatar';
import {
  Panel,
  PanelLink,
  Badge,
  EmptyNote,
  DateTile,
  ProgressRing,
  Icons,
} from '@/components/ui';
import { getSettings } from '@/lib/settings';
import { policyFrom } from '@/lib/premium';
import { effectivePreset, characterFor } from '@/lib/appearance';
import Character from '@/components/Character';
import FocusStrip from './FocusStrip';
import { formatDateTimeWeekday, formatTime, greetingFor, formatDayMonth } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(iso: string) {
  return formatDateTimeWeekday(iso);
}

function fmtTime(iso: string) {
  return formatTime(iso);
}

function greeting() {
  return greetingFor();
}

const rowCls =
  'flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] border border-border hover:border-primary hover:bg-hero/40 transition';

export default async function DashboardPage() {
  const user = await requireAuth();
  const st = await getSettings().catch(() => null);
  const heroArt = st?.heroArt ?? '';
  // Anime Deluxe themes: show the theme's original character (unless the
  // admin uploaded their own artwork, which always wins).
  const character = st && !heroArt ? characterFor(effectivePreset(st, policyFrom(st), user), st.showScene) : null;

  const [
    programs,
    allUsers,
    upcomingSessions,
    assignments,
    openQueries,
    attendanceSummary,
  ] = await Promise.all([
    listPrograms(user.orgId),
    user.role === 'admin' ? countUsersByRole(user.orgId) : Promise.resolve({ total: 0, mentor: 0, student: 0, admin: 0 }),
    listUpcomingForUser(user.orgId, user, 5),
    listAssignments(user.orgId, user),
    listOpenQueries(user.orgId, user, 5),
    user.role === 'student'
      ? getStudentAttendanceSummary(user.orgId, user.id)
      : Promise.resolve([]),
  ]);

  const pendingForStudent =
    user.role === 'student'
      ? assignments
          .filter((a) => a.myState === 'pending' || a.myState === 'overdue')
          .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
          .slice(0, 5)
      : [];

  const toGradeForMentor =
    user.role === 'mentor' || user.role === 'admin'
      ? assignments
          .filter((a) => a.submittedCount > a.gradedCount)
          .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
          .slice(0, 5)
      : [];

  // Overall attendance rate for students (across all programs)
  const attendanceTotals = attendanceSummary.reduce(
    (acc, s) => {
      acc.present += s.present;
      acc.absent += s.absent;
      acc.late += s.late;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );
  const attendanceDenom =
    attendanceTotals.present + attendanceTotals.absent + attendanceTotals.late;
  const attendanceRate =
    attendanceDenom > 0
      ? (attendanceTotals.present + attendanceTotals.late) / attendanceDenom
      : 0;

  const firstName = user.name?.split(' ')[0] ?? user.name;
  const nextSession = upcomingSessions[0];

  return (
    <div className="space-y-6">
      {/* ---------------- Welcome banner ---------------- */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero px-5 py-6 sm:px-8 sm:py-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 w-56 h-56 rounded-full bg-accent opacity-70"
        />
        <span
          aria-hidden
          className="pointer-events-none hidden sm:block absolute right-40 bottom-4 w-24 h-16 text-muted opacity-40 bg-[radial-gradient(currentColor_1.3px,transparent_1.5px)] [background-size:16px_16px]"
        />
        {character && (
          <Character
            id={character}
            className="pointer-events-none hidden md:block absolute right-4 top-3 bottom-0 h-[calc(100%-0.75rem)] w-auto max-w-[30%]"
          />
        )}
        {heroArt && (
          // Artwork from Settings → Appearance (decorative)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroArt}
            alt=""
            aria-hidden
            className="pointer-events-none hidden md:block absolute right-0 bottom-0 h-[115%] max-w-[38%] object-contain object-right-bottom opacity-95"
          />
        )}
        <div className={`relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 ${character || heroArt ? 'md:pr-[30%]' : ''}`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted capitalize">
              {user.role} ·{' '}
              {formatDayMonth(new Date())}
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {nextSession
                ? <>Your next session is <span className="font-medium text-text">{nextSession.title}</span>.</>
                : 'No sessions scheduled right now.'}
            </p>
          </div>

          {nextSession && (
            <Link
              href={`/sessions/${nextSession.id}`}
              className="flex items-center gap-3 p-3 pr-4 bg-surface/90 backdrop-blur border border-border rounded-[var(--radius-lg)] shadow-sm hover:border-primary transition lg:max-w-sm"
            >
              <DateTile iso={nextSession.startsAt} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{nextSession.title}</p>
                <p className="text-xs text-muted truncate">
                  {nextSession.programName} · {fmtTime(nextSession.startsAt)}
                </p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ---------------- What needs you (role-aware) ---------------- */}
      <FocusStrip user={user} />

      {/* ---------------- Admin stats ---------------- */}
      {user.role === 'admin' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat label="Programs" value={programs.length} href="/admin/programs" icon={Icons.programs} />
          <Stat label="Users" value={allUsers.total} href="/admin/users" icon={Icons.users} />
          <Stat
            label="Mentors"
            value={allUsers.mentor}
            href="/admin/users?role=mentor"
            icon={Icons.mentor}
          />
          <Stat
            label="Students"
            value={allUsers.student}
            href="/admin/users?role=student"
            icon={Icons.student}
          />
        </div>
      )}

      {/* ---------------- Student attendance ---------------- */}
      {user.role === 'student' && attendanceDenom > 0 && (
        <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 flex flex-col sm:flex-row sm:items-center gap-5">
          <ProgressRing value={attendanceRate} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
              Your attendance
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {Math.round(attendanceRate * 100)}%
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="success">{attendanceTotals.present} present</Badge>
              <Badge tone="warning">{attendanceTotals.late} late</Badge>
              <Badge tone="danger">{attendanceTotals.absent} absent</Badge>
            </div>
          </div>
          <Link href="/attendance" className="btn-outline text-sm self-start sm:self-center">
            View details
          </Link>
        </section>
      )}

      {/* ---------------- Sessions + assignments ---------------- */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel
          title="Upcoming sessions"
          icon={Icons.calendar}
          action={<PanelLink href="/sessions">View all</PanelLink>}
          bodyClassName="p-3"
        >
          {upcomingSessions.length === 0 ? (
            <EmptyNote compact title="Nothing scheduled" text="New sessions will show up here." icon={Icons.calendar} />
          ) : (
            <div className="space-y-2">
              {upcomingSessions.map((s) => (
                <Link key={s.id} href={`/sessions/${s.id}`} className={rowCls}>
                  <div className="flex items-center gap-3 min-w-0">
                    <DateTile iso={s.startsAt} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted truncate">
                        {s.programName} · {fmt(s.startsAt)}
                      </p>
                    </div>
                  </div>
                  <Avatar name={s.mentorName} src={s.mentorAvatar} size={28} />
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title={user.role === 'student' ? 'Your assignments' : 'To grade'}
          icon={Icons.clipboard}
          action={<PanelLink href="/assignments">View all</PanelLink>}
          bodyClassName="p-3"
        >
          {user.role === 'student' ? (
            pendingForStudent.length === 0 ? (
              <EmptyNote compact title="Nothing pending 🎉" text="You're all caught up on assignments." icon={Icons.check} />
            ) : (
              <div className="space-y-2">
                {pendingForStudent.map((a) => {
                  const overdue = a.myState === 'overdue';
                  return (
                    <Link key={a.id} href={`/assignments/${a.id}`} className={rowCls}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-[var(--radius-md)] ${overdue ? 'bg-danger/10 text-danger' : 'bg-hero text-text'}`}>
                          {Icons.clipboard}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className={`text-xs truncate ${overdue ? 'text-danger' : 'text-muted'}`}>
                            {a.programName} · Due {fmt(a.dueAt)}
                          </p>
                        </div>
                      </div>
                      <Badge tone={overdue ? 'danger' : 'warning'}>{a.myState}</Badge>
                    </Link>
                  );
                })}
              </div>
            )
          ) : toGradeForMentor.length === 0 ? (
            <EmptyNote compact title="Nothing to grade" text="Submissions waiting for marks appear here." icon={Icons.check} />
          ) : (
            <div className="space-y-2">
              {toGradeForMentor.map((a) => (
                <Link key={a.id} href={`/assignments/${a.id}`} className={rowCls}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid place-items-center w-10 h-10 shrink-0 rounded-[var(--radius-md)] bg-hero text-text">
                      {Icons.clipboard}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted truncate">
                        {a.programName} · {a.submittedCount - a.gradedCount} to grade
                      </p>
                    </div>
                  </div>
                  <span className="grid place-items-center min-w-8 h-8 px-2 rounded-full bg-primary text-primary-fg text-xs font-semibold tabular-nums">
                    {a.submittedCount - a.gradedCount}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ---------------- Queries + programs ---------------- */}
      <div className={`grid gap-6 ${user.role === 'admin' ? 'lg:grid-cols-2' : ''}`}>
        <Panel
          title={user.role === 'student' ? 'Your open queries' : 'Open queries'}
          icon={Icons.chat}
          action={<PanelLink href="/queries">View all</PanelLink>}
          bodyClassName="p-3"
        >
          {openQueries.length === 0 ? (
            <EmptyNote
              compact
              icon={Icons.chat}
              title="No open threads"
              text={
                user.role === 'student'
                  ? 'Ask a question any time.'
                  : 'No open threads needing attention.'
              }
            />
          ) : (
            <div className="space-y-2">
              {openQueries.map((q) => (
                <Link key={q.id} href={`/queries/${q.id}`} className={rowCls}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={q.studentName} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{q.subject}</p>
                      <p className="text-xs text-muted truncate">
                        {q.programName} · {q.studentName}
                      </p>
                    </div>
                  </div>
                  <Badge tone="warning" className="shrink-0">
                    {q.messageCount} msg
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        {user.role === 'admin' && (
          <Panel
            title="Recent programs"
            icon={Icons.programs}
            action={<PanelLink href="/admin/programs">Manage</PanelLink>}
            bodyClassName="p-3"
          >
            {programs.length === 0 ? (
              <EmptyNote compact icon={Icons.programs} title="No programs yet" />
            ) : (
              <div className="space-y-2">
                {programs.slice(0, 5).map((p) => (
                  <Link key={p.id} href={`/admin/programs/${p.id}`} className={rowCls}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted">
                        {p.mentorCount} mentors · {p.studentCount} students
                      </p>
                    </div>
                    <Badge
                      dot
                      tone={
                        p.status === 'active'
                          ? 'success'
                          : p.status === 'archived'
                          ? 'muted'
                          : 'warning'
                      }
                    >
                      {p.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number;
  href?: string;
  icon?: React.ReactNode;
}) {
  const inner = (
    <div className="group h-full p-4 sm:p-5 bg-surface border border-border rounded-[var(--radius-lg)] hover:border-primary transition">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
        {icon && (
          <span className="grid place-items-center w-9 h-9 rounded-[var(--radius-md)] bg-hero text-text group-hover:bg-primary group-hover:text-primary-fg transition">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}