import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import Session from '@/models/Session';
import QueryForm from '../QueryForm';

export const dynamic = 'force-dynamic';

export default async function NewQueryPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const user = await requireAuth();
  const sp = await searchParams;

  if (user.role !== 'student') {
    return (
      <div className="card text-sm text-muted">
        Only students can start a query thread. Mentors can reply from the thread.
      </div>
    );
  }

  await db();

  const programs = await Program.find({ orgId: user.orgId, students: user.id })
    .select('_id name')
    .sort({ name: 1 })
    .lean();

  // If a sessionId was passed, load it so we can show the context + default program
  let presetSession: { id: string; title: string; programId: string } | null = null;
  if (sp.sessionId) {
    const s = await Session.findOne({ _id: sp.sessionId, orgId: user.orgId })
      .select('_id title programId')
      .lean();
    if (s) {
      presetSession = {
        id: String(s._id),
        title: s.title as string,
        programId: String(s.programId),
      };
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Ask a question</h1>
        <p className="text-sm text-muted">
          Your mentors will be able to reply. First to reply is your assigned mentor.
        </p>
      </div>

      {programs.length === 0 ? (
        <div className="card text-sm text-muted">
          You're not enrolled in any program yet.
        </div>
      ) : (
        <QueryForm
          programs={programs.map((p) => ({
            id: String(p._id),
            name: p.name as string,
          }))}
          presetSession={presetSession}
        />
      )}
    </div>
  );
}