import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-helpers';
import { getProgram } from '@/lib/programs';
import { listUsers } from '@/lib/users';
import ProgramForm from '../ProgramForm';
import MembersPicker from './MembersPicker';

export const dynamic = 'force-dynamic';

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole('admin');
  const { id } = await params;

  const [program, mentors, students] = await Promise.all([
    getProgram(admin.orgId, id),
    listUsers(admin.orgId, { role: 'mentor' }),
    listUsers(admin.orgId, { role: 'student' }),
  ]);

  if (!program) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{program.name}</h1>
        <p className="text-sm text-muted">
          {program.mentorCount} mentors · {program.studentCount} students
        </p>
      </div>

      <ProgramForm initial={program} />

      <MembersPicker
        programId={program.id}
        role="mentor"
        allCandidates={mentors.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          avatar: m.avatar,
        }))}
        initialSelected={program.mentors.map((m) => m.id)}
      />

      <MembersPicker
        programId={program.id}
        role="student"
        allCandidates={students.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar,
        }))}
        initialSelected={program.students.map((s) => s.id)}
      />
    </div>
  );
}