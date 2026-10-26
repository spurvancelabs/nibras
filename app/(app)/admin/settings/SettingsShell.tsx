// =============================================================================
// FILE: app/(app)/admin/settings/SettingsShell.tsx   (NEW FILE — replaces
// SettingsForm.tsx)
// Redesigned Admin → Settings:
//   - section navigation (sidebar on desktop, swipeable pills on phones)
//   - search across every setting
//   - one form, one sticky "Save changes" bar with the number of unsaved
//     changes, Discard, Ctrl/⌘ S, and a warning before leaving unsaved work
//   - LIVE preview: appearance changes (and hovering a theme/style) restyle
//     the whole page instantly; nothing is saved until you press Save
// =============================================================================

'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from './actions';
import type { ThemeSettings, ThemePreset } from '@/lib/theme-config';
import { findPreset } from '@/lib/theme-config';
import { orgAppearanceCss, fontsHref, presetCss } from '@/lib/theme-css';
import { findUiStyle, uiStyleCss, type UiStyle } from '@/lib/ui-styles';
import { useLivePreview } from '@/components/appearance/preview';
import NavIcon, { type IconName } from '@/components/NavIcon';
import { GeneralSection, BrandingSection, LandingSection } from './sections/Organisation';
import { AppearanceSection } from './sections/Appearance';
import { FeaturesSection, AnnouncementSection } from './sections/Learning';
import { MembersSection, CertificatesSection } from './sections/People';
import { SecuritySection, SignInSection, MaintenanceSection } from './sections/Access';
import { PremiumSection, ThemeAccessSection, AttendanceRulesSection, AiSection, RetentionSection, RolesSection } from './sections/Policy';
import type { SetField, TwoFactorStatRow } from './sections/types';

type SectionId =
  | 'general'
  | 'branding'
  | 'appearance'
  | 'landing'
  | 'features'
  | 'announcement'
  | 'members'
  | 'certificates'
  | 'security'
  | 'signin'
  | 'maintenance'
  | 'premium'
  | 'themeAccess'
  | 'attendanceRules'
  | 'ai'
  | 'retention'
  | 'roles';

type SectionDef = {
  id: SectionId;
  label: string;
  icon: IconName;
  group: string;
  desc: string;
  keywords: string;
  keys: (keyof ThemeSettings)[];
  /** Who may change it (others can look). */
  level?: 'royal' | 'super' | 'entitle';
};

const SECTIONS: SectionDef[] = [
  { id: 'general', label: 'General', icon: 'settings', group: 'Organisation', desc: 'Name and contact details', keywords: 'organisation name contact email support url', keys: ['orgName', 'contactEmail', 'supportUrl'] },
  { id: 'branding', label: 'Branding', icon: 'sparkle', group: 'Organisation', desc: 'Logo, favicon and logo size', keywords: 'logo favicon icon size brand', keys: ['logo', 'favicon', 'logoHeight'] },
  { id: 'landing', label: 'Landing page', icon: 'dash', group: 'Organisation', desc: 'Public home page hero and partners', keywords: 'hero headline partners trusted by home', keys: ['heroTitle', 'heroSubtitle', 'heroImage', 'partnersTitle', 'partnersText', 'partnerLogos'] },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: 'palette',
    group: 'Look & feel',
    desc: '550 colour themes, 150+ design styles, dark mode, fonts',
    keywords: 'theme colour color palette style design glass neumorphism brutal dark light mode font radius corners scene anime deluxe artwork personal',
    keys: ['themePresetId', 'light', 'dark', 'font', 'radiusMd', 'radiusLg', 'themeMode', 'uiStyle', 'allowUserThemes', 'allowUserStyles', 'showScene', 'heroArt'],
  },
  { id: 'premium', label: 'Premium', icon: 'crown', group: 'Look & feel', desc: 'Membership on/off and wording', keywords: 'premium membership paid upgrade subscription', keys: ['premiumEnabled', 'premiumName', 'premiumHowTo', 'premiumPerks'], level: 'super' },
  { id: 'themeAccess', label: 'Theme access', icon: 'palette', group: 'Look & feel', desc: 'Which themes are Premium', keywords: 'premium themes tiers free locked deluxe anime entitlement', keys: ['themeTiers', 'themeOverrides', 'styleTiers', 'styleOverrides'], level: 'entitle' },
  { id: 'features', label: 'Features', icon: 'dash', group: 'Learning', desc: 'Switch sections on or off', keywords: 'quizzes certificates syllabus gradebook queries modules', keys: ['featureQuizzes', 'featureCertificates', 'featureSyllabus', 'featureGradebook', 'featureQueries'] },
  { id: 'announcement', label: 'Announcement', icon: 'bell', group: 'Learning', desc: 'Banner at the top of every page', keywords: 'banner message notice alert', keys: ['announcementEnabled', 'announcementText', 'announcementTone', 'announcementLink', 'announcementAudience'] },
  { id: 'certificates', label: 'Certificates', icon: 'award', group: 'Learning', desc: 'Issuer, signatory and numbering', keywords: 'certificate signature signatory prefix footer issuer', keys: ['certIssuerName', 'certSignatoryName', 'certSignatoryTitle', 'certSignatureImage', 'certPrefix', 'certFooterText'] },
  { id: 'attendanceRules', label: 'Attendance rules', icon: 'attendance', group: 'Learning', desc: 'Low-attendance alerts', keywords: 'attendance threshold absent absence streak alert', keys: ['attendanceThreshold', 'absenceStreakAlert', 'attendanceAlerts'] },
  { id: 'ai', label: 'AI grading', icon: 'grading', group: 'Learning', desc: 'Suggested marks for mentors', keywords: 'ai artificial intelligence grading rubric feedback limit cost', keys: ['aiGradingEnabled', 'aiMonthlyLimit', 'aiMaxChars'], level: 'super' },
  { id: 'members', label: 'Members & IDs', icon: 'users', group: 'Learning', desc: 'Member ID rules', keywords: 'member id roll number format required', keys: ['memberIdRequired', 'memberIdFormat'] },
  { id: 'security', label: 'Security', icon: 'shield', group: 'Access & safety', desc: 'Two-step sign-in, sessions, passwords', keywords: '2fa two-step authenticator mfa session length password alerts', keys: ['twoFactorPolicy', 'sessionMaxHours', 'passwordMinLength', 'newSignInAlerts'], level: 'royal' },
  { id: 'signin', label: 'Sign-in page', icon: 'user', group: 'Access & safety', desc: 'Note shown under the sign-in form', keywords: 'login notice note', keys: ['loginNotice'] },
  { id: 'maintenance', label: 'Maintenance', icon: 'settings', group: 'Access & safety', desc: 'Temporarily close the LMS', keywords: 'maintenance downtime close', keys: ['maintenanceMode', 'maintenanceMessage'], level: 'royal' },
  { id: 'retention', label: 'Data retention', icon: 'shield', group: 'Access & safety', desc: 'How long logs are kept', keywords: 'retention delete cleanup audit notifications privacy', keys: ['auditRetentionDays', 'notificationRetentionDays'], level: 'super' },
  { id: 'roles', label: 'Roles & delegation', icon: 'users', group: 'Access & safety', desc: 'Who may do what', keywords: 'roles permissions super royal admin mentor delegate rbac', keys: ['permissionOverrides'], level: 'super' },
];

const KEY_LABEL: Partial<Record<keyof ThemeSettings, string>> = {
  light: 'light colours',
  dark: 'dark colours',
  themePresetId: 'colour theme',
  uiStyle: 'design style',
};

const APPEARANCE_KEYS: (keyof ThemeSettings)[] = ['light', 'dark', 'font', 'radiusMd', 'radiusLg', 'themePresetId', 'uiStyle', 'showScene'];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function SettingsShell({
  initial,
  canRoyal,
  canSuper = false,
  canEntitle = false,
  aiConfigured = false,
  initialSection,
  twoFactorStats,
  viewerHas2fa = false,
}: {
  initial: ThemeSettings;
  canRoyal: boolean;
  canSuper?: boolean;
  canEntitle?: boolean;
  aiConfigured?: boolean;
  initialSection?: string;
  twoFactorStats: TwoFactorStatRow[];
  viewerHas2fa?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<ThemeSettings>(initial);
  const [form, setForm] = useState<ThemeSettings>(initial);
  const [section, setSection] = useState<SectionId>(
    SECTIONS.some((s) => s.id === initialSection) ? (initialSection as SectionId) : 'general'
  );
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [hoverPreset, setHoverPreset] = useState<ThemePreset | null>(null);
  const [hoverStyle, setHoverStyle] = useState<UiStyle | null>(null);

  const set: SetField = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), []);

  const changed = useMemo(
    () => (Object.keys(form) as (keyof ThemeSettings)[]).filter((k) => !same(form[k], saved[k])),
    [form, saved]
  );
  const dirty = changed.length > 0;

  // ---- live preview of unsaved appearance (+ hover previews) ----
  const appearanceDirty = APPEARANCE_KEYS.some((k) => !same(form[k], saved[k]));
  const previewCss = useMemo(() => {
    if (!appearanceDirty && !hoverPreset && !hoverStyle) return null;
    try {
      let css = orgAppearanceCss(form);
      if (hoverPreset) css += presetCss(hoverPreset, { showScene: form.showScene });
      if (hoverStyle) css += uiStyleCss(hoverStyle);
      return css;
    } catch {
      return null;
    }
  }, [appearanceDirty, form, hoverPreset, hoverStyle]);
  const previewFonts = useMemo(
    () => (previewCss ? fontsHref(hoverPreset?.font ?? form.font, hoverStyle ?? findUiStyle(form.uiStyle)) : null),
    [previewCss, hoverPreset, hoverStyle, form.font, form.uiStyle]
  );
  useLivePreview(previewCss, previewFonts);

  // ---- keep ?section= in the address bar (no navigation) ----
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('section', section);
      window.history.replaceState(null, '', url.toString());
    } catch {
      /* ignore */
    }
  }, [section]);

  // ---- warn before leaving with unsaved changes ----
  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  const save = useCallback(() => {
    if (!dirty || pending) return;
    setToast(null);
    startTransition(async () => {
      const res = await saveSettings(form);
      if (res.ok) {
        setSaved(form);
        setToast({ kind: 'ok', text: 'Settings saved. Everyone sees the changes on their next page load.' });
        router.refresh();
      } else {
        setToast({ kind: 'err', text: res.error });
      }
    });
  }, [dirty, pending, form, router]);

  // Ctrl/⌘ S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  useEffect(() => {
    if (!toast || toast.kind === 'err') return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const visibleSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return SECTIONS;
    return SECTIONS.filter((s) => `${s.label} ${s.desc} ${s.keywords}`.toLowerCase().includes(term));
  }, [query]);

  const groups = useMemo(() => {
    const m = new Map<string, SectionDef[]>();
    for (const s of visibleSections) m.set(s.group, [...(m.get(s.group) ?? []), s]);
    return Array.from(m.entries());
  }, [visibleSections]);

  const sectionDirty = (s: SectionDef) => s.keys.some((k) => changed.includes(k));
  const current = SECTIONS.find((s) => s.id === section)!;
  const props = { form, set, setForm, canRoyal, canSuper, canEntitle };
  const locked = (s: SectionDef) => (s.level === 'royal' && !canRoyal) || (s.level === 'super' && !canSuper) || (s.level === 'entitle' && !canEntitle);
  const preset = findPreset(form.themePresetId);
  const style = findUiStyle(form.uiStyle);
  const featuresOn = [form.featureQuizzes, form.featureCertificates, form.featureSyllabus, form.featureGradebook, form.featureQueries].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ---------------- Header ---------------- */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-5 sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 w-56 h-56 rounded-full bg-accent opacity-70" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Admin</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-1.5 text-sm text-muted max-w-xl">Everything about your LMS in one place. Changes apply to everyone after you save.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface/80 border border-border">
              <NavIcon name="palette" size={14} /> {preset?.name ?? 'Custom colours'}
            </span>
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface/80 border border-border">
              <NavIcon name="sparkle" size={14} /> {style?.name ?? 'Classic'}
            </span>
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface/80 border border-border">
              <NavIcon name="dash" size={14} /> {featuresOn}/5 features on
            </span>
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface/80 border border-border">
              <NavIcon name="shield" size={14} /> 2-step: {form.twoFactorPolicy}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] gap-6 items-start">
        {/* ---------------- Section navigation ---------------- */}
        <aside className="lg:sticky lg:top-24 space-y-3 min-w-0">
          <div className="relative">
            <NavIcon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings…"
              aria-label="Search settings"
              className="input h-10 pl-9 text-sm"
            />
          </div>

          {/* Phones / tablets: horizontal pills */}
          <nav aria-label="Settings sections" className="lg:hidden no-scrollbar flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
            {visibleSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={section === s.id ? 'page' : undefined}
                className={`relative shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-sm font-medium transition-colors ${
                  section === s.id ? 'bg-primary text-primary-fg border-primary' : 'border-border bg-surface text-muted hover:text-text'
                }`}
              >
                <NavIcon name={s.icon} size={15} />
                {s.label}
                {sectionDirty(s) && <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-label="unsaved" />}
              </button>
            ))}
          </nav>

          {/* Desktop: grouped list */}
          <nav aria-label="Settings sections" className="hidden lg:block bg-surface border border-border rounded-[var(--radius-lg)] p-2">
            {groups.map(([g, items]) => (
              <div key={g} className="py-1">
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/80">{g}</p>
                {items.map((s) => {
                  const active = section === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSection(s.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-left transition-colors ${
                        active ? 'bg-primary text-primary-fg' : 'hover:bg-hero text-text'
                      }`}
                    >
                      <NavIcon name={s.icon} size={17} className={active ? '' : 'text-muted'} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{s.label}</span>
                        <span className={`block text-[11px] truncate ${active ? 'opacity-80' : 'text-muted'}`}>{s.desc}</span>
                      </span>
                      {locked(s) && (
                        <span title={s.level === 'super' ? 'Super admins only' : 'Royal admins only'} aria-label="View only">
                          {s.level === 'super' ? '🛡️' : '👑'}
                        </span>
                      )}
                      {sectionDirty(s) && <span className="w-2 h-2 rounded-full bg-warning shrink-0" aria-label="unsaved changes" />}
                    </button>
                  );
                })}
              </div>
            ))}
            {groups.length === 0 && <p className="px-3 py-6 text-sm text-muted text-center">No settings match “{query}”.</p>}
          </nav>
        </aside>

        {/* ---------------- Active section ---------------- */}
        <form
          className="min-w-0 space-y-5 pb-24"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-[var(--radius-md)] bg-primary text-primary-fg" aria-hidden>
              <NavIcon name={current.icon} size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-tight">{current.label}</h2>
              <p className="text-sm text-muted">{current.desc}</p>
            </div>
          </div>

          {section === 'general' && <GeneralSection {...props} />}
          {section === 'branding' && <BrandingSection {...props} />}
          {section === 'landing' && <LandingSection {...props} />}
          {section === 'appearance' && <AppearanceSection {...props} onHoverPreset={setHoverPreset} onHoverStyle={setHoverStyle} />}
          {section === 'features' && <FeaturesSection {...props} />}
          {section === 'announcement' && <AnnouncementSection {...props} />}
          {section === 'certificates' && <CertificatesSection {...props} />}
          {section === 'members' && <MembersSection {...props} />}
          {section === 'security' && <SecuritySection {...props} stats={twoFactorStats} viewerHas2fa={viewerHas2fa} />}
          {section === 'signin' && <SignInSection {...props} />}
          {section === 'maintenance' && <MaintenanceSection {...props} />}
          {section === 'premium' && <PremiumSection {...props} />}
          {section === 'themeAccess' && <ThemeAccessSection {...props} />}
          {section === 'attendanceRules' && <AttendanceRulesSection {...props} />}
          {section === 'ai' && <AiSection {...props} aiConfigured={aiConfigured} />}
          {section === 'retention' && <RetentionSection {...props} />}
          {section === 'roles' && <RolesSection {...props} />}
        </form>
      </div>

      {/* ---------------- Save bar ---------------- */}
      <div
        className={`fixed z-40 left-1/2 -translate-x-1/2 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 w-[min(640px,calc(100vw-1.5rem))] transition-all duration-200 ${
          dirty || toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        role="region"
        aria-label="Save settings"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl">
          <p className="flex-1 min-w-0 text-sm">
            {toast ? (
              <span className={toast.kind === 'ok' ? 'text-success' : 'text-danger'}>{toast.text}</span>
            ) : (
              <>
                <b>
                  {changed.length} unsaved change{changed.length === 1 ? '' : 's'}
                </b>
                <span className="text-muted">
                  {' '}
                  · {changed.slice(0, 3).map((k) => KEY_LABEL[k] ?? k.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}
                  {changed.length > 3 ? '…' : ''}
                </span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {dirty && (
              <button type="button" className="btn-outline h-10 px-4" disabled={pending} onClick={() => { setForm(saved); setToast(null); }}>
                Discard
              </button>
            )}
            {dirty ? (
              <button type="button" className="btn-primary h-10 px-5" disabled={pending} onClick={save}>
                {pending && <span className="w-4 h-4 rounded-full border-2 border-primary-fg/30 border-t-primary-fg animate-spin" />}
                {pending ? 'Saving…' : 'Save changes'}
                {!pending && <span className="kbd !bg-transparent !text-current !border-current/40 hidden sm:inline-flex">Ctrl S</span>}
              </button>
            ) : (
              <button type="button" className="btn-outline h-10 px-4" onClick={() => setToast(null)}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
