// =============================================================================
// FILE: app/(app)/admin/programs/new/page.tsx
// Create-program page (admin). Members are added after creation.
// =============================================================================

import { requireRole } from '@/lib/auth-helpers';
import ProgramForm from '../ProgramForm';
import { PageHeader } from '@/components/ui';

export default async function NewProgramPage() {
  await requireRole('admin');
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        back={{ href: '/admin/programs', label: 'All programs' }}
        eyebrow="Programs"
        title="New program"
        subtitle="Create the program first — you can add mentors and students on the next screen."
      />
      <ProgramForm />
    </div>
  );
}