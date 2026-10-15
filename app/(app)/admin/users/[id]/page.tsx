// =============================================================================
// FILE: app/(app)/admin/users/[id]/page.tsx
// Edit-user page (admin): profile header, account form (incl. member ID),
// programs, and a danger zone (delete) that shows what will be removed.
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-helpers';
import { getUserById, getUserFootprint } from '@/lib/users';
import { listPrograms } from '@/lib/programs';
import { getSettings } from '@/lib/settings';
import Avatar from '@/components/Avatar';
import EditUserForm from './EditUserForm';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole('admin');
  const { id } = await params;

  const [user, programs, settings] = await Promise.all([
    getUserById(admin.orgId, id),
    listPrograms(admin.orgId),
    getSettings(),
  ]);

  if (!user) notFound();

  const footprint = await getUserFootprint(admin.orgId, user.id);
  const isSelf = user.id === admin.id;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All users
      </Link>

      {/* Profile header */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-5 sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 w-52 h-52 rounded-full bg-accent opacity-60" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={user.name} src={user.avatar} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={user.role === 'admin' ? 'primary' : user.role === 'mentor' ? 'warning' : 'muted'}>
                {user.role}
              </Badge>
              {user.status === 'active' ? (
                <Badge tone="success" dot>active</Badge>
              ) : (
                <Badge tone="danger" dot>disabled</Badge>
              )}
              {isSelf && <Badge tone="muted">you</Badge>}
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight truncate">{user.name}</h1>
            <p className="text-sm text-muted truncate">{user.email}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-auto">
            <Fact label="Member ID" value={user.memberId || '—'} mono />
            <Fact label="Programs" value={String(user.programIds.length)} />
            <Fact
              label="Joined"
              value={new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            />
          </div>
        </div>
      </section>

      <EditUserForm
        user={user}
        programs={programs}
        isSelf={isSelf}
        footprint={footprint}
        memberIdRequired={settings.memberIdRequired}
        memberIdFormat={settings.memberIdFormat}
      />
    </div>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface/85 border border-border px-3 py-2 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`text-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}