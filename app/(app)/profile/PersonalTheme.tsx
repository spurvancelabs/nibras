// =============================================================================
// FILE: app/(app)/profile/PersonalTheme.tsx   (NEW FILE)
// Pick a personal theme (overrides the organisation theme for you only).
// Hover previews the theme live; click saves it.
// =============================================================================

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ThemePresetPicker from '@/components/ThemePresetPicker';
import { presetCss } from '@/lib/theme-css';
import { findPreset, type ThemePreset } from '@/lib/theme-config';
import { saveThemeAction } from './actions';
import { Alert } from '@/components/ui';

export default function PersonalTheme({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState<string>(current);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  function preview(p: ThemePreset | null) {
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.id = 'theme-live-preview';
      document.body.appendChild(styleRef.current);
    }
    const show = p ?? findPreset(value) ?? null;
    styleRef.current.textContent = show ? presetCss(show) : '';
  }

  useEffect(() => () => styleRef.current?.remove(), []);

  function select(p: ThemePreset | null) {
    const id = p?.id ?? '';
    setValue(id);
    setMsg(null);
    start(async () => {
      const res = await saveThemeAction({ presetId: id });
      if (res.ok) {
        setMsg({ tone: 'success', text: p ? `“${p.name}” is now your theme.` : 'Using the organisation theme again.' });
        styleRef.current && (styleRef.current.textContent = '');
        router.refresh();
      } else {
        setMsg({ tone: 'error', text: res.error });
      }
    });
  }

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-semibold">Your theme</h2>
        <p className="text-xs text-muted">
          Choose colours just for you. Hover to preview, click to save. Light/dark mode still follows the toggle at the top.
        </p>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div aria-busy={pending}>
        <ThemePresetPicker value={value || null} onSelect={select} onPreview={preview} noneLabel="Organisation theme" />
      </div>
    </section>
  );
}
