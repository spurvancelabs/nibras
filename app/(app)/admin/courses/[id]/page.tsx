// =============================================================================
// FILE: app/(app)/admin/courses/[id]/page.tsx   (NEW FILE)
// Course editor. `/admin/courses/new` starts a blank course.
// =============================================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { editorData, courseLearners, staffOptions, type CourseInput } from '@/lib/courses';
import { listPrograms } from '@/lib/programs';
import { PageHeader } from '@/components/ui';
import CourseEditor from './CourseEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit course' };

export default async function CourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('courses.manage');
  const { id } = await params;
  const s = await getSettings();
  const isNew = id === 'new';
  const data = isNew ? null : await editorData(user, id);
  if (!isNew && !data) notFound();

  const [programs, staff, learners] = await Promise.all([listPrograms(user.orgId), staffOptions(user.orgId), isNew ? Promise.resolve([]) : courseLearners(user, id)]);
  const initial: CourseInput = data
    ? { title: data.title, slug: data.slug, subtitle: data.subtitle, description: data.description, cover: data.cover, level: data.level, category: data.category, status: data.status, access: data.access, tokenPrice: data.tokenPrice, programIds: data.programIds, instructorIds: data.instructorIds, sections: data.sections }
    : { title: '', slug: '', subtitle: '', description: '', cover: '', level: 'all', category: '', status: 'draft', access: 'free', tokenPrice: 0, programIds: [], instructorIds: [user.id], sections: [{ id: 'intro01', title: 'Getting started', lessons: [] }] };

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: '/admin/courses', label: 'All courses' }} eyebrow="Courses" title={data?.title || 'New course'} subtitle={isNew ? 'Fill in the details, add lessons, then publish.' : `${data!.enrolledCount} enrolled`} />
      <CourseEditor
        key={id}
        initial={initial}
        id={isNew ? null : id}
        programs={programs.map((p) => ({ id: p.id, name: p.name }))}
        staff={staff.map((m) => ({ id: m.id, name: `${m.name}${m.role === 'admin' ? ' (admin)' : ''}` }))}
        learners={learners}
        premiumOn={s.premiumEnabled}
        tokensOn={s.tokensEnabled}
        tokenName={s.tokenName}
        tokenIcon={s.tokenIcon}
        premiumName={s.premiumName || 'Premium'}
        canChooseInstructors={user.role === 'admin'}
      />
    </div>
  );
}
