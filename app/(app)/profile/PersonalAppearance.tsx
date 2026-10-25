// =============================================================================
// FILE: app/(app)/profile/PersonalAppearance.tsx   (NEW FILE — replaces
// PersonalTheme.tsx)
// Your own colour theme + design style + light/dark mode. Hover previews the
// whole page live; click saves instantly (only for you).
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

type Props = {
  theme: string;
  style: string;
  allowThemes: boolean;
  allowStyles: boolean;
  showScene: boolean;
  orgThemeName: string;
  orgStyleName: string;
};

export default function PersonalAppearance({ theme, style, allowThemes, allowStyles, showScene, orgThemeName, orgStyleName }: Props) {
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
    const id = p?.id ?? '';
    setThemeId(id);
    setMsg(null);
    start(async () => {
      const r = await saveThemeAction({ presetId: id });
      if (r.ok) {
        setMsg({ tone: 'success', text: p ? `“${p.name}” is now your colour theme.` : 'Using the organisation colours again.' });
        preview('');
        router.refresh();
      } else setMsg({ tone: 'error', text: r.error });
    });
  }

  function chooseStyle(s: UiStyle | null) {
    const id = s?.id ?? '';
    setStyleId(id);
    setMsg(null);
    start(async () => {
      const r = await saveStyleAction({ styleId: id });
      if (r.ok) {
        setMsg({ tone: 'success', text: s ? `“${s.name}” is now your design style.` : 'Using the organisation style again.' });
        preview('');
        router.refresh();
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
          <ThemePresetPicker value={themeId || null} onSelect={chooseTheme} onPreview={onPreviewTheme} noneLabel="Organisation colours" />
        </SettingsCard>
      ) : (
        <SettingsCard title="Your colour theme" description="Your admin has turned off personal colour themes." icon={<NavIcon name="palette" />} />
      )}

      {allowStyles ? (
        <SettingsCard title="Your design style" description="Change how cards, buttons and inputs look — just for you." icon={<NavIcon name="sparkle" />}>
          <UiStylePicker value={styleId || null} onSelect={chooseStyle} onPreview={onPreviewStyle} noneLabel="Organisation style" dark={isDark} />
        </SettingsCard>
      ) : (
        <SettingsCard title="Your design style" description="Your admin has turned off personal design styles." icon={<NavIcon name="sparkle" />} />
      )}
    </div>
  );
}
