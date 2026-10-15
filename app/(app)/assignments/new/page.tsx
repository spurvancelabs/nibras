// =============================================================================
// FILE: app/(app)/assignments/new/page.tsx
// Create-assignment page (admin / mentor). Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import AssignmentForm from '../AssignmentForm';
import { PageHeader, EmptyNote, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function NewAssignmentPage() {
  const user = await requireAuth();

  if (user.role === 'student') {
    return (
      <div className="max-w-lg mx-auto bg-surface border border-border rounded-[var(--radius-lg)]">
        <EmptyNote
          icon={Icons.clipboard}
          title="Students can't create assignments."
          action={
            <Link href="/assignments" className="btn-outline text-sm">
              Back to assignments
            </Link>
          }
        />
      </div>
    );
  }

  await db();
  const query: Record<string, unknown> = {
    orgId: user.orgId,
    status: 'active',
  };
  if (user.role === 'mentor') query.mentors = user.id;

  const programs = await Program.find(query).select('_id name').sort({ name: 1 }).lean();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        back={{ href: '/assignments', label: 'All assignments' }}
        eyebrow="Assignments"
        title="New assignment"
        subtitle="Set a deadline and any reference files."
      />

      {programs.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote
            icon={Icons.programs}
            title="You don't have any programs yet."
            text={
              user.role === 'mentor'
                ? 'Ask an admin to add you to a program.'
                : 'Create one from Programs.'
            }
          />
        </div>
      ) : (
        <AssignmentForm
          programs={programs.map((p) => ({ id: String(p._id), name: p.name as string }))}
        />
      )}
    </div>
  );
}