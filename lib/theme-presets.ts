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
import type { SceneId } from './theme-scenes';

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
  rounded: '"M PLUS Rounded 1c", Nunito, ui-rounded, ui-sans-serif, system-ui, sans-serif',
  quicksand: 'Quicksand, ui-sans-serif, system-ui, sans-serif',
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
  /** second hue: gradient end, hero band and accent (duotone / gradient themes) */
  h2?: number;
  /** illustrated background (Deluxe / Anime Deluxe) */
  scene?: SceneId;
  /** recommended design style id (lib/ui-styles.ts) */
  style?: string;
};

/** Compact seed: [name, hue, saturation, lightness?, tint?, hue2?, scene?, style?] */
type T = [string, number, number, number?, number?, number?, SceneId?, string?];
const seeds = (rows: T[]): Seed[] =>
  rows.map(([name, h, s, l, tint, h2, scene, style]) => ({ name, h, s, l, tint, h2, scene, style }));

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
      ...seeds([
        ['Skardu Blue', 205, 70, 40], ['Deosai Meadow', 95, 50, 32], ['Fairy Meadows', 140, 55, 30], ['Naran Lake', 190, 70, 34],
        ['Saif ul Malook', 175, 65, 30], ['Attabad Turquoise', 180, 85, 30], ['Faisal Mosque', 210, 15, 40, 0.6], ['Shalimar Gardens', 145, 60, 28],
        ['Rohtas Fort', 25, 45, 38], ['Mohenjo-daro', 22, 50, 40, 0.7], ['Sindhi Ajrak', 355, 70, 34, undefined, 215], ['Balochi Embroidery', 345, 80, 42, undefined, 30],
        ['Kalash Festival', 330, 75, 46, undefined, 50], ['Neelum Valley', 160, 60, 28], ['Ziarat Juniper', 130, 40, 28], ['Gwadar Coast', 195, 75, 36],
        ['Chitral Pine', 150, 50, 24], ['Minar-e-Pakistan', 150, 25, 34, 0.6], ['Lahore Fort', 15, 55, 38], ['Khewra Salt', 5, 45, 55, 0.8],
        ['Hingol Dunes', 32, 55, 40], ['Kaghan Snow', 205, 35, 44, 0.7],
      ]),
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
  {
    id: 'deluxe', label: 'Deluxe', font: 'dm', shape: 'soft', tint: 0.45,
    seeds: seeds([
      ['Royal Gold', 43, 80, 38, 0.5, 30, 'deco', 'deluxe'], ['Black Pearl', 230, 15, 22, 0.2, 200, 'velvet', 'dark-luxury-ui'],
      ['Champagne', 40, 45, 40, 0.75, 25, 'starlight', 'luxury-ui'], ['Velvet Noir', 345, 55, 32, 0.3, 15, 'velvet', 'dark-luxury-ui'],
      ['Emerald Palace', 155, 70, 26, 0.4, 45, 'filigree', 'royal-palace'], ['Sapphire Lounge', 220, 75, 36, 0.35, 45, 'deco', 'deluxe'],
      ['Rose Gold', 15, 55, 46, 0.6, 350, 'starlight', 'deluxe'], ['Platinum', 220, 8, 34, 0.3, 200, 'marble', 'luxury-ui'],
      ['Ivory & Gold', 42, 70, 36, 0.8, 30, 'filigree', 'royal-palace'], ['Midnight Gold', 44, 85, 40, 0.2, 230, 'starlight', 'dark-luxury-ui'],
      ['Bordeaux', 345, 60, 30, 0.45, 20, 'velvet', 'deluxe'], ['Imperial Jade', 160, 55, 28, 0.5, 40, 'filigree', 'royal-palace'],
      ['Onyx Marble', 0, 0, 16, 0.15, 40, 'marble', 'editorial-luxury-ui'], ['Amethyst Crown', 275, 55, 42, 0.4, 45, 'filigree', 'royal-palace'],
      ['Copper Lux', 22, 65, 40, 0.55, 40, 'deco', 'art-deco-ui'], ['Pearl White', 210, 20, 38, 0.6, 330, 'marble', 'high-end-minimalist-ui'],
      ['Gatsby Night', 45, 75, 42, 0.15, 220, 'deco', 'art-deco-ui'], ['Ruby Palace', 350, 70, 38, 0.4, 42, 'filigree', 'royal-palace'],
      ['Sterling', 210, 12, 30, 0.35, 190, 'marble', 'metallic-ui'], ['Golden Lotus', 40, 80, 40, 0.6, 330, 'starlight', 'deluxe'],
      ['Royal Navy', 225, 65, 28, 0.35, 43, 'deco', 'luxury-ui'], ['Opal Dream', 260, 40, 52, 0.6, 170, 'starlight', 'holographic-ui'],
      ['Mocha Lux', 25, 35, 30, 0.55, 40, 'marble', 'luxury-ui'], ['Velvet Plum', 300, 45, 34, 0.4, 40, 'velvet', 'deluxe'],
    ]),
  },
  {
    id: 'anime', label: 'Anime Deluxe', font: 'rounded', shape: 'round', tint: 0.5,
    seeds: seeds([
      ['Sakura Spirit', 340, 70, 52, 0.7, 280, 'sakura', 'anime-deluxe'], ['Moonlit Shrine', 250, 55, 48, 0.35, 210, 'moon-shrine', 'anime-night-festival'],
      ['Lantern Festival', 20, 90, 48, 0.45, 330, 'lanterns', 'anime-night-festival'], ['Starfall Night', 255, 70, 55, 0.25, 200, 'starfall', 'anime-night-festival'],
      ['Tidecaller', 200, 85, 40, 0.5, 170, 'waves', 'anime-deluxe'], ['Ember Blade', 8, 85, 48, 0.35, 35, 'ember', 'anime-deluxe'],
      ['Frostbloom', 195, 70, 42, 0.65, 260, 'frost', 'anime-deluxe'], ['Stormcaller', 265, 75, 55, 0.3, 200, 'storm', 'anime-deluxe'],
      ['Verdant Grove', 140, 60, 32, 0.5, 90, 'forest', 'anime-deluxe'], ['Galewind', 170, 55, 34, 0.6, 200, 'wind', 'anime-deluxe'],
      ['Crystal Peak', 215, 65, 48, 0.55, 280, 'crystal', 'anime-deluxe'], ['Koi Garden', 12, 80, 48, 0.55, 190, 'koi', 'anime-deluxe'],
      ['Sky Islands', 205, 80, 46, 0.7, 45, 'sky-islands', 'anime-deluxe'], ['Cherry Moon', 330, 60, 48, 0.3, 250, 'sakura', 'anime-night-festival'],
      ['Twilight Fox', 25, 85, 46, 0.4, 280, 'lanterns', 'anime-deluxe'], ['Celestial Harmony', 240, 60, 55, 0.3, 45, 'starfall', 'anime-deluxe'],
      ['Thunder Sakura', 280, 70, 55, 0.5, 330, 'storm', 'anime-deluxe'], ['Spirit Lake', 185, 60, 34, 0.55, 260, 'koi', 'anime-deluxe'],
      ['Dawn Blossom', 350, 75, 52, 0.75, 40, 'sakura', 'anime-deluxe'], ['Mist Valley', 200, 30, 40, 0.6, 150, 'mountains', 'anime-deluxe'],
      ['Phoenix Flame', 15, 95, 48, 0.4, 45, 'ember', 'anime-deluxe'], ['Snowy Shrine', 210, 40, 44, 0.7, 350, 'moon-shrine', 'anime-deluxe'],
      ['Ocean Spirit', 195, 85, 36, 0.5, 230, 'waves', 'anime-deluxe'], ['Starry Wish', 270, 65, 58, 0.4, 330, 'starfall', 'anime-deluxe'],
      ['Emerald Wind', 150, 70, 30, 0.5, 190, 'wind', 'anime-deluxe'], ['Amber Festival', 35, 95, 42, 0.55, 15, 'lanterns', 'anime-deluxe'],
      ['Aurora Dream', 165, 70, 32, 0.35, 280, 'starfall', 'anime-night-festival'], ['Moonflower', 290, 50, 55, 0.55, 200, 'moon-shrine', 'anime-deluxe'],
    ]),
  },
  {
    id: 'gradients', label: 'Gradients', font: 'jakarta', shape: 'round', tint: 0.35,
    seeds: seeds([
      ['Peach Sunset', 15, 90, 48, undefined, 330], ['Ocean Breeze', 200, 80, 38, undefined, 165], ['Purple Haze', 270, 70, 52, undefined, 320],
      ['Mango Tango', 32, 95, 44, undefined, 8], ['Cosmic Fusion', 285, 70, 50, undefined, 210], ['Blue Raspberry', 225, 85, 50, undefined, 330],
      ['Citrus Splash', 45, 95, 40, undefined, 95], ['Berry Smoothie', 330, 70, 46, undefined, 280], ['Lagoon Glow', 185, 85, 32, undefined, 140],
      ['Electric Violet', 260, 90, 58, undefined, 195], ['Fire & Ice', 5, 85, 48, undefined, 200], ['Tropical Punch', 345, 85, 50, undefined, 25],
      ['Northern Lights', 160, 75, 32, undefined, 265], ['Candy Floss', 320, 75, 52, undefined, 200], ['Midnight Bloom', 250, 60, 48, undefined, 320],
      ['Golden Hour', 38, 90, 42, undefined, 10], ['Mint Mojito', 150, 65, 32, undefined, 85], ['Rose Quartz Glow', 340, 55, 50, undefined, 270],
      ['Deep Space', 235, 65, 50, undefined, 285], ['Sunrise Glow', 25, 95, 48, undefined, 50], ['Aqua Marine Glow', 178, 80, 30, undefined, 215],
      ['Plum Wine', 300, 55, 40, undefined, 345], ['Lemon Lime', 58, 90, 36, undefined, 110], ['Sapphire Dream', 220, 80, 48, undefined, 260],
      ['Crimson Tide', 350, 80, 44, undefined, 20], ['Emerald City', 155, 80, 30, undefined, 190], ['Orchid Bloom', 290, 60, 52, undefined, 330],
      ['Sky Fire', 205, 85, 46, undefined, 15], ['Neon Dusk', 275, 85, 55, undefined, 10], ['Seaglass', 170, 45, 36, undefined, 200],
    ]),
  },
  {
    id: 'duotone', label: 'Duotone', font: 'dm', shape: 'soft', tint: 0.3,
    seeds: seeds([
      ['Ink & Saffron', 225, 55, 30, undefined, 38], ['Navy & Coral', 220, 65, 32, undefined, 10], ['Teal & Tangerine', 180, 75, 30, undefined, 28],
      ['Plum & Lime', 290, 55, 40, undefined, 85], ['Forest & Rose', 150, 55, 28, undefined, 345], ['Cobalt & Gold', 215, 85, 42, undefined, 45],
      ['Charcoal & Mint', 210, 15, 25, undefined, 155], ['Wine & Blush', 345, 60, 34, undefined, 355], ['Indigo & Peach', 245, 65, 46, undefined, 22],
      ['Olive & Sky', 75, 40, 32, undefined, 200], ['Ruby & Teal', 350, 75, 42, undefined, 180], ['Violet & Amber', 265, 75, 52, undefined, 40],
      ['Slate & Lemon', 215, 25, 32, undefined, 55], ['Espresso & Cream', 25, 40, 26, undefined, 40], ['Moss & Clay', 90, 40, 30, undefined, 18],
      ['Denim & Sun', 215, 55, 38, undefined, 48],
    ]),
  },
  {
    id: 'seasons', label: 'Seasons', font: 'poppins', shape: 'round', tint: 0.45,
    seeds: seeds([
      ['Spring Bloom', 330, 65, 50, undefined, 100], ['Spring Meadow', 110, 55, 34], ['Early Spring', 150, 45, 34], ['April Showers', 205, 55, 42],
      ['Summer Breeze', 190, 80, 34], ['Summer Sun', 45, 95, 40], ['Beach Day', 185, 85, 32, undefined, 40], ['Midsummer', 20, 85, 48],
      ['Autumn Harvest', 28, 75, 40], ['Pumpkin Spice', 24, 80, 42], ['Maple', 8, 70, 40], ['Harvest Moon', 40, 70, 36],
      ['Winter Frost', 205, 45, 40], ['Snowfall', 215, 30, 38], ['Winter Berry', 345, 60, 40], ['Evergreen', 155, 55, 26],
    ]),
  },
  {
    id: 'flowers', label: 'Flowers', font: 'poppins', shape: 'pill', tint: 0.6,
    seeds: seeds([
      ['Rose', 350, 70, 46], ['Tulip', 10, 80, 48], ['Sunflower', 45, 95, 38], ['Daisy', 50, 80, 36, 0.8], ['Lilac', 275, 45, 55], ['Orchid', 300, 55, 50],
      ['Peony', 335, 65, 52], ['Magnolia', 330, 35, 50, 0.8], ['Hibiscus', 355, 85, 48], ['Lotus', 320, 55, 50], ['Jasmine', 55, 60, 34, 0.85], ['Iris', 255, 60, 52],
      ['French Marigold', 32, 95, 44], ['Bluebell', 230, 65, 55], ['Poppy', 5, 85, 48], ['Camellia', 345, 65, 44], ['Wisteria', 265, 50, 55], ['Hydrangea', 220, 55, 52],
      ['Gardenia', 45, 30, 36, 0.85], ['Bougainvillea', 320, 85, 46], ['Lavender Sprig', 265, 40, 52], ['Dahlia', 340, 75, 40], ['Violet Bloom', 270, 65, 50], ['Chrysanthemum', 40, 85, 42],
    ]),
  },
  {
    id: 'fruits', label: 'Fruits & Sweets', font: 'poppins', shape: 'pill', tint: 0.55,
    seeds: seeds([
      ['Mango', 38, 95, 44], ['Kiwi', 85, 60, 32], ['Blueberry', 230, 60, 46], ['Raspberry', 340, 75, 46], ['Watermelon', 350, 80, 52, undefined, 140],
      ['Lychee', 350, 45, 50], ['Pomegranate', 355, 70, 40], ['Fig', 300, 30, 36], ['Grape', 280, 50, 44], ['Papaya', 20, 90, 50], ['Pineapple', 48, 95, 38],
      ['Lime', 80, 75, 30], ['Cherry', 355, 80, 42], ['Ripe Plum', 305, 45, 38], ['Guava', 345, 60, 50], ['Dragon Fruit', 325, 80, 48, undefined, 90],
      ['Banana Split', 50, 90, 38], ['Strawberry Milk', 345, 60, 55, 0.8], ['Caramel', 30, 65, 40], ['Macaron', 320, 55, 55, 0.8], ['Gulab Jamun', 15, 60, 32],
      ['Kulfi', 40, 55, 38, 0.8], ['Jalebi', 35, 95, 46], ['Falooda', 330, 65, 52], ['Mint Ice Cream', 160, 50, 34, 0.75],
    ]),
  },
  {
    id: 'coffee', label: 'Coffee & Tea', font: 'dm', shape: 'soft', tint: 0.6,
    seeds: seeds([
      ['Latte', 30, 35, 36], ['Cappuccino', 25, 40, 32], ['Cafe Mocha', 20, 35, 28], ['Matcha', 95, 45, 32], ['Masala Chai', 28, 55, 36], ['Earl Grey', 220, 15, 36],
      ['Green Tea', 110, 40, 32], ['Hibiscus Tea', 350, 60, 40], ['Kashmiri Chai', 345, 45, 52, 0.8], ['Cold Brew', 25, 45, 22], ['Caramel Macchiato', 32, 60, 38],
      ['Jasmine Tea', 55, 50, 32, 0.8], ['Black Tea', 15, 45, 26], ['Rooibos', 12, 60, 40],
    ]),
  },
  {
    id: 'gems', label: 'Gems & Minerals', font: 'inter', shape: 'round', tint: 0.3,
    seeds: seeds([
      ['Emerald Cut', 152, 80, 30], ['Citrine', 45, 90, 40], ['Turquoise', 176, 70, 34], ['Rose Quartz', 345, 50, 52], ['Moonstone', 220, 25, 45, 0.7],
      ['Malachite', 155, 70, 26], ['Tanzanite', 250, 60, 50], ['Morganite', 15, 50, 52], ['Alexandrite', 170, 40, 34, undefined, 300], ['Spinel', 345, 75, 46],
      ['Zircon', 195, 70, 38], ['Labradorite', 205, 35, 40, undefined, 170], ['Carnelian', 15, 75, 44], ['Kunzite', 315, 45, 55], ['Amber Stone', 35, 90, 40],
    ]),
  },
  {
    id: 'cities', label: 'World Cities', font: 'jakarta', shape: 'soft', tint: 0.35,
    seeds: seeds([
      ['Tokyo Neon', 325, 85, 50, undefined, 200], ['Kyoto Garden', 150, 45, 30], ['Paris Blush', 345, 45, 50], ['London Fog', 210, 12, 36], ['New York Night', 225, 40, 40],
      ['Istanbul Tile', 195, 70, 36, undefined, 30], ['Marrakech Spice', 18, 70, 42], ['Santorini', 210, 75, 42], ['Dubai Gold', 40, 75, 38], ['Seoul Pop', 330, 70, 52],
      ['Rio Carnival', 140, 80, 32, undefined, 45], ['Cairo Sand', 38, 50, 38], ['Venice Canal', 185, 45, 34], ['Barcelona Sun', 28, 85, 46], ['Havana', 10, 65, 46, undefined, 170],
      ['Sydney Harbour', 200, 70, 40], ['Amsterdam Tulip', 5, 75, 48], ['Bangkok Temple', 42, 85, 40, undefined, 350], ['Prague Dusk', 270, 30, 42], ['Lisbon Tram', 48, 90, 38],
      ['Singapore Garden', 160, 65, 30], ['Reykjavik Ice', 195, 40, 40], ['Cape Town Coast', 190, 65, 36], ['Mumbai Monsoon', 205, 40, 34], ['Petra Rose', 12, 45, 44],
      ['Vienna Opera', 350, 45, 36], ['Kathmandu Prayer', 10, 80, 46, undefined, 210], ['Bali Jungle', 130, 55, 28], ['Mexico Fiesta', 330, 80, 48, undefined, 50], ['Oslo Fjord', 210, 45, 36],
    ]),
  },
  {
    id: 'space', label: 'Space & Cosmos', font: 'inter', shape: 'soft', tint: 0.2,
    seeds: seeds([
      ['Mars Red', 10, 70, 44], ['Jupiter Storm', 25, 60, 42], ['Saturn Rings', 40, 55, 40], ['Neptune Blue', 225, 75, 48], ['Uranus Ice', 185, 55, 36],
      ['Venus Glow', 35, 85, 44], ['Andromeda', 265, 60, 55], ['Orion Nebula', 300, 60, 50, undefined, 210], ['Milky Way', 240, 40, 50], ['Supernova', 15, 95, 50, undefined, 300],
      ['Black Hole', 260, 20, 30], ['Comet Tail', 195, 80, 40], ['Lunar Grey', 220, 8, 38], ['Solar Flare', 30, 100, 48], ['Stardust', 45, 50, 42],
      ['Event Horizon', 280, 45, 40], ['Cosmic Teal', 178, 70, 30], ['Pulsar', 200, 90, 48, undefined, 280],
    ]),
  },
  {
    id: 'neon', label: 'Neon & Cyber', font: 'jakarta', shape: 'sharp', tint: 0.1,
    seeds: seeds([
      ['Neon Pink', 320, 100, 50], ['Neon Cyan', 185, 100, 32], ['Neon Lime', 95, 90, 32], ['Neon Orange', 25, 100, 48], ['Neon Purple', 275, 95, 58],
      ['Synthwave', 310, 85, 52, undefined, 190], ['Cyber Grid', 190, 100, 32, undefined, 300], ['Blade Runner', 20, 85, 48, undefined, 200], ['Hacker Green', 140, 90, 28],
      ['Glitch', 300, 90, 50, undefined, 170], ['Laser Grid', 345, 95, 52, undefined, 200], ['Plasma', 260, 100, 60, undefined, 320], ['Arcade', 55, 100, 40, undefined, 300],
      ['Matrix Rain', 130, 80, 30], ['Tron Blue', 195, 100, 40], ['Hyperdrive', 220, 100, 55, undefined, 180], ['Night Market', 345, 85, 50, undefined, 40], ['Vapor Neon', 290, 85, 58, undefined, 180],
    ]),
  },
  {
    id: 'retro', label: 'Retro & Vintage', font: 'poppins', shape: 'round', tint: 0.65,
    seeds: seeds([
      ['Seventies Orange', 25, 80, 46], ['Avocado Kitchen', 75, 40, 32], ['Mustard', 45, 80, 38], ['Harvest Gold', 40, 75, 38], ['Teal Diner', 178, 55, 32],
      ['Bubblegum Retro', 330, 60, 52], ['Polaroid', 30, 20, 36, 0.85], ['Vintage Rose', 350, 35, 46], ['Sepia', 30, 40, 32, 0.8], ['Jukebox', 355, 75, 44, undefined, 45],
      ['Atomic Age', 185, 65, 34, undefined, 15], ['Disco', 285, 70, 52, undefined, 45], ['Typewriter', 30, 10, 24, 0.7], ['Vinyl', 0, 0, 14, 0.4, 350], ['Cassette', 15, 75, 46, undefined, 200],
      ['Pinball', 300, 80, 50, undefined, 55], ['Old Film', 40, 15, 30, 0.7], ['Postcard', 200, 45, 40, 0.7],
    ]),
  },
  {
    id: 'professional', label: 'Professional', font: 'inter', shape: 'soft', tint: 0.15,
    seeds: seeds([
      ['Boardroom', 220, 40, 30], ['Executive Navy', 222, 55, 28], ['Consulting Blue', 210, 80, 40], ['Fintech Teal', 180, 70, 30], ['Legal Grey', 215, 15, 32],
      ['Healthcare Blue', 200, 75, 40], ['Startup Purple', 255, 70, 55], ['Banking Green', 155, 60, 28], ['Analytics', 205, 60, 42, undefined, 170], ['Enterprise', 230, 30, 36],
      ['Trust Blue', 215, 70, 42], ['Clarity', 195, 40, 40], ['Momentum', 15, 80, 46], ['Insight', 270, 45, 48], ['Precision', 200, 20, 30], ['Summit', 225, 45, 40],
    ]),
  },
  {
    id: 'academic', label: 'Academic', font: 'dm', shape: 'soft', tint: 0.45,
    seeds: seeds([
      ['Ivy League', 145, 45, 26], ['Scholar', 225, 50, 32], ['Library', 25, 35, 30], ['Chalkboard', 150, 20, 26], ['Lecture Hall', 15, 40, 36],
      ['Graduation', 230, 60, 30, undefined, 45], ['Campus Green', 130, 45, 30], ['Old Parchment', 40, 35, 34, 0.85], ['Science Lab', 190, 70, 34], ['Math Notebook', 215, 60, 46, 0.6],
      ['Ink & Quill', 230, 30, 24], ['Debate Club', 350, 55, 38], ['Honors Gold', 42, 75, 36], ['Study Hall', 200, 25, 34],
    ]),
  },
  {
    id: 'playful', label: 'Playful', font: 'poppins', shape: 'pill', tint: 0.55,
    seeds: seeds([
      ['Crayon Red', 5, 80, 48], ['Crayon Blue', 215, 80, 50], ['Playground', 40, 95, 42, undefined, 200], ['Bubblegum', 330, 80, 55], ['Lego Yellow', 48, 100, 40],
      ['Dino Green', 110, 60, 34], ['Unicorn', 290, 60, 58, undefined, 330], ['Rainbow', 0, 85, 50, undefined, 200], ['Toy Box', 200, 80, 44, undefined, 25],
      ['Jellybean', 340, 80, 50, undefined, 90], ['Sprinkles', 320, 70, 54, undefined, 190], ['Puzzle', 25, 90, 48, undefined, 215], ['Balloon', 355, 85, 52], ['Sunny Day', 50, 95, 40],
    ]),
  },
  {
    id: 'mono', label: 'Monochrome', font: 'system', shape: 'sharp', tint: 0.3,
    seeds: seeds([
      ['Mono Red', 0, 65, 40], ['Mono Orange', 25, 75, 42], ['Mono Yellow', 48, 80, 34], ['Mono Green', 140, 50, 30], ['Mono Teal', 180, 55, 30], ['Mono Blue', 215, 65, 42],
      ['Mono Indigo', 240, 50, 46], ['Mono Purple', 275, 45, 46], ['Mono Pink', 330, 55, 48], ['Mono Brown', 25, 35, 32], ['Mono Slate', 215, 20, 36], ['Mono Sand', 40, 30, 36, 0.7],
    ]),
  },
  {
    id: 'weather', label: 'Weather & Sky', font: 'jakarta', shape: 'round', tint: 0.45,
    seeds: seeds([
      ['Stormy Sky', 215, 25, 36], ['Rainy Day', 205, 35, 40], ['Blue Hour', 230, 55, 46], ['Morning Sunrise', 20, 90, 50, undefined, 45], ['Fog Bank', 210, 10, 42, 0.6],
      ['Thunder', 260, 40, 40], ['Rainbow Sky', 200, 75, 46, undefined, 330], ['Clear Sky', 200, 85, 44], ['Overcast', 210, 8, 38], ['Heatwave', 15, 90, 48, undefined, 45],
      ['Snow Day', 205, 30, 42, 0.75], ['Sunset Clouds', 340, 60, 52, undefined, 25], ['Monsoon', 190, 45, 30], ['Dawn Mist', 260, 25, 52, 0.7],
    ]),
  },
  {
    id: 'landscapes', label: 'Landscapes', font: 'dm', shape: 'soft', tint: 0.5,
    seeds: seeds([
      ['Alpine Lake', 195, 65, 36], ['Canyon', 18, 60, 40], ['Savanna', 40, 60, 38], ['Tundra', 190, 20, 40], ['Rainforest', 140, 65, 26], ['Prairie', 70, 45, 34],
      ['Volcano', 5, 75, 40], ['Glacier Bay', 190, 50, 38], ['Highland Heather', 300, 30, 44], ['Redwood', 10, 50, 32], ['Coral Coast', 10, 75, 52, undefined, 185],
      ['Oasis', 170, 60, 32, undefined, 40], ['Fjord Mist', 205, 30, 38], ['Bamboo Forest', 100, 50, 30],
    ]),
  },
  {
    id: 'calm', label: 'Calm & Wellness', font: 'quicksand', shape: 'pill', tint: 0.6,
    seeds: seeds([
      ['Zen Garden', 100, 20, 36], ['Spa Day', 170, 35, 34], ['Breathe', 195, 40, 42], ['Meditation', 260, 25, 48], ['Serenity', 210, 45, 48], ['Tranquil Sage', 130, 18, 36],
      ['Mindful', 30, 25, 40], ['Healing Green', 150, 40, 32], ['Soft Lavender', 260, 40, 56], ['Calm Water', 190, 45, 36], ['Gentle Peach', 20, 60, 52], ['Still Sand', 38, 25, 38],
    ]),
  },
  {
    id: 'metals', label: 'Metals', font: 'inter', shape: 'sharp', tint: 0.2,
    seeds: seeds([
      ['Silver', 210, 8, 40], ['Bronze', 30, 55, 36], ['Titanium', 210, 10, 30], ['Brass', 45, 60, 34], ['Pewter', 200, 6, 34], ['Chrome Blue', 205, 25, 40],
      ['Gunmetal', 215, 12, 24], ['Antique Gold', 42, 55, 34], ['Copper Patina', 170, 35, 32], ['Iron Ore', 10, 25, 28],
    ]),
  },
  {
    id: 'spices', label: 'Spices', font: 'poppins', shape: 'round', tint: 0.55,
    seeds: seeds([
      ['Turmeric', 42, 90, 40], ['Cardamom', 90, 35, 32], ['Sumac', 355, 55, 36], ['Chili', 5, 85, 44], ['Clove', 15, 40, 26], ['Nutmeg', 25, 50, 34],
      ['Star Anise', 20, 35, 28], ['Fennel', 80, 35, 32], ['Zafran', 36, 95, 44], ['Cumin', 30, 45, 32],
    ]),
  },
  {
    id: 'textiles', label: 'Textiles & Crafts', font: 'dm', shape: 'soft', tint: 0.55,
    seeds: seeds([
      ['Indigo Dye', 235, 55, 34], ['Ajrak Red', 355, 65, 34, undefined, 220], ['Batik', 25, 60, 34, undefined, 200], ['Denim', 215, 40, 36], ['Velvet Rope', 345, 55, 32],
      ['Silk Road', 35, 65, 40, undefined, 180], ['Tweed', 30, 20, 32], ['Raw Linen', 40, 20, 36, 0.85], ['Phulkari', 330, 80, 46, undefined, 45], ['Khaddar', 35, 25, 34, 0.7],
      ['Pashmina', 20, 25, 44, 0.75], ['Block Print', 10, 70, 40, undefined, 200],
    ]),
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
  // Second hue: gradient end colour (and hero / accent for duotone themes).
  const h2 = seed.h2 ?? (h + 32) % 360;
  const hh = seed.h2 ?? h;

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
    heroBg: hslToHex(hh, Math.min(s, 85) * 0.7, 95.5 - tint * 1.5),
    accent: hslToHex(hh, Math.min(s, 75) * 0.6, 86),
    ...STATUS_LIGHT,
  };
  fixButton(light, h, s, seed.l ?? 45);
  light.primary2 = second(light.primaryFg, h2, s, seed.l ?? 45);

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
    heroBg: hslToHex(hh, Math.min(s, 60) * 0.5, 11),
    accent: hslToHex(hh, Math.min(s, 60) * 0.55, 22),
    ...STATUS_DARK,
  };
  fixButton(dark, h, Math.min(s, 85), Math.max(58, (seed.l ?? 45) + 18));
  dark.primary2 = second(dark.primaryFg, h2, Math.min(s, 85), Math.max(58, (seed.l ?? 45) + 18));
  return { light, dark };
}

/** Gradient end colour: readable with the same button text (≥ 4.5 : 1). */
function second(fg: string, h: number, s: number, l: number): string {
  return fg === '#ffffff' ? ensure(h, s, l, '#ffffff', 4.6, 'darker') : ensure(h, s, l, INK, 4.6, 'lighter');
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
  deluxe: 'Premium look with illustrated background',
  anime: 'Anime-inspired scenery and glow',
  gradients: 'Two-colour gradients',
  duotone: 'Bold two-colour pairing',
  seasons: 'Colours of the seasons',
  flowers: 'Fresh floral colours',
  fruits: 'Sweet and juicy',
  coffee: 'Cosy café tones',
  gems: 'Polished gemstone colours',
  cities: 'Inspired by world cities',
  space: 'Out of this world',
  neon: 'Electric neon — great in dark mode',
  retro: 'Vintage and nostalgic',
  professional: 'Corporate and trustworthy',
  academic: 'Classic campus colours',
  playful: 'Bright and fun',
  mono: 'One colour, many shades',
  weather: 'Moods of the sky',
  landscapes: 'Natural landscapes',
  calm: 'Soothing and focused',
  metals: 'Cool metallic neutrals',
  spices: 'Warm spice-market colours',
  textiles: 'Fabric and craft traditions',
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
      ...(seed.scene ? { scene: seed.scene } : {}),
      ...(seed.style ? { uiStyle: seed.style } : {}),
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
