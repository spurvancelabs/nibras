// =============================================================================
// FILE: app/(app)/admin/settings/sections/types.ts   (NEW FILE)
// Shared props for the settings sections.
// =============================================================================

import type { ThemeSettings } from '@/lib/theme-config';
import type { ThemePreset } from '@/lib/theme-config';
import type { UiStyle } from '@/lib/ui-styles';

export type SetField = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;

export type SectionProps = {
  form: ThemeSettings;
  set: SetField;
  setForm: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  /** Royal admin (maintenance + security settings). */
  canRoyal: boolean;
  /** Super admin (global policies: premium, AI, retention, delegation). */
  canSuper: boolean;
  /** May edit which themes are premium (Royal by default; delegable). */
  canEntitle: boolean;
  /** Programs (for "join this program after sign-up"). */
  programs?: { id: string; name: string }[];
};

export type AppearanceProps = SectionProps & {
  onHoverPreset: (p: ThemePreset | null) => void;
  onHoverStyle: (s: UiStyle | null) => void;
};

export type TwoFactorStatRow = { role: 'admin' | 'mentor' | 'student'; total: number; enabled: number };
