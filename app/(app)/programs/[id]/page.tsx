// =============================================================================
// FILE: app/(app)/programs/[id]/page.tsx   (NEW FILE)
// Program page for members and staff: hero, progress (students), certificate,
// week-by-week syllabus timeline, outcomes, sessions, assignments, quizzes.
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getProgramHub, getSyllabus } from '@/lib/program-hub';
import { listQuizzes } from '@/lib/quizzes';
import { listCertificates } from '@/lib/certificates';
import { getSettings } from '@/lib/settings';
import { formatDate, formatDateTimeWeekday, formatTime } from '@/lib/time';
import Avatar from '@/components/Avatar';
import { Panel, PanelLink, Badge, EmptyNote, ProgressRing, DateTile, SessionStatusBadge, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ProgramHubPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const [hub, settings] = await Promise.all([getProgramHub(user.orgId, user, id), getSettings()]);
  if (!hub) notFound();
  const staff = hub.access === 'manage';

  const [syllabus, quizzes, certs] = await Promise.all([
    settings.featureSyllabus ? getSyllabus(user.orgId, id) : Promise.resolve(null),
    settings.featureQuizzes ? listQuizzes(user.orgId, user, { programId: id }) : Promise.resolve([]),
    settings.featureCertificates && user.role === 'student' ? listCertificates(user.orgId, user, id) : Promise.resolve([]),
  ]);
  const myCert = certs.find((c) => c.status === 'issued');
  const p = hub.program;
  const now = Date.now();
  const sessionById = new Map(hub.sessions.map((s) => [s.id, s]));
  const nextSession = hub.sessions.find((s) => new Date(s.startsAt).getTime() >= now && s.status === 'scheduled');

  return (
    <div className="space-y-6">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-accent opacity-60" />
        <span aria-hidden className="pointer-events-none absolute right-24 bottom-[-60px] w-40 h-40 rounded-full bg-accent opacity-40" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0 max-w-3xl">
            <Link href="/programs" className="text-sm text-muted hover:text-text">← {user.role === 'admin' ? 'Programs' : 'My programs'}</Link>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
              {p.startDate ? formatDate(p.startDate) : 'Program'}
              {p.endDate ? ` – ${formatDate(p.endDate)}` : ''} · {hub.sessions.length} sessions · {p.studentCount} students
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">{p.name}</h1>
            {p.description && <p className="mt-3 text-sm sm:text-base text-muted whitespace-pre-line">{p.description}</p>}
            {hub.mentors.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {hub.mentors.slice(0, 5).map((m) => (
                    <span key={m.id} className="rounded-full ring-2 ring-[var(--color-hero)]">
                      <Avatar name={m.name} src={m.avatar} size={30} />
                    </span>
                  ))}
                </div>
                <span className="text-xs text-muted">Mentors: {hub.mentors.map((m) => m.name).join(', ')}</span>
              </div>
            )}
          </div>
          {staff && (
            <div className="flex flex-wrap gap-2">
              {settings.featureSyllabus && <Link href={`/programs/${id}/syllabus`} className="btn-primary h-10 inline-flex items-center gap-2">{Icons.edit} Edit syllabus</Link>}
              {settings.featureGradebook && <Link href={`/programs/${id}/gradebook`} className="btn-outline h-10 inline-flex items-center">Gradebook</Link>}
              {settings.featureCertificates && <Link href={`/programs/${id}/certificates`} className="btn-outline h-10 inline-flex items-center">Certificates</Link>}
              {settings.featureQuizzes && <Link href={`/quizzes/new?program=${id}`} className="btn-outline h-10 inline-flex items-center">New quiz</Link>}
              {user.role === 'admin' && <Link href={`/admin/programs/${id}`} className="btn-outline h-10 inline-flex items-center">Admin</Link>}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Student progress ---------------- */}
      {hub.progress && (
        <section className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Attendance', v: hub.progress.attendance.percent, sub: `${hub.progress.attendance.present + hub.progress.attendance.late} of ${hub.progress.attendance.present + hub.progress.attendance.late + hub.progress.attendance.absent} sessions` },
            { label: 'Assignments', v: hub.progress.assignments.percent, sub: `${hub.progress.assignments.submitted}/${hub.progress.assignments.total} submitted · ${hub.progress.assignments.graded} graded` },
            { label: 'Quizzes', v: hub.progress.quizzes.percent, sub: `${hub.progress.quizzes.attempted}/${hub.progress.quizzes.total} taken` },
          ].map((x) => (
            <div key={x.label} className="flex items-center gap-4 bg-surface border border-border rounded-[var(--radius-lg)] p-4">
              <ProgressRing value={(x.v ?? 0) / 100} size={72} stroke={7} label={x.v === null ? '—' : `${Math.round(x.v)}%`} />
              <div>
                <p className="font-semibold">{x.label}</p>
                <p className="text-xs text-muted">{x.sub}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {myCert && (
        <Link href={`/certificates/${myCert.id}`} className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-success/40 bg-success/10 p-4 hover:border-success transition">
          <span className="text-3xl" aria-hidden>🎓</span>
          <span>
            <span className="block font-semibold">Your certificate is ready</span>
            <span className="block text-xs text-muted">No. {myCert.certNo} · issued {formatDate(myCert.issuedAt)} — view, download or share</span>
          </span>
        </Link>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ---------------- Syllabus ---------------- */}
        <div className="space-y-6 min-w-0">
          {syllabus && (
            <Panel
              title="Syllabus"
              icon={Icons.programs}
              action={staff ? <PanelLink href={`/programs/${id}/syllabus`}>Edit</PanelLink> : undefined}
              bodyClassName="p-5 sm:p-6"
            >
              {!syllabus.overview && syllabus.modules.length === 0 ? (
                <EmptyNote compact title="No syllabus yet." text={staff ? 'Add the week-by-week plan so students know what is coming.' : 'Your mentors will add it soon.'} />
              ) : (
                <div className="space-y-6">
                  {syllabus.overview && <p className="text-sm whitespace-pre-line leading-relaxed">{syllabus.overview}</p>}

                  {(syllabus.outcomes.length > 0 || syllabus.prerequisites.length > 0) && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {syllabus.outcomes.length > 0 && (
                        <div className="rounded-[var(--radius-md)] bg-hero p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">You will be able to</p>
                          <ul className="space-y-1.5 text-sm">
                            {syllabus.outcomes.map((o, i) => (
                              <li key={i} className="flex gap-2"><span className="text-success">✓</span>{o}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {syllabus.prerequisites.length > 0 && (
                        <div className="rounded-[var(--radius-md)] border border-border p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Before you start</p>
                          <ul className="space-y-1.5 text-sm">
                            {syllabus.prerequisites.map((o, i) => (
                              <li key={i} className="flex gap-2"><span className="text-muted">•</span>{o}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {syllabus.modules.length > 0 && (
                    <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {syllabus.modules.map((m, i) => {
                        const linked = m.sessionIds.map((sid) => sessionById.get(sid)).filter(Boolean) as typeof hub.sessions;
                        const done = linked.length > 0 && linked.every((s) => new Date(s.endsAt).getTime() < now);
                        return (
                          <li key={m.id ?? i} className="relative pl-11">
                            <span
                              className={`absolute left-0 top-0 grid place-items-center w-8 h-8 rounded-full text-xs font-bold ring-4 ring-[var(--color-surface)] ${
                                done ? 'bg-success text-white' : 'bg-primary text-primary-fg'
                              }`}
                            >
                              {done ? '✓' : i + 1}
                            </span>
                            <div className="rounded-[var(--radius-md)] border border-border p-4 hover:border-primary/60 transition">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h3 className="font-semibold">{m.title}</h3>
                                {m.weekLabel && <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{m.weekLabel}</span>}
                              </div>
                              {m.summary && <p className="mt-1.5 text-sm text-muted whitespace-pre-line">{m.summary}</p>}
                              {m.topics.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {m.topics.map((t, k) => (
                                    <span key={k} className="px-2.5 py-1 rounded-full bg-hero text-xs">{t}</span>
                                  ))}
                                </div>
                              )}
                              {linked.length > 0 && (
                                <ul className="mt-3 space-y-1 text-xs">
                                  {linked.map((s) => (
                                    <li key={s.id}>
                                      <Link href={`/sessions/${s.id}`} className="inline-flex items-center gap-1.5 hover:underline">
                                        {Icons.calendar} {s.title} · {formatDateTimeWeekday(s.startsAt)}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {m.resources.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {m.resources.map((r, k) => (
                                    <a key={k} href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[var(--radius-md)] border border-border hover:bg-hero">
                                      {Icons.link} {r.title}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {syllabus.assessment && (
                    <div className="rounded-[var(--radius-md)] border border-dashed border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">How you are assessed</p>
                      <p className="text-sm whitespace-pre-line">{syllabus.assessment}</p>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          {/* ---------------- Assignments ---------------- */}
          <Panel title={`Assignments (${hub.assignments.length})`} icon={Icons.clipboard} action={<PanelLink href="/assignments">All</PanelLink>} bodyClassName="p-0">
            {hub.assignments.length === 0 ? (
              <EmptyNote compact title="No assignments yet." />
            ) : (
              <ul className="divide-y divide-border">
                {hub.assignments.map((a) => (
                  <li key={a.id}>
                    <Link href={`/assignments/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-hero/40">
                      <span className="text-sm font-medium truncate">{a.title}</span>
                      <span className="text-xs text-muted shrink-0">{a.dueAt ? `due ${formatDateTimeWeekday(a.dueAt)}` : ''}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {settings.featureQuizzes && (
            <Panel title={`Quizzes (${quizzes.length})`} icon={Icons.check} action={<PanelLink href={`/quizzes?program=${id}`}>All</PanelLink>} bodyClassName="p-0">
              {quizzes.length === 0 ? (
                <EmptyNote compact title="No quizzes yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {quizzes.map((q) => (
                    <li key={q.id}>
                      <Link href={`/quizzes/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-hero/40">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate">{q.title}</span>
                          <span className="block text-xs text-muted">
                            {q.questionCount} questions{q.timeLimitMin ? ` · ${q.timeLimitMin} min` : ''}
                            {q.sessionTitle ? ` · ${q.sessionTitle}` : ''}
                          </span>
                        </span>
                        {staff ? (
                          <Badge tone={q.status === 'published' ? 'success' : q.status === 'closed' ? 'danger' : 'muted'}>{q.status}</Badge>
                        ) : q.my?.bestPercent !== null && q.my?.bestPercent !== undefined ? (
                          <Badge tone={q.my.bestPercent >= q.passPercent ? 'success' : 'danger'}>{q.my.bestPercent}%</Badge>
                        ) : q.my?.canStart ? (
                          <Badge tone="primary">open</Badge>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>

        {/* ---------------- Sessions (side) ---------------- */}
        <aside className="space-y-6">
          {nextSession && (
            <div className="rounded-[var(--radius-lg)] bg-primary text-primary-fg p-5">
              <p className="text-xs uppercase tracking-wider opacity-80">Next session</p>
              <p className="mt-1 font-semibold">{nextSession.title}</p>
              <p className="text-sm opacity-90">{formatDateTimeWeekday(nextSession.startsAt)} – {formatTime(nextSession.endsAt)}</p>
              <Link href={`/sessions/${nextSession.id}`} className="mt-3 inline-flex text-sm font-medium underline underline-offset-2">Open session →</Link>
            </div>
          )}
          <Panel title={`Sessions (${hub.sessions.length})`} icon={Icons.calendar} bodyClassName="p-0">
            {hub.sessions.length === 0 ? (
              <EmptyNote compact title="No sessions yet." />
            ) : (
              <ul className="divide-y divide-border max-h-[640px] overflow-y-auto">
                {hub.sessions.map((s) => (
                  <li key={s.id}>
                    <Link href={`/sessions/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-hero/40">
                      <DateTile iso={s.startsAt} muted={new Date(s.endsAt).getTime() < now} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{s.title}</span>
                        <span className="block text-xs text-muted">{formatTime(s.startsAt)} – {formatTime(s.endsAt)}</span>
                      </span>
                      <SessionStatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
