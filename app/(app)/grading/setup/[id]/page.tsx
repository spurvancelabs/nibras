// =============================================================================
// FILE: app/(app)/grading/setup/[id]/page.tsx   (NEW FILE)
// Rubric & AI setup for one assignment (mentors of the program, admins).
// =============================================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth-helpers';
import { getSetup } from '@/lib/grading';
import { PageHeader } from '@/components/ui';
import SetupForm from './SetupForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rubric & AI setup' };

export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('grading.review');
  const { id } = await params;
  const setup = await getSetup(user, id);
  if (!setup) notFound();
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        back={{ href: `/grading?assignment=${id}`, label: 'Grading queue' }}
        eyebrow="Rubric & AI setup"
        title={setup.assignment.title}
        subtitle={`Out of ${setup.assignment.maxMarks} marks. The rubric helps you and the AI grade consistently; learners never see the reference answer.`}
      />
      <SetupForm assignmentId={id} maxMarks={setup.assignment.maxMarks} initial={{ rubric: setup.rubric, referenceAnswer: setup.referenceAnswer, guidance: setup.guidance, aiEnabled: setup.aiEnabled }} />
    </div>
  );
}
