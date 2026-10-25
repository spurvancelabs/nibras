// =============================================================================
// FILE: app/(app)/admin/settings/sections/People.tsx   (NEW FILE)
// Settings → Members & IDs and Certificates.
// =============================================================================

'use client';

import CloudinaryUpload from '@/components/CloudinaryUpload';
import { SettingsCard, Field, Toggle } from '@/components/settings-ui';
import NavIcon from '@/components/NavIcon';
import { formatMemberId, validateMemberIdFormat } from '@/lib/member-id';
import type { SectionProps } from './types';

export function MembersSection({ form, set }: SectionProps) {
  const err = validateMemberIdFormat(form.memberIdFormat);
  return (
    <SettingsCard
      title="Member IDs"
      description="Used when creating users and in CSV import. You can also assign missing IDs from the Users page."
      icon={<NavIcon name="users" />}
    >
      <Toggle
        checked={!!form.memberIdRequired}
        onChange={(v) => set('memberIdRequired', v)}
        label="Every user must have a member ID"
        description="When off, the member ID field is optional."
        icon="🪪"
      />
      <Field
        label="ID format"
        htmlFor="memberIdFormat"
        error={err}
        hint={
          <>
            Preview: <span className="font-mono text-text">{formatMemberId(form.memberIdFormat, 1)}</span>, <span className="font-mono text-text">{formatMemberId(form.memberIdFormat, 2)}</span>, …
          </>
        }
      >
        <input
          id="memberIdFormat"
          className="input h-11 font-mono uppercase"
          value={form.memberIdFormat}
          maxLength={40}
          onChange={(e) => set('memberIdFormat', e.target.value.toUpperCase().replace(/\s+/g, ''))}
          placeholder="MEM-{YYYY}-{####}"
        />
      </Field>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {[
          ['{YYYY}', 'year'],
          ['{YY}', 'short year'],
          ['{MM}', 'month'],
          ['{DD}', 'day'],
          ['{####}', 'number (4 digits)'],
        ].map(([t, d]) => (
          <button
            key={t}
            type="button"
            onClick={() => set('memberIdFormat', (form.memberIdFormat + t).slice(0, 40))}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-border hover:bg-hero transition-colors"
            title={`Add ${t}`}
          >
            <code className="font-mono font-semibold">{t}</code>
            <span className="text-muted">{d}</span>
          </button>
        ))}
      </div>
    </SettingsCard>
  );
}

export function CertificatesSection({ form, set }: SectionProps) {
  const prefix = form.certPrefix || 'CERT';
  return (
    <>
      <SettingsCard title="Certificate defaults" description="Used for every certificate. Each program can override the title, design and signatory." icon={<NavIcon name="award" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Issued by" htmlFor="certIssuer">
            <input id="certIssuer" className="input h-11" value={form.certIssuerName} onChange={(e) => set('certIssuerName', e.target.value)} placeholder={form.orgName} />
          </Field>
          <Field label="Certificate number prefix" htmlFor="certPrefix" hint={<>e.g. <span className="font-mono">{prefix}-2026-7Q4K-9XW2</span></>}>
            <input
              id="certPrefix"
              className="input h-11 font-mono uppercase"
              maxLength={12}
              value={form.certPrefix}
              onChange={(e) => set('certPrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            />
          </Field>
          <Field label="Signatory name" htmlFor="certSig">
            <input id="certSig" className="input h-11" value={form.certSignatoryName} onChange={(e) => set('certSignatoryName', e.target.value)} placeholder="e.g. Ayesha Khan" />
          </Field>
          <Field label="Signatory title" htmlFor="certSigTitle">
            <input id="certSigTitle" className="input h-11" value={form.certSignatoryTitle} onChange={(e) => set('certSignatoryTitle', e.target.value)} />
          </Field>
        </div>
        <Field label="Signature image" hint="Optional. A transparent PNG of the signature works best.">
          <CloudinaryUpload value={form.certSignatureImage} onChange={(url) => set('certSignatureImage', url)} label="Upload signature" />
        </Field>
        <Field label="Footer text" htmlFor="certFooter" hint="Optional, shown in small print.">
          <input id="certFooter" className="input h-11" maxLength={200} value={form.certFooterText} onChange={(e) => set('certFooterText', e.target.value)} placeholder="Verify this certificate at …/verify" />
        </Field>
      </SettingsCard>
    </>
  );
}
