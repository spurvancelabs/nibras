// =============================================================================
// FILE: app/(app)/courses/page.tsx   (NEW FILE)
// Course catalog: "Continue learning" + all published courses the user can
// see, with search and filters (level, free / premium / tokens).
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAuth, hasPermission } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { catalog } from '@/lib/courses';
import { PageHeader, Panel, EmptyNote } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { CourseCardView } from './CourseBits';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Courses' };

const LEVELS = [
  { id: '', label: 'Any level' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; level?: string; access?: string }> }) {
  const user = await requireAuth();
  const s = await getSettings();
  const sp = await searchParams;
  if (s.featureCourses === false) {
    return (
      <div className="space-y-6">
        <PageHeader title="Courses" />
        <Panel>
          <EmptyNote title="Courses are switched off" text="Your organisation hasn't turned on video courses." />
        </Panel>
      </div>
    );
  }
  const q = (sp.q ?? '').slice(0, 80);
  const level = sp.level ?? '';
  const access = sp.access ?? '';
  const [{ courses, mine }, canManage] = await Promise.all([catalog(user, { q, level, access }), user.role === 'student' ? Promise.resolve(false) : hasPermission(user, 'courses.manage')]);
  const premiumName = s.premiumName || 'Premium';
  const accessOpts = [
    { id: '', label: 'All' },
    { id: 'free', label: 'Free' },
    ...(s.premiumEnabled ? [{ id: 'premium', label: premiumName }] : []),
    ...(s.tokensEnabled ? [{ id: 'tokens', label: s.tokenName }] : []),
  ];
  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(level ? { level } : {}), ...(access ? { access } : {}), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const str = p.toString();
    return `/courses${str ? `?${str}` : ''}`;
  };
  const inProgress = mine.filter((c) => !c.completed).slice(0, 3);
  const filtered = !!(q || level || access);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learning"
        title="Courses"
        subtitle="Recorded lectures you can watch at your own pace."
        actions={
          canManage ? (
            <Link href="/admin/courses" className="btn-outline h-10 px-4 text-sm">
              <NavIcon name="settings" size={16} /> Manage courses
            </Link>
          ) : undefined
        }
      />

      {inProgress.length > 0 && !filtered && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Continue learning</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((c) => (
              <CourseCardView key={c.id} c={c} tokenIcon={s.tokenIcon} premiumName={premiumName} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <form action="/courses" className="flex-1 flex gap-2" role="search">
            {level && <input type="hidden" name="level" value={level} />}
            {access && <input type="hidden" name="access" value={access} />}
            <label className="sr-only" htmlFor="course-q">
              Search courses
            </label>
            <input id="course-q" name="q" defaultValue={q} placeholder="Search courses…" className="input h-10 flex-1" maxLength={80} />
            <button className="btn-outline h-10 px-4 text-sm">Search</button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => (
              <Link key={l.id} href={link({ level: l.id })} aria-current={level === l.id ? 'true' : undefined} className={`h-8 px-3 inline-flex items-center rounded-full border text-xs font-medium transition-colors ${level === l.id ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'}`}>
                {l.label}
              </Link>
            ))}
            {accessOpts.length > 2 && <span className="w-px bg-border mx-1" aria-hidden />}
            {accessOpts.length > 2 &&
              accessOpts.map((a) => (
                <Link key={a.id || 'all'} href={link({ access: a.id })} aria-current={access === a.id ? 'true' : undefined} className={`h-8 px-3 inline-flex items-center rounded-full border text-xs font-medium transition-colors ${access === a.id ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'}`}>
                  {a.label}
                </Link>
              ))}
          </div>
        </div>

        {courses.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((c) => (
              <CourseCardView key={c.id} c={c} tokenIcon={s.tokenIcon} premiumName={premiumName} />
            ))}
          </div>
        ) : (
          <Panel>
            <EmptyNote
              icon={<NavIcon name="courses" />}
              title={filtered ? 'No courses match' : 'No courses yet'}
              text={filtered ? 'Try another search or filter.' : canManage ? 'Create the first course — upload videos, add explanations and resources.' : 'New courses will show up here.'}
              action={
                filtered ? (
                  <Link href="/courses" className="btn-outline">
                    Clear filters
                  </Link>
                ) : canManage ? (
                  <Link href="/admin/courses/new" className="btn-primary">
                    Create a course
                  </Link>
                ) : undefined
              }
            />
          </Panel>
        )}
      </section>

      {mine.some((c) => c.completed) && !filtered && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Completed</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mine
              .filter((c) => c.completed)
              .map((c) => (
                <CourseCardView key={c.id} c={c} tokenIcon={s.tokenIcon} premiumName={premiumName} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
