// =============================================================================
// FILE: app/(app)/admin/settings/SettingsForm.tsx
// Admin → Settings form (client). Branding (logo + logo size), theme presets, light/dark palettes,
// member ID rules (required switch + default format),
// typography, landing-page content (hero + Trusted by logos), contact.
// =============================================================================

'use client';

import { useMemo, useState, useTransition } from 'react';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import ThemePresetPicker from '@/components/ThemePresetPicker';
import { saveSettings } from './actions';
import {
  FONT_OPTIONS,
  THEME_PRESETS,
  LOGO_MIN,
  LOGO_MAX,
  clampLogoHeight,
  type ThemePreset,
} from '@/lib/theme-config';
import { formatMemberId, validateMemberIdFormat } from '@/lib/member-id';

const LOGO_SIZE_PRESETS = [
  { label: 'Small', value: 24 },
  { label: 'Medium', value: 32 },
  { label: 'Large', value: 44 },
  { label: 'X-Large', value: 56 },
];
import type {
  ThemeSettings,
  ThemePalette,
  ThemeMode,
} from '@/models/Setting';

type Props = { initial: ThemeSettings; canMaintenance?: boolean };

type Tab =
  | 'branding' | 'landing' | 'members' | 'light' | 'dark' | 'typography' | 'contact'
  | 'features' | 'announcement' | 'certificates' | 'signin';

const TABS: { id: Tab; label: string }[] = [
  { id: 'branding', label: 'Branding' },
  { id: 'landing', label: 'Landing page' },
  { id: 'members', label: 'Members' },
  { id: 'light', label: 'Light theme' },
  { id: 'dark', label: 'Dark theme' },
  { id: 'typography', label: 'Typography & Shape' },
  { id: 'contact', label: 'Contact' },
  { id: 'features', label: 'Features' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'signin', label: 'Sign-in & maintenance' },
];

const PALETTE_FIELDS: { key: keyof ThemePalette; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryFg', label: 'Primary text' },
  { key: 'bg', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'heroBg', label: 'Hero background' },
  { key: 'accent', label: 'Accent (decor)' },
  { key: 'border', label: 'Border' },
  { key: 'muted', label: 'Muted text' },
  { key: 'text', label: 'Text' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'danger', label: 'Danger' },
];

function samePalette(a: ThemePalette, b: ThemePalette) {
  return (Object.keys(b) as (keyof ThemePalette)[]).every(
    (k) => (a[k] ?? '').toLowerCase() === (b[k] ?? '').toLowerCase()
  );
}

export default function SettingsForm({ initial, canMaintenance = false }: Props) {
  const [form, setForm] = useState<ThemeSettings>(initial);
  const [tab, setTab] = useState<Tab>('branding');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function setField<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setPaletteField(
    which: 'light' | 'dark',
    key: keyof ThemePalette,
    value: string
  ) {
    setForm((f) => ({ ...f, [which]: { ...f[which], [key]: value } }));
  }

  function applyPreset(p: ThemePreset) {
    setForm((f) => ({
      ...f,
      light: { ...p.light },
      dark: { ...p.dark },
      font: p.font,
      radiusMd: p.radiusMd,
      radiusLg: p.radiusLg,
      themePresetId: p.id,
    }));
    setMessage({ kind: 'ok', text: `“${p.name}” applied — click Save settings to publish it.` });
  }

  const activePresetId = useMemo(
    () =>
      THEME_PRESETS.find(
        (p) => samePalette(form.light, p.light) && samePalette(form.dark, p.dark)
      )?.id ?? null,
    [form.light, form.dark]
  );

  const previewPalette = useMemo(
    () => (tab === 'dark' ? form.dark : form.light),
    [tab, form.light, form.dark]
  );

  const logoHeight = clampLogoHeight(form.logoHeight ?? 32);

  const fontIsPreset = FONT_OPTIONS.some((f) => f.value === form.font);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await saveSettings(form);
      if (res.ok) setMessage({ kind: 'ok', text: 'Settings saved.' });
      else setMessage({ kind: 'err', text: res.error });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {message && (
        <div
          className={`text-sm px-3 py-2 rounded-md border ${
            message.kind === 'ok'
              ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Theme presets */}
      <section className="card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold">Theme presets</h2>
            <p className="text-xs text-muted">
              One click fills the light &amp; dark palettes, font and corner radius. Every preset is checked for readable
              contrast in both modes. You can fine-tune afterwards.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={form.allowUserThemes}
              onChange={(e) => setField('allowUserThemes', e.target.checked)}
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
            Let users pick a personal theme
          </label>
        </div>
        <ThemePresetPicker value={activePresetId} onSelect={(p) => p && applyPreset(p)} />
      </section>

      {/* Org-wide default theme mode */}
      <section className="card space-y-3">
        <h2 className="font-semibold">Default theme mode</h2>
        <p className="text-xs text-muted">
          Applied to new visitors. Users can still override via the toggle.
        </p>
        <div className="flex gap-2 flex-wrap">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setField('themeMode', m)}
              className={form.themeMode === m ? 'btn-primary' : 'btn-outline'}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 transition ${
              tab === t.id
                ? 'border-primary text-text font-medium'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'branding' && (
        <section className="card space-y-4">
          <div>
            <label className="label">Organization name</label>
            <input
              className="input"
              value={form.orgName}
              onChange={(e) => setField('orgName', e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Logo (light mode)</label>
              <CloudinaryUpload
                value={form.logo}
                onChange={(url) => setField('logo', url)}
                label="Upload logo"
              />
            </div>
            <div>
              <label className="label">Favicon</label>
              <CloudinaryUpload
                value={form.favicon}
                onChange={(url) => setField('favicon', url)}
                label="Upload favicon"
                accept="image/png,image/x-icon,image/svg+xml"
              />
            </div>
          </div>

          {/* Logo size */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="label mb-0" htmlFor="logoHeight">
                Logo size
              </label>
              <span className="text-xs text-muted tabular-nums">{logoHeight}px tall</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setField('logoHeight', clampLogoHeight(logoHeight - 2))}
                disabled={logoHeight <= LOGO_MIN}
                aria-label="Decrease logo size"
                className="btn-outline grid place-items-center w-9 h-9 p-0 text-lg leading-none disabled:opacity-40"
              >
                −
              </button>
              <input
                id="logoHeight"
                type="range"
                min={LOGO_MIN}
                max={LOGO_MAX}
                step={1}
                value={logoHeight}
                onChange={(e) => setField('logoHeight', clampLogoHeight(e.target.value))}
                className="flex-1 accent-primary cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setField('logoHeight', clampLogoHeight(logoHeight + 2))}
                disabled={logoHeight >= LOGO_MAX}
                aria-label="Increase logo size"
                className="btn-outline grid place-items-center w-9 h-9 p-0 text-lg leading-none disabled:opacity-40"
              >
                +
              </button>
              <input
                type="number"
                min={LOGO_MIN}
                max={LOGO_MAX}
                value={logoHeight}
                onChange={(e) => setField('logoHeight', clampLogoHeight(e.target.value))}
                aria-label="Logo height in pixels"
                className="input w-20 text-center tabular-nums"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {LOGO_SIZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setField('logoHeight', p.value)}
                  className={`px-3 py-1 rounded-full border text-xs transition ${
                    logoHeight === p.value
                      ? 'bg-primary text-primary-fg border-primary'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {p.label} · {p.value}px
                </button>
              ))}
            </div>

            {/* Live preview of a navbar with the chosen size */}
            <div className="rounded-lg border border-border overflow-hidden">
              <p className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted border-b border-border bg-bg">
                Preview
              </p>
              <div
                className="flex items-center justify-between gap-4 px-4 py-2 min-h-16"
                style={{ background: form.light.heroBg, color: form.light.text }}
              >
                {form.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logo}
                    alt={form.orgName}
                    style={{ height: logoHeight, width: 'auto', maxWidth: 280, objectFit: 'contain' }}
                  />
                ) : (
                  <span className="text-sm font-semibold" style={{ fontSize: Math.max(13, logoHeight * 0.5) }}>
                    {form.orgName || 'Your logo'}
                  </span>
                )}
                <span
                  className="hidden sm:inline-block px-4 py-2 text-xs font-medium"
                  style={{
                    background: form.light.primary,
                    color: form.light.primaryFg,
                    borderRadius: form.radiusMd,
                  }}
                >
                  Sign in
                </span>
              </div>
            </div>
            <p className="text-xs text-muted">
              Used on the landing page, sidebar and login page. On phones the logo is capped at 44px so the navbar stays tidy.
              {!form.logo && ' Upload a logo above to see the real preview.'}
            </p>
          </div>
        </section>
      )}

      {tab === 'landing' && (
        <section className="card space-y-5">
          <div>
            <h2 className="font-semibold">Hero</h2>
            <p className="text-xs text-muted">Leave empty to use the built-in text.</p>
          </div>
          <div>
            <label className="label">Headline</label>
            <input
              className="input"
              value={form.heroTitle}
              maxLength={90}
              onChange={(e) => setField('heroTitle', e.target.value)}
              placeholder="Teach, learn, and track — all in one place."
            />
          </div>
          <div>
            <label className="label">Sub-text</label>
            <textarea
              className="input min-h-[84px]"
              value={form.heroSubtitle}
              maxLength={260}
              onChange={(e) => setField('heroSubtitle', e.target.value)}
              placeholder={`${form.orgName} runs every program on a single platform…`}
            />
          </div>
          <div>
            <label className="label">Hero image</label>
            <p className="text-xs text-muted mb-2">
              A cut-out photo (transparent PNG) looks best. Without one, a course preview card is shown.
            </p>
            <CloudinaryUpload
              value={form.heroImage}
              onChange={(url) => setField('heroImage', url)}
              label="Upload hero image"
              accept="image/png,image/webp,image/jpeg"
            />
          </div>

          <hr className="border-border" />

          <div>
            <h2 className="font-semibold">Trusted by</h2>
            <p className="text-xs text-muted">The section is hidden until at least one logo is added (max 12).</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Section title</label>
              <input
                className="input"
                value={form.partnersTitle}
                onChange={(e) => setField('partnersTitle', e.target.value)}
                placeholder="Trusted by"
              />
            </div>
            <div>
              <label className="label">Side text</label>
              <input
                className="input"
                value={form.partnersText}
                onChange={(e) => setField('partnersText', e.target.value)}
                placeholder="Universities and communities learning with us."
              />
            </div>
          </div>

          {form.partnerLogos.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {form.partnerLogos.map((src, i) => (
                <li key={src + i} className="relative rounded-md border border-border p-3 flex items-center justify-center h-20 bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="max-h-full max-w-full object-contain" />
                  <button
                    type="button"
                    onClick={() =>
                      setField('partnerLogos', form.partnerLogos.filter((_, j) => j !== i))
                    }
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-bg border border-border text-xs text-muted hover:text-text"
                    aria-label="Remove logo"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {form.partnerLogos.length < 12 && (
            <CloudinaryUpload
              key={form.partnerLogos.length}
              value=""
              onChange={(url) => {
                if (url) setField('partnerLogos', [...form.partnerLogos, url]);
              }}
              label="Add partner logo"
              accept="image/png,image/svg+xml,image/webp"
            />
          )}
        </section>
      )}

      {tab === 'members' && (
        <section className="card space-y-5">
          <div>
            <h2 className="font-semibold">Member IDs</h2>
            <p className="text-xs text-muted">
              Used when creating users manually and in CSV import. You can also change these from the Users pages.
            </p>
          </div>

          <label className="flex items-center justify-between gap-4 p-3.5 rounded-md border border-border bg-bg cursor-pointer">
            <span>
              <span className="block text-sm font-medium">Require a member ID for every user</span>
              <span className="block text-xs text-muted">
                When off, the member ID field is optional.
              </span>
            </span>
            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={!!form.memberIdRequired}
                onChange={(e) => setField('memberIdRequired', e.target.checked)}
              />
              <span className="w-11 h-6 rounded-full bg-border peer-checked:bg-primary transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-5" />
            </span>
          </label>

          <div>
            <label className="label" htmlFor="memberIdFormat">Default ID format</label>
            <input
              id="memberIdFormat"
              className="input font-mono uppercase"
              value={form.memberIdFormat}
              maxLength={40}
              onChange={(e) => setField('memberIdFormat', e.target.value.toUpperCase().replace(/\s+/g, ''))}
              placeholder="MEM-{YYYY}-{####}"
            />
            {validateMemberIdFormat(form.memberIdFormat) ? (
              <p className="text-xs text-danger mt-1">{validateMemberIdFormat(form.memberIdFormat)}</p>
            ) : (
              <p className="text-xs text-muted mt-1">
                Preview:{' '}
                <span className="font-mono text-text">{formatMemberId(form.memberIdFormat, 1)}</span>,{' '}
                <span className="font-mono text-text">{formatMemberId(form.memberIdFormat, 2)}</span>, …
              </p>
            )}
            <p className="text-[11px] text-muted mt-2">
              Tokens: <code>{'{YYYY}'}</code> year · <code>{'{YY}'}</code> short year · <code>{'{MM}'}</code> month ·{' '}
              <code>{'{DD}'}</code> day · <code>{'{###}'}</code> running number (number of # = digits)
            </p>
          </div>
        </section>
      )}

      {(tab === 'light' || tab === 'dark') && (
        <section className="card space-y-4">
          <h2 className="font-semibold">
            {tab === 'light' ? 'Light palette' : 'Dark palette'}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PALETTE_FIELDS.map((f) => (
              <ColorField
                key={f.key}
                label={f.label}
                value={form[tab][f.key] ?? ''}
                onChange={(v) => setPaletteField(tab, f.key, v)}
              />
            ))}
          </div>
        </section>
      )}

      {tab === 'typography' && (
        <section className="card space-y-4">
          <h2 className="font-semibold">Typography & Shape</h2>

          <div>
            <label className="label">Font family</label>
            <select
              className="input"
              value={form.font}
              onChange={(e) => setField('font', e.target.value)}
            >
              {!fontIsPreset && <option value={form.font}>Custom</option>}
              {FONT_OPTIONS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Radius MD</label>
              <input
                className="input"
                value={form.radiusMd}
                onChange={(e) => setField('radiusMd', e.target.value)}
                placeholder="8px"
              />
            </div>
            <div>
              <label className="label">Radius LG</label>
              <input
                className="input"
                value={form.radiusLg}
                onChange={(e) => setField('radiusLg', e.target.value)}
                placeholder="16px"
              />
            </div>
          </div>
        </section>
      )}

      {tab === 'features' && (
        <section className="card space-y-3">
          <div>
            <h2 className="font-semibold">Features</h2>
            <p className="text-xs text-muted">Turn whole sections on or off. Turning one off hides it from menus; no data is deleted.</p>
          </div>
          {(
            [
              ['featureQuizzes', 'Quizzes', 'Timed quizzes for programs and sessions, with auto-grading.'],
              ['featureCertificates', 'Certificates', 'Issue certificates when students complete a program; public verification page.'],
              ['featureSyllabus', 'Syllabus', 'Week-by-week syllabus on each program page.'],
              ['featureGradebook', 'Gradebook', 'Marks for every student across assignments and quizzes, with CSV export.'],
              ['featureQueries', 'Queries', 'Students can ask mentors questions.'],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} className="flex items-start justify-between gap-4 p-3 rounded-[var(--radius-md)] border border-border cursor-pointer hover:bg-hero/40">
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setField(key, e.target.checked)}
                className="mt-1 w-4 h-4 accent-[var(--color-primary)]"
              />
            </label>
          ))}
        </section>
      )}

      {tab === 'announcement' && (
        <section className="card space-y-4">
          <div>
            <h2 className="font-semibold">Announcement banner</h2>
            <p className="text-xs text-muted">A short message at the top of every page — e.g. a schedule change or a holiday.</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.announcementEnabled}
              onChange={(e) => setField('announcementEnabled', e.target.checked)}
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
            Show the banner
          </label>
          <div>
            <label className="label">Message</label>
            <textarea
              className="input min-h-[72px]"
              maxLength={280}
              value={form.announcementText}
              onChange={(e) => setField('announcementText', e.target.value)}
              placeholder="Lecture 3 moves to Sunday 8 pm this week."
            />
            <p className="text-xs text-muted mt-1">{form.announcementText.length}/280</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Style</label>
              <select className="input" value={form.announcementTone} onChange={(e) => setField('announcementTone', e.target.value as ThemeSettings['announcementTone'])}>
                <option value="info">Info</option>
                <option value="success">Good news</option>
                <option value="warning">Warning</option>
                <option value="danger">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Who sees it</label>
              <select className="input" value={form.announcementAudience} onChange={(e) => setField('announcementAudience', e.target.value as ThemeSettings['announcementAudience'])}>
                <option value="all">Everyone</option>
                <option value="student">Students only</option>
                <option value="mentor">Mentors only</option>
                <option value="admin">Admins only</option>
              </select>
            </div>
            <div>
              <label className="label">Link (optional)</label>
              <input className="input" value={form.announcementLink} onChange={(e) => setField('announcementLink', e.target.value)} placeholder="/quizzes or https://…" />
            </div>
          </div>
        </section>
      )}

      {tab === 'certificates' && (
        <section className="card space-y-4">
          <div>
            <h2 className="font-semibold">Certificates</h2>
            <p className="text-xs text-muted">Defaults for every certificate. Each program can override the title and signatory.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Issued by</label>
              <input className="input" value={form.certIssuerName} onChange={(e) => setField('certIssuerName', e.target.value)} placeholder={form.orgName} />
            </div>
            <div>
              <label className="label">Certificate number prefix</label>
              <input className="input font-mono uppercase" maxLength={12} value={form.certPrefix} onChange={(e) => setField('certPrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} />
              <p className="text-xs text-muted mt-1">e.g. {(form.certPrefix || 'CERT')}-2026-7Q4K-9XW2</p>
            </div>
            <div>
              <label className="label">Signatory name</label>
              <input className="input" value={form.certSignatoryName} onChange={(e) => setField('certSignatoryName', e.target.value)} placeholder="e.g. Ayesha Khan" />
            </div>
            <div>
              <label className="label">Signatory title</label>
              <input className="input" value={form.certSignatoryTitle} onChange={(e) => setField('certSignatoryTitle', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Signature image (optional, transparent PNG works best)</label>
            <CloudinaryUpload value={form.certSignatureImage} onChange={(url) => setField('certSignatureImage', url)} label="Upload signature" />
          </div>
          <div>
            <label className="label">Footer text (optional)</label>
            <input className="input" maxLength={200} value={form.certFooterText} onChange={(e) => setField('certFooterText', e.target.value)} placeholder="Verify this certificate at …/verify" />
          </div>
        </section>
      )}

      {tab === 'signin' && (
        <section className="card space-y-4">
          <div>
            <label className="label">Note on the sign-in page (optional)</label>
            <textarea
              className="input min-h-[64px]"
              maxLength={300}
              value={form.loginNotice}
              onChange={(e) => setField('loginNotice', e.target.value)}
              placeholder="Your password is your WhatsApp number in the format 92XXXXXXXXXX."
            />
          </div>
          <div className={`rounded-[var(--radius-md)] border p-4 space-y-3 ${form.maintenanceMode ? 'border-danger/50 bg-danger/5' : 'border-border'}`}>
            <div>
              <h3 className="text-sm font-semibold">Maintenance mode</h3>
              <p className="text-xs text-muted">
                Students and mentors see a maintenance message instead of the app. Admins can still use everything.
                {!canMaintenance && ' Only a royal admin can change this.'}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                disabled={!canMaintenance}
                checked={form.maintenanceMode}
                onChange={(e) => setField('maintenanceMode', e.target.checked)}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
              Maintenance mode is ON
            </label>
            <textarea
              className="input min-h-[64px]"
              maxLength={300}
              disabled={!canMaintenance}
              value={form.maintenanceMessage}
              onChange={(e) => setField('maintenanceMessage', e.target.value)}
            />
          </div>
        </section>
      )}

      {tab === 'contact' && (
        <section className="card space-y-4">
          <h2 className="font-semibold">Contact</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Contact email</label>
              <input
                className="input"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setField('contactEmail', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Support URL</label>
              <input
                className="input"
                type="url"
                inputMode="url"
                pattern="https?://.+"
                value={form.supportUrl}
                onChange={(e) => setField('supportUrl', e.target.value)}
                placeholder="https://…"
              />
              <p className="text-xs text-muted mt-1">
                Must start with http:// or https://
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Live preview — uses current tab's palette */}
      <section className="card space-y-3">
        <h2 className="font-semibold">
          Preview <span className="text-xs text-muted">({tab === 'dark' ? 'dark' : 'light'})</span>
        </h2>

        <div
          className="border border-border rounded-lg overflow-hidden"
          style={{
            background: previewPalette.bg,
            color: previewPalette.text,
            borderColor: previewPalette.border,
            fontFamily: form.font,
          }}
        >
          {/* Mini hero */}
          <div
            className="relative px-6 pt-6 pb-10 overflow-hidden"
            style={{ background: previewPalette.heroBg }}
          >
            <span
              aria-hidden
              className="absolute -right-6 -top-6 w-28 h-28 rounded-full"
              style={{ background: previewPalette.accent }}
            />
            <p className="relative font-semibold text-lg max-w-[16rem] leading-snug">
              {form.heroTitle || 'Teach, learn, and track — all in one place.'}
            </p>
            <span
              className="relative inline-block mt-3 px-4 py-2 text-xs font-medium"
              style={{
                background: previewPalette.primary,
                color: previewPalette.primaryFg,
                borderRadius: form.radiusMd,
              }}
            >
              Sign in
            </span>
          </div>

          <div className="px-6 pb-6 -mt-5">
            <div
              className="relative p-4"
              style={{
                background: previewPalette.surface,
                borderColor: previewPalette.border,
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: form.radiusLg,
              }}
            >
              <p className="font-semibold mb-1">{form.orgName || 'Preview'}</p>
              <p className="text-sm mb-3" style={{ color: previewPalette.muted }}>
                This is how your theme will look.
              </p>

              <div className="flex gap-2 flex-wrap">
                <Chip bg={previewPalette.primary} fg={previewPalette.primaryFg} radius={form.radiusMd}>
                  Primary
                </Chip>
                <Chip bg={previewPalette.success} fg="#fff" radius={form.radiusMd}>Success</Chip>
                <Chip bg={previewPalette.warning} fg="#fff" radius={form.radiusMd}>Warning</Chip>
                <Chip bg={previewPalette.danger} fg="#fff" radius={form.radiusMd}>Danger</Chip>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setForm(initial)}
          disabled={pending}
          className="btn-outline"
        >
          Reset
        </button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}

function Chip({
  bg,
  fg,
  radius,
  children,
}: {
  bg: string;
  fg: string;
  radius: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="px-3 py-1.5 text-sm font-medium"
      style={{ background: bg, color: fg, borderRadius: radius }}
    >
      {children}
    </span>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 border border-border rounded-md cursor-pointer bg-surface"
        />
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}