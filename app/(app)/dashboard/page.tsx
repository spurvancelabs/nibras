import { requireAuth } from '@/lib/auth-helpers';

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>

      <div className="card space-y-1">
        <p className="text-sm">
          <span className="text-muted">Email: </span>
          {user.email}
        </p>
        <p className="text-sm">
          <span className="text-muted">Role: </span>
          <span className="badge-muted">{user.role}</span>
        </p>
        <p className="text-sm">
          <span className="text-muted">Org: </span>
          {user.orgId}
        </p>
      </div>

      <p className="text-sm text-muted">
        Modules coming next: sessions, materials, assignments, queries.
      </p>
    </div>
  );
}