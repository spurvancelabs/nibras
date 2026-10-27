// =============================================================================
// FILE: app/(app)/profile/PersonalAppearance.tsx   (NEW FILE — replaces
// PersonalTheme.tsx)
// Your own colour theme + design style + light/dark mode. Hover previews the
// whole page live; click saves instantly (only for you).
// UPDATED: Premium themes/styles show a crown. Free members can still
// preview them; choosing one opens the Upgrade dialog instead of saving
// (the server refuses it too).
// =============================================================================

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ThemePresetPicker from '@/components/ThemePresetPicker';
import UiStylePicker from '@/components/UiStylePicker';
import ThemeToggle from '@/components/ThemeToggle';
import { SettingsCard, Pill } from '@/components/settings-ui';
import { Alert } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { presetCss } from '@/lib/theme-css';
import { findPreset, type ThemePreset } from '@/lib/theme-config';
import { findUiStyle, uiStyleCss, type UiStyle } from '@/lib/ui-styles';
import { saveThemeAction, saveStyleAction } from './actions';
import { Modal } from '@/components/feedback';
import { themeTier, styleTier, type EntitlementPolicy } from '@/lib/entitlements';
import Link from 'next/link';
import { smoothThemeChange } from '@/lib/theme-shift';

type Props = {
  theme: string;
  style: string;
  allowThemes: boolean;
  allowStyles: boolean;
  showScene: boolean;
  orgThemeName: string;
  orgStyleName: string;
  policy: EntitlementPolicy;
  /** User may use premium items now. */
  hasPremium: boolean;
  premiumName: string;
};

export default function PersonalAppearance({
  theme,
  style,
  allowThemes,
  allowStyles,
  showScene,
  orgThemeName,
  orgStyleName,
  policy,
  hasPremium,
  premiumName,
}: Props) {
  const [upsell, setUpsell] = useState<string | null>(null);
  const themePremium = (p: ThemePreset) => themeTier(p, policy) === 'premium';
  const stylePremium = (st: UiStyle) => styleTier(st, policy) === 'premium';
  const themeLocked = (p: ThemePreset) => !hasPremium && themePremium(p);
  const styleLocked = (st: UiStyle) => !hasPremium && stylePremium(st);
  const router = useRouter();
  const [themeId, setThemeId] = useState(theme);
  const [styleId, setStyleId] = useState(style);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isDark, setIsDark] = useState(false);
  const previewRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      obs.disconnect();
      previewRef.current?.remove();
    };
  }, []);

  function preview(css: string) {
    if (!previewRef.current) {
      previewRef.current = document.createElement('style');
      previewRef.current.id = 'personal-live-preview';
      document.body.appendChild(previewRef.current);
    }
    previewRef.current.textContent = css;
  }

  function onPreviewTheme(p: ThemePreset | null) {
    preview(p ? presetCss(p, { showScene }) : '');
  }
  function onPreviewStyle(s: UiStyle | null) {
    preview(s ? uiStyleCss(s) : '');
  }

  function chooseTheme(p: ThemePreset | null) {
    if (p && themeLocked(p)) {
      setUpsell(p.name);
      return;
    }
    const id = p?.id ?? '';
    setThemeId(id);
    setMsg(null);
    start(async () => {
      const r = await saveThemeAction({ presetId: id });
      if (r.ok) {
        setMsg({ tone: 'success', text: p ? `“${p.name}” is now your colour theme.` : 'Using the organisation colours again.' });
        smoothThemeChange(() => {
          preview('');
          router.refresh();
        }, 800);
      } else if ('premiumRequired' in r && r.premiumRequired) {
        setThemeId(theme);
        setUpsell(p?.name ?? 'This theme');
      } else setMsg({ tone: 'error', text: r.error });
    });
  }

  function chooseStyle(s: UiStyle | null) {
    if (s && styleLocked(s)) {
      setUpsell(s.name);
      return;
    }
    const id = s?.id ?? '';
    setStyleId(id);
    setMsg(null);
    start(async () => {
      const r = await saveStyleAction({ styleId: id });
      if (r.ok) {
        setMsg({ tone: 'success', text: s ? `“${s.name}” is now your design style.` : 'Using the organisation style again.' });
        smoothThemeChange(() => {
          preview('');
          router.refresh();
        }, 800);
      } else if ('premiumRequired' in r && r.premiumRequired) {
        setStyleId(style);
        setUpsell(s?.name ?? 'This style');
      } else setMsg({ tone: 'error', text: r.error });
    });
  }

  const currentTheme = findPreset(themeId);
  const currentStyle = findUiStyle(styleId);

  return (
    <div className="space-y-5" aria-busy={pending}>
      <SettingsCard title="Mode" description="Light, dark, or follow your device. Saved on this browser." icon={<NavIcon name="moon" />}>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill tone="primary">🎨 {currentTheme?.name ?? `${orgThemeName} (organisation)`}</Pill>
            <Pill tone="primary">✨ {currentStyle?.name ?? `${orgStyleName} (organisation)`}</Pill>
          </div>
        </div>
      </SettingsCard>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {allowThemes ? (
        <SettingsCard title="Your colour theme" description="Only you see it. Hover to preview, click to apply." icon={<NavIcon name="palette" />}>
          <ThemePresetPicker
            value={themeId || null}
            onSelect={chooseTheme}
            onPreview={onPreviewTheme}
            noneLabel="Organisation colours"
            isPremium={policy.premiumEnabled ? themePremium : undefined}
            isLocked={policy.premiumEnabled ? themeLocked : undefined}
          />
        </SettingsCard>
      ) : (
        <SettingsCard title="Your colour theme" description="Your admin has turned off personal colour themes." icon={<NavIcon name="palette" />} />
      )}

      {allowStyles ? (
        <SettingsCard title="Your design style" description="Change how cards, buttons and inputs look — just for you." icon={<NavIcon name="sparkle" />}>
          <UiStylePicker
            value={styleId || null}
            onSelect={chooseStyle}
            onPreview={onPreviewStyle}
            noneLabel="Organisation style"
            dark={isDark}
            isPremium={policy.premiumEnabled ? stylePremium : undefined}
            isLocked={policy.premiumEnabled ? styleLocked : undefined}
          />
        </SettingsCard>
      ) : (
        <SettingsCard title="Your design style" description="Your admin has turned off personal design styles." icon={<NavIcon name="sparkle" />} />
      )}

      <Modal
        open={!!upsell}
        onClose={() => {
          setUpsell(null);
          preview('');
        }}
        size="sm"
        title={`“${upsell ?? ''}” is part of ${premiumName}`}
        description="You can preview every premium theme and style. To keep one, you need an active membership."
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setUpsell(null);
                preview('');
              }}
            >
              Not now
            </button>
            <Link href="/premium" className="btn-primary" data-autofocus>
              <NavIcon name="crown" size={16} /> See {premiumName}
            </Link>
          </>
        }
      >
        <ul className="text-sm space-y-1.5 text-muted">
          <li>✨ Deluxe &amp; Anime Deluxe themes with illustrated scenes and characters</li>
          <li>💎 The flagship Deluxe design style</li>
          <li>🔁 Your choice is saved — it comes back automatically when you renew</li>
        </ul>
      </Modal>
    </div>
  );
}
