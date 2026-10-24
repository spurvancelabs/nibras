// =============================================================================
// FILE: app/(app)/programs/page.tsx   (NEW FILE)
// "My programs" — students see their progress; mentors their programs; admins
// all programs (and still manage them under Admin → Programs).
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listMyPrograms } from '@/lib/program-hub';
import { formatDate } from '@/lib/time';
import { PageHeader, EmptyNote, Badge, ProgressRing } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function MyProgramsPage() {
  const user = await requireAuth();
  const programs = await listMyPrograms(user.orgId, user);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning"
        title={user.role === 'admin' ? 'Programs' : 'My programs'}
        subtitle={user.role === 'student' ? 'Your courses, syllabus and progress.' : 'Program pages, syllabus, gradebook and certificates.'}
        actions={user.role === 'admin' ? <Link href="/admin/programs" className="btn-outline h-10 inline-flex items-center">Manage programs</Link> : undefined}
      />
      {programs.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote title="No programs yet." text={user.role === 'student' ? 'When you are added to a program it appears here.' : 'Programs you mentor appear here.'} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {programs.map((p) => {
            const pr = p.progress;
            return (
              <Link key={p.id} href={`/programs/${p.id}`} className="group relative overflow-hidden flex flex-col bg-surface border border-border rounded-[var(--radius-lg)] p-5 hover:border-primary transition">
                <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-accent opacity-50" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      {p.startDate ? formatDate(p.startDate) : 'Program'}
                      {p.endDate ? ` – ${formatDate(p.endDate)}` : ''}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold group-hover:underline">{p.name}</h3>
                  </div>
                  {p.status !== 'active' && <Badge tone="muted">{p.status}</Badge>}
                </div>
                {p.description && <p className="relative mt-2 text-sm text-muted line-clamp-2">{p.description}</p>}
                {pr ? (
                  <div className="relative mt-4 flex items-center gap-4">
                    <ProgressRing value={(pr.attendance.percent ?? 0) / 100} size={60} stroke={6} label={pr.attendance.percent === null ? '—' : `${Math.round(pr.attendance.percent)}%`} />
                    <div className="text-xs text-muted space-y-0.5">
                      <p>Attendance</p>
                      <p>
                        Assignments {pr.assignments.submitted}/{pr.assignments.total}
                        {pr.assignments.percent !== null ? ` · ${pr.assignments.percent}%` : ''}
                      </p>
                      <p>
                        Quizzes {pr.quizzes.attempted}/{pr.quizzes.total}
                        {pr.quizzes.percent !== null ? ` · ${pr.quizzes.percent}%` : ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="relative mt-4 text-xs text-muted">
                    {p.studentCount} student{p.studentCount === 1 ? '' : 's'}
                    {p.mentorNames.length ? ` · ${p.mentorNames.slice(0, 2).join(', ')}` : ''}
                  </p>
                )}
                <p className="relative mt-auto pt-4 text-xs font-medium">
                  {p.hasSyllabus ? 'Syllabus available →' : 'Open program →'}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
