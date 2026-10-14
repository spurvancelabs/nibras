'use client';

import { useMemo, useState, useTransition } from 'react';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import { saveSettings } from './actions';
import type {
  ThemeSettings,
  ThemePalette,
  ThemeMode,
} from '@/models/Setting';

type Props = { initial: ThemeSettings };

type Tab = 'branding' | 'light' | 'dark' | 'typography' | 'contact';

const TABS: { id: Tab; label: string }[] = [
  { id: 'branding', label: 'Branding' },
  { id: 'light', label: 'Light theme' },
  { id: 'dark', label: 'Dark theme' },
  { id: 'typography', label: 'Typography & Shape' },
  { id: 'contact', label: 'Contact' },
];

const PRESET_FONTS = [
  { label: 'System', value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Poppins', value: 'Poppins, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

const PALETTE_FIELDS: { key: keyof ThemePalette; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryFg', label: 'Primary text' },
  { key: 'bg', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'border', label: 'Border' },
  { key: 'muted', label: 'Muted text' },
  { key: 'text', label: 'Text' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'danger', label: 'Danger' },
];

export default function SettingsForm({ initial }: Props) {
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

  const previewPalette = useMemo(
    () => (tab === 'dark' ? form.dark : form.light),
    [tab, form.light, form.dark]
  );

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
                value={form[tab][f.key]}
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
              {PRESET_FONTS.map((f) => (
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
                placeholder="12px"
              />
            </div>
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
          className="border border-border rounded-lg p-6"
          style={{
            background: previewPalette.bg,
            color: previewPalette.text,
            borderColor: previewPalette.border,
            fontFamily: form.font,
          }}
        >
          <div
            className="p-4"
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
          value={value.startsWith('#') ? value : '#000000'}
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