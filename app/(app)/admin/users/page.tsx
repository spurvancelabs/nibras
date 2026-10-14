import Link from 'next/link';
import { requireRole } from '@/lib/auth-helpers';
import { listUsers } from '@/lib/users';
import { ROLES } from '@/models/User';
import Avatar from '@/components/Avatar';

type SearchParams = Promise<{ role?: string; q?: string }>;

export const dynamic = 'force-dynamic';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireRole('admin');
  const sp = await searchParams;

  const role = ROLES.includes(sp.role as (typeof ROLES)[number])
    ? (sp.role as (typeof ROLES)[number])
    : undefined;

  const users = await listUsers(admin.orgId, { role, search: sp.q });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Link href="/admin/users/import" className="btn-outline">
          Import CSV
        </Link>
        <Link href="/admin/users/new" className="btn-primary">
          + New user
        </Link>
      </div>

      <form className="card flex flex-wrap items-end gap-3" method="get">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input
            className="input"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Name or email"
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" name="role" defaultValue={sp.role ?? ''}>
            <option value="">All</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-outline">Filter</button>
      </form>

      <div className="card p-0 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Programs</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatar} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-muted">{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {u.programIds.length}
                    </td>
                    <td className="px-4 py-3">
                      {u.status === 'active' ? (
                        <span className="badge-success">active</span>
                      ) : (
                        <span className="badge-danger">disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-sm hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}