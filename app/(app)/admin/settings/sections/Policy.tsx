// =============================================================================
// FILE: app/(app)/admin/settings/sections/Policy.tsx   (NEW FILE)
// Settings sections for the new global policies:
//   Premium (Super Admin) · Theme access (Royal Admin, delegable) ·
//   Attendance rules (admins) · AI grading (Super Admin) ·
//   Data retention (Super Admin) · Roles & delegation (Super Admin)
// The server re-checks every changed key (app/(app)/admin/settings/actions).
// =============================================================================

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SettingsCard, Field, Toggle, RangeField, Pill, Segmented } from '@/components/settings-ui';
import NavIcon from '@/components/NavIcon';
import { THEME_PRESETS, THEME_CATEGORY_NAMES, type Tier } from '@/lib/theme-config';
import { UI_STYLES, UI_STYLE_CATEGORIES } from '@/lib/ui-styles';
import { DELEGABLE, LEVEL_LABEL, PERMISSIONS, type Level, type Permission } from '@/lib/rbac';
import type { SectionProps } from './types';

export function LevelNote({ allowed, level }: { allowed: boolean; level: 'royal' | 'super' }) {
  if (allowed) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-hero/50 text-sm">
      <span aria-hidden>{level === 'super' ? '🛡️' : '👑'}</span>
      <p>
        Only a {LEVEL_LABEL[level]} can change these settings. You can see them, but changes won&apos;t be saved.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Premium (policy)
// ---------------------------------------------------------------------------

export function PremiumSection({ form, set, canSuper }: SectionProps) {
  const d = !canSuper;
  return (
    <>
      <LevelNote allowed={canSuper} level="super" />
      <SettingsCard
        title="Premium membership"
        description="Lets you keep some themes and styles for members. While this is off, everything is free for everyone — exactly like before."
        icon={<NavIcon name="crown" />}
        actions={
          <Link href="/admin/premium" className="btn-outline h-9 px-3 text-sm">
            Manage members
          </Link>
        }
      >
        <Toggle
          checked={form.premiumEnabled}
          onChange={(v) => !d && set('premiumEnabled', v)}
          disabled={d}
          label="Turn on Premium"
          description="Premium themes show a crown. Free members can preview them; choosing one shows an Upgrade page. Admins always have access."
        />
        <Field label="Name of the membership" hint="Shown on badges and the upgrade page.">
          <input className="input" maxLength={40} disabled={d} value={form.premiumName} onChange={(e) => set('premiumName', e.target.value)} />
        </Field>
        <Field
          label="How to get it"
          hint="Shown on the Premium page — e.g. bank transfer details, who to contact, or 'Ask your program admin for a code'. There is no built-in card payment."
        >
          <textarea className="input min-h-24" maxLength={2000} disabled={d} value={form.premiumHowTo} onChange={(e) => set('premiumHowTo', e.target.value)} />
        </Field>
        <Field label="Extra perks (one per line)" hint="Listed on the Premium page under the theme perks.">
          <textarea className="input min-h-20" maxLength={2000} disabled={d} value={form.premiumPerks} onChange={(e) => set('premiumPerks', e.target.value)} />
        </Field>
        <p className="text-xs text-muted">
          When a membership ends, premium themes pause automatically and the organisation theme is shown. The member&apos;s choice is kept and comes back when they renew. Nothing is deleted.
        </p>
      </SettingsCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Theme access (tiers)
// ---------------------------------------------------------------------------

function TierSwitch({ value, onChange, disabled }: { value: Tier; onChange: (t: Tier) => void; disabled?: boolean }) {
  return (
    <Segmented<Tier>
      value={value}
      onChange={onChange}
      disabled={disabled}
      ariaLabel="Tier"
      options={[
        { value: 'free', label: 'Free' },
        { value: 'premium', label: '👑 Premium' },
      ]}
    />
  );
}

export function ThemeAccessSection({ form, set, canEntitle }: SectionProps) {
  const d = !canEntitle;
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'themes' | 'styles'>('themes');

  const catTier = (c: string): Tier => (kind === 'themes' ? form.themeTiers[c] : form.styleTiers[c]) === 'premium' ? 'premium' : 'free';
  const setCat = (c: string, t: Tier) => {
    if (kind === 'themes') set('themeTiers', { ...form.themeTiers, [c]: t });
    else set('styleTiers', { ...form.styleTiers, [c]: t });
  };
  const overrides = kind === 'themes' ? form.themeOverrides : form.styleOverrides;
  const setOverride = (id: string, t: Tier | null) => {
    const next = { ...overrides };
    if (t === null) delete next[id];
    else next[id] = t;
    if (kind === 'themes') set('themeOverrides', next);
    else set('styleOverrides', next);
  };

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const list = kind === 'themes' ? THEME_PRESETS.map((p) => ({ id: p.id, name: p.name, category: p.category ?? '' })) : UI_STYLES.map((s) => ({ id: s.id, name: s.name, category: s.category as string }));
    return list.filter((i) => `${i.name} ${i.category}`.toLowerCase().includes(term)).slice(0, 30);
  }, [q, kind]);

  const cats = kind === 'themes' ? THEME_CATEGORY_NAMES : (UI_STYLE_CATEGORIES as readonly string[]);
  const premiumCount =
    kind === 'themes'
      ? THEME_PRESETS.filter((p) => (form.themeOverrides[p.id] ?? form.themeTiers[p.category ?? '']) === 'premium').length
      : UI_STYLES.filter((s) => (form.styleOverrides[s.id] ?? form.styleTiers[s.category]) === 'premium').length;

  return (
    <>
      <LevelNote allowed={canEntitle} level="royal" />
      {!form.premiumEnabled && (
        <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-warning/40 bg-warning/10 text-sm">
          <span aria-hidden>ℹ️</span>
          <p>Premium is switched off, so these tiers have no effect yet. A Super Admin can turn it on in Settings → Premium.</p>
        </div>
      )}
      <SettingsCard
        title="Which themes are Premium"
        description="Set a whole category to Free or Premium, then make exceptions for single themes. Changes apply on the next page load."
        icon={<NavIcon name="palette" />}
        actions={
          <Segmented<'themes' | 'styles'>
            value={kind}
            onChange={setKind}
            ariaLabel="Themes or styles"
            options={[
              { value: 'themes', label: 'Colour themes' },
              { value: 'styles', label: 'Design styles' },
            ]}
          />
        }
      >
        <p className="text-sm">
          <b>{premiumCount}</b> of {kind === 'themes' ? THEME_PRESETS.length : UI_STYLES.length} {kind === 'themes' ? 'themes' : 'styles'} are Premium.
        </p>
        <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border max-h-[420px] overflow-y-auto">
          {cats.map((c) => (
            <li key={c} className="flex items-center gap-3 px-3 py-2">
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{c}</span>
              <TierSwitch value={catTier(c)} onChange={(t) => setCat(c, t)} disabled={d} />
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard title="Exceptions" description="Make one theme or style Free inside a Premium category — or the other way round." icon={<NavIcon name="sparkle" />}>
        <div className="relative">
          <NavIcon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" className="input h-10 pl-9 text-sm" placeholder={`Search ${kind}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {items.length > 0 && (
          <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {items.map((i) => {
              const ov = overrides[i.id] as Tier | undefined;
              const effective: Tier = ov ?? catTier(i.category);
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{i.name}</span>
                    <span className="block text-[11px] text-muted truncate">
                      {i.category} · category is {catTier(i.category)}
                    </span>
                  </span>
                  <TierSwitch value={effective} onChange={(t) => setOverride(i.id, t === catTier(i.category) ? null : t)} disabled={d} />
                </li>
              );
            })}
          </ul>
        )}
        {Object.keys(overrides).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(overrides).map(([id, t]) => (
              <button
                key={id}
                type="button"
                disabled={d}
                onClick={() => setOverride(id, null)}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-border text-xs hover:bg-hero disabled:opacity-60"
                title="Remove exception"
              >
                {t === 'premium' ? '👑' : '🆓'} {id}
                <NavIcon name="close" size={12} />
              </button>
            ))}
          </div>
        )}
      </SettingsCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Attendance rules
// ---------------------------------------------------------------------------

export function AttendanceRulesSection({ form, set }: SectionProps) {
  return (
    <SettingsCard
      title="Attendance alerts"
      description="Spot learners who are falling behind. Alerts go to the learner and their mentors once a day."
      icon={<NavIcon name="attendance" />}
    >
      <Toggle
        checked={form.attendanceAlerts}
        onChange={(v) => set('attendanceAlerts', v)}
        label="Send attendance alerts"
        description="Low attendance and repeated absences are always shown in Attendance reports, even when alerts are off."
      />
      <RangeField
        label="Low attendance below"
        value={form.attendanceThreshold}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => set('attendanceThreshold', v)}
        hint="Counted over completed sessions in each program. Late counts as attended; excused is left out."
      />
      <RangeField
        label="Repeated absence after"
        value={form.absenceStreakAlert}
        min={0}
        max={20}
        format={(v) => (v === 0 ? 'off' : `${v} absences in a row`)}
        onChange={(v) => set('absenceStreakAlert', v)}
      />
    </SettingsCard>
  );
}

// ---------------------------------------------------------------------------
// AI grading
// ---------------------------------------------------------------------------

export function AiSection({ form, set, canSuper, aiConfigured }: SectionProps & { aiConfigured?: boolean }) {
  const d = !canSuper;
  return (
    <>
      <LevelNote allowed={canSuper} level="super" />
      <SettingsCard
        title="AI-assisted grading"
        description="Mentors can ask the AI for suggested marks and draft feedback on text submissions. A mentor always reviews and approves before a learner sees anything."
        icon={<NavIcon name="grading" />}
      >
        <div className="flex flex-wrap gap-2">
          {aiConfigured ? <Pill tone="success">AI provider connected</Pill> : <Pill tone="warning">No AI provider set</Pill>}
        </div>
        {!aiConfigured && (
          <p className="text-xs text-muted">
            Add <code className="font-mono">AI_API_KEY</code>, <code className="font-mono">AI_BASE_URL</code> and <code className="font-mono">AI_MODEL</code> in Vercel → Settings →
            Environment Variables (any OpenAI-compatible provider: Groq, Google Gemini, OpenRouter, a local Ollama…), then redeploy. Keys are never stored in the database.
          </p>
        )}
        <Toggle
          checked={form.aiGradingEnabled}
          onChange={(v) => !d && set('aiGradingEnabled', v)}
          disabled={d}
          label="Allow AI suggestions"
          description="Off = the grading queue works fully by hand. Objective quiz questions are always marked by fixed rules, never by AI."
        />
        <RangeField
          label="Monthly limit"
          value={form.aiMonthlyLimit}
          min={0}
          max={5000}
          step={50}
          format={(v) => (v === 0 ? 'no AI requests' : `${v} requests / month`)}
          onChange={(v) => !d && set('aiMonthlyLimit', v)}
          hint="Keeps costs predictable. When the limit is reached, mentors grade by hand until next month."
        />
        <RangeField
          label="Longest submission sent to AI"
          value={form.aiMaxChars}
          min={1000}
          max={50000}
          step={1000}
          format={(v) => `${v.toLocaleString()} characters`}
          onChange={(v) => !d && set('aiMaxChars', v)}
          hint="Longer work is cut and the mentor is told. Names and emails are never sent."
        />
      </SettingsCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Data retention
// ---------------------------------------------------------------------------

export function RetentionSection({ form, set, canSuper }: SectionProps) {
  const d = !canSuper;
  const days = (v: number) => (v >= 365 ? `${Math.round((v / 365) * 10) / 10} year${v >= 730 ? 's' : ''}` : `${v} days`);
  return (
    <>
      <LevelNote allowed={canSuper} level="super" />
      <SettingsCard
        title="How long records are kept"
        description="Old records are removed by the daily maintenance job. Learning data (grades, submissions, attendance, certificates) is never removed by this."
        icon={<NavIcon name="shield" />}
      >
        <RangeField label="Audit log" value={form.auditRetentionDays} min={30} max={3650} step={30} format={days} onChange={(v) => !d && set('auditRetentionDays', v)} />
        <RangeField
          label="Read notifications"
          value={form.notificationRetentionDays}
          min={14}
          max={3650}
          step={7}
          format={days}
          onChange={(v) => !d && set('notificationRetentionDays', v)}
          hint="Unread notifications are kept."
        />
      </SettingsCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Roles & delegation
// ---------------------------------------------------------------------------

const PERM_LABEL: Partial<Record<Permission, string>> = {
  'premium.grant': 'Grant and remove Premium',
  'premium.codes': 'Create Premium codes',
  'themes.entitlements': 'Choose which themes are Premium',
  'automation.review': 'Resolve inactivity flags and reactivate accounts',
};

export function RolesSection({ form, set, canSuper }: SectionProps) {
  const d = !canSuper;
  const perms = Object.keys(DELEGABLE) as Permission[];
  return (
    <>
      <LevelNote allowed={canSuper} level="super" />
      <SettingsCard
        title="Roles"
        description="Learner < Mentor < Program Administrator (admin) < Royal Admin < Super Admin. Each level can do everything the levels below can."
        icon={<NavIcon name="users" />}
      >
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          <li className="p-3 rounded-[var(--radius-md)] border border-border">
            <b>Super Admin</b>
            <p className="text-xs text-muted">Global policies: premium, inactivity automation, AI grading, data retention, this page.</p>
          </li>
          <li className="p-3 rounded-[var(--radius-md)] border border-border">
            <b>Royal Admin</b>
            <p className="text-xs text-muted">Manages admins, security, audit log, premium members and theme access.</p>
          </li>
          <li className="p-3 rounded-[var(--radius-md)] border border-border">
            <b>Program Administrator</b>
            <p className="text-xs text-muted">Programs, users, reports, everyday settings.</p>
          </li>
          <li className="p-3 rounded-[var(--radius-md)] border border-border">
            <b>Mentor</b>
            <p className="text-xs text-muted">Their programs: sessions, attendance, grading (approves AI suggestions).</p>
          </li>
        </ul>
        <p className="text-xs text-muted">
          Make someone Royal or Super Admin from <Link className="underline" href="/admin/security">Security</Link>.
        </p>
      </SettingsCard>
      <SettingsCard title="Delegation" description="Let a lower level do some jobs. Everything else is fixed for safety." icon={<NavIcon name="shield" />}>
        <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
          {perms.map((p) => {
            const allowed = DELEGABLE[p] ?? [];
            const value = (form.permissionOverrides[p] as Level | undefined) ?? PERMISSIONS[p];
            return (
              <li key={p} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5">
                <span className="flex-1 min-w-0 text-sm font-medium">{PERM_LABEL[p] ?? p}</span>
                <select
                  className="input h-9 sm:w-56 text-sm"
                  disabled={d}
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value as Level;
                    const next = { ...form.permissionOverrides };
                    if (v === PERMISSIONS[p]) delete next[p];
                    else next[p] = v;
                    set('permissionOverrides', next);
                  }}
                >
                  {allowed.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABEL[l]} and above{l === PERMISSIONS[p] ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </SettingsCard>
    </>
  );
}
