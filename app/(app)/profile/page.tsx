// =============================================================================
// FILE: app/(app)/profile/page.tsx
// Profile, redesigned with tabs:
//   Account    — name, photo, email/role/member ID
//   Security   — password, two-step sign-in, recent sign-in activity
//   Appearance — personal colour theme, design style and mode
// Open a tab directly: /profile?tab=security
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { getUserById } from '@/lib/users';
import { getSettings } from '@/lib/settings';
import { listAudit } from '@/lib/audit';
import { twoFactorStatus, policyRequires } from '@/lib/two-factor';
import { findPreset } from '@/lib/theme-config';
import { findUiStyle } from '@/lib/ui-styles';
import { formatDateTime, formatDate, formatRelative } from '@/lib/time';
import { describeUserAgent } from '@/lib/user-agent';
import Avatar from '@/components/Avatar';
import NavIcon, { type IconName } from '@/components/NavIcon';
import { SettingsCard } from '@/components/settings-ui';
import AccountForm from './AccountForm';
import PasswordForm from './PasswordForm';
import TwoFactorPanel from './TwoFactorPanel';
import PersonalAppearance from './PersonalAppearance';
import SignOutEverywhere from './SignOutEverywhere';
import { LEVEL_LABEL, levelOf } from '@/lib/rbac';
import { policyFrom } from '@/lib/premium';
import { hasPremiumAccess } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profile' };

type Tab = 'account' | 'security' | 'appearance';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'account', label: 'Account', icon: 'user' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
];

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string; required?: string }> }) {
  const me = await requireAuth({ allowWithout2fa: true });
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : 'account';

  const [user, settings, tfa] = await Promise.all([
    getUserById(me.orgId, me.id),
    getSettings(),
    twoFactorStatus(me.orgId, me.id).catch(() => ({ enabled: false, enabledAt: null, recoveryLeft: 0 })),
  ]);
  if (!user) return null;
  const required = policyRequires(settings.twoFactorPolicy, me.role);
  const history =
    tab === 'security'
      ? await listAudit(me.orgId, { targetId: me.id, group: 'auth.', limit: 15 }).catch(() => [])
      : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ---------------- Header ---------------- */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-5 sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -right-12 -bottom-20 w-64 h-64 rounded-full bg-accent opacity-60" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={user.name} src={user.avatar} size={80} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">{user.name}</h1>
            <p className="text-sm text-muted truncate">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-surface/80 border border-border capitalize">
                <NavIcon name="user" size={13} /> {LEVEL_LABEL[levelOf({ role: me.role, royal: me.royal, superAdmin: me.superAdmin })]}
              </span>
              {user.memberId && <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-surface/80 border border-border font-mono">{user.memberId}</span>}
              <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border ${tfa.enabled ? 'bg-success/10 text-success border-success/30' : 'bg-surface/80 border-border'}`}>
                <NavIcon name="shield" size={13} /> 2-step {tfa.enabled ? 'on' : 'off'}
              </span>
              {user.lastLoginAt && <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-surface/80 border border-border">Last sign-in {formatRelative(user.lastLoginAt)}</span>}
            </div>
          </div>
        </div>
      </section>

      {required && !tfa.enabled && (
        <div role="alert" className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-md)] border border-warning/40 bg-warning/12 text-sm">
          <span aria-hidden className="text-lg">🔐</span>
          <p>
            <b>Your admin requires two-step sign-in.</b> Set it up below to keep using the LMS.
          </p>
        </div>
      )}

      {/* ---------------- Tabs ---------------- */}
      <nav aria-label="Profile sections" className="no-scrollbar flex gap-1 overflow-x-auto p-1 rounded-[var(--radius-md)] border border-border bg-surface w-full sm:w-fit">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`/profile?tab=${t.id}`}
              scroll={false}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[calc(var(--radius-md)-3px)] text-sm font-medium whitespace-nowrap transition-colors ${
                active ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-text hover:bg-hero'
              }`}
            >
              <NavIcon name={t.icon} size={16} />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {tab === 'account' && (
        <AccountForm user={{ name: user.name, avatar: user.avatar, email: user.email, role: user.role, memberId: user.memberId }} />
      )}

      {tab === 'security' && (
        <div className="space-y-5">
          <TwoFactorPanel
            enabled={tfa.enabled}
            enabledAt={tfa.enabledAt ? formatDate(tfa.enabledAt) : null}
            recoveryLeft={tfa.recoveryLeft}
            required={required}
            policyOff={settings.twoFactorPolicy === 'off'}
            orgName={settings.orgName || 'Nibras'}
          />
          <PasswordForm minLength={settings.passwordMinLength} lastChanged={user.passwordChangedAt ? formatDate(user.passwordChangedAt) : null} />
          <SignOutEverywhere />
          <SettingsCard
            title="Recent sign-in activity"
            description="If you see something you don't recognise, change your password and turn on two-step sign-in."
            icon={<NavIcon name="sessions" />}
          >
            {history.length === 0 ? (
              <p className="text-sm text-muted">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border -my-2">
                {history.map((h) => {
                  const ua = describeUserAgent(h.userAgent);
                  const bad = /failed|blocked/.test(h.action);
                  return (
                    <li key={h.id} className="flex items-start gap-3 py-3">
                      <span className={`mt-0.5 grid place-items-center w-9 h-9 shrink-0 rounded-full ${bad ? 'bg-danger/10 text-danger' : 'bg-hero text-text'}`} aria-hidden>
                        {ua.mobile ? '📱' : '💻'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${bad ? 'text-danger' : ''}`}>{h.label}</p>
                        <p className="text-xs text-muted truncate">
                          {ua.browser} on {ua.os}
                          {h.ip ? ` · ${h.ip}` : ''}
                        </p>
                      </div>
                      <time className="text-xs text-muted shrink-0 text-right" dateTime={h.at} title={formatDateTime(h.at)}>
                        {formatRelative(h.at)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </SettingsCard>
        </div>
      )}

      {tab === 'appearance' && (
        <PersonalAppearance
          theme={me.themePreset ?? ''}
          style={me.uiStyle ?? ''}
          allowThemes={settings.allowUserThemes}
          allowStyles={settings.allowUserStyles}
          showScene={settings.showScene}
          orgThemeName={findPreset(settings.themePresetId)?.name ?? 'Custom'}
          orgStyleName={findUiStyle(settings.uiStyle)?.name ?? 'Classic'}
          policy={policyFrom(settings)}
          hasPremium={hasPremiumAccess(me, policyFrom(settings))}
          premiumName={settings.premiumName || 'Premium'}
        />
      )}
    </div>
  );
}
