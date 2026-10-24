// =============================================================================
// FILE: app/(app)/programs/[id]/syllabus/page.tsx   (NEW FILE)
// =============================================================================

import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getProgramHub, getSyllabus } from '@/lib/program-hub';
import { PageHeader } from '@/components/ui';
import SyllabusEditor from './SyllabusEditor';

export const dynamic = 'force-dynamic';

export default async function SyllabusPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const hub = await getProgramHub(user.orgId, user, id);
  if (!hub || hub.access !== 'manage') notFound();
  const syllabus = await getSyllabus(user.orgId, id);
  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader back={{ href: `/programs/${id}`, label: hub.program.name }} eyebrow="Syllabus" title="Edit syllabus" subtitle="Students see this on the program page." />
      <SyllabusEditor programId={id} initial={syllabus} sessions={hub.sessions.map((s) => ({ id: s.id, title: s.title, startsAt: s.startsAt }))} />
    </div>
  );
}
