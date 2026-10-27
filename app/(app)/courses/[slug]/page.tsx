// =============================================================================
// FILE: app/(app)/courses/[slug]/page.tsx   (NEW FILE)
// Course overview: description, instructors, curriculum (with preview
// lessons), progress and the enrol / continue button.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { coursePage } from '@/lib/courses';
import { formatDuration } from '@/lib/courses-core';
import { PageHeader, Panel } from '@/components/ui';
import Avatar from '@/components/Avatar';
import NavIcon from '@/components/NavIcon';
import { AccessBadge, RichText, levelLabel } from '../CourseBits';
import EnrollButton from './EnrollButton';

export const dynamic = 'force-dynamic';

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
export const metadata: Metadata = { title: 'Course' };

export default async function CoursePageView({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAuth();
  const { slug } = await params;
  const s = await getSettings();
  if (s.featureCourses === false) notFound();
  const data = await coursePage(user, safeDecode(slug));
  if (!data) notFound();
  const { course: c, curriculum, gate, manage, progress } = data;
  const premiumName = s.premiumName || 'Premium';
  const first = curriculum[0]?.lessons[0]?.id;
  const resumeId = progress.lastLessonId || first;
  const nextUndone = curriculum.flatMap((x) => x.lessons).find((l) => !l.done)?.id ?? resumeId;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/courses', label: 'All courses' }}
        eyebrow={[c.category, levelLabel(c.level)].filter(Boolean).join(' · ')}
        title={c.title}
        subtitle={c.subtitle}
        actions={
          manage ? (
            <Link href={`/admin/courses/${c.id}`} className="btn-outline h-10 px-4 text-sm">
              <NavIcon name="settings" size={16} /> Edit course
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-6 min-w-0">
          {c.cover && (
            <div className="aspect-video overflow-hidden rounded-[var(--radius-lg)] border border-border bg-hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.cover} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {c.description && (
            <Panel title="About this course">
              <RichText text={c.description} />
            </Panel>
          )}
          <Panel title="Curriculum" action={<span className="text-xs text-muted">{c.lessonCount} lessons{c.totalDuration ? ` · ${formatDuration(c.totalDuration)}` : ''}</span>} bodyClassName="divide-y divide-border">
            {curriculum.map((sec, si) => (
              <details key={sec.id} open={si < 3} className="group">
                <summary className="flex items-center justify-between gap-3 px-5 py-3 cursor-pointer list-none hover:bg-hero/60">
                  <span className="font-medium">
                    <span className="text-muted mr-2 tabular-nums">{si + 1}.</span>
                    {sec.title}
                  </span>
                  <span className="text-xs text-muted shrink-0">
                    {sec.lessons.filter((l) => l.done).length}/{sec.lessons.length}
                    <span className="inline-block ml-2 transition-transform group-open:rotate-180" aria-hidden>
                      ▾
                    </span>
                  </span>
                </summary>
                <ul className="pb-2">
                  {sec.lessons.map((l) => {
                    const open = gate.enrolled || manage || l.preview;
                    const body = (
                      <>
                        <span className={`grid place-items-center w-6 h-6 rounded-full text-[11px] shrink-0 ${l.done ? 'bg-success text-white' : 'bg-hero text-muted'}`} aria-hidden>
                          {l.done ? '✓' : l.type === 'video' ? '▶' : '≡'}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{l.title}</span>
                        {l.preview && !gate.enrolled && <span className="text-[11px] font-semibold text-primary">Preview</span>}
                        {!open && <NavIcon name="lock" size={14} />}
                        {l.duration > 0 && <span className="text-xs text-muted tabular-nums">{formatDuration(l.duration)}</span>}
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {open ? (
                          <Link href={`/courses/${c.slug}/learn/${l.id}`} prefetch={false} className="flex items-center gap-3 px-5 py-2 text-sm hover:bg-hero/60">
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-5 py-2 text-sm text-muted">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
            {!curriculum.length && <p className="px-5 py-6 text-sm text-muted">No lessons yet.</p>}
          </Panel>
        </div>

        <aside className="space-y-4 order-first lg:order-none lg:sticky lg:top-20">
          <section className="p-5 bg-surface border border-border rounded-[var(--radius-lg)] space-y-4">
            <div className="flex items-center justify-between">
              <AccessBadge access={c.access} price={c.tokenPrice} tokenIcon={s.tokenIcon} premiumName={premiumName} />
              <span className="text-xs text-muted">{c.enrolledCount} learner{c.enrolledCount === 1 ? '' : 's'}</span>
            </div>
            {gate.enrolled ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{c.completed ? 'Completed 🎉' : 'Your progress'}</span>
                    <span className="tabular-nums text-muted">
                      {progress.done}/{progress.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-hero overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                {nextUndone && (
                  <Link href={`/courses/${c.slug}/learn/${nextUndone}`} className="btn-primary h-11 px-6 w-full justify-center">
                    {progress.done ? (c.completed ? 'Watch again' : 'Continue learning') : 'Start learning'}
                  </Link>
                )}
              </>
            ) : manage ? (
              first ? (
                <Link href={`/courses/${c.slug}/learn/${first}`} className="btn-primary h-11 px-6 w-full justify-center">
                  Preview as staff
                </Link>
              ) : null
            ) : (
              <EnrollButton
                courseId={c.id}
                title={c.title}
                reason={gate.reason}
                price={gate.price}
                balance={user.tokens ?? 0}
                tokenName={s.tokenName}
                tokenIcon={s.tokenIcon}
                premiumName={premiumName}
                premiumFree={gate.premiumFree}
                canEnroll={gate.canEnroll}
              />
            )}
            <ul className="text-sm space-y-1.5 text-muted">
              <li>▶ {c.lessonCount} lessons</li>
              {c.totalDuration > 0 && <li>⏱ {formatDuration(c.totalDuration)} of content</li>}
              <li>📶 {levelLabel(c.level)}</li>
              {s.tokensEnabled && (s.tokenRules?.courseComplete ?? 0) > 0 && (
                <li>
                  {s.tokenIcon} Earn {s.tokenRules.courseComplete} {s.tokenName} when you finish
                </li>
              )}
            </ul>
          </section>
          {c.instructors.length > 0 && (
            <Panel title={c.instructors.length > 1 ? 'Instructors' : 'Instructor'}>
              <ul className="space-y-3">
                {c.instructors.map((i) => (
                  <li key={i.id} className="flex items-center gap-3">
                    <Avatar name={i.name} src={i.avatar} size={36} />
                    <span className="font-medium text-sm">{i.name}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
