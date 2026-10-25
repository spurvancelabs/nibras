// =============================================================================
// FILE: app/(app)/admin/settings/sections/Access.tsx   (NEW FILE)
// Settings → Security (royal admins), Sign-in page, Maintenance (royal).
// =============================================================================

'use client';

import Link from 'next/link';
import { SettingsCard, Field, Toggle, RadioCards, RangeField, Pill } from '@/components/settings-ui';
import NavIcon from '@/components/NavIcon';
import type { TwoFactorPolicy } from '@/lib/theme-config';
import type { SectionProps, TwoFactorStatRow } from './types';

function RoyalNote({ canRoyal }: { canRoyal: boolean }) {
  if (canRoyal) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-hero/50 text-sm">
      <span aria-hidden>👑</span>
      <p>Only a royal admin can change these settings. You can see them, but changes won&apos;t be saved.</p>
    </div>
  );
}

const HOURS = [
  { h: 12, label: '12 hours' },
  { h: 24, label: '1 day' },
  { h: 168, label: '7 days' },
  { h: 336, label: '14 days' },
  { h: 720, label: '30 days' },
  { h: 2160, label: '90 days' },
];

function hoursLabel(h: number) {
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'}`;
  const d = Math.round((h / 24) * 10) / 10;
  return `${d} day${d === 1 ? '' : 's'}`;
}

export function SecuritySection({ form, set, canRoyal, stats, viewerHas2fa }: SectionProps & { stats: TwoFactorStatRow[]; viewerHas2fa: boolean }) {
  const disabled = !canRoyal;
  const requiresAdmins = form.twoFactorPolicy === 'admins' || form.twoFactorPolicy === 'staff' || form.twoFactorPolicy === 'all';
  return (
    <>
      <RoyalNote canRoyal={canRoyal} />
      {requiresAdmins && !viewerHas2fa && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-[var(--radius-md)] border border-warning/40 bg-warning/10 text-sm">
          <span aria-hidden className="text-lg">🔐</span>
          <p className="flex-1">
            You don&apos;t have two-step sign-in yet. After you save this, you&apos;ll be asked to set it up before you can use the rest of the LMS.
          </p>
          <Link href="/profile?tab=security" className="btn-outline h-9 px-3 text-sm shrink-0">
            Set it up first
          </Link>
        </div>
      )}

      <SettingsCard
        title="Two-step sign-in"
        description="Asks for a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…) after the password. Stops account takeovers even if a password leaks."
        icon={<NavIcon name="shield" />}
        actions={
          canRoyal ? (
            <Link href="/admin/security" className="btn-outline h-9 px-3 text-sm">
              Security dashboard
            </Link>
          ) : undefined
        }
      >
        <RadioCards<TwoFactorPolicy>
          value={form.twoFactorPolicy}
          onChange={(v) => set('twoFactorPolicy', v)}
          disabled={disabled}
          columns={2}
          options={[
            { value: 'optional', title: 'Optional', icon: '🙂', description: 'Anyone can turn it on in Profile → Security. Recommended starting point.', badge: <Pill tone="success">default</Pill> },
            { value: 'admins', title: 'Required for admins', icon: '🛡️', description: 'Admins must set it up the next time they open the LMS.' },
            { value: 'staff', title: 'Required for admins & mentors', icon: '🧑‍🏫', description: 'Everyone who can see student data must use it.' },
            { value: 'all', title: 'Required for everyone', icon: '🔒', description: 'Students too. Make sure they have a phone with an authenticator app.' },
            { value: 'off', title: 'Off', icon: '⏸️', description: 'Hide the option. People who already turned it on keep using it.' },
          ]}
        />
        <div className="rounded-[var(--radius-md)] border border-border overflow-hidden">
          <p className="px-4 py-2 text-xs font-medium text-muted border-b border-border bg-bg/60">Who has it on</p>
          <ul className="divide-y divide-border">
            {stats.map((r) => {
              const pct = r.total ? Math.round((r.enabled / r.total) * 100) : 0;
              return (
                <li key={r.role} className="flex items-center gap-4 px-4 py-2.5 text-sm">
                  <span className="w-20 capitalize font-medium">{r.role}s</span>
                  <span className="flex-1 h-2 rounded-full bg-hero overflow-hidden">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-24 text-right tabular-nums text-muted">
                    {r.enabled}/{r.total} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-muted">
          Lost phone? People can sign in with one of their recovery codes, and a royal admin can reset two-step sign-in from the user&apos;s page.
          In an emergency, setting <code className="font-mono">AUTH_2FA=off</code> in Vercel (then redeploying) skips the code for everyone.
        </p>
      </SettingsCard>

      <SettingsCard title="Session length" description="How long people stay signed in before they must sign in again. Shorter is safer on shared computers." icon={<NavIcon name="sessions" />}>
        <RangeField
          label="Sign everyone out after"
          value={form.sessionMaxHours}
          min={1}
          max={2160}
          step={1}
          format={hoursLabel}
          onChange={(v) => !disabled && set('sessionMaxHours', v)}
        />
        <div className="flex flex-wrap gap-2">
          {HOURS.map((o) => (
            <button
              key={o.h}
              type="button"
              disabled={disabled}
              aria-pressed={form.sessionMaxHours === o.h}
              onClick={() => set('sessionMaxHours', o.h)}
              className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors disabled:opacity-50 ${
                form.sessionMaxHours === o.h ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">People signed in before this update are not signed out by it.</p>
      </SettingsCard>

      <SettingsCard title="Passwords & alerts" icon={<NavIcon name="user" />}>
        <RangeField
          label="Minimum length for passwords people choose"
          value={form.passwordMinLength}
          min={8}
          max={32}
          unit=" characters"
          onChange={(v) => !disabled && set('passwordMinLength', v)}
          hint="Applies when someone changes their own password. Passwords you set for users (e.g. phone numbers) are not affected."
        />
        <Toggle
          checked={form.newSignInAlerts}
          onChange={(v) => set('newSignInAlerts', v)}
          disabled={disabled}
          label="New-network sign-in alerts"
          description="Admins and mentors get an in-app alert when their account signs in from a new network."
          icon="🔔"
        />
      </SettingsCard>
    </>
  );
}

export function SignInSection({ form, set }: SectionProps) {
  return (
    <SettingsCard title="Note on the sign-in page" description="A short message under the sign-in form — e.g. how passwords are formed." icon={<NavIcon name="user" />}>
      <Field label="Message" htmlFor="loginNotice" aside={`${form.loginNotice.length}/300`}>
        <textarea
          id="loginNotice"
          className="input min-h-[84px]"
          maxLength={300}
          value={form.loginNotice}
          onChange={(e) => set('loginNotice', e.target.value)}
          placeholder="Your password is your WhatsApp number in the format 92XXXXXXXXXX."
        />
      </Field>
      {form.loginNotice.trim() && (
        <div className="rounded-[var(--radius-md)] border border-border px-4 py-3 text-xs leading-relaxed whitespace-pre-line bg-bg/50">{form.loginNotice}</div>
      )}
    </SettingsCard>
  );
}

export function MaintenanceSection({ form, set, canRoyal }: SectionProps) {
  return (
    <>
      <RoyalNote canRoyal={canRoyal} />
      <SettingsCard
        title="Maintenance mode"
        description="Students and mentors see a maintenance message instead of the LMS. Admins can still use everything."
        icon={<span aria-hidden>🛠️</span>}
        tone={form.maintenanceMode ? 'danger' : 'default'}
      >
        <Toggle
          checked={form.maintenanceMode}
          onChange={(v) => set('maintenanceMode', v)}
          disabled={!canRoyal}
          label={form.maintenanceMode ? 'Maintenance mode is ON' : 'Maintenance mode is off'}
          description="Takes effect right after you save."
          icon={form.maintenanceMode ? '🔴' : '🟢'}
        />
        <Field label="Message shown to students and mentors" htmlFor="mm" aside={`${form.maintenanceMessage.length}/300`}>
          <textarea id="mm" className="input min-h-[84px]" maxLength={300} disabled={!canRoyal} value={form.maintenanceMessage} onChange={(e) => set('maintenanceMessage', e.target.value)} />
        </Field>
      </SettingsCard>
    </>
  );
}
