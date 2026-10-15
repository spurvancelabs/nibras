// =============================================================================
// FILE: app/(app)/queries/new/page.tsx
// "Ask a question" page (students only). Optional ?sessionId= links the thread
// to a session. Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import Session from '@/models/Session';
import QueryForm from '../QueryForm';
import { PageHeader, EmptyNote, Icons } from '@/components/ui';

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
      <div className="max-w-lg mx-auto bg-surface border border-border rounded-[var(--radius-lg)]">
        <EmptyNote
          icon={Icons.chat}
          title="Only students can start a query thread."
          text="Mentors can reply from the thread."
          action={
            <Link href="/queries" className="btn-outline text-sm">
              Back to queries
            </Link>
          }
        />
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
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        back={{ href: '/queries', label: 'All queries' }}
        eyebrow="Queries"
        title="Ask a question"
        subtitle="Your mentors will be able to reply. First to reply is your assigned mentor."
      />

      {programs.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote
            icon={Icons.programs}
            title="You're not enrolled in any program yet."
            text="Ask your admin to add you to a program."
          />
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