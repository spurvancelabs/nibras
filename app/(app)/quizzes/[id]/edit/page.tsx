// =============================================================================
// FILE: app/(app)/quizzes/[id]/edit/page.tsx   (NEW FILE)
// =============================================================================

import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-helpers';
import { getQuizForEditor, listManageablePrograms } from '@/lib/quizzes';
import { PageHeader } from '@/components/ui';
import QuizBuilder from '../../QuizBuilder';

export const dynamic = 'force-dynamic';

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole('admin', 'mentor');
  const { id } = await params;
  const [quiz, programs] = await Promise.all([getQuizForEditor(user.orgId, user, id), listManageablePrograms(user.orgId, user)]);
  if (!quiz) notFound();
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader back={{ href: `/quizzes/${id}`, label: quiz.title }} eyebrow="Quizzes" title="Edit quiz" />
      <QuizBuilder programs={programs} initial={quiz} />
    </div>
  );
}
