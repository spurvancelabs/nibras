import Link from 'next/link';
import { requireRole } from '@/lib/auth-helpers';
import { listPrograms } from '@/lib/programs';

export const dynamic = 'force-dynamic';

export default async function ProgramsPage() {
  const admin = await requireRole('admin');
  const programs = await listPrograms(admin.orgId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="text-sm text-muted">{programs.length} total</p>
        </div>
        <Link href="/admin/programs/new" className="btn-primary">
          + New program
        </Link>
      </div>

      {programs.length === 0 ? (
        <div className="card text-center text-sm text-muted py-10">
          No programs yet. Create your first one to get started.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/admin/programs/${p.id}`}
              className="card hover:border-primary transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold truncate">{p.name}</h3>
                <span
                  className={
                    p.status === 'active'
                      ? 'badge-success'
                      : p.status === 'archived'
                      ? 'badge-muted'
                      : 'badge-warning'
                  }
                >
                  {p.status}
                </span>
              </div>
              {p.description && (
                <p className="text-sm text-muted line-clamp-2 mb-3">
                  {p.description}
                </p>
              )}
              <div className="flex gap-4 text-xs text-muted">
                <span>{p.mentorCount} mentors</span>
                <span>{p.studentCount} students</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}