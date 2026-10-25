// =============================================================================
// FILE: app/(app)/admin/settings/sections/Organisation.tsx   (NEW FILE)
// Settings → General, Branding, Landing page.
// =============================================================================

'use client';

import CloudinaryUpload from '@/components/CloudinaryUpload';
import { SettingsCard, Field, RangeField } from '@/components/settings-ui';
import NavIcon from '@/components/NavIcon';
import { LOGO_MIN, LOGO_MAX, clampLogoHeight } from '@/lib/theme-config';
import type { SectionProps } from './types';

export function GeneralSection({ form, set }: SectionProps) {
  const urlBad = form.supportUrl !== '' && !/^https?:\/\/\S+$/i.test(form.supportUrl);
  const emailBad = form.contactEmail !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail);
  return (
    <>
      <SettingsCard title="Organisation" description="Shown in the menu, page titles, emails and certificates." icon={<NavIcon name="settings" />}>
        <Field label="Organisation name" htmlFor="orgName" hint="Maximum 80 characters.">
          <input id="orgName" className="input h-11" maxLength={80} value={form.orgName} onChange={(e) => set('orgName', e.target.value)} />
        </Field>
      </SettingsCard>
      <SettingsCard title="Contact & support" description="Shown on the sign-in page so people know where to get help." icon={<NavIcon name="queries" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Contact email" htmlFor="contactEmail" error={emailBad ? 'This doesn’t look like an email address.' : null}>
            <input id="contactEmail" type="email" className="input h-11" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="help@yourorg.com" />
          </Field>
          <Field label="Support link" htmlFor="supportUrl" hint="WhatsApp group, help page, …" error={urlBad ? 'Must start with http:// or https://' : null}>
            <input id="supportUrl" type="url" inputMode="url" className="input h-11" value={form.supportUrl} onChange={(e) => set('supportUrl', e.target.value)} placeholder="https://…" />
          </Field>
        </div>
      </SettingsCard>
    </>
  );
}

const LOGO_SIZES = [
  { label: 'Small', value: 24 },
  { label: 'Medium', value: 32 },
  { label: 'Large', value: 44 },
  { label: 'X-Large', value: 56 },
];

export function BrandingSection({ form, set }: SectionProps) {
  const logoHeight = clampLogoHeight(form.logoHeight ?? 32);
  return (
    <>
      <SettingsCard title="Logo & favicon" description="Transparent PNG or SVG works best." icon={<NavIcon name="sparkle" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Logo">
            <CloudinaryUpload value={form.logo} onChange={(url) => set('logo', url)} label="Upload logo" />
          </Field>
          <Field label="Favicon (browser tab icon)">
            <CloudinaryUpload value={form.favicon} onChange={(url) => set('favicon', url)} label="Upload favicon" accept="image/png,image/x-icon,image/svg+xml" />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="Logo size" description="Used on the landing page, sidebar and sign-in page. Phones cap it at 44px so the bar stays tidy.">
        <RangeField label="Height" value={logoHeight} min={LOGO_MIN} max={LOGO_MAX} unit="px" onChange={(v) => set('logoHeight', clampLogoHeight(v))} />
        <div className="flex flex-wrap gap-2">
          {LOGO_SIZES.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={logoHeight === p.value}
              onClick={() => set('logoHeight', p.value)}
              className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${
                logoHeight === p.value ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
              }`}
            >
              {p.label} · {p.value}px
            </button>
          ))}
        </div>
        <div className="rounded-[var(--radius-md)] border border-border overflow-hidden">
          <p className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted border-b border-border bg-bg">Preview</p>
          <div className="flex items-center justify-between gap-4 px-4 py-2 min-h-16 bg-hero">
            {form.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo} alt={form.orgName} style={{ height: logoHeight, width: 'auto', maxWidth: 260, objectFit: 'contain' }} />
            ) : (
              <span className="font-semibold" style={{ fontSize: Math.max(13, logoHeight * 0.5) }}>
                {form.orgName || 'Your logo'}
              </span>
            )}
            <span className="btn-primary h-9 px-4 text-xs hidden sm:inline-flex">Sign in</span>
          </div>
        </div>
      </SettingsCard>
    </>
  );
}

export function LandingSection({ form, set }: SectionProps) {
  return (
    <>
      <SettingsCard title="Hero" description="The first thing visitors see on your home page. Leave empty to use the built-in text." icon={<NavIcon name="dash" />}>
        <Field label="Headline" htmlFor="heroTitle" aside={`${form.heroTitle.length}/90`}>
          <input id="heroTitle" className="input h-11" maxLength={90} value={form.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} placeholder="Teach, learn, and track — all in one place." />
        </Field>
        <Field label="Sub-text" htmlFor="heroSubtitle" aside={`${form.heroSubtitle.length}/260`}>
          <textarea id="heroSubtitle" className="input min-h-[88px]" maxLength={260} value={form.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} placeholder={`${form.orgName} runs every program on a single platform…`} />
        </Field>
        <Field label="Hero image" hint="A cut-out photo (transparent PNG) looks best. Without one, a course preview card is shown.">
          <CloudinaryUpload value={form.heroImage} onChange={(url) => set('heroImage', url)} label="Upload hero image" accept="image/png,image/webp,image/jpeg" />
        </Field>
      </SettingsCard>

      <SettingsCard title="Trusted by" description="Partner logos. The section stays hidden until you add at least one logo (max 12).">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Section title" htmlFor="partnersTitle">
            <input id="partnersTitle" className="input h-11" value={form.partnersTitle} onChange={(e) => set('partnersTitle', e.target.value)} placeholder="Trusted by" />
          </Field>
          <Field label="Side text" htmlFor="partnersText">
            <input id="partnersText" className="input h-11" value={form.partnersText} onChange={(e) => set('partnersText', e.target.value)} placeholder="Universities and communities learning with us." />
          </Field>
        </div>
        {form.partnerLogos.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {form.partnerLogos.map((src, i) => (
              <li key={src + i} className="relative rounded-[var(--radius-md)] border border-border p-3 flex items-center justify-center h-20 bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="max-h-full max-w-full object-contain" />
                <button
                  type="button"
                  onClick={() => set('partnerLogos', form.partnerLogos.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 grid place-items-center w-6 h-6 rounded-full bg-surface border border-border text-muted hover:text-danger"
                  aria-label="Remove logo"
                >
                  <NavIcon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {form.partnerLogos.length < 12 && (
          <CloudinaryUpload
            key={form.partnerLogos.length}
            value=""
            onChange={(url) => url && set('partnerLogos', [...form.partnerLogos, url])}
            label="Add partner logo"
            accept="image/png,image/svg+xml,image/webp"
          />
        )}
      </SettingsCard>
    </>
  );
}
