import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import AssignmentForm from '../AssignmentForm';

export const dynamic = 'force-dynamic';

export default async function NewAssignmentPage() {
  const user = await requireAuth();

  if (user.role === 'student') {
    return <div className="card text-sm text-muted">Students can't create assignments.</div>;
  }

  await db();
  const query: Record<string, unknown> = { orgId: user.orgId };
  if (user.role === 'mentor') query.mentors = user.id;

  const programs = await Program.find(query).select('_id name').sort({ name: 1 }).lean();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">New assignment</h1>
        <p className="text-sm text-muted">Set a deadline and any reference files.</p>
      </div>

      {programs.length === 0 ? (
        <div className="card text-sm text-muted">
          You don't have any programs yet.
        </div>
      ) : (
        <AssignmentForm
          programs={programs.map((p) => ({ id: String(p._id), name: p.name as string }))}
        />
      )}
    </div>
  );
}