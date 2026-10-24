// =============================================================================
// FILE: app/(app)/quizzes/[id]/attempt/[attemptId]/page.tsx   (NEW FILE)
// Taking the quiz. Only the student who owns the attempt can open it.
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getPlayer } from '@/lib/quizzes';
import QuizPlayer from '../../../QuizPlayer';

export const dynamic = 'force-dynamic';

export default async function AttemptPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const user = await requireAuth();
  const { attemptId } = await params;
  const data = await getPlayer(user.orgId, user, attemptId);
  if (!data) notFound();
  if ('redirectTo' in data) redirect(data.redirectTo);
  return (
    <div className="max-w-3xl mx-auto">
      <QuizPlayer data={data} />
    </div>
  );
}
