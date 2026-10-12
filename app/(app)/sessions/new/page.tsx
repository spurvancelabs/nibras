import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import SessionForm from '../SessionForm';

export const dynamic = 'force-dynamic';

export default async function NewSessionPage() {
  const user = await requireAuth();

  if (user.role === 'student') {
    return (
      <div className="card text-sm text-muted">
        Students can't create sessions.
      </div>
    );
  }

  await db();

  const programQuery: Record<string, unknown> = { orgId: user.orgId };
  if (user.role === 'mentor') {
    programQuery.mentors = user.id;
  }

  const programs = await Program.find(programQuery)
    .select('_id name')
    .sort({ name: 1 })
    .lean();

  const options = programs.map((p) => ({
    id: String(p._id),
    name: p.name as string,
  }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">New session</h1>
        <p className="text-sm text-muted">
          Schedule a session for one of your programs.
        </p>
      </div>

      {options.length === 0 ? (
        <div className="card text-sm text-muted">
          You don't have any programs yet.{' '}
          {user.role === 'mentor'
            ? 'Ask an admin to add you to a program.'
            : 'Create one from Programs.'}
        </div>
      ) : (
        <SessionForm programs={options} />
      )}
    </div>
  );
}