// =============================================================================
// FILE: app/(app)/sessions/page.tsx
// Sessions list: upcoming (cards) + past (list). Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listSessionsForUser } from '@/lib/sessions';
import Avatar from '@/components/Avatar';
import {
  PageHeader,
  SessionStatusBadge,
  Badge,
  EmptyNote,
  DateTile,
  Icons,
} from '@/components/ui';

export const dynamic = 'force-dynamic';

type SessionRow = Awaited<ReturnType<typeof listSessionsForUser>>[number];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtTimeRange(startIso: string, endIso?: string) {
  const t = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return endIso ? `${t(startIso)} – ${t(endIso)}` : t(startIso);
}

export default async function SessionsPage() {
  const user = await requireAuth();
  const sessions = await listSessionsForUser(user.orgId, user);

  const now = Date.now();
  const upcoming = sessions
    .filter((s) => new Date(s.startsAt).getTime() >= now && s.status === 'scheduled')
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = sessions
    .filter((s) => new Date(s.startsAt).getTime() < now || s.status !== 'scheduled')
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));

  const canCreate = user.role === 'admin' || user.role === 'mentor';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learning"
        title="Sessions"
        subtitle={
          <span className="inline-flex flex-wrap gap-2">
            <Badge tone="primary">{upcoming.length} upcoming</Badge>
            <Badge tone="muted">{past.length} past</Badge>
          </span>
        }
        actions={
          canCreate && (
            <Link href="/sessions/new" className="btn-primary inline-flex items-center gap-2 h-10">
              {Icons.plus}
              New session
            </Link>
          )
        }
      />

      {/* Upcoming */}
      <section className="space-y-3">
        <SectionTitle>Upcoming</SectionTitle>
        {upcoming.length === 0 ? (
          <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
            <EmptyNote icon={Icons.calendar} title="No upcoming sessions." text="Scheduled sessions will appear here." />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcoming.map((s) => (
              <UpcomingCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      <section className="space-y-3">
        <SectionTitle>Past</SectionTitle>
        {past.length === 0 ? (
          <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
            <EmptyNote icon={Icons.clock} title="No past sessions yet." />
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] divide-y divide-border overflow-hidden">
            {past.map((s) => (
              <PastRow key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
      {children}
    </h2>
  );
}

function UpcomingCard({ s }: { s: SessionRow }) {
  return (
    <Link
      href={`/sessions/${s.id}`}
      className="group flex flex-col p-4 bg-surface border border-border rounded-[var(--radius-lg)] hover:border-primary hover:-translate-y-0.5 transition"
    >
      <div className="flex items-start gap-3">
        <DateTile iso={s.startsAt} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium leading-snug line-clamp-2">{s.title}</h3>
            <SessionStatusBadge status={s.status} />
          </div>
          <p className="mt-1 text-xs text-muted truncate">{s.programName}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        {Icons.clock}
        <span>{fmtTimeRange(s.startsAt, s.endsAt)}</span>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={s.mentorName} src={s.mentorAvatar} size={24} />
          <span className="text-xs text-muted truncate">{s.mentorName}</span>
        </div>
        <span className="text-xs font-medium text-text opacity-0 group-hover:opacity-100 transition">
          Open →
        </span>
      </div>
    </Link>
  );
}

function PastRow({ s }: { s: SessionRow }) {
  return (
    <Link
      href={`/sessions/${s.id}`}
      className="flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-hero/40 transition"
    >
      <DateTile iso={s.startsAt} muted />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-medium truncate max-w-full">{s.title}</h3>
          <SessionStatusBadge status={s.status} />
        </div>
        <p className="mt-0.5 text-xs text-muted truncate">
          {s.programName} · {fmtDate(s.startsAt)}
        </p>
        <div className="mt-1.5 flex items-center gap-2 sm:hidden">
          <Avatar name={s.mentorName} src={s.mentorAvatar} size={18} />
          <span className="text-xs text-muted truncate">{s.mentorName}</span>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <Avatar name={s.mentorName} src={s.mentorAvatar} size={24} />
        <span className="text-xs text-muted max-w-[8rem] truncate">{s.mentorName}</span>
      </div>
      {s.recordingUrl && (
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hero text-[11px] font-medium">
          {Icons.video}
          <span className="hidden sm:inline">Recording</span>
        </span>
      )}
    </Link>
  );
}