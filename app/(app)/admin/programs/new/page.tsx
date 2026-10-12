import { requireRole } from '@/lib/auth-helpers';
import ProgramForm from '../ProgramForm';

export default async function NewProgramPage() {
  await requireRole('admin');
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">New program</h1>
        <p className="text-sm text-muted">Create a program and add members.</p>
      </div>
      <ProgramForm />
    </div>
  );
}