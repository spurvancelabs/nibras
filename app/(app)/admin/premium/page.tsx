// =============================================================================
// FILE: app/(app)/admin/premium/page.tsx   (NEW FILE)
// Admin → Premium: stats, members (search / filter / bulk extend & revoke),
// grant to people or a whole program, and redeemable codes.
// Viewing: Program Administrators and up. Changing: see actions.ts.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePermission, hasPermission } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { listMembers, listCodes, premiumStats, type MemberFilter } from '@/lib/premium';
import { listPrograms } from '@/lib/programs';
import { PageHeader, Panel, EmptyNote } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { MembersPanel, CodesPanel } from './PremiumAdmin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Premium' };

const FILTERS: { id: MemberFilter; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'expiring', label: 'Ending in 7 days' },
  { id: 'expired', label: 'Ended' },
  { id: 'free', label: 'Free' },
  { id: 'all', label: 'Everyone' },
];

export default async function AdminPremiumPage({ searchParams }: { searchParams: Promise<{ tab?: string; filter?: string; q?: string }> }) {
  const admin = await requirePermission('premium.view');
  const sp = await searchParams;
  const s = await getSettings();
  const tab = sp.tab === 'codes' ? 'codes' : 'members';
  const filter = (FILTERS.some((f) => f.id === sp.filter) ? sp.filter : 'active') as MemberFilter;

  if (!s.premiumEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Premium" subtitle="Memberships and theme access" />
        <Panel>
          <EmptyNote
            icon={<NavIcon name="crown" />}
            title="Premium is switched off"
            text="While it's off, every theme and style is free for everyone. A Super Admin can turn it on and choose which themes are Premium."
            action={
              <Link href="/admin/settings?section=premium" className="btn-primary">
                Open Premium settings
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  const [stats, canGrant, canCodes, canEntitle, programs] = await Promise.all([
    premiumStats(admin.orgId),
    hasPermission(admin, 'premium.grant'),
    hasPermission(admin, 'premium.codes'),
    hasPermission(admin, 'themes.entitlements'),
    listPrograms(admin.orgId),
  ]);
  const [members, codes] = await Promise.all([
    tab === 'members' ? listMembers(admin.orgId, { filter, q: sp.q ?? '', limit: 500 }) : Promise.resolve([]),
    tab === 'codes' ? listCodes(admin.orgId) : Promise.resolve([]),
  ]);

  const tiles = [
    { label: 'Active members', value: stats.active, icon: 'crown' as const },
    { label: 'Ending in 7 days', value: stats.expiring, icon: 'sessions' as const, tone: stats.expiring ? 'text-warning' : '' },
    { label: 'Lifetime', value: stats.lifetime, icon: 'award' as const },
    { label: 'Ended (30 days)', value: stats.expired30, icon: 'progress' as const },
    { label: 'Usable codes', value: stats.codesActive, icon: 'lock' as const },
    { label: 'Redeemed (30 days)', value: stats.redeemed30, icon: 'attendance' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title={s.premiumName || 'Premium'}
        subtitle="Give members premium themes, extend or end memberships, and create codes."
        actions={
          <>
            {canEntitle && (
              <Link href="/admin/settings?section=themeAccess" className="btn-outline h-10 px-4 text-sm">
                Theme access
              </Link>
            )}
            <Link href="/premium" className="btn-outline h-10 px-4 text-sm">
              Member view
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              <NavIcon name={t.icon} size={13} /> {t.label}
            </p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${t.tone ?? ''}`}>{t.value}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Premium sections" className="flex gap-1.5 border-b border-border">
        {[
          { id: 'members', label: 'Members' },
          { id: 'codes', label: 'Codes' },
        ].map((t) => (
          <Link
            key={t.id}
            href={`/admin/premium?tab=${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`h-10 px-4 -mb-px inline-flex items-center text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-primary text-text' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'members' ? (
        <>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter members">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={`/admin/premium?filter=${f.id}`}
                role="tab"
                aria-selected={filter === f.id}
                className={`h-8 px-3 inline-flex items-center rounded-full border text-xs font-medium transition-colors ${
                  filter === f.id ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <MembersPanel members={members} canGrant={canGrant} programs={programs.map((p) => ({ id: p.id, name: p.name, students: p.studentCount }))} />
        </>
      ) : (
        <CodesPanel codes={codes} canCodes={canCodes} programs={programs.map((p) => ({ id: p.id, name: p.name, students: p.studentCount }))} />
      )}
    </div>
  );
}
