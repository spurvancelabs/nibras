// =============================================================================
// FILE: app/(app)/admin/courses/page.tsx   (NEW FILE)
// Manage video courses: stats + table. Program Administrators see every
// course; mentors (when allowed) see the ones they created or teach.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePermission } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { managedCourses } from '@/lib/courses';
import { PageHeader, Panel, EmptyNote, Alert } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import CoursesTable from './CoursesTable';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Manage courses' };

export default async function AdminCoursesPage() {
  const user = await requirePermission('courses.manage');
  const s = await getSettings();
  const rows = await managedCourses(user);
  const tiles = [
    { label: 'Published', value: rows.filter((r) => r.status === 'published').length },
    { label: 'Drafts', value: rows.filter((r) => r.status === 'draft').length },
    { label: 'Enrolments', value: rows.reduce((a, r) => a + r.enrolledCount, 0) },
    { label: 'Completions', value: rows.reduce((a, r) => a + r.completedCount, 0) },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Manage courses"
        subtitle="Recorded video lectures with explanations and resources. Make them free, Premium, or paid with tokens."
        actions={
          <>
            <Link href="/courses" className="btn-outline h-10 px-4 text-sm">
              Learner view
            </Link>
            <Link href="/admin/courses/new" className="btn-primary h-10 px-4 text-sm">
              <NavIcon name="plus" size={16} /> New course
            </Link>
          </>
        }
      />
      {s.featureCourses === false && <Alert tone="info">Courses are switched off in Settings → Features, so learners can’t see them yet.</Alert>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{t.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>
      {rows.length ? (
        <CoursesTable rows={rows} tokenIcon={s.tokenIcon} premiumName={s.premiumName || 'Premium'} />
      ) : (
        <Panel>
          <EmptyNote
            icon={<NavIcon name="courses" />}
            title="No courses yet"
            text="Create a course, add sections and lessons, upload videos or paste YouTube/Vimeo links, then publish."
            action={
              <Link href="/admin/courses/new" className="btn-primary">
                Create your first course
              </Link>
            }
          />
        </Panel>
      )}
    </div>
  );
}
