// =============================================================================
// FILE: app/(app)/quizzes/new/page.tsx   (NEW FILE)
// =============================================================================

import { requireRole } from '@/lib/auth-helpers';
import { listManageablePrograms } from '@/lib/quizzes';
import { PageHeader, EmptyNote } from '@/components/ui';
import QuizBuilder from '../QuizBuilder';

export const dynamic = 'force-dynamic';

export default async function NewQuizPage({ searchParams }: { searchParams: Promise<{ program?: string; session?: string }> }) {
  const user = await requireRole('admin', 'mentor');
  const sp = await searchParams;
  const programs = await listManageablePrograms(user.orgId, user);
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader back={{ href: '/quizzes', label: 'Quizzes' }} eyebrow="Quizzes" title="New quiz" subtitle="Saved as a draft until you publish it." />
      {programs.length === 0 ? (
        <EmptyNote title="No programs yet." text="You can create quizzes for programs you mentor." />
      ) : (
        <QuizBuilder
          programs={programs}
          defaultProgramId={programs.some((p) => p.id === sp.program) ? sp.program : undefined}
          defaultSessionId={sp.session ?? ''}
        />
      )}
    </div>
  );
}
