// =============================================================================
// FILE: lib/ui-styles.ts   (NEW FILE — client-safe)
// DESIGN STYLES ("UI styles"): 150+ looks such as Glassmorphism, Neumorphism,
// Neobrutalism, Windows 95, Cyberpunk HUD, Art Deco, Kawaii …
//
// How it works
//   A style is ONLY a set of CSS variables (--ui-*, --font-heading, --fx-*).
//   app/globals.css reads those variables for cards, buttons, inputs, the top
//   bar, headings and the page backdrop. Because every style always sets the
//   FULL variable set, switching styles never leaves anything behind, and the
//   same style works with every colour theme (500+) in light AND dark mode.
//
//   - Organisation style:  Settings → Appearance (root layout injects it)
//   - Personal style:      Profile → Appearance (if the admin allows it)
//   - Live preview:        the variables are set inline on a preview box
//
// IDs are stable (saved in the database) — never rename an id.
// =============================================================================

import { BACKDROPS, PATTERNS, type BackdropKey, type PatternKey } from './ui-patterns';
import { UI_FONTS, type FontKey } from './ui-fonts';

export type Vars = Record<string, string>;

export const UI_STYLE_CATEGORIES = [
  'Essentials',
  'Deluxe',
  'Glass & Light',
  'Soft & Tactile',
  'Bold & Brutal',
  'Gradient & Motion',
  'Futuristic',
  'Retro & Nostalgia',
  'OS-inspired',
  'Luxury & Editorial',
  'Playful & Artsy',
  'Nature & Organic',
  'Dashboards',
] as const;
export type UiStyleCategory = (typeof UI_STYLE_CATEGORIES)[number];

export type UiStyle = {
  id: string;
  name: string;
  category: UiStyleCategory;
  description: string;
  /** Light-mode variables (merged over DEFAULT_UI_VARS). */
  vars: Vars;
  /** Dark-mode overrides. */
  dark?: Vars;
  /** Google font keys to load. */
  fonts: FontKey[];
  /** Looks best in this mode (the picker offers to switch). */
  mode?: 'dark' | 'light';
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const P = 'var(--color-primary)';
const P2 = 'var(--color-primary-2, var(--color-primary))';
const T = 'var(--color-text)';
const S = 'var(--color-surface)';
const B = 'var(--color-bg)';
const A = 'var(--color-accent)';
const BR = 'var(--color-border)';
const mix = (c: string, pct: number, other = 'transparent') => `color-mix(in srgb, ${c} ${pct}%, ${other})`;
const W = (pct: number) => mix('#ffffff', pct);
const K = (pct: number) => mix('#000000', pct);

/** Classic = the original Nibras look. Every style starts from these. */
export const DEFAULT_UI_VARS: Vars = {
  '--ui-surface-bg': S,
  '--ui-surface-paint': 'initial',
  '--ui-surface-blur': 'none',
  '--ui-card-shadow': 'initial',
  '--ui-card-shadow-hover': 'initial',
  '--ui-lift': '0px',
  '--ui-border-w': '1px',
  '--ui-border-c': BR,
  '--ui-border-style': 'initial',
  '--ui-radius-scale': '1',
  '--ui-primary-image': 'none',
  '--ui-btn-shadow': 'initial',
  '--ui-btn-case': 'none',
  '--ui-btn-tracking': 'normal',
  '--ui-btn-weight': '500',
  '--ui-input-bg': S,
  '--ui-input-shadow': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '--ui-topbar-bg': mix(S, 85),
  '--ui-topbar-blur': 'blur(12px)',
  '--ui-sidebar-bg': S,
  '--ui-backdrop': 'none',
  '--ui-backdrop-size': 'auto',
  '--ui-backdrop-anim': 'none',
  '--ui-pattern': 'none',
  '--ui-pattern-color': T,
  '--ui-pattern-opacity': '0',
  '--ui-hero-image': 'none',
  '--ui-font-body': 'initial',
  '--font-heading': 'initial',
  '--ui-heading-case': 'none',
  '--ui-heading-tracking': 'initial',
  '--ui-heading-glow': 'none',
  '--ui-heading-image': 'none',
  '--ui-heading-anim': 'none',
  '--ui-heading-fill': 'currentColor',
  '--ui-dur': '200ms',
  '--ui-enter': 'none',
  '--ui-press': '1',
  '--ui-progress-display': 'none',
  '--fx-sketch': '0',
  '--fx-tilt': '0',
  '--fx-asym': '0',
  '--fx-bevel': '0',
  '--fx-deluxe': '0',
};

type Part = Vars;

const radius = (scale: number): Part => ({ '--ui-radius-scale': String(scale) });
const backdrop = (k: BackdropKey, anim = false): Part => ({
  '--ui-backdrop': BACKDROPS[k],
  ...(anim ? { '--ui-backdrop-size': '200% 200%', '--ui-backdrop-anim': 'ui-drift 26s ease-in-out infinite alternate' } : {}),
});
const pattern = (k: PatternKey, opacity: number, color: string = T): Part => ({
  '--ui-pattern': PATTERNS[k],
  '--ui-pattern-opacity': String(opacity),
  '--ui-pattern-color': color,
});
const heading = (f: FontKey, opts: { upper?: boolean; tracking?: string } = {}): Part => ({
  '--font-heading': UI_FONTS[f].css,
  ...(opts.upper ? { '--ui-heading-case': 'uppercase' } : {}),
  ...(opts.tracking ? { '--ui-heading-tracking': opts.tracking } : {}),
});
const body = (f: FontKey): Part => ({ '--ui-font-body': UI_FONTS[f].css });
const gradientBtn = (angle = 135): Part => ({ '--ui-primary-image': `linear-gradient(${angle}deg, ${P}, ${P2})` });
const glossyBtn: Part = {
  '--ui-primary-image': `linear-gradient(180deg, ${W(42)} 0%, ${W(10)} 48%, transparent 52%, ${K(10)} 100%)`,
};
const motion = (lift = -3): Part => ({
  '--ui-enter': 'ui-rise .32s cubic-bezier(.2,.7,.2,1) both',
  '--ui-lift': `${lift}px`,
  '--ui-dur': '260ms',
});
const upperButtons = (tracking = '.06em'): Part => ({ '--ui-btn-case': 'uppercase', '--ui-btn-tracking': tracking });
const headingGradient: Part = {
  '--ui-heading-image': `linear-gradient(100deg, ${T} 10%, ${P} 55%, ${P2} 90%)`,
  '--ui-heading-fill': 'transparent',
};
const progressBar: Part = { '--ui-progress-display': 'block' };

// ----- surfaces -----

function glass(blur = 16, alpha = 58, extra: Part = {}): Part {
  return {
    '--ui-surface-bg': mix(S, alpha),
    '--ui-surface-blur': `blur(${blur}px) saturate(1.6)`,
    '--ui-border-c': mix(T, 10),
    '--ui-card-shadow': `inset 0 1px 0 ${W(45)}, 0 10px 30px ${mix(T, 8)}`,
    '--ui-card-shadow-hover': `inset 0 1px 0 ${W(55)}, 0 16px 40px ${mix(T, 12)}`,
    '--ui-input-bg': mix(S, alpha + 15),
    '--ui-topbar-bg': mix(S, Math.max(35, alpha - 15)),
    '--ui-topbar-blur': `blur(${blur + 4}px) saturate(1.6)`,
    '--ui-sidebar-bg': mix(S, alpha),
    ...extra,
  };
}
const glassDark: Vars = {
  '--ui-card-shadow': `inset 0 1px 0 ${W(7)}, 0 10px 30px ${K(35)}`,
  '--ui-card-shadow-hover': `inset 0 1px 0 ${W(10)}, 0 16px 40px ${K(45)}`,
  '--ui-border-c': W(9),
};

function neu(depth = 9, soft = false): { v: Part; d: Vars } {
  const d = depth;
  const blur = d * 2;
  return {
    v: {
      '--ui-surface-bg': B,
      '--ui-border-w': '0px',
      '--ui-card-shadow': `${d}px ${d}px ${blur}px ${mix(T, soft ? 9 : 14)}, -${d}px -${d}px ${blur}px ${W(soft ? 75 : 90)}`,
      '--ui-card-shadow-hover': `${d + 3}px ${d + 3}px ${blur + 6}px ${mix(T, soft ? 11 : 16)}, -${d + 3}px -${d + 3}px ${blur + 6}px ${W(soft ? 80 : 95)}`,
      '--ui-input-bg': B,
      '--ui-input-shadow': `inset 3px 3px 7px ${mix(T, 12)}, inset -3px -3px 7px ${W(85)}`,
      '--ui-btn-shadow': `4px 4px 10px ${mix(T, 16)}, -4px -4px 10px ${W(80)}`,
      '--ui-topbar-bg': B,
      '--ui-sidebar-bg': B,
      '--ui-press': '.97',
    },
    d: {
      '--ui-card-shadow': `${d}px ${d}px ${blur}px ${K(55)}, -${d}px -${d}px ${blur}px ${W(5)}`,
      '--ui-card-shadow-hover': `${d + 3}px ${d + 3}px ${blur + 6}px ${K(60)}, -${d + 3}px -${d + 3}px ${blur + 6}px ${W(6)}`,
      '--ui-input-shadow': `inset 3px 3px 7px ${K(50)}, inset -3px -3px 7px ${W(5)}`,
      '--ui-btn-shadow': `4px 4px 10px ${K(55)}, -4px -4px 10px ${W(5)}`,
    },
  };
}

function clay(r = 1.7): { v: Part; d: Vars } {
  return {
    v: {
      '--ui-border-w': '0px',
      ...radius(r),
      '--ui-card-shadow': `inset -6px -6px 14px ${mix(T, 7)}, inset 6px 6px 14px ${W(70)}, 12px 18px 34px ${mix(T, 12)}`,
      '--ui-card-shadow-hover': `inset -6px -6px 14px ${mix(T, 7)}, inset 6px 6px 14px ${W(75)}, 16px 24px 42px ${mix(T, 16)}`,
      '--ui-btn-shadow': `inset -3px -3px 7px ${K(18)}, inset 3px 3px 7px ${W(35)}, 6px 10px 18px ${mix(P, 30)}`,
      '--ui-input-shadow': `inset 3px 3px 8px ${mix(T, 10)}, inset -3px -3px 8px ${W(70)}`,
      '--ui-lift': '-3px',
      '--ui-press': '.96',
    },
    d: {
      '--ui-card-shadow': `inset -6px -6px 14px ${K(35)}, inset 6px 6px 14px ${W(6)}, 12px 18px 34px ${K(45)}`,
      '--ui-card-shadow-hover': `inset -6px -6px 14px ${K(35)}, inset 6px 6px 14px ${W(8)}, 16px 24px 42px ${K(55)}`,
      '--ui-input-shadow': `inset 3px 3px 8px ${K(45)}, inset -3px -3px 8px ${W(5)}`,
    },
  };
}

function brutal(w = 2, off = 5, r = 0.2, color = T): Part {
  return {
    '--ui-border-w': `${w}px`,
    '--ui-border-c': color,
    ...radius(r),
    '--ui-card-shadow': `${off}px ${off}px 0 0 ${color}`,
    '--ui-card-shadow-hover': `${off + 3}px ${off + 3}px 0 0 ${color}`,
    '--ui-lift': '-2px',
    '--ui-btn-shadow': `0 0 0 ${w}px ${color}, ${Math.max(3, off - 2)}px ${Math.max(3, off - 2)}px 0 ${w}px ${color}`,
    '--ui-input-shadow': `${Math.max(2, off - 3)}px ${Math.max(2, off - 3)}px 0 0 ${color}`,
    '--ui-btn-weight': '700',
    '--ui-topbar-bg': S,
    '--ui-press': '.97',
  };
}

const flat: Part = {
  '--ui-border-w': '0px',
  '--ui-card-shadow': 'none',
  '--ui-card-shadow-hover': 'none',
  '--ui-input-shadow': 'none',
  '--ui-btn-shadow': 'none',
};

function material(elev = 1): Part {
  const e1 = `0 1px 3px ${K(12)}, 0 1px 2px ${K(20)}`;
  const e2 = `0 3px 6px ${K(14)}, 0 3px 6px ${K(18)}`;
  const e3 = `0 10px 20px ${K(16)}, 0 6px 6px ${K(18)}`;
  return {
    '--ui-border-w': '0px',
    '--ui-card-shadow': elev > 1 ? e2 : e1,
    '--ui-card-shadow-hover': elev > 1 ? e3 : e2,
    '--ui-btn-shadow': e1,
    '--ui-lift': '-1px',
  };
}

function outline(w = 1.5, color = mix(T, 55)): Part {
  return {
    '--ui-surface-bg': 'transparent',
    '--ui-border-w': `${w}px`,
    '--ui-border-c': color,
    '--ui-card-shadow': 'none',
    '--ui-card-shadow-hover': `0 0 0 1px ${color}`,
    '--ui-input-bg': 'transparent',
    '--ui-input-shadow': 'none',
    '--ui-topbar-bg': mix(B, 90),
    '--ui-sidebar-bg': B,
  };
}

function neon(color = P, strength = 1): { v: Part; d: Vars } {
  const g = Math.round(28 * strength);
  return {
    v: {
      '--ui-border-c': mix(color, 55),
      '--ui-card-shadow': `0 0 0 1px ${mix(color, 30)}, 0 0 ${g}px ${mix(color, 18)}`,
      '--ui-card-shadow-hover': `0 0 0 1px ${mix(color, 60)}, 0 0 ${g + 14}px ${mix(color, 32)}`,
      '--ui-btn-shadow': `0 0 0 1px ${mix(color, 70)}, 0 0 ${g}px ${mix(color, 45)}`,
      '--ui-heading-glow': `0 0 18px ${mix(color, 45)}`,
    },
    d: {
      '--ui-card-shadow': `0 0 0 1px ${mix(color, 40)}, 0 0 ${g}px ${mix(color, 28)}, inset 0 0 ${g}px ${mix(color, 8)}`,
      '--ui-card-shadow-hover': `0 0 0 1px ${mix(color, 75)}, 0 0 ${g + 18}px ${mix(color, 45)}, inset 0 0 ${g}px ${mix(color, 12)}`,
      '--ui-heading-glow': `0 0 22px ${mix(color, 70)}`,
    },
  };
}

const metallicPaint = `linear-gradient(180deg, ${W(55)} 0%, ${W(8)} 45%, ${K(6)} 100%), ${S}`;
const metallicPaintDark = `linear-gradient(180deg, ${W(10)} 0%, ${W(2)} 45%, ${K(25)} 100%), ${S}`;
const holoPaint = `linear-gradient(125deg, ${mix('#a5f3fc', 18)} 0%, ${mix('#f0abfc', 18)} 30%, ${mix('#fde68a', 16)} 60%, ${mix('#a7f3d0', 18)} 100%), ${mix(S, 70)}`;
const bevel = (dark = false): string =>
  dark
    ? `inset -2px -2px 0 ${K(60)}, inset 2px 2px 0 ${W(18)}, inset -3px -3px 0 ${K(30)}, inset 3px 3px 0 ${W(8)}`
    : `inset -2px -2px 0 #0a0a0a, inset 2px 2px 0 #ffffff, inset -3px -3px 0 #808080, inset 3px 3px 0 #dfdfdf`;
const hudCorners = (c = P) =>
  `linear-gradient(${c},${c}) top left / 14px 2px no-repeat, linear-gradient(${c},${c}) top left / 2px 14px no-repeat, linear-gradient(${c},${c}) top right / 14px 2px no-repeat, linear-gradient(${c},${c}) top right / 2px 14px no-repeat, linear-gradient(${c},${c}) bottom left / 14px 2px no-repeat, linear-gradient(${c},${c}) bottom left / 2px 14px no-repeat, linear-gradient(${c},${c}) bottom right / 14px 2px no-repeat, linear-gradient(${c},${c}) bottom right / 2px 14px no-repeat`;
const tapePaint = `linear-gradient(${mix('var(--color-warning)', 40)}, ${mix('var(--color-warning)', 40)}) top 0 left 50% / 72px 14px no-repeat`;

// ---------------------------------------------------------------------------
// Definition helper
// ---------------------------------------------------------------------------

type Def = {
  name: string;
  cat: UiStyleCategory;
  desc: string;
  parts?: Part[];
  dark?: Vars;
  fonts?: FontKey[];
  mode?: 'dark' | 'light';
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function make(d: Def & { id?: string }): UiStyle {
  return {
    id: d.id ?? slug(d.name),
    name: d.name,
    category: d.cat,
    description: d.desc,
    vars: Object.assign({}, ...(d.parts ?? [])),
    dark: d.dark,
    fonts: d.fonts ?? [],
    mode: d.mode,
  };
}

const NEU = neu();
const NEU_SOFT = neu(6, true);
const NEU_DEEP = neu(12);
const CLAY = clay();
const CLAY_XL = clay(2.2);
const NEON = neon();
const NEON_STRONG = neon(P, 1.5);

// ---------------------------------------------------------------------------
// The styles
// ---------------------------------------------------------------------------

const DEFS: (Def & { id?: string })[] = [
  // ===== Essentials =====
  { id: 'classic', name: 'Classic', cat: 'Essentials', desc: 'The original clean Nibras look (default).' },
  { name: 'Minimalism', cat: 'Essentials', desc: 'Lots of white space, hairline borders, nothing extra.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(T, 8) }, radius(0.8), { '--ui-topbar-bg': mix(B, 92), '--ui-sidebar-bg': B }], fonts: ['inter'] },
  { name: 'Flat Design', cat: 'Essentials', desc: 'Solid colour blocks, no shadows or gradients.', parts: [flat, { '--ui-surface-bg': mix(P, 5, S), '--ui-topbar-bg': S }, radius(0.6)] },
  { name: 'Card-Based UI', cat: 'Essentials', desc: 'Everything lives on soft elevated cards.', parts: [{ '--ui-border-c': mix(T, 6), '--ui-card-shadow': `0 1px 2px ${K(6)}, 0 4px 14px ${K(6)}`, '--ui-card-shadow-hover': `0 2px 4px ${K(8)}, 0 12px 28px ${K(10)}`, '--ui-lift': '-2px' }, backdrop('plain'), radius(1.15)], dark: { '--ui-card-shadow': `0 1px 2px ${K(40)}, 0 4px 14px ${K(40)}` } },
  { name: 'Outline UI', cat: 'Essentials', desc: 'Clear outlines instead of filled panels.', parts: [outline(1.5)] },
  { name: 'Wireframe UI', cat: 'Essentials', desc: 'Blueprint-like wireframe: dashed outlines, mono labels.', parts: [outline(1.2, mix(T, 45)), { '--ui-border-style': 'dashed' }, heading('jetbrains'), pattern('gridFine', 0.06), radius(0.3)], fonts: ['jetbrains'] },
  { name: 'High-Contrast UI', cat: 'Essentials', desc: 'Strong outlines and bold focus — maximum readability.', parts: [{ '--ui-border-w': '2px', '--ui-border-c': T, '--ui-card-shadow': 'none', '--ui-input-shadow': 'none', '--ui-btn-weight': '700' }, radius(0.6)] },
  { name: 'Adaptive UI', cat: 'Essentials', desc: 'Quiet, balanced defaults that suit every theme and screen.', parts: [{ '--ui-border-c': mix(T, 9), '--ui-card-shadow': `0 1px 2px ${K(5)}` }, radius(1.1), backdrop('meshSoft')] },
  { name: 'Monochromatic UI', cat: 'Essentials', desc: 'Every surface tinted with one colour.', parts: [{ '--ui-surface-bg': mix(P, 6, S), '--ui-border-c': mix(P, 18, S), '--ui-input-bg': mix(P, 4, S), '--ui-topbar-bg': mix(P, 8, S), '--ui-sidebar-bg': mix(P, 7, S) }, backdrop('duotone')] },
  { name: 'Dark Mode UI', cat: 'Essentials', desc: 'Built for dark mode: deep surfaces, soft glows.', parts: [{ '--ui-border-c': mix(T, 9), '--ui-card-shadow': `0 1px 0 ${W(4)} inset, 0 8px 24px ${K(30)}` }, backdrop('spotlight')], mode: 'dark' },
  { name: 'Minimal Dark UI', cat: 'Essentials', desc: 'Pure, quiet dark interface with hairlines.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(T, 8) }, radius(0.7)], mode: 'dark' },
  { name: 'Editorial Minimalism', cat: 'Essentials', desc: 'Magazine whitespace with elegant serif headings.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(T, 10) }, radius(0.2), heading('instrument', { tracking: '-.01em' })], fonts: ['instrument'] },
  { name: 'High-End Minimalist UI', cat: 'Essentials', desc: 'Premium restraint: thin lines, refined type.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(T, 7), '--ui-btn-tracking': '.04em' }, radius(0.35), heading('manrope', { tracking: '-.03em' }), body('manrope')], fonts: ['manrope'] },
  { name: 'Organic Minimalism', cat: 'Essentials', desc: 'Minimal with soft natural curves.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(T, 7), '--ui-surface-bg': mix(A, 18, S) }, radius(1.8), heading('fraunces')], fonts: ['fraunces'] },
  { name: 'Swiss Style', cat: 'Essentials', desc: 'International typographic style: grid, bold sans, strong rules.', parts: [flat, { '--ui-border-w': '2px', '--ui-border-c': T }, radius(0), heading('inter', { tracking: '-.04em' }), pattern('grid', 0.05)], fonts: ['inter'] },
  { name: 'Monospace UI', cat: 'Essentials', desc: 'Everything in a crisp monospace font.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(T, 18) }, radius(0.3), heading('jetbrains'), body('jetbrains')], fonts: ['jetbrains'] },

  // ===== Deluxe (special) =====
  { name: 'Deluxe', cat: 'Deluxe', desc: 'Flagship premium look: gilded card edges, frosted surfaces, gold focus rings and scrollbars.', parts: [glass(18, 62), { '--ui-border-c': mix(P, 35), '--ui-card-shadow': `inset 0 1px 0 ${W(40)}, 0 0 0 1px ${mix(P, 12)}, 0 18px 40px ${mix(T, 12)}` }, gradientBtn(120), upperButtons('.12em'), heading('cormorant', { tracking: '.02em' }), backdrop('luxe'), pattern('deco', 0.07, P), motion(-2), radius(0.9), { '--fx-deluxe': '1', '--ui-scroll-thumb': 'color-mix(in srgb, #c9a24a 70%, var(--color-primary))', '--ui-scroll-thumb-hover': '#d4af37' }], dark: { '--ui-card-shadow': `inset 0 1px 0 ${W(8)}, 0 0 0 1px ${mix(P, 20)}, 0 18px 40px ${K(50)}` }, fonts: ['cormorant'] },
  { name: 'Anime Deluxe', cat: 'Deluxe', desc: 'Dreamy anime-inspired look: glowing glass, rounded type, sparkles.', parts: [glass(16, 55), { '--ui-border-c': mix(P, 30), '--ui-card-shadow': `inset 0 1px 0 ${W(50)}, 0 0 0 1px ${mix(P, 14)}, 0 14px 36px ${mix(P, 18)}` }, gradientBtn(110), heading('mplusRounded'), body('mplusRounded'), backdrop('aurora', true), pattern('sparkles', 0.22, P), motion(-3), radius(1.4), { '--ui-heading-glow': `0 2px 16px ${mix(P, 28)}` }], dark: { '--ui-card-shadow': `inset 0 1px 0 ${W(9)}, 0 0 0 1px ${mix(P, 24)}, 0 14px 36px ${mix(P, 22)}` }, fonts: ['mplusRounded'] },
  { name: 'Anime Night Festival', cat: 'Deluxe', desc: 'Lantern-lit glass panels and starry sparkles. Best in dark mode.', parts: [glass(14, 50), { '--ui-border-c': mix(P, 40) }, gradientBtn(100), heading('zenMaru'), backdrop('auroraStrong', true), pattern('stars', 0.35, P), motion(-3), radius(1.3), { '--ui-heading-glow': `0 0 20px ${mix(P, 45)}` }], dark: glassDark, fonts: ['zenMaru'], mode: 'dark' },
  { name: 'Royal Palace', cat: 'Deluxe', desc: 'Ornate royal look: serif capitals, filigree pattern, gold rules.', parts: [{ '--ui-border-c': mix(P, 45), '--ui-border-style': 'double', '--ui-border-w': '3px', '--ui-card-shadow': `0 12px 30px ${mix(T, 10)}` }, gradientBtn(180), upperButtons('.14em'), heading('cinzel', { tracking: '.04em' }), backdrop('luxe'), pattern('ornament', 0.06, P), radius(0.4)], fonts: ['cinzel'] },

  // ===== Glass & Light =====
  { name: 'Glassmorphism', cat: 'Glass & Light', desc: 'Frosted translucent panels over a colourful backdrop.', parts: [glass(), backdrop('aurora')], dark: glassDark },
  { name: 'Frosted Glass UI', cat: 'Glass & Light', desc: 'Heavier frost, softer colours.', parts: [glass(24, 66), backdrop('meshSoft')], dark: glassDark },
  { name: 'Liquid Glass', cat: 'Glass & Light', desc: 'Glossy liquid glass with bright highlights and deep blur.', parts: [glass(26, 45, { '--ui-surface-paint': `radial-gradient(120% 70% at 0% 0%, ${W(38)} 0, transparent 46%), ${mix(S, 45)}`, '--ui-card-shadow': `inset 0 1px 1px ${W(70)}, inset 0 -1px 1px ${K(6)}, 0 12px 36px ${mix(T, 12)}` }), backdrop('auroraStrong', true), radius(1.5), motion(-2)], dark: { ...glassDark, '--ui-surface-paint': `radial-gradient(120% 70% at 0% 0%, ${W(10)} 0, transparent 46%), ${mix(S, 45)}` } },
  { name: 'Aurora Glass UI', cat: 'Glass & Light', desc: 'Glass panels over a slowly moving aurora.', parts: [glass(18, 50), backdrop('auroraStrong', true)], dark: glassDark },
  { name: '3D Glass UI', cat: 'Glass & Light', desc: 'Thick glass slabs with depth and edge light.', parts: [glass(20, 55, { '--ui-card-shadow': `inset 0 1px 0 ${W(60)}, inset 0 -6px 12px ${mix(T, 5)}, 0 2px 0 ${W(30)}, 0 20px 40px ${mix(T, 16)}` }), backdrop('mesh'), radius(1.3), motion(-4)], dark: glassDark },
  { name: 'Gradient Glass UI', cat: 'Glass & Light', desc: 'Glass with a colour gradient glow.', parts: [glass(18, 55), gradientBtn(), backdrop('mesh', true), { '--ui-card-shadow': `inset 0 1px 0 ${W(45)}, 0 12px 34px ${mix(P, 16)}` }], dark: glassDark },
  { name: 'Glassmorphic Mobile UI', cat: 'Glass & Light', desc: 'App-like glass cards, big round corners.', parts: [glass(18, 60), backdrop('aurora'), radius(1.7), motion(-2)], dark: glassDark },
  { name: 'Frutiger Aero', cat: 'Glass & Light', desc: 'Glossy 2000s optimism: sky, bubbles, shiny glass.', parts: [glass(14, 62), glossyBtn, backdrop('sky'), pattern('bubbles', 0.14, 'var(--color-surface)'), radius(1.2), heading('nunito')], fonts: ['nunito'], dark: glassDark },
  { name: 'Spatial UI', cat: 'Glass & Light', desc: 'Floating panels in space, gentle depth.', parts: [glass(28, 52, { '--ui-card-shadow': `0 0 0 1px ${W(30)}, 0 24px 60px ${mix(T, 16)}` }), backdrop('ambient', true), radius(1.6), motion(-4)], dark: glassDark },
  { name: 'Spatial Computing UI', cat: 'Glass & Light', desc: 'Headset-style glass windows with bright edges.', parts: [glass(32, 40, { '--ui-border-c': W(55), '--ui-card-shadow': `inset 0 0 0 1px ${W(35)}, 0 30px 70px ${mix(T, 18)}` }), backdrop('auroraStrong', true), radius(1.9), heading('sora'), motion(-3)], dark: { ...glassDark, '--ui-border-c': W(14) }, fonts: ['sora'] },
  { name: '3D Spatial UI', cat: 'Glass & Light', desc: 'Layered depth with strong floating shadows.', parts: [glass(18, 64, { '--ui-card-shadow': `0 2px 0 ${W(40)} inset, 0 30px 50px -10px ${mix(T, 22)}`, '--ui-card-shadow-hover': `0 2px 0 ${W(45)} inset, 0 40px 60px -10px ${mix(T, 26)}` }), backdrop('ambient'), radius(1.4), motion(-6)], dark: glassDark },
  { name: 'Ambient UI', cat: 'Glass & Light', desc: 'Calm, low-contrast panels with slow light.', parts: [glass(20, 68, { '--ui-border-c': mix(T, 6), '--ui-card-shadow': `0 10px 40px ${mix(T, 6)}` }), backdrop('ambient', true), radius(1.5)], dark: glassDark },
  { name: 'Ambient Computing UI', cat: 'Glass & Light', desc: 'Quiet, glanceable surfaces that fade into the room.', parts: [glass(22, 72, { '--ui-border-w': '0px', '--ui-card-shadow': `0 8px 32px ${mix(T, 6)}` }), backdrop('ambient', true), radius(1.8), heading('lexend'), body('lexend')], fonts: ['lexend'], dark: glassDark },
  { name: 'Immersive UI', cat: 'Glass & Light', desc: 'Full-bleed colour behind deep glass panels.', parts: [glass(26, 45), backdrop('auroraStrong', true), radius(1.4), motion(-2)], dark: glassDark },
  { name: 'Augmented Reality UI', cat: 'Glass & Light', desc: 'See-through overlay panels with HUD hints.', parts: [glass(10, 35, { '--ui-border-c': mix(P, 45), '--ui-surface-paint': `${hudCorners(mix(P, 80))}, ${mix(S, 35)}` }), backdrop('ambient'), pattern('crosses', 0.1, P), radius(1.2), heading('exo')], fonts: ['exo'], dark: glassDark },

  // ===== Soft & Tactile =====
  { name: 'Neumorphism', cat: 'Soft & Tactile', desc: 'Soft extruded shapes from the same surface.', parts: [NEU.v, radius(1.3)], dark: NEU.d },
  { name: 'Soft Neumorphism', cat: 'Soft & Tactile', desc: 'Gentler neumorphic shadows, easier on the eyes.', parts: [NEU_SOFT.v, radius(1.4)], dark: NEU_SOFT.d },
  { name: 'Liquid Neumorphism', cat: 'Soft & Tactile', desc: 'Neumorphism with pill shapes and liquid motion.', parts: [NEU.v, radius(2.2), motion(-2), backdrop('ambient', true)], dark: NEU.d },
  { name: 'Soft UI', cat: 'Soft & Tactile', desc: 'Pillowy, rounded and calm.', parts: [{ '--ui-border-c': mix(T, 5), '--ui-card-shadow': `0 6px 24px ${mix(T, 7)}`, '--ui-card-shadow-hover': `0 10px 34px ${mix(T, 10)}`, '--ui-btn-shadow': `0 6px 16px ${mix(P, 28)}` }, radius(1.6), backdrop('meshSoft'), heading('nunito')], fonts: ['nunito'] },
  { name: 'Claymorphism', cat: 'Soft & Tactile', desc: 'Puffy clay-like 3D cards.', parts: [CLAY.v, backdrop('meshSoft'), heading('nunito')], dark: CLAY.d, fonts: ['nunito'] },
  { name: 'Clay 3D UI', cat: 'Soft & Tactile', desc: 'Chunkier clay with bigger depth.', parts: [CLAY_XL.v, backdrop('mesh'), heading('fredoka'), motion(-4)], dark: CLAY_XL.d, fonts: ['fredoka'] },
  { name: 'Claymorphic Mobile UI', cat: 'Soft & Tactile', desc: 'Toy-like clay app cards.', parts: [CLAY_XL.v, backdrop('meshSoft'), heading('baloo')], dark: CLAY_XL.d, fonts: ['baloo'] },
  { name: 'Skeuomorphism', cat: 'Soft & Tactile', desc: 'Real-world materials: textures, bevels and depth.', parts: [{ '--ui-surface-paint': `linear-gradient(180deg, ${W(40)}, transparent 40%), ${S}`, '--ui-border-c': mix(T, 18), '--ui-card-shadow': `inset 0 1px 0 ${W(70)}, 0 1px 1px ${K(15)}, 0 4px 10px ${K(12)}`, '--ui-input-shadow': `inset 0 2px 4px ${K(14)}`, '--ui-btn-shadow': `inset 0 1px 0 ${W(40)}, 0 1px 2px ${K(30)}` }, glossyBtn, pattern('paper', 0.18), backdrop('paper'), radius(0.8), heading('lora')], dark: { '--ui-surface-paint': `linear-gradient(180deg, ${W(6)}, transparent 40%), ${S}`, '--ui-card-shadow': `inset 0 1px 0 ${W(8)}, 0 1px 1px ${K(40)}, 0 4px 10px ${K(40)}` }, fonts: ['lora'] },
  { name: 'Skeuomorphic Music UI', cat: 'Soft & Tactile', desc: 'Brushed metal panels and glowing displays, like audio gear.', parts: [{ '--ui-surface-paint': metallicPaint, '--ui-border-c': mix(T, 22), '--ui-card-shadow': `inset 0 1px 0 ${W(70)}, 0 2px 0 ${K(10)}, 0 8px 18px ${K(16)}`, '--ui-input-bg': mix(T, 88, P), '--ui-input-shadow': `inset 0 2px 6px ${K(40)}` }, glossyBtn, pattern('stripes', 0.03), radius(0.7), heading('rajdhani', { upper: true, tracking: '.08em' }), { '--ui-btn-shadow': `0 2px 0 ${K(30)}, 0 0 14px ${mix(P, 35)}` }], dark: { '--ui-surface-paint': metallicPaintDark }, fonts: ['rajdhani'] },
  { name: 'Haptic-Inspired UI', cat: 'Soft & Tactile', desc: 'Buttons that press down and spring back.', parts: [{ '--ui-card-shadow': `0 2px 0 ${mix(T, 10)}, 0 8px 20px ${mix(T, 6)}`, '--ui-btn-shadow': `0 4px 0 ${mix(P, 60, '#000')}`, '--ui-press': '.94' }, radius(1.3), motion(-2)] },
  { name: 'Pastel UI', cat: 'Soft & Tactile', desc: 'Soft pastel surfaces and friendly rounded type.', parts: [{ '--ui-surface-bg': mix(A, 25, S), '--ui-border-c': mix(A, 70, S), '--ui-card-shadow': `0 6px 20px ${mix(P, 10)}` }, backdrop('meshSoft'), radius(1.6), heading('quicksand'), body('quicksand')], fonts: ['quicksand'] },
  { name: 'Kawaii UI', cat: 'Soft & Tactile', desc: 'Cute and bubbly: pastels, hearts and sparkles.', parts: [{ '--ui-surface-bg': mix(A, 22, S), '--ui-border-w': '2px', '--ui-border-c': mix(P, 30, S), '--ui-card-shadow': `0 6px 0 ${mix(P, 18, S)}` }, radius(2), pattern('hearts', 0.12, P), backdrop('meshSoft'), heading('fredoka'), body('fredoka'), motion(-3)], fonts: ['fredoka'] },

  // ===== Bold & Brutal =====
  { name: 'Neobrutalism', cat: 'Bold & Brutal', desc: 'Thick borders, hard offset shadows, punchy colour.', parts: [brutal(2, 5, 0.6), heading('spaceGrotesk', { tracking: '-.02em' }), { '--ui-surface-bg': S }], fonts: ['spaceGrotesk'] },
  { name: 'Brutalism', cat: 'Bold & Brutal', desc: 'Raw, sharp and unapologetic.', parts: [brutal(3, 0, 0), { '--ui-card-shadow': 'none', '--ui-card-shadow-hover': `6px 6px 0 0 ${T}` }, upperButtons('.04em'), heading('archivoBlack', { upper: true }), body('spaceMono')], fonts: ['archivoBlack', 'spaceMono'] },
  { name: 'Monochrome Brutalism', cat: 'Bold & Brutal', desc: 'Black-and-white brutalism, heavy type.', parts: [brutal(3, 6, 0), { '--ui-primary-image': `linear-gradient(${T}, ${T})` }, heading('archivoBlack', { upper: true })], fonts: ['archivoBlack'] },
  { name: 'Editorial Brutalism', cat: 'Bold & Brutal', desc: 'Newspaper headlines meet raw grids.', parts: [brutal(2, 0, 0), { '--ui-card-shadow': 'none' }, heading('dmSerif', { tracking: '-.02em' }), body('plexMono'), pattern('grid', 0.05)], fonts: ['dmSerif', 'plexMono'] },
  { name: 'Neobrutalist Dashboard', cat: 'Bold & Brutal', desc: 'Neobrutalism tuned for dense dashboards.', parts: [brutal(2, 4, 0.5), heading('spaceGrotesk'), pattern('dots', 0.12)], fonts: ['spaceGrotesk'] },
  { name: 'Industrial UI', cat: 'Bold & Brutal', desc: 'Steel, rivets and hazard stripes.', parts: [{ '--ui-surface-paint': metallicPaint, '--ui-border-w': '2px', '--ui-border-c': mix(T, 45), '--ui-card-shadow': `0 3px 0 ${K(20)}` }, pattern('diagonal', 0.05), radius(0.2), upperButtons('.08em'), heading('bebas', { tracking: '.04em' })], dark: { '--ui-surface-paint': metallicPaintDark }, fonts: ['bebas'] },
  { name: 'Anti-Design', cat: 'Bold & Brutal', desc: 'Deliberately clashing, tilted and loud.', parts: [brutal(2, 7, 0), { '--ui-border-style': 'dashed', '--fx-tilt': '1', '--fx-asym': '1' }, heading('unbounded', { upper: true }), body('spaceMono'), pattern('confetti', 0.12, P)], fonts: ['unbounded', 'spaceMono'] },
  { name: 'Maximalism', cat: 'Bold & Brutal', desc: 'More is more: colour, pattern and big type.', parts: [brutal(3, 6, 0.8, P), gradientBtn(), backdrop('burst'), pattern('memphis', 0.14, P), heading('syne', { tracking: '-.02em' }), motion(-3)], fonts: ['syne'] },
  { name: 'Maximalist Editorial UI', cat: 'Bold & Brutal', desc: 'Loud magazine spreads with oversized serif type.', parts: [brutal(2, 5, 0.2, P), heading('bodoni', { tracking: '-.02em' }), backdrop('burst'), pattern('halftone', 0.08)], fonts: ['bodoni'] },

  // ===== Gradient & Motion =====
  { name: 'Gradient UI', cat: 'Gradient & Motion', desc: 'Vivid gradients on buttons and highlights.', parts: [gradientBtn(), backdrop('duotone'), { '--ui-card-shadow': `0 8px 24px ${mix(P, 10)}` }, headingGradient, radius(1.2)] },
  { name: 'Soft Gradient UI', cat: 'Gradient & Motion', desc: 'Gentle, washed-out gradients.', parts: [gradientBtn(160), backdrop('meshSoft'), { '--ui-border-c': mix(T, 6), '--ui-card-shadow': `0 6px 20px ${mix(T, 5)}` }, radius(1.4)] },
  { name: 'Mesh Gradient UI', cat: 'Gradient & Motion', desc: 'Rich multi-point mesh gradients.', parts: [backdrop('mesh'), gradientBtn(), glass(12, 70)], dark: glassDark },
  { name: 'Gradient Mesh UI', cat: 'Gradient & Motion', desc: 'Animated mesh backdrop with clean cards.', parts: [backdrop('mesh', true), gradientBtn(120), { '--ui-card-shadow': `0 10px 30px ${mix(T, 8)}` }, radius(1.25)] },
  { name: 'Aurora UI', cat: 'Gradient & Motion', desc: 'Northern-lights glow behind everything.', parts: [backdrop('auroraStrong', true), { '--ui-card-shadow': `0 10px 30px ${mix(T, 7)}` }, gradientBtn(), radius(1.2)] },
  { name: 'Motion UI', cat: 'Gradient & Motion', desc: 'Smooth entrances, hover lifts and lively feedback.', parts: [motion(-4), { '--ui-card-shadow': `0 4px 14px ${mix(T, 6)}`, '--ui-card-shadow-hover': `0 18px 40px ${mix(T, 14)}` }, radius(1.2)] },
  { name: 'Liquid UI', cat: 'Gradient & Motion', desc: 'Fluid blobs, pill shapes and smooth motion.', parts: [backdrop('mesh', true), radius(2), motion(-3), gradientBtn(), { '--ui-card-shadow': `0 12px 32px ${mix(P, 12)}` }] },
  { name: 'Liquid Motion UI', cat: 'Gradient & Motion', desc: 'Everything flows: animated gradients and springy cards.', parts: [backdrop('auroraStrong', true), motion(-5), gradientBtn(), radius(1.7), headingGradient] },
  { name: 'Liquid Morphism', cat: 'Gradient & Motion', desc: 'Molten glass blobs with liquid highlights.', parts: [glass(22, 50, { '--ui-surface-paint': `radial-gradient(80% 60% at 20% 0%, ${W(32)} 0, transparent 50%), ${mix(S, 50)}` }), backdrop('mesh', true), radius(2.1), motion(-3)], dark: { ...glassDark, '--ui-surface-paint': `radial-gradient(80% 60% at 20% 0%, ${W(8)} 0, transparent 50%), ${mix(S, 50)}` } },
  { name: 'Kinetic Typography UI', cat: 'Gradient & Motion', desc: 'Animated gradient headlines and bold type.', parts: [headingGradient, heading('unbounded', { tracking: '-.02em' }), motion(-2), { '--ui-heading-anim': 'ui-shine 7s linear infinite' }], fonts: ['unbounded'] },
  { name: 'Scroll-Driven UI', cat: 'Gradient & Motion', desc: 'Reading-progress bar and reveal-on-load motion.', parts: [progressBar, motion(-2), radius(1.1)] },
  { name: 'Scrolltelling UI', cat: 'Gradient & Motion', desc: 'Story-like reveals and a progress line.', parts: [progressBar, motion(-3), heading('fraunces'), backdrop('dusk')], fonts: ['fraunces'] },
  { name: 'Parallax UI', cat: 'Gradient & Motion', desc: 'Layered fixed backgrounds that create depth.', parts: [backdrop('aurora'), pattern('dotsLarge', 0.12, P), glass(10, 75), motion(-3)], dark: glassDark },
  { name: 'Parallax Storytelling UI', cat: 'Gradient & Motion', desc: 'Deep layered scenes with progress and reveals.', parts: [backdrop('dusk'), pattern('topo', 0.1, P), glass(12, 72), progressBar, motion(-4), heading('fraunces')], dark: glassDark, fonts: ['fraunces'] },
  { name: 'Duotone UI', cat: 'Gradient & Motion', desc: 'Two-colour everything.', parts: [backdrop('duotone'), { '--ui-surface-bg': mix(P, 4, S), '--ui-border-c': mix(P, 25, S), '--ui-primary-image': `linear-gradient(90deg, ${P} 50%, ${P2} 50%)` }, radius(0.6)] },
  { name: 'Split-Screen UI', cat: 'Gradient & Motion', desc: 'Two-tone split background for contrast.', parts: [backdrop('split'), { '--ui-card-shadow': `0 12px 30px ${mix(T, 10)}` }, radius(1)] },
  { name: 'Cinematic UI', cat: 'Gradient & Motion', desc: 'Movie-poster drama: vignette, grain and tall type.', parts: [backdrop('cinematic'), pattern('noise', 0.12), glass(14, 65), heading('bebas', { tracking: '.06em' }), motion(-2)], dark: glassDark, fonts: ['bebas'], mode: 'dark' },

  // ===== Futuristic =====
  { name: 'Cyberpunk', cat: 'Futuristic', desc: 'Neon edges, angular HUD corners, night-city glow.', parts: [NEON_STRONG.v, { '--ui-surface-paint': `${hudCorners()}, ${mix(S, 88)}` }, backdrop('cinematic'), pattern('scanlines', 0.07, P), heading('orbitron', { upper: true, tracking: '.06em' }), body('rajdhani'), upperButtons('.1em'), radius(0.15)], dark: NEON_STRONG.d, fonts: ['orbitron', 'rajdhani'], mode: 'dark' },
  { name: 'Cyberpunk HUD', cat: 'Futuristic', desc: 'Targeting brackets, grids and neon readouts.', parts: [NEON.v, { '--ui-surface-paint': `${hudCorners()}, ${mix(S, 80)}` }, backdrop('terminal'), pattern('grid', 0.08, P), heading('michroma', { upper: true }), body('rajdhani'), radius(0)], dark: NEON.d, fonts: ['michroma', 'rajdhani'], mode: 'dark' },
  { name: 'Neon UI', cat: 'Futuristic', desc: 'Glowing neon edges, buttons and headings.', parts: [NEON_STRONG.v, backdrop('spotlight'), pattern('dots', 0.08, P), heading('righteous'), radius(1)], dark: NEON_STRONG.d, fonts: ['righteous'], mode: 'dark' },
  { name: 'HUD UI', cat: 'Futuristic', desc: 'Heads-up display: corner brackets and thin lines.', parts: [{ '--ui-surface-paint': `${hudCorners()}, ${mix(S, 70)}`, '--ui-border-c': mix(P, 25), '--ui-card-shadow': 'none' }, pattern('brackets', 0.1, P), heading('rajdhani', { upper: true, tracking: '.12em' }), radius(0.1)], fonts: ['rajdhani'] },
  { name: 'Sci-Fi UI', cat: 'Futuristic', desc: 'Starship consoles and clean futuristic type.', parts: [{ '--ui-surface-paint': `${hudCorners(mix(P, 70))}, ${S}`, '--ui-border-c': mix(P, 30), '--ui-card-shadow': `0 0 24px ${mix(P, 10)}` }, backdrop('spotlight'), pattern('hex', 0.06, P), heading('exo', { tracking: '.04em' }), radius(0.3)], fonts: ['exo'] },
  { name: 'Sci-Fi Dashboard', cat: 'Futuristic', desc: 'Mission-control dashboard with hex grid.', parts: [NEON.v, { '--ui-surface-paint': `${hudCorners()}, ${mix(S, 85)}` }, pattern('hex', 0.08, P), heading('orbitron', { upper: true }), body('exo'), radius(0.2)], dark: NEON.d, fonts: ['orbitron', 'exo'], mode: 'dark' },
  { name: 'Cybernetic UI', cat: 'Futuristic', desc: 'Circuit traces and machine precision.', parts: [{ '--ui-border-c': mix(P, 30), '--ui-card-shadow': `0 0 0 1px ${mix(P, 10)}` }, pattern('circuit', 0.1, P), backdrop('terminal'), heading('michroma'), radius(0.25)], fonts: ['michroma'] },
  { name: 'Cyber-Organic UI', cat: 'Futuristic', desc: 'Bio-tech: circuits that grow like plants.', parts: [glass(12, 70), pattern('vines', 0.1, P), backdrop('nature'), heading('exo'), radius(1.4), { '--ui-card-shadow': `0 0 0 1px ${mix(P, 18)}, 0 10px 30px ${mix(P, 10)}` }], dark: glassDark, fonts: ['exo'] },
  { name: 'Tactical UI', cat: 'Futuristic', desc: 'Military-grade: stencil type, grids, brackets.', parts: [{ '--ui-surface-paint': `${hudCorners(mix(T, 60))}, ${S}`, '--ui-border-c': mix(T, 25), '--ui-card-shadow': 'none' }, pattern('grid', 0.06), heading('bebas', { tracking: '.1em' }), body('plexMono'), upperButtons('.12em'), radius(0)], fonts: ['bebas', 'plexMono'] },
  { name: 'Automotive HUD UI', cat: 'Futuristic', desc: 'Car-dashboard readouts with speedometer glow.', parts: [NEON.v, glass(10, 70), backdrop('spotlight'), pattern('rings', 0.06, P), heading('michroma', { upper: true }), radius(1.1)], dark: { ...NEON.d, ...glassDark }, fonts: ['michroma'], mode: 'dark' },
  { name: 'Biometric UI', cat: 'Futuristic', desc: 'Scanner rings and fingerprint lines.', parts: [{ '--ui-border-c': mix(P, 25), '--ui-card-shadow': `0 0 0 1px ${mix(P, 8)}, 0 8px 24px ${mix(P, 10)}` }, pattern('fingerprint', 0.12, P), backdrop('spotlight'), heading('sora'), radius(1.2)], fonts: ['sora'] },
  { name: 'Hologram UI', cat: 'Futuristic', desc: 'Projected translucent panels with scanlines.', parts: [glass(8, 40, { '--ui-border-c': mix(P, 45), '--ui-card-shadow': `0 0 18px ${mix(P, 22)}` }), pattern('scanlines', 0.08, P), backdrop('spotlight'), heading('exo'), { '--ui-heading-glow': `0 0 14px ${mix(P, 50)}` }], dark: glassDark, fonts: ['exo'] },
  { name: 'Holographic UI', cat: 'Futuristic', desc: 'Iridescent rainbow-foil surfaces.', parts: [{ '--ui-surface-paint': holoPaint, '--ui-surface-blur': 'blur(10px)', '--ui-border-c': W(60), '--ui-card-shadow': `0 8px 30px ${mix('#a78bfa', 18)}`, '--ui-primary-image': `linear-gradient(120deg, ${W(30)}, transparent 40%, ${W(25)} 60%, transparent)` }, backdrop('holo', true), radius(1.3), heading('spaceGrotesk')], fonts: ['spaceGrotesk'] },
  { name: 'Holographic Dashboard', cat: 'Futuristic', desc: 'Foil-shimmer dashboard panels.', parts: [{ '--ui-surface-paint': holoPaint, '--ui-surface-blur': 'blur(10px)', '--ui-border-c': W(50) }, backdrop('holo'), pattern('dots', 0.08), radius(1), heading('spaceGrotesk')], fonts: ['spaceGrotesk'] },
  { name: 'AI-Native UI', cat: 'Futuristic', desc: 'Gradient glow edges and subtle sparkles.', parts: [{ '--ui-border-c': mix(P, 25), '--ui-card-shadow': `0 0 0 1px ${mix(P, 14)}, 0 8px 28px ${mix(P2, 14)}` }, gradientBtn(110), backdrop('meshSoft'), pattern('sparkles', 0.12, P), heading('sora'), radius(1.3), motion(-2)], fonts: ['sora'] },
  { name: 'Generative UI', cat: 'Futuristic', desc: 'Interfaces that feel generated: soft shapes, glows.', parts: [backdrop('mesh', true), pattern('generative', 0.06, P), glass(14, 70), radius(1.3)], dark: glassDark },
  { name: 'Generative Art UI', cat: 'Futuristic', desc: 'Algorithmic circles and lines behind the content.', parts: [pattern('generative', 0.14, P), backdrop('ambient'), { '--ui-card-shadow': `0 6px 22px ${mix(T, 8)}` }, radius(1), heading('syne')], fonts: ['syne'] },
  { name: 'Chrome Futurism', cat: 'Futuristic', desc: 'Polished chrome and sleek futuristic type.', parts: [{ '--ui-surface-paint': metallicPaint, '--ui-border-c': mix(T, 20), '--ui-card-shadow': `inset 0 1px 0 ${W(80)}, 0 10px 24px ${K(14)}`, '--ui-primary-image': `linear-gradient(180deg, ${W(45)}, transparent 50%, ${K(15)})` }, backdrop('chrome'), heading('michroma'), radius(1.2)], dark: { '--ui-surface-paint': metallicPaintDark }, fonts: ['michroma'] },
  { name: 'Retro-Futurism', cat: 'Futuristic', desc: 'The future as imagined in the 60s–80s.', parts: [{ '--ui-card-shadow': `0 6px 0 ${mix(P, 35)}`, '--ui-border-c': mix(P, 40) }, backdrop('sunset'), pattern('perspective', 0.2, P), heading('audiowide'), radius(1.6), gradientBtn(90)], fonts: ['audiowide'] },

  // ===== Retro & Nostalgia =====
  { name: 'Retro UI', cat: 'Retro & Nostalgia', desc: 'Warm vintage colours and chunky rounded shapes.', parts: [{ '--ui-border-w': '2px', '--ui-border-c': mix(T, 70), '--ui-card-shadow': `4px 4px 0 ${mix(P, 50)}` }, radius(1.2), heading('righteous'), backdrop('paper'), pattern('stripes', 0.04)], fonts: ['righteous'] },
  { name: 'Retro Web UI', cat: 'Retro & Nostalgia', desc: 'The 90s web: bevels, tiles and Times-like type.', parts: [{ '--ui-border-w': '2px', '--ui-border-style': 'outset', '--ui-border-c': mix(T, 30), '--ui-card-shadow': 'none' }, radius(0), heading('georgia'), pattern('tiles', 0.06), { '--ui-btn-shadow': bevel() }], fonts: [] },
  { name: 'Retro Gaming UI', cat: 'Retro & Nostalgia', desc: '8-bit arcade: pixel type and chunky blocks.', parts: [brutal(3, 4, 0), heading('silkscreen', { upper: true }), body('pixelify'), pattern('checker', 0.04), upperButtons('.04em')], fonts: ['silkscreen', 'pixelify'] },
  { name: 'Pixel Art UI', cat: 'Retro & Nostalgia', desc: 'Pixel borders and pixel fonts.', parts: [brutal(3, 4, 0), heading('silkscreen'), body('pixelify'), pattern('pixels', 0.06, P)], fonts: ['silkscreen', 'pixelify'] },
  { name: 'Pixel-Art Dashboard', cat: 'Retro & Nostalgia', desc: 'Pixel art tuned for data-heavy screens.', parts: [brutal(2, 3, 0), heading('silkscreen'), pattern('gridFine', 0.05)], fonts: ['silkscreen'] },
  { name: 'Terminal UI', cat: 'Retro & Nostalgia', desc: 'Command-line look: mono type, sharp panels.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(P, 40) }, radius(0), heading('jetbrains'), body('jetbrains'), backdrop('terminal'), { '--ui-heading-glow': `0 0 8px ${mix(P, 35)}` }], fonts: ['jetbrains'], mode: 'dark' },
  { name: 'Retro Terminal UI', cat: 'Retro & Nostalgia', desc: 'Green-screen CRT with scanlines.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(P, 50) }, radius(0), heading('vt323'), body('vt323'), pattern('scanlines', 0.1, P), backdrop('terminal'), { '--ui-heading-glow': `0 0 10px ${mix(P, 55)}` }], fonts: ['vt323'], mode: 'dark' },
  { name: 'Command Palette UI', cat: 'Retro & Nostalgia', desc: 'Keyboard-first: keycap buttons and mono accents.', parts: [{ '--ui-border-c': mix(T, 12), '--ui-card-shadow': `0 1px 0 ${mix(T, 8)}`, '--ui-btn-shadow': `inset 0 -2px 0 ${K(25)}` }, radius(0.7), heading('jetbrains')], fonts: ['jetbrains'] },
  { name: 'Windows 95 UI', cat: 'Retro & Nostalgia', desc: 'Grey bevels, square corners and classic title bars.', parts: [{ '--ui-surface-bg': mix(S, 30, '#c3c3c3'), '--ui-border-w': '0px', '--ui-card-shadow': bevel(), '--ui-card-shadow-hover': bevel(), '--ui-btn-shadow': bevel(), '--ui-input-shadow': `inset 2px 2px 0 #808080, inset -2px -2px 0 #ffffff`, '--ui-topbar-bg': mix(S, 30, '#c3c3c3'), '--ui-sidebar-bg': mix(S, 30, '#c3c3c3'), '--fx-bevel': '1' }, radius(0), body('tahoma'), heading('tahoma'), backdrop('plain')], dark: { '--ui-surface-bg': mix(S, 60, '#3a3a3a'), '--ui-card-shadow': bevel(true), '--ui-card-shadow-hover': bevel(true), '--ui-btn-shadow': bevel(true), '--ui-topbar-bg': mix(S, 60, '#3a3a3a'), '--ui-sidebar-bg': mix(S, 60, '#3a3a3a'), '--ui-input-shadow': `inset 2px 2px 0 ${K(50)}, inset -2px -2px 0 ${W(10)}` } },
  { name: 'Windows XP UI', cat: 'Retro & Nostalgia', desc: 'Friendly blue title bars and glossy rounded buttons.', parts: [glossyBtn, { '--ui-border-c': mix(P, 35), '--ui-card-shadow': `0 2px 6px ${K(12)}`, '--ui-topbar-bg': mix(P, 12, S), '--ui-btn-shadow': `0 1px 2px ${K(30)}` }, radius(0.9), body('tahoma'), backdrop('sky')], fonts: [] },
  { name: 'Windows Aero', cat: 'Retro & Nostalgia', desc: 'Translucent glass with glossy highlights (2007).', parts: [glass(10, 55, { '--ui-surface-paint': `linear-gradient(180deg, ${W(35)} 0%, transparent 50%), ${mix(S, 55)}` }), glossyBtn, backdrop('sky'), radius(0.8), body('segoe')], dark: glassDark, fonts: ['segoe'] },
  { name: 'Y2K', cat: 'Retro & Nostalgia', desc: 'Millennium shine: chrome, bubbles and sparkles.', parts: [{ '--ui-surface-paint': `linear-gradient(180deg, ${W(60)}, transparent 50%), ${S}`, '--ui-border-c': mix(P, 30), '--ui-card-shadow': `0 6px 18px ${mix(P, 18)}` }, glossyBtn, pattern('sparkles', 0.18, P), backdrop('holo'), radius(1.8), heading('unbounded')], fonts: ['unbounded'] },
  { name: 'Cyber Y2K UI', cat: 'Retro & Nostalgia', desc: 'Y2K chrome meets neon cyber.', parts: [NEON.v, glossyBtn, pattern('sparkles', 0.2, P), backdrop('holo', true), radius(1.5), heading('audiowide')], dark: NEON.d, fonts: ['audiowide'] },
  { name: 'Vaporwave', cat: 'Retro & Nostalgia', desc: 'Sunset gradients and a neon perspective grid.', parts: [{ '--ui-border-c': mix('#ff71ce', 40), '--ui-card-shadow': `4px 4px 0 ${mix('#01cdfe', 45)}` }, backdrop('sunset'), pattern('perspective', 0.28, '#ff71ce'), heading('righteous', { upper: true, tracking: '.12em' }), radius(0.3)], fonts: ['righteous'] },
  { name: 'Vaporwave UI', cat: 'Retro & Nostalgia', desc: 'Pastel vaporwave windows with glitchy shadows.', parts: [{ '--ui-surface-bg': mix('#f0abfc', 10, S), '--ui-border-c': mix('#b967ff', 45), '--ui-card-shadow': `-3px -3px 0 ${mix('#01cdfe', 40)}, 3px 3px 0 ${mix('#ff71ce', 40)}` }, backdrop('sunset'), pattern('grid', 0.08, '#b967ff'), heading('monoton'), radius(0)], fonts: ['monoton'] },
  { name: 'Retro Futurism Classic', id: 'retro-futurism-classic', cat: 'Retro & Nostalgia', desc: 'Space-age curves and atomic sparkles.', parts: [{ '--ui-card-shadow': `0 8px 0 ${mix(P, 25)}`, '--ui-border-w': '2px', '--ui-border-c': mix(P, 35) }, radius(2), heading('audiowide'), pattern('sparkles', 0.12, P), backdrop('dusk')], fonts: ['audiowide'] },

  // ===== OS-inspired =====
  { name: 'Material Design', cat: 'OS-inspired', desc: 'Paper layers, elevation and bold buttons.', parts: [material(), upperButtons('.06em'), radius(0.5), body('roboto'), heading('roboto')], fonts: ['roboto'] },
  { name: 'Material You', cat: 'OS-inspired', desc: 'Tonal surfaces, big round corners, friendly.', parts: [material(), { '--ui-surface-bg': mix(P, 6, S), '--ui-input-bg': mix(P, 8, S), '--ui-topbar-bg': mix(P, 8, S), '--ui-sidebar-bg': mix(P, 6, S), '--ui-card-shadow': 'none' }, radius(2), body('roboto'), heading('roboto')], fonts: ['roboto'] },
  { name: 'Fluent Design', cat: 'OS-inspired', desc: 'Acrylic material, light and depth.', parts: [glass(30, 70, { '--ui-border-c': mix(T, 8), '--ui-card-shadow': `0 2px 4px ${K(6)}, 0 8px 16px ${K(8)}` }), pattern('noise', 0.05), radius(0.6), body('segoe')], dark: glassDark, fonts: ['segoe'] },
  { name: 'macOS-Inspired UI', cat: 'OS-inspired', desc: 'Vibrant sidebar, soft shadows, SF-like type.', parts: [glass(30, 72, { '--ui-border-c': mix(T, 9), '--ui-card-shadow': `0 0 0 .5px ${K(10)}, 0 6px 20px ${K(8)}` }), radius(1.25), body('apple'), backdrop('ambient')], dark: glassDark },
  { name: 'Frutiger Metro', cat: 'OS-inspired', desc: 'Live-tile flat colour with clean light type.', parts: [flat, { '--ui-surface-bg': mix(P, 7, S) }, radius(0), heading('lexend', { tracking: '-.02em' }), body('lexend')], fonts: ['lexend'] },

  // ===== Luxury & Editorial =====
  { name: 'Luxury UI', cat: 'Luxury & Editorial', desc: 'Gold hairlines, serif capitals, generous space.', parts: [{ '--ui-border-c': mix(P, 35), '--ui-card-shadow': `0 18px 40px ${mix(T, 8)}` }, gradientBtn(180), upperButtons('.16em'), heading('cormorant', { tracking: '.02em' }), backdrop('luxe'), radius(0.3)], fonts: ['cormorant'] },
  { name: 'Dark Luxury UI', cat: 'Luxury & Editorial', desc: 'Black velvet and gold. Best in dark mode.', parts: [{ '--ui-border-c': mix(P, 40), '--ui-card-shadow': `0 0 0 1px ${mix(P, 10)}, 0 20px 50px ${K(30)}` }, gradientBtn(180), upperButtons('.16em'), heading('playfair'), backdrop('luxe'), pattern('deco', 0.05, P), radius(0.4)], fonts: ['playfair'], mode: 'dark' },
  { name: 'Editorial UI', cat: 'Luxury & Editorial', desc: 'Magazine layout: serif headlines, column rules.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(T, 18) }, radius(0), heading('playfair', { tracking: '-.01em' }), body('lora')], fonts: ['playfair', 'lora'] },
  { name: 'Editorial Luxury UI', cat: 'Luxury & Editorial', desc: 'Fashion-magazine luxury with Didone type.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(P, 30) }, radius(0), heading('bodoni', { tracking: '-.01em' }), upperButtons('.2em'), backdrop('luxe')], fonts: ['bodoni'] },
  { name: 'Art Deco UI', cat: 'Luxury & Editorial', desc: 'Gatsby glamour: fans, gold and geometric caps.', parts: [{ '--ui-border-w': '3px', '--ui-border-style': 'double', '--ui-border-c': mix(P, 55), '--ui-card-shadow': `0 14px 30px ${mix(T, 10)}` }, pattern('deco', 0.1, P), backdrop('luxe'), heading('poiret', { upper: true, tracking: '.14em' }), upperButtons('.18em'), radius(0)], fonts: ['poiret'] },
  { name: 'Art Nouveau UI', cat: 'Luxury & Editorial', desc: 'Flowing vines, organic arches, elegant serif.', parts: [{ '--ui-border-c': mix(P, 35), '--ui-card-shadow': `0 10px 28px ${mix(T, 8)}` }, pattern('vines', 0.1, P), backdrop('paper'), heading('cormorant'), radius(1.6)], fonts: ['cormorant'] },
  { name: 'Gothic UI', cat: 'Luxury & Editorial', desc: 'Blackletter headings, ornaments and shadow.', parts: [{ '--ui-border-w': '3px', '--ui-border-style': 'double', '--ui-border-c': mix(T, 40), '--ui-card-shadow': `0 14px 30px ${K(25)}` }, pattern('ornament', 0.07), backdrop('vignette'), heading('unifraktur'), body('cormorant'), radius(0.2)], fonts: ['unifraktur', 'cormorant'], mode: 'dark' },
  { name: 'Paper UI', cat: 'Luxury & Editorial', desc: 'Paper sheets with real texture and soft shadows.', parts: [{ '--ui-border-c': mix(T, 6), '--ui-card-shadow': `0 1px 1px ${K(8)}, 0 6px 16px ${K(7)}` }, pattern('paper', 0.22), backdrop('paper'), heading('lora'), radius(0.3)], fonts: ['lora'] },
  { name: 'E-Ink UI', cat: 'Luxury & Editorial', desc: 'Calm e-reader: paper, black ink, no animation.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': T, '--ui-dur': '0ms' }, radius(0.2), heading('literata'), body('literata'), pattern('paper', 0.15), backdrop('paper')], fonts: ['literata'] },
  { name: 'Blueprint UI', cat: 'Luxury & Editorial', desc: 'Technical drawings: blue grid and mono notes.', parts: [outline(1.2, mix(P, 50)), backdrop('blueprint'), pattern('blueprint', 0.16, P), heading('spaceMono', { upper: true }), body('plexMono'), radius(0)], fonts: ['spaceMono', 'plexMono'] },
  { name: 'Metallic UI', cat: 'Luxury & Editorial', desc: 'Brushed silver panels and polished buttons.', parts: [{ '--ui-surface-paint': metallicPaint, '--ui-border-c': mix(T, 18), '--ui-card-shadow': `inset 0 1px 0 ${W(80)}, 0 6px 16px ${K(12)}`, '--ui-primary-image': `linear-gradient(180deg, ${W(35)}, transparent 50%, ${K(18)})` }, pattern('stripes', 0.025), backdrop('chrome'), radius(0.8)], dark: { '--ui-surface-paint': metallicPaintDark } },
  { name: 'Chrome UI', cat: 'Luxury & Editorial', desc: 'Mirror-shine chrome surfaces.', parts: [{ '--ui-surface-paint': `linear-gradient(180deg, ${W(70)} 0%, ${W(10)} 35%, ${K(8)} 50%, ${W(30)} 100%), ${S}`, '--ui-border-c': mix(T, 25), '--ui-card-shadow': `0 8px 20px ${K(15)}` }, backdrop('chrome'), radius(1)], dark: { '--ui-surface-paint': `linear-gradient(180deg, ${W(14)} 0%, ${W(3)} 35%, ${K(30)} 50%, ${W(8)} 100%), ${S}` } },
  { name: 'Liquid Chrome UI', cat: 'Luxury & Editorial', desc: 'Molten chrome curves and reflections.', parts: [{ '--ui-surface-paint': `radial-gradient(120% 80% at 10% 0%, ${W(65)} 0, transparent 40%), linear-gradient(180deg, ${W(30)}, ${K(8)}), ${S}`, '--ui-border-c': mix(T, 20), '--ui-card-shadow': `0 12px 28px ${K(16)}` }, backdrop('chrome', true), radius(1.8), motion(-2)], dark: { '--ui-surface-paint': `radial-gradient(120% 80% at 10% 0%, ${W(14)} 0, transparent 40%), linear-gradient(180deg, ${W(6)}, ${K(30)}), ${S}` } },

  // ===== Playful & Artsy =====
  { name: 'Memphis Design', cat: 'Playful & Artsy', desc: '80s Memphis: squiggles, confetti and bold colour.', parts: [brutal(2, 6, 0.8), { '--ui-card-shadow': `6px 6px 0 0 ${A}, 6px 6px 0 2px ${T}` }, pattern('memphis', 0.18, P), heading('syne')], fonts: ['syne'] },
  { name: 'Pop Art UI', cat: 'Playful & Artsy', desc: 'Comic halftones, thick outlines, loud type.', parts: [brutal(3, 6, 0.3), pattern('halftone', 0.1, P), heading('bangers', { tracking: '.04em' })], fonts: ['bangers'] },
  { name: 'Comic Book UI', cat: 'Playful & Artsy', desc: 'Speech-bubble panels and comic lettering.', parts: [brutal(3, 5, 0.9), pattern('halftone', 0.08), heading('bangers', { upper: true, tracking: '.05em' }), body('patrick'), { '--fx-tilt': '1' }], fonts: ['bangers', 'patrick'] },
  { name: 'Cartoon UI', cat: 'Playful & Artsy', desc: 'Bouncy cartoon shapes with chunky outlines.', parts: [brutal(3, 4, 1.5), { '--ui-card-shadow': `0 5px 0 0 ${T}`, '--ui-card-shadow-hover': `0 8px 0 0 ${T}` }, heading('baloo'), body('baloo'), motion(-3)], fonts: ['baloo'] },
  { name: 'Sticker UI', cat: 'Playful & Artsy', desc: 'Die-cut stickers with white outlines and tilt.', parts: [{ '--ui-border-w': '4px', '--ui-border-c': S, '--ui-card-shadow': `0 0 0 1px ${mix(T, 12)}, 0 8px 18px ${mix(T, 16)}`, '--fx-tilt': '1' }, backdrop('meshSoft'), pattern('dots', 0.1), radius(1.4), heading('fredoka'), motion(-3)], fonts: ['fredoka'] },
  { name: 'Collage UI', cat: 'Playful & Artsy', desc: 'Taped paper cut-outs and mixed type.', parts: [{ '--ui-surface-paint': `${tapePaint}, ${S}`, '--ui-card-shadow': `2px 4px 10px ${K(14)}`, '--fx-tilt': '1' }, pattern('paper', 0.18), backdrop('paper'), heading('dmSerif'), radius(0.1)], fonts: ['dmSerif'] },
  { name: 'Hand-Drawn UI', cat: 'Playful & Artsy', desc: 'Sketchy wobbly borders and handwriting.', parts: [{ '--ui-border-w': '2px', '--ui-border-c': T, '--ui-card-shadow': `2px 3px 0 ${mix(T, 70)}`, '--fx-sketch': '1' }, heading('caveat'), body('patrick'), pattern('paper', 0.15), backdrop('paper')], fonts: ['caveat', 'patrick'] },
  { name: 'Gamified UI', cat: 'Playful & Artsy', desc: 'Game-like chunky buttons, XP-bar progress, rewards.', parts: [{ '--ui-border-w': '2px', '--ui-border-c': mix(T, 14), '--ui-card-shadow': `0 4px 0 ${mix(T, 14)}`, '--ui-btn-shadow': `0 4px 0 ${mix(P, 60, '#000')}`, '--ui-press': '.95', '--ui-btn-weight': '800' }, gradientBtn(180), upperButtons('.04em'), radius(1.3), heading('baloo'), body('nunito'), pattern('sparkles', 0.12, P)], fonts: ['baloo', 'nunito'] },
  { name: 'Bauhaus UI', cat: 'Playful & Artsy', desc: 'Primary shapes, geometry and bold sans caps.', parts: [flat, { '--ui-border-w': '2px', '--ui-border-c': T }, radius(0), backdrop('bauhaus'), pattern('bauhaus', 0.06), heading('josefin', { upper: true, tracking: '.06em' })], fonts: ['josefin'] },
  { name: 'Isometric UI', cat: 'Playful & Artsy', desc: 'Isometric grid and stacked 3D cards.', parts: [{ '--ui-card-shadow': `4px 4px 0 ${mix(P, 30)}, 8px 8px 0 ${mix(P, 14)}`, '--ui-card-shadow-hover': `6px 6px 0 ${mix(P, 35)}, 12px 12px 0 ${mix(P, 16)}`, '--ui-border-c': mix(P, 35), '--ui-lift': '-2px' }, pattern('isometric', 0.08, P), radius(0.4)] },
  { name: '3D UI', cat: 'Playful & Artsy', desc: 'Raised blocks with real depth and lift.', parts: [{ '--ui-card-shadow': `0 1px 0 ${W(60)} inset, 0 6px 0 ${mix(T, 12)}, 0 16px 30px ${mix(T, 12)}`, '--ui-card-shadow-hover': `0 1px 0 ${W(60)} inset, 0 10px 0 ${mix(T, 12)}, 0 24px 40px ${mix(T, 14)}`, '--ui-btn-shadow': `0 4px 0 ${mix(P, 55, '#000')}` }, motion(-4), radius(1.2)] },
  { name: 'Asymmetric Grid UI', cat: 'Playful & Artsy', desc: 'Off-balance corners and a bold grid.', parts: [{ '--fx-asym': '1', '--ui-border-c': mix(T, 14) }, pattern('grid', 0.06), heading('syne')], fonts: ['syne'] },
  { name: 'Infinite Canvas UI', cat: 'Playful & Artsy', desc: 'Whiteboard dot grid with floating cards.', parts: [pattern('canvasDots', 0.2), { '--ui-card-shadow': `0 2px 6px ${K(6)}, 0 12px 28px ${K(8)}`, '--ui-border-c': mix(T, 6) }, radius(1.1), motion(-2)] },

  // ===== Nature & Organic =====
  { name: 'Organic UI', cat: 'Nature & Organic', desc: 'Soft blobs and natural curves.', parts: [backdrop('nature'), radius(1.9), { '--ui-card-shadow': `0 10px 30px ${mix(T, 6)}`, '--ui-border-c': mix(T, 6) }, heading('fraunces')], fonts: ['fraunces'] },
  { name: 'Organic Shapes UI', cat: 'Nature & Organic', desc: 'Pebble-like irregular shapes.', parts: [backdrop('nature'), { '--fx-asym': '1', '--ui-card-shadow': `0 10px 26px ${mix(T, 7)}` }, radius(1.6), pattern('leaves', 0.06, P), heading('fraunces')], fonts: ['fraunces'] },
  { name: 'Biophilic UI', cat: 'Nature & Organic', desc: 'Leaves, light and calm greens.', parts: [backdrop('nature'), pattern('leaves', 0.1, P), glass(10, 80), radius(1.6), heading('lora')], dark: glassDark, fonts: ['lora'] },
  { name: 'Nature-Inspired UI', cat: 'Nature & Organic', desc: 'Earthy textures and topographic lines.', parts: [backdrop('nature'), pattern('topo', 0.1, P), { '--ui-card-shadow': `0 8px 22px ${mix(T, 7)}` }, radius(1.3), heading('fraunces')], fonts: ['fraunces'] },
  { name: 'Wabi-Sabi UI', cat: 'Nature & Organic', desc: 'Imperfect, quiet beauty: paper and clay tones.', parts: [flat, { '--ui-border-w': '1px', '--ui-border-c': mix(T, 12), '--fx-asym': '1' }, pattern('paper', 0.2), backdrop('paper'), heading('cormorant'), radius(0.8)], fonts: ['cormorant'] },
  { name: 'Voice-First UI', cat: 'Nature & Organic', desc: 'Big friendly pills and a waveform motif.', parts: [radius(2.4), pattern('waveform', 0.08, P), backdrop('ambient'), { '--ui-card-shadow': `0 8px 26px ${mix(P, 10)}` }, heading('lexend'), body('lexend')], fonts: ['lexend'] },

  // ===== Dashboards =====
  { name: 'Dashboard UI', cat: 'Dashboards', desc: 'Crisp, data-dense admin panels.', parts: [{ '--ui-border-c': mix(T, 9), '--ui-card-shadow': `0 1px 2px ${K(5)}` }, radius(0.7), backdrop('plain'), heading('inter', { tracking: '-.02em' })], fonts: ['inter'] },
  { name: 'Data Visualization UI', cat: 'Dashboards', desc: 'Chart-friendly neutral panels and grid lines.', parts: [{ '--ui-border-c': mix(T, 8), '--ui-card-shadow': 'none' }, pattern('gridFine', 0.05), radius(0.6), heading('plexMono'), body('inter')], fonts: ['plexMono', 'inter'] },
  { name: 'Bento Grid', cat: 'Dashboards', desc: 'Rounded bento boxes, tinted tiles.', parts: [{ '--ui-surface-bg': mix(A, 14, S), '--ui-border-c': mix(T, 5), '--ui-card-shadow': 'none', '--ui-card-shadow-hover': `0 10px 24px ${mix(T, 8)}`, '--ui-lift': '-2px' }, radius(1.8), heading('jakarta', { tracking: '-.02em' })], fonts: ['jakarta'] },
  { name: 'Bento Dashboard', cat: 'Dashboards', desc: 'Bento boxes for metrics-heavy screens.', parts: [{ '--ui-border-c': mix(T, 6), '--ui-card-shadow': `0 1px 2px ${K(5)}` }, radius(1.6), backdrop('meshSoft'), heading('jakarta')], fonts: ['jakarta'] },
  { name: 'Glassmorphic Dashboard', cat: 'Dashboards', desc: 'Dashboard panels in frosted glass.', parts: [glass(16, 60), backdrop('mesh'), radius(1.1)], dark: glassDark },
  { name: 'Frosted Glass Dashboard', cat: 'Dashboards', desc: 'Heavily frosted data panels.', parts: [glass(26, 70), backdrop('meshSoft'), radius(1)], dark: glassDark },
  { name: 'Liquid Glass Dashboard', cat: 'Dashboards', desc: 'Liquid glass, tuned for metrics.', parts: [glass(24, 48, { '--ui-surface-paint': `radial-gradient(120% 70% at 0% 0%, ${W(30)} 0, transparent 46%), ${mix(S, 48)}` }), backdrop('aurora', true), radius(1.3)], dark: { ...glassDark, '--ui-surface-paint': `radial-gradient(120% 70% at 0% 0%, ${W(8)} 0, transparent 46%), ${mix(S, 48)}` } },
  { name: 'Neumorphic Dashboard', cat: 'Dashboards', desc: 'Soft neumorphic metric tiles.', parts: [NEU_DEEP.v, radius(1.1)], dark: NEU_DEEP.d },
  { name: 'Isometric Dashboard', cat: 'Dashboards', desc: 'Stacked isometric tiles for data.', parts: [{ '--ui-card-shadow': `3px 3px 0 ${mix(P, 25)}, 6px 6px 0 ${mix(P, 12)}`, '--ui-border-c': mix(P, 30) }, pattern('cubes', 0.06, P), radius(0.3)] },
  { name: 'Blueprint Dashboard', cat: 'Dashboards', desc: 'Engineering blueprint for admin screens.', parts: [outline(1, mix(P, 45)), backdrop('blueprint'), pattern('blueprint', 0.12, P), heading('spaceMono'), radius(0.1)], fonts: ['spaceMono'] },
  { name: 'Floating Card UI', cat: 'Dashboards', desc: 'Cards hover above the page with soft shadows.', parts: [{ '--ui-border-w': '0px', '--ui-card-shadow': `0 10px 30px ${mix(T, 9)}`, '--ui-card-shadow-hover': `0 20px 46px ${mix(T, 14)}` }, motion(-5), radius(1.4), backdrop('ambient')] },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const UI_STYLES: UiStyle[] = (() => {
  const seen = new Set<string>();
  const out: UiStyle[] = [];
  for (const d of DEFS) {
    const s = make(d);
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
})();

export const DEFAULT_UI_STYLE_ID = 'classic';

export function findUiStyle(id: string | null | undefined): UiStyle | undefined {
  return id ? UI_STYLES.find((s) => s.id === id) : undefined;
}

/** Strip anything that could break out of a CSS declaration/<style> block. */
function safe(v: string): string {
  return v.replace(/[<>{};]/g, '');
}

function block(vars: Vars): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${safe(v)}`)
    .join(';');
}

/** Full variable set for a style (light). */
export function uiStyleVars(style: UiStyle): Vars {
  return { ...DEFAULT_UI_VARS, ...style.vars };
}

/**
 * CSS for a style. Always emits the COMPLETE variable set, so it fully
 * replaces whatever style was active before (org style vs personal style).
 */
export function uiStyleCss(style: UiStyle | undefined): string {
  const s = style ?? findUiStyle(DEFAULT_UI_STYLE_ID)!;
  const light = uiStyleVars(s);
  const dark = s.dark ? `.dark{${block(s.dark)}}` : '';
  return `:root{${block(light)}}${dark}`;
}

/** Google font keys a style needs. */
export function uiStyleFonts(style: UiStyle | undefined): FontKey[] {
  return style?.fonts ?? [];
}

/** Inline-style object (React) for previews: vars + recomputed radius. */
export function uiStylePreviewVars(style: UiStyle, darkMode: boolean): Record<string, string> {
  const v = { ...uiStyleVars(style), ...(darkMode && style.dark ? style.dark : {}) };
  const scale = v['--ui-radius-scale'] ?? '1';
  return {
    ...v,
    '--radius-md': `calc(var(--radius-md-base, 8px) * ${scale})`,
    '--radius-lg': `calc(var(--radius-lg-base, 16px) * ${scale})`,
  };
}
