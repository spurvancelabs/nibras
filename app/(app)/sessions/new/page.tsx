// =============================================================================
// FILE: app/(app)/sessions/new/page.tsx
// Create-session page (admin / mentor). Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import User from '@/models/User';
import SessionForm from '../SessionForm';
import { PageHeader, EmptyNote, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function NewSessionPage() {
  const user = await requireAuth();

  if (user.role === 'student') {
    return (
      <div className="max-w-lg mx-auto bg-surface border border-border rounded-[var(--radius-lg)]">
        <EmptyNote
          icon={Icons.calendar}
          title="Students can't create sessions."
          action={
            <Link href="/sessions" className="btn-outline text-sm">
              Back to sessions
            </Link>
          }
        />
      </div>
    );
  }

  await db();

  const programQuery: Record<string, unknown> = {
    orgId: user.orgId,
    status: 'active',
  };
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

  // Mentors in the org; the server validates the picked mentor belongs to the program.
  const mentorRows = await User.find({
    orgId: user.orgId,
    role: 'mentor',
  }).select('_id name programIds').lean();

  const mentors = mentorRows.map((m) => ({
    id: String(m._id),
    name: m.name as string,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        back={{ href: '/sessions', label: 'All sessions' }}
        eyebrow="Sessions"
        title="New session"
        subtitle="Schedule a session for one of your programs."
      />

      {options.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote
            icon={Icons.programs}
            title="You don't have any programs yet."
            text={
              user.role === 'mentor'
                ? 'Ask an admin to add you to a program.'
                : 'Create one from Programs.'
            }
            action={
              user.role === 'admin' ? (
                <Link href="/admin/programs/new" className="btn-primary text-sm">
                  Create program
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <SessionForm
          programs={options}
          mentors={mentors}
          viewerRole={user.role === 'admin' ? 'admin' : 'mentor'}
        />
      )}
    </div>
  );
}