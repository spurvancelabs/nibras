// =============================================================================
// FILE: lib/theme-presets.ts   (REWRITTEN — was an unused copy of theme-config)
// 110+ generated theme presets, grouped by category. Client-safe.
//
// Each preset is built from a small "seed" (hue, saturation, tint …) into a
// full light AND dark palette. Contrast is enforced while generating:
//   - button text vs button colour      ≥ 4.5 : 1
//   - body text vs background           ≥ 7   : 1
//   - muted text vs background          ≥ 4.5 : 1
//   - primary vs background             ≥ 3   : 1 (UI components)
// so every preset is readable in both modes.
// IDs are stable — they are saved as users' personal theme choice.
// =============================================================================

import type { ThemePalette, ThemePreset } from './theme-config';

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function hslToHex(h: number, s: number, l: number): string {
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function channel(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Move lightness until the colour reaches `min` contrast against `against`. */
function ensure(h: number, s: number, l: number, against: string, min: number, dir: 'darker' | 'lighter'): string {
  let L = l;
  for (let i = 0; i < 100; i++) {
    const c = hslToHex(h, s, L);
    if (contrast(c, against) >= min) return c;
    L += dir === 'darker' ? -1 : 1;
    if (L <= 0 || L >= 100) break;
  }
  return dir === 'darker' ? '#000000' : '#ffffff';
}

const INK = '#111111';
/** White or near-black, whichever reads better on `bg`. */
export function readableOn(bg: string): string {
  return contrast('#ffffff', bg) >= contrast(INK, bg) ? '#ffffff' : INK;
}

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

const FONT = {
  inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
  poppins: 'Poppins, ui-sans-serif, system-ui, sans-serif',
  dm: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  jakarta: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", serif',
} as const;

type Shape = 'sharp' | 'soft' | 'round' | 'pill';
const RADIUS: Record<Shape, [string, string]> = {
  sharp: ['4px', '6px'],
  soft: ['8px', '14px'],
  round: ['10px', '18px'],
  pill: ['14px', '24px'],
};

type Seed = {
  name: string;
  h: number; // primary hue
  s: number; // primary saturation
  /** primary lightness in light mode (default 45) */
  l?: number;
  /** neutral hue for backgrounds/text (default = h) */
  nh?: number;
  /** 0 = white backgrounds, 1 = strongly tinted (default 0.35) */
  tint?: number;
  desc?: string;
};

type Category = {
  id: string;
  label: string;
  font: keyof typeof FONT;
  shape: Shape;
  tint?: number;
  seeds: Seed[];
};

export const THEME_CATEGORIES: Category[] = [
  {
    id: 'classic', label: 'Classic', font: 'inter', shape: 'soft',
    seeds: [
      { name: 'Indigo Classic', h: 239, s: 70 }, { name: 'Royal Blue', h: 221, s: 83 },
      { name: 'Cobalt', h: 215, s: 90, l: 42 }, { name: 'Sky', h: 199, s: 89, l: 40 },
      { name: 'Teal', h: 173, s: 80, l: 32 }, { name: 'Emerald', h: 160, s: 84, l: 33 },
      { name: 'Slate', h: 215, s: 25, l: 35 }, { name: 'Graphite', h: 220, s: 10, l: 25 },
      { name: 'Crimson', h: 348, s: 83, l: 45 }, { name: 'Ruby', h: 340, s: 75, l: 42 },
      { name: 'Amber', h: 38, s: 92, l: 40 }, { name: 'Violet', h: 262, s: 83, l: 55 },
    ],
  },
  {
    id: 'nature', label: 'Nature', font: 'dm', shape: 'round', tint: 0.5,
    seeds: [
      { name: 'Pine', h: 150, s: 60, l: 28 }, { name: 'Moss', h: 85, s: 45, l: 32 },
      { name: 'Olive', h: 70, s: 40, l: 32 }, { name: 'Sage', h: 130, s: 20, l: 38 },
      { name: 'Fern', h: 120, s: 45, l: 33 }, { name: 'Bamboo', h: 95, s: 55, l: 32 },
      { name: 'Cedar', h: 25, s: 45, l: 35 }, { name: 'Meadow', h: 105, s: 60, l: 34 },
      { name: 'Lagoon', h: 185, s: 70, l: 32 }, { name: 'Glacier', h: 195, s: 55, l: 38 },
      { name: 'Desert Sage', h: 80, s: 18, l: 38 }, { name: 'Autumn Leaf', h: 22, s: 80, l: 42 },
      { name: 'Lavender Field', h: 270, s: 55, l: 52 }, { name: 'Cherry Blossom', h: 335, s: 70, l: 48 },
    ],
  },
  {
    id: 'ocean', label: 'Ocean', font: 'jakarta', shape: 'soft', tint: 0.4,
    seeds: [
      { name: 'Deep Sea', h: 205, s: 85, l: 32 }, { name: 'Coral Reef', h: 10, s: 85, l: 50 },
      { name: 'Tidal', h: 190, s: 75, l: 33 }, { name: 'Marine', h: 210, s: 70, l: 40 },
      { name: 'Seafoam', h: 165, s: 55, l: 32 }, { name: 'Harbor', h: 200, s: 40, l: 35 },
      { name: 'Pearl Bay', h: 190, s: 20, l: 36, tint: 0.6 }, { name: 'Nautical', h: 220, s: 60, l: 32 },
      { name: 'Abyss', h: 230, s: 55, l: 30 }, { name: 'Aqua', h: 180, s: 85, l: 30 },
    ],
  },
  {
    id: 'warm', label: 'Warm & Sunset', font: 'poppins', shape: 'round', tint: 0.5,
    seeds: [
      { name: 'Sunset', h: 15, s: 90, l: 48 }, { name: 'Tangerine', h: 28, s: 95, l: 45 },
      { name: 'Apricot', h: 30, s: 85, l: 45 }, { name: 'Peach', h: 20, s: 80, l: 50 },
      { name: 'Terracotta', h: 14, s: 60, l: 45 }, { name: 'Cinnamon', h: 20, s: 55, l: 38 },
      { name: 'Marigold', h: 42, s: 95, l: 40 }, { name: 'Saffron', h: 36, s: 90, l: 42 },
      { name: 'Paprika', h: 8, s: 75, l: 45 }, { name: 'Rosewood', h: 355, s: 45, l: 38 },
      { name: 'Brick', h: 5, s: 60, l: 40 }, { name: 'Copper', h: 25, s: 70, l: 40 },
    ],
  },
  {
    id: 'pastel', label: 'Pastel', font: 'poppins', shape: 'pill', tint: 0.85,
    seeds: [
      { name: 'Pastel Mint', h: 155, s: 55, l: 36 }, { name: 'Pastel Lilac', h: 275, s: 50, l: 55 },
      { name: 'Pastel Peach', h: 20, s: 85, l: 52 }, { name: 'Pastel Sky', h: 205, s: 70, l: 45 },
      { name: 'Pastel Rose', h: 345, s: 65, l: 52 }, { name: 'Pastel Lemon', h: 52, s: 85, l: 38 },
      { name: 'Cotton Candy', h: 320, s: 60, l: 52 }, { name: 'Powder Blue', h: 210, s: 45, l: 45 },
      { name: 'Baby Teal', h: 178, s: 45, l: 34 }, { name: 'Blush', h: 355, s: 55, l: 52 },
    ],
  },
  {
    id: 'bold', label: 'Bold & Vivid', font: 'jakarta', shape: 'sharp', tint: 0.1,
    seeds: [
      { name: 'Electric Blue', h: 225, s: 100, l: 50 }, { name: 'Neon Green', h: 135, s: 90, l: 30 },
      { name: 'Hot Pink', h: 330, s: 90, l: 48 }, { name: 'Fuchsia', h: 295, s: 85, l: 45 },
      { name: 'Lime Punch', h: 90, s: 80, l: 30 }, { name: 'Ultraviolet', h: 270, s: 90, l: 55 },
      { name: 'Cyber Cyan', h: 188, s: 100, l: 30 }, { name: 'Flame', h: 12, s: 100, l: 48 },
      { name: 'Magenta', h: 310, s: 80, l: 45 }, { name: 'Volt', h: 70, s: 90, l: 28 },
      { name: 'Laser Red', h: 355, s: 95, l: 48 }, { name: 'Royal Purple', h: 280, s: 75, l: 45 },
    ],
  },
  {
    id: 'earth', label: 'Earth & Neutral', font: 'dm', shape: 'soft', tint: 0.6,
    seeds: [
      { name: 'Sandstone', h: 35, s: 35, l: 38 }, { name: 'Clay', h: 18, s: 40, l: 40 },
      { name: 'Mocha', h: 25, s: 30, l: 32 }, { name: 'Espresso', h: 20, s: 35, l: 22 },
      { name: 'Stone', h: 30, s: 10, l: 32 }, { name: 'Taupe', h: 30, s: 15, l: 36 },
      { name: 'Linen', h: 40, s: 25, l: 35, tint: 0.8 }, { name: 'Charcoal', h: 0, s: 0, l: 18, tint: 0 },
      { name: 'Ash', h: 210, s: 8, l: 30 }, { name: 'Walnut', h: 28, s: 45, l: 28 },
    ],
  },
  {
    id: 'jewel', label: 'Jewel Tones', font: 'inter', shape: 'round', tint: 0.3,
    seeds: [
      { name: 'Sapphire', h: 220, s: 75, l: 40 }, { name: 'Jade', h: 158, s: 65, l: 30 },
      { name: 'Amethyst', h: 270, s: 60, l: 48 }, { name: 'Topaz', h: 40, s: 85, l: 40 },
      { name: 'Garnet', h: 350, s: 65, l: 38 }, { name: 'Tourmaline', h: 330, s: 55, l: 42 },
      { name: 'Aquamarine', h: 172, s: 65, l: 30 }, { name: 'Onyx', h: 240, s: 8, l: 18 },
      { name: 'Peridot', h: 80, s: 60, l: 32 }, { name: 'Lapis', h: 225, s: 70, l: 38 },
    ],
  },
  {
    id: 'pakistan', label: 'Pakistan & Heritage', font: 'poppins', shape: 'round', tint: 0.45,
    seeds: [
      { name: 'Pakistan Green', h: 145, s: 95, l: 22, desc: 'Deep national green' },
      { name: 'Margalla Hills', h: 140, s: 45, l: 30 }, { name: 'Hunza Apricot', h: 30, s: 85, l: 44 },
      { name: 'Thar Sand', h: 38, s: 45, l: 38, tint: 0.7 }, { name: 'Lahore Rose', h: 345, s: 60, l: 45 },
      { name: 'Karachi Sea', h: 195, s: 75, l: 34 }, { name: 'Mughal Gold', h: 43, s: 75, l: 36 },
      { name: 'Truck Art', h: 8, s: 85, l: 46, nh: 45 }, { name: 'Badshahi Red', h: 5, s: 65, l: 38 },
      { name: 'Indus Blue', h: 205, s: 65, l: 36 }, { name: 'Swat Valley', h: 165, s: 50, l: 30 },
      { name: 'Multani Blue', h: 210, s: 80, l: 38, nh: 40 },
    ],
  },
  {
    id: 'night', label: 'Night & Space', font: 'inter', shape: 'soft', tint: 0.25,
    seeds: [
      { name: 'Midnight', h: 230, s: 45, l: 38 }, { name: 'Dusk', h: 260, s: 35, l: 42 },
      { name: 'Twilight', h: 250, s: 50, l: 48 }, { name: 'Night Owl', h: 210, s: 40, l: 36 },
      { name: 'Obsidian', h: 240, s: 15, l: 22 }, { name: 'Aurora', h: 160, s: 70, l: 30 },
      { name: 'Nebula', h: 285, s: 60, l: 48 }, { name: 'Eclipse', h: 30, s: 60, l: 38 },
      { name: 'Galaxy', h: 250, s: 70, l: 52 }, { name: 'Blackout', h: 0, s: 0, l: 10, tint: 0 },
    ],
  },
  {
    id: 'minimal', label: 'Minimal & Calm', font: 'system', shape: 'sharp', tint: 0.15,
    seeds: [
      { name: 'Paper', h: 40, s: 8, l: 25, tint: 0.5 }, { name: 'Ink', h: 220, s: 15, l: 20 },
      { name: 'Monochrome', h: 0, s: 0, l: 15, tint: 0 }, { name: 'Calm Gray', h: 200, s: 8, l: 30 },
      { name: 'Newsprint', h: 45, s: 10, l: 22, tint: 0.6 }, { name: 'Soft Focus', h: 230, s: 20, l: 40 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

const STATUS_LIGHT = { success: '#15803d', warning: '#b45309', danger: '#dc2626' };
const STATUS_DARK = { success: '#22c55e', warning: '#f59e0b', danger: '#f87171' };

export function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildPalettes(seed: Seed, catTint: number): { light: ThemePalette; dark: ThemePalette } {
  const { h, s } = seed;
  const nh = seed.nh ?? h;
  const tint = seed.tint ?? catTint;
  const ns = Math.min(s, 45); // neutrals never get garish

  // ---------- light ----------
  const lBg = hslToHex(nh, ns * tint, 99 - tint * 2.2);
  const lSurface = tint > 0.55 ? hslToHex(nh, ns * tint * 0.35, 99.6) : '#ffffff';
  const lPrimary = ensure(h, s, seed.l ?? 45, lBg, 3.2, 'darker');
  const lText = ensure(nh, Math.min(ns, 30), 13, lBg, 12, 'darker');
  const light: ThemePalette = {
    primary: lPrimary,
    primaryFg: readableOn(lPrimary),
    bg: lBg,
    surface: lSurface,
    border: hslToHex(nh, ns * 0.45 + 6, 89 - tint * 2),
    muted: ensure(nh, Math.min(ns, 16), 44, lBg, 4.8, 'darker'),
    text: lText,
    heroBg: hslToHex(h, Math.min(s, 85) * 0.7, 95.5 - tint * 1.5),
    accent: hslToHex(h, Math.min(s, 75) * 0.6, 86),
    ...STATUS_LIGHT,
  };
  fixButton(light, h, s, seed.l ?? 45);

  // ---------- dark ----------
  const dBg = hslToHex(nh, Math.min(ns, 30) * 0.55, 7);
  const dPrimary = ensure(h, Math.min(s, 85), Math.max(58, (seed.l ?? 45) + 18), dBg, 5, 'lighter');
  const dark: ThemePalette = {
    primary: dPrimary,
    primaryFg: readableOn(dPrimary),
    bg: dBg,
    surface: hslToHex(nh, Math.min(ns, 30) * 0.55, 10.5),
    border: hslToHex(nh, Math.min(ns, 30) * 0.5, 19),
    muted: ensure(nh, Math.min(ns, 14), 62, dBg, 5, 'lighter'),
    text: ensure(nh, Math.min(ns, 20), 92, dBg, 13, 'lighter'),
    heroBg: hslToHex(h, Math.min(s, 60) * 0.5, 11),
    accent: hslToHex(h, Math.min(s, 60) * 0.55, 22),
    ...STATUS_DARK,
  };
  fixButton(dark, h, Math.min(s, 85), Math.max(58, (seed.l ?? 45) + 18));
  return { light, dark };
}

/** Guarantee ≥ 4.5:1 between the button colour and its text. */
function fixButton(p: ThemePalette, h: number, s: number, l: number) {
  if (contrast(p.primary, p.primaryFg) >= 4.5) return;
  if (p.primaryFg === '#ffffff') {
    p.primary = ensure(h, s, l, '#ffffff', 4.6, 'darker');
  } else {
    p.primary = ensure(h, s, l, INK, 4.6, 'lighter');
  }
}

const CATEGORY_DESC: Record<string, string> = {
  classic: 'Clean and professional',
  nature: 'Calm, natural tones',
  ocean: 'Cool sea colours',
  warm: 'Warm, energetic',
  pastel: 'Soft and friendly',
  bold: 'High-energy, vivid',
  earth: 'Earthy neutrals',
  jewel: 'Rich gemstone colours',
  pakistan: 'Inspired by Pakistan',
  night: 'Great in dark mode',
  minimal: 'Quiet and distraction-free',
};

export const GENERATED_PRESETS: ThemePreset[] = THEME_CATEGORIES.flatMap((cat) =>
  cat.seeds.map((seed) => {
    const { light, dark } = buildPalettes(seed, cat.tint ?? 0.35);
    const [radiusMd, radiusLg] = RADIUS[cat.shape];
    return {
      id: slug(seed.name),
      name: seed.name,
      description: seed.desc ?? CATEGORY_DESC[cat.id] ?? cat.label,
      category: cat.label,
      font: seed.name === 'Paper' || seed.name === 'Newsprint' ? FONT.serif : FONT[cat.font],
      radiusMd,
      radiusLg,
      light,
      dark,
    };
  })
);

/** Hand-made accessibility preset: maximum contrast in both modes. */
export const HIGH_CONTRAST: ThemePreset = {
  id: 'high-contrast',
  name: 'High Contrast',
  description: 'Maximum readability (accessibility)',
  category: 'Minimal & Calm',
  font: FONT.system,
  radiusMd: '6px',
  radiusLg: '10px',
  light: {
    primary: '#000000', primaryFg: '#ffffff', bg: '#ffffff', surface: '#ffffff', border: '#000000',
    muted: '#333333', text: '#000000', heroBg: '#f1f1f1', accent: '#d9d9d9',
    success: '#006400', warning: '#7a4a00', danger: '#b00000',
  },
  dark: {
    primary: '#ffff00', primaryFg: '#000000', bg: '#000000', surface: '#000000', border: '#ffffff',
    muted: '#e0e0e0', text: '#ffffff', heroBg: '#111111', accent: '#333333',
    success: '#00ff7f', warning: '#ffd700', danger: '#ff6b6b',
  },
};
