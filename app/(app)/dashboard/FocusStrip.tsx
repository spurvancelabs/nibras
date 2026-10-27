// =============================================================================
// FILE: app/(app)/dashboard/FocusStrip.tsx   (NEW FILE — server)
// Role-aware "what needs you" strip at the top of the dashboard:
//   learner — learning streak, the most urgent next step, achievements
//   mentor  — submissions to grade, AI suggestions to review
//   admin   — grading backlog, accounts flagged for review, premium ending
// Each tile links to the hub where the work is done. Fails quietly.
// =============================================================================

import Link from 'next/link';
import type { SessionUser } from '@/lib/auth-helpers';
import { hasPermission } from '@/lib/auth-helpers';
import { learnerProgress } from '@/lib/learner-progress';
import { gradingStats } from '@/lib/grading';
import { listFlags } from '@/lib/automation';
import { premiumStats } from '@/lib/premium';
import { getSettings } from '@/lib/settings';
import NavIcon from '@/components/NavIcon';
import { cached } from '@/lib/cache';

type Tile = { href: string; label: string; value: string; hint: string; icon: Parameters<typeof NavIcon>[0]['name']; tone?: 'warning' | 'primary' };

async function tilesFor(user: SessionUser): Promise<Tile[]> {
  if (user.role === 'student') {
    const p = await cached(['progress', user.id], 45, () => learnerProgress(user.orgId, user.id), [`user-summary:${user.id}`]);
    const n = p.next[0];
    const earned = p.achievements.filter((a) => a.earned).length;
    return [
      { href: '/progress', label: 'Learning streak', value: `${p.streak.current} wk`, hint: p.streak.thisWeekActive ? 'This week counts ✓' : 'Do one thing this week to keep it', icon: 'progress', tone: p.streak.thisWeekActive ? undefined : 'warning' },
      n
        ? { href: n.href, label: 'Next up', value: n.title, hint: n.detail, icon: n.kind === 'quiz' ? 'quiz' : n.kind === 'attendance' ? 'attendance' : 'assignments', tone: n.urgent ? 'warning' : 'primary' }
        : { href: '/progress', label: 'Next up', value: 'All caught up', hint: 'Nothing due right now 🎉', icon: 'attendance' },
      { href: '/progress', label: 'Achievements', value: `${earned}/${p.achievements.length}`, hint: 'See your badges', icon: 'award' },
    ];
  }
  const g = await cached(['grading-stats', user.id], 30, () => gradingStats(user), [`user-summary:${user.id}`]);
  const tiles: Tile[] = [
    { href: '/grading', label: 'To grade', value: String(g.toGrade), hint: g.toGrade ? 'Oldest first in the queue' : 'All caught up', icon: 'grading', tone: g.toGrade ? 'warning' : undefined },
    { href: '/grading', label: 'AI suggestions', value: String(g.aiReady), hint: g.aiReady ? 'Waiting for your review' : 'None waiting', icon: 'sparkle', tone: g.aiReady ? 'primary' : undefined },
    { href: '/attendance', label: 'Attendance', value: 'Hub', hint: 'Rates, flags & missing registers', icon: 'attendance' },
  ];
  if (user.role === 'admin') {
    const [canAuto, s] = await Promise.all([hasPermission(user, 'automation.view'), getSettings()]);
    if (canAuto) {
      const flags = await listFlags(user.orgId, ['flagged', 'suspended'], 500);
      tiles[2] = { href: '/admin/automation?tab=flags', label: 'Accounts to review', value: String(flags.length), hint: flags.length ? 'Inactive accounts flagged' : 'Nothing flagged', icon: 'automation', tone: flags.length ? 'warning' : undefined };
    }
    if (s.premiumEnabled) {
      const ps = await premiumStats(user.orgId);
      tiles.push({ href: '/admin/premium?filter=expiring', label: 'Premium', value: String(ps.active), hint: ps.expiring ? `${ps.expiring} ending this week` : 'active members', icon: 'crown', tone: ps.expiring ? 'warning' : undefined });
    }
  }
  return tiles;
}

export default async function FocusStrip({ user }: { user: SessionUser }) {
  let tiles: Tile[] = [];
  try {
    tiles = await tilesFor(user);
  } catch (e) {
    console.error('[dashboard] focus strip failed', e);
    return null;
  }
  return (
    <div className={`grid gap-3 ${tiles.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={`group flex items-center gap-3 p-4 bg-surface border rounded-[var(--radius-lg)] transition-colors hover:border-primary ${
            t.tone === 'warning' ? 'border-warning/50' : 'border-border'
          }`}
        >
          <span className={`grid place-items-center w-10 h-10 rounded-full shrink-0 ${t.tone === 'warning' ? 'bg-warning/15 text-warning' : t.tone === 'primary' ? 'bg-primary text-primary-fg' : 'bg-hero'}`}>
            <NavIcon name={t.icon} size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{t.label}</span>
            <span className="block text-lg font-semibold leading-tight truncate">{t.value}</span>
            <span className="block text-xs text-muted truncate">{t.hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
