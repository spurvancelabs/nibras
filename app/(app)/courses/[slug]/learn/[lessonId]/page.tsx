// =============================================================================
// FILE: app/(app)/courses/[slug]/learn/[lessonId]/page.tsx   (NEW FILE)
// Lesson view: video, explanation, downloadable resources and the course
// outline. Only enrolled learners, course staff, or "preview" lessons.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { lessonPage } from '@/lib/courses';
import { formatDuration, parseVideo } from '@/lib/courses-core';
import { Panel, FileList, FileRow, EmptyNote, DownloadIcon } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { RichText } from '../../../CourseBits';
import LessonPlayer from './LessonPlayer';

export const dynamic = 'force-dynamic';

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
export const metadata: Metadata = { title: 'Lesson' };

export default async function LessonView({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const user = await requireAuth();
  const { slug, lessonId } = await params;
  const s = await getSettings();
  if (s.featureCourses === false) notFound();
  const data = await lessonPage(user, safeDecode(slug), lessonId.slice(0, 40));
  if (!data) notFound();
  if (data === 'locked') {
    return (
      <div className="max-w-xl mx-auto pt-10">
        <Panel>
          <EmptyNote
            icon={<NavIcon name="lock" />}
            title="Enrol to watch this lesson"
            text="This lesson is part of the course. Enrol to unlock all lessons, explanations and resources."
            action={
              <Link href={`/courses/${encodeURIComponent(slug)}`} className="btn-primary">
                See the course
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }
  const { course, lesson, nav, curriculum, progress, enrolled, manage } = data;
  const done = curriculum.some((sec) => sec.lessons.some((l) => l.id === lesson.id && l.done));
  const courseReward = s.tokensEnabled ? s.tokenRules?.courseComplete ?? 0 : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px] items-start">
      <div className="space-y-5 min-w-0">
        <div className="space-y-1">
          <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
            ← {course.title}
          </Link>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{lesson.sectionTitle}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          {!enrolled && (
            <p className="text-xs text-muted">{manage ? 'Staff preview — progress is not tracked.' : 'Free preview lesson.'}</p>
          )}
        </div>

        <LessonPlayer
          courseId={course.id}
          slug={course.slug}
          lessonId={lesson.id}
          title={lesson.title}
          video={lesson.type === 'video' ? parseVideo(lesson.videoUrl) : { kind: 'none' }}
          done={done}
          enrolled={enrolled}
          next={nav.next}
          tokenNote={courseReward ? `+${courseReward} ${s.tokenName}` : ''}
        />

        {lesson.body.trim() && (
          <Panel title={lesson.type === 'article' ? 'Lesson' : 'Explanation'}>
            <RichText text={lesson.body} />
          </Panel>
        )}

        {lesson.resources.length > 0 && (
          <Panel title="Resources" icon={<NavIcon name="assignments" size={16} />} bodyClassName="p-3">
            <FileList>
              {lesson.resources.map((r, i) => (
                <FileRow key={i} name={r.title || 'Resource'} format={r.format} size={r.size}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn-outline h-8 px-3 text-xs" aria-label={`Open ${r.title}`}>
                    {DownloadIcon} Open
                  </a>
                </FileRow>
              ))}
            </FileList>
          </Panel>
        )}

        <div className="flex justify-between gap-3 pt-2">
          {nav.prev ? (
            <Link href={`/courses/${course.slug}/learn/${nav.prev.id}`} className="btn-ghost h-10 px-3 text-sm min-w-0">
              ← <span className="truncate">{nav.prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>

      <aside className="xl:sticky xl:top-20 space-y-3">
        {enrolled && (
          <div className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium">{progress.completed ? 'Completed 🎉' : 'Progress'}</span>
              <span className="text-muted tabular-nums">{progress.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-hero overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progress.percent}%`, transition: 'width 400ms ease' }} />
            </div>
          </div>
        )}
        <nav aria-label="Course outline" className="bg-surface border border-border rounded-[var(--radius-lg)] max-h-[70vh] overflow-y-auto overscroll-contain">
          {curriculum.map((sec, si) => (
            <div key={sec.id} className="border-b border-border last:border-0">
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {si + 1}. {sec.title}
              </p>
              <ul className="pb-2">
                {sec.lessons.map((l) => {
                  const current = l.id === lesson.id;
                  const open = enrolled || manage || l.preview;
                  return (
                    <li key={l.id}>
                      {open ? (
                        <Link
                          href={`/courses/${course.slug}/learn/${l.id}`}
                          prefetch={false}
                          aria-current={current ? 'page' : undefined}
                          className={`flex items-center gap-2.5 px-4 py-1.5 text-sm ${current ? 'bg-hero font-medium' : 'hover:bg-hero/60'}`}
                        >
                          <span className={`grid place-items-center w-5 h-5 rounded-full text-[10px] shrink-0 ${l.done ? 'bg-success text-white' : current ? 'bg-primary text-primary-fg' : 'bg-hero text-muted'}`} aria-hidden>
                            {l.done ? '✓' : l.type === 'video' ? '▶' : '≡'}
                          </span>
                          <span className="flex-1 min-w-0 truncate">{l.title}</span>
                          {l.duration > 0 && <span className="text-[11px] text-muted tabular-nums">{formatDuration(l.duration)}</span>}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2.5 px-4 py-1.5 text-sm text-muted">
                          <NavIcon name="lock" size={12} />
                          <span className="flex-1 min-w-0 truncate">{l.title}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
