// =============================================================================
// FILE: lib/ui-patterns.ts   (NEW FILE — client-safe)
// Background pieces used by the design styles (lib/ui-styles.ts):
//   - PATTERNS: tiny SVG tiles used as a CSS *mask*, so they are painted in
//     the current theme colour (works with every colour theme, light & dark).
//   - BACKDROPS: gradient backgrounds built from the theme's CSS variables.
// Everything is generated (deterministic), no images to download.
// =============================================================================

/** Deterministic pseudo-random numbers (same output on server and client). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** SVG markup → CSS url() (safe inside a <style> block: no < > { } ; characters). */
export function svgUrl(w: number, h: number, inner: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')}")`;
}

/** A repeating mask tile: full `mask` shorthand value. */
const tile = (w: number, h: number, inner: string, size = `${w}px ${h}px`) => `${svgUrl(w, h, inner)} 0 0 / ${size} repeat`;

// ---------------------------------------------------------------------------
// Patterns (black shapes; the mask colour comes from --ui-pattern-color)
// ---------------------------------------------------------------------------

function sparkle(cx: number, cy: number, r: number) {
  const k = r * 0.28;
  return `<path d='M${r1(cx)} ${r1(cy - r)}Q${r1(cx + k)} ${r1(cy - k)} ${r1(cx + r)} ${r1(cy)}Q${r1(cx + k)} ${r1(cy + k)} ${r1(cx)} ${r1(cy + r)}Q${r1(cx - k)} ${r1(cy + k)} ${r1(cx - r)} ${r1(cy)}Q${r1(cx - k)} ${r1(cy - k)} ${r1(cx)} ${r1(cy - r)}Z'/>`;
}

function randomShapes(seed: number, w: number, h: number, n: number, draw: (r: () => number, x: number, y: number, i: number) => string) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) out += draw(r, r() * w, r() * h, i);
  return out;
}

export const PATTERNS = {
  none: 'none',
  dots: tile(22, 22, `<circle cx='11' cy='11' r='1.4'/>`),
  dotsLarge: tile(36, 36, `<circle cx='18' cy='18' r='2.4'/>`),
  canvasDots: tile(28, 28, `<circle cx='14' cy='14' r='1.6'/>`),
  grid: tile(32, 32, `<path d='M32 0H0V32' fill='none' stroke='black' stroke-width='1'/>`),
  gridFine: tile(16, 16, `<path d='M16 0H0V16' fill='none' stroke='black' stroke-width='.6'/>`),
  blueprint: tile(
    100,
    100,
    `<path d='M100 0H0V100' fill='none' stroke='black' stroke-width='1.6'/><path d='M20 0V100M40 0V100M60 0V100M80 0V100M0 20H100M0 40H100M0 60H100M0 80H100' fill='none' stroke='black' stroke-width='.5' opacity='.6'/>`
  ),
  diagonal: tile(14, 14, `<path d='M-2 16L16 -2M12 18L18 12M-4 4L4 -4' stroke='black' stroke-width='1.4'/>`),
  stripes: tile(10, 10, `<rect width='10' height='3'/>`),
  scanlines: tile(4, 4, `<rect width='4' height='1.2'/>`),
  checker: tile(24, 24, `<rect width='12' height='12'/><rect x='12' y='12' width='12' height='12'/>`),
  crosses: tile(40, 40, `<path d='M20 14V26M14 20H26' stroke='black' stroke-width='1.6'/>`),
  hex: tile(
    56,
    97,
    `<path d='M28 0L56 16V48L28 64L0 48V16Z M28 64V97 M0 97V80L28 64L56 80V97' fill='none' stroke='black' stroke-width='1'/>`,
    '56px 97px'
  ),
  isometric: tile(
    60,
    34.6,
    `<path d='M0 0L60 34.6M60 0L0 34.6M30 0V34.6' fill='none' stroke='black' stroke-width='.8'/>`,
    '60px 34.6px'
  ),
  cubes: tile(
    60,
    104,
    `<path d='M30 0L60 17V52L30 69L0 52V17Z' fill='none' stroke='black' stroke-width='1'/><path d='M30 34L60 17M30 34L0 17M30 34V69' stroke='black' stroke-width='1'/><path d='M0 52L30 69V104M60 52L30 69' fill='none' stroke='black' stroke-width='1'/>`,
    '60px 104px'
  ),
  waves: tile(120, 24, `<path d='M0 12C20 2 40 2 60 12S100 22 120 12' fill='none' stroke='black' stroke-width='1.4'/>`),
  seigaiha: tile(
    60,
    30,
    `<g fill='none' stroke='black' stroke-width='1.2'><path d='M0 30A30 30 0 0 1 60 30M8 30A22 22 0 0 1 52 30M16 30A14 14 0 0 1 44 30M24 30A6 6 0 0 1 36 30'/><path d='M-30 15A30 30 0 0 1 30 15M30 15A30 30 0 0 1 90 15' opacity='.55'/></g>`
  ),
  topo: tile(
    360,
    360,
    Array.from({ length: 7 }, (_, i) => {
      const r = 26 + i * 24;
      return `<path d='M${180 - r} 180C${180 - r} ${180 - r * 0.8} ${180 - r * 0.2} ${180 - r} ${180 + r * 0.1} ${180 - r * 0.95}S${180 + r * 1.05} ${180 - r * 0.3} ${180 + r * 0.95} ${180 + r * 0.15}S${180 + r * 0.2} ${180 + r * 1.05} ${180 - r * 0.25} ${180 + r * 0.9}S${180 - r} ${180 + r * 0.4} ${180 - r} 180Z' fill='none' stroke='black' stroke-width='1'/>`;
    }).join('')
  ),
  circuit: tile(
    160,
    160,
    `<g fill='none' stroke='black' stroke-width='1.2'><path d='M0 40H40L60 60H110L130 40H160M0 120H30L50 100H80V60M110 60V100L130 120H160M80 160V130H120M40 0V20M120 0V25L140 45'/></g><g><circle cx='40' cy='40' r='3'/><circle cx='110' cy='60' r='3'/><circle cx='80' cy='100' r='3'/><circle cx='120' cy='130' r='3'/><circle cx='140' cy='45' r='3'/><circle cx='30' cy='120' r='3'/></g>`
  ),
  confetti: tile(
    240,
    240,
    `<g fill='none' stroke='black' stroke-width='3' stroke-linecap='round'><path d='M20 40q10-14 20 0t20 0t20 0'/><path d='M150 190q10-14 20 0t20 0t20 0'/><circle cx='190' cy='50' r='12'/><circle cx='60' cy='170' r='8'/></g><path d='M120 70l18 30h-36z'/><path d='M30 110h16v16H30z' transform='rotate(20 38 118)'/><circle cx='210' cy='130' r='5'/><circle cx='100' cy='210' r='5'/><path d='M200 210l12 6-12 6z'/>`
  ),
  memphis: tile(
    200,
    200,
    `<g fill='none' stroke='black' stroke-width='4' stroke-linecap='round'><path d='M15 30l15 12 15-12 15 12 15-12'/><path d='M120 150l15 12 15-12 15 12 15-12'/></g><circle cx='160' cy='40' r='14'/><path d='M40 120l24 40H16z'/><circle cx='100' cy='90' r='4'/><circle cx='120' cy='96' r='4'/><circle cx='110' cy='112' r='4'/>`
  ),
  halftone: tile(16, 16, `<circle cx='4' cy='4' r='2.6'/><circle cx='12' cy='12' r='2.6'/>`),
  noise: `${svgUrl(
    180,
    180,
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -.35'/></filter><rect width='180' height='180' filter='url(#n)'/>`
  )} 0 0 / 180px 180px repeat`,
  paper: `${svgUrl(
    240,
    240,
    `<filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.04 .9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 -.42'/></filter><rect width='240' height='240' filter='url(#p)'/>`
  )} 0 0 / 240px 240px repeat`,
  deco: tile(
    80,
    40,
    `<g fill='none' stroke='black' stroke-width='1.2'><path d='M0 40A40 40 0 0 1 80 40'/><path d='M10 40A30 30 0 0 1 70 40'/><path d='M20 40A20 20 0 0 1 60 40'/><path d='M40 40V0M40 40L12 12M40 40L68 12M40 40L0 28M40 40L80 28'/></g>`
  ),
  vines: tile(
    220,
    220,
    `<g fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round'><path d='M0 110C40 60 80 160 120 110S180 40 220 110'/><path d='M110 0C60 40 160 80 110 120S40 180 110 220' opacity='.6'/></g><path d='M60 98c10-14 26-14 30-2-12 8-22 8-30 2z'/><path d='M160 112c-10 14-26 14-30 2 12-8 22-8 30-2z'/><circle cx='120' cy='110' r='3.5'/>`
  ),
  ornament: tile(
    80,
    80,
    `<g fill='none' stroke='black' stroke-width='1.2'><path d='M40 8C52 20 52 28 40 40C28 28 28 20 40 8ZM40 72C28 60 28 52 40 40C52 52 52 60 40 72ZM8 40C20 28 28 28 40 40C28 52 20 52 8 40ZM72 40C60 52 52 52 40 40C52 28 60 28 72 40Z'/><circle cx='40' cy='40' r='4'/></g>`
  ),
  sparkles: tile(200, 200, randomShapes(7, 200, 200, 9, (r, x, y) => sparkle(x, y, 3 + r() * 7))),
  stars: tile(
    260,
    260,
    randomShapes(11, 260, 260, 40, (r, x, y, i) => (i % 9 === 0 ? sparkle(x, y, 4 + r() * 3) : `<circle cx='${r1(x)}' cy='${r1(y)}' r='${r1(0.5 + r() * 1.3)}'/>`))
  ),
  hearts: tile(
    160,
    160,
    `<path d='M40 52c-8-10-22-4-18 8 3 7 18 16 18 16s15-9 18-16c4-12-10-18-18-8z'/>${sparkle(120, 40, 8)}${sparkle(110, 120, 5)}<circle cx='50' cy='130' r='4'/>`
  ),
  leaves: tile(
    200,
    200,
    `<path d='M40 60c30-30 70-20 80 0-30 30-70 20-80 0z' opacity='.9'/><path d='M40 60l80 0' stroke='white' stroke-width='1.5'/><path d='M140 150c20-30 50-28 54-10-22 24-48 22-54 10z' opacity='.7'/><circle cx='60' cy='160' r='4'/>`
  ),
  bubbles: tile(
    280,
    280,
    randomShapes(23, 280, 280, 10, (r, x, y) => {
      const rad = 6 + r() * 26;
      return `<circle cx='${r1(x)}' cy='${r1(y)}' r='${r1(rad)}' fill='none' stroke='black' stroke-width='1.6'/><circle cx='${r1(x - rad * 0.35)}' cy='${r1(y - rad * 0.35)}' r='${r1(rad * 0.18)}'/>`;
    })
  ),
  bauhaus: tile(
    240,
    240,
    `<circle cx='60' cy='60' r='34'/><path d='M150 30h60v60h-60z' fill='none' stroke='black' stroke-width='6'/><path d='M150 210l40-70 40 70z'/><path d='M20 200a40 40 0 0 1 80 0z'/>`
  ),
  waveform: tile(
    240,
    80,
    randomShapes(31, 240, 80, 40, (r, _x, _y, i) => {
      const h = 6 + Math.abs(Math.sin(i * 0.55)) * 50 * (0.5 + r() * 0.5);
      return `<rect x='${i * 6}' y='${r1(40 - h / 2)}' width='3' height='${r1(h)}' rx='1.5'/>`;
    })
  ),
  brackets: tile(
    120,
    120,
    `<g fill='none' stroke='black' stroke-width='1.4'><path d='M8 20V8H20M100 8H112V20M112 100V112H100M20 112H8V100'/><path d='M60 54V66M54 60H66'/></g>`
  ),
  pixels: tile(48, 48, randomShapes(41, 6, 6, 9, (r, x, y) => `<rect x='${Math.floor(x) * 8}' y='${Math.floor(y) * 8}' width='8' height='8'/>`)),
  fingerprint: `${svgUrl(
    600,
    600,
    `<g fill='none' stroke='black' stroke-width='2'>${Array.from({ length: 14 }, (_, i) => `<ellipse cx='300' cy='330' rx='${40 + i * 18}' ry='${55 + i * 21}' stroke-dasharray='${120 + i * 30} ${18 + (i % 3) * 12}'/>`).join('')}</g>`
  )} right -120px top -60px / 640px 640px no-repeat`,
  generative: tile(
    300,
    300,
    randomShapes(53, 300, 300, 18, (r, x, y, i) =>
      i % 3 === 0
        ? `<circle cx='${r1(x)}' cy='${r1(y)}' r='${r1(6 + r() * 30)}' fill='none' stroke='black' stroke-width='${r1(1 + r() * 3)}'/>`
        : i % 3 === 1
          ? `<circle cx='${r1(x)}' cy='${r1(y)}' r='${r1(2 + r() * 8)}'/>`
          : `<path d='M${r1(x)} ${r1(y)}l${r1(20 + r() * 40)} ${r1(-20 + r() * 40)}' stroke='black' stroke-width='2' stroke-linecap='round'/>`
    )
  ),
  perspective: `${svgUrl(
    1600,
    500,
    `<g fill='none' stroke='black' stroke-width='1.6'>${Array.from({ length: 25 }, (_, i) => `<path d='M800 0L${-1600 + i * 200} 500'/>`).join('')}${Array.from({ length: 10 }, (_, i) => {
      const y = Math.round(500 * Math.pow(i / 10, 1.9));
      return `<path d='M0 ${y}H1600'/>`;
    }).join('')}</g>`
  )} center bottom / 100% 45vh no-repeat`,
  rings: tile(140, 140, `<g fill='none' stroke='black' stroke-width='1.2'><circle cx='70' cy='70' r='20'/><circle cx='70' cy='70' r='40'/><circle cx='70' cy='70' r='60'/></g>`),
  tiles: tile(48, 48, `<rect x='2' y='2' width='44' height='44' rx='6' fill='none' stroke='black' stroke-width='1.2'/>`),
  rain: tile(60, 60, `<path d='M10 0l-6 18M40 22l-6 18M25 44l-5 14' stroke='black' stroke-width='1.2' stroke-linecap='round'/>`),
} as const;

export type PatternKey = keyof typeof PATTERNS;

// ---------------------------------------------------------------------------
// Backdrops (painted behind the whole app; use theme variables)
// ---------------------------------------------------------------------------

const P = 'var(--color-primary)';
const P2 = 'var(--color-primary-2, var(--color-primary))';
const A = 'var(--color-accent)';
const H = 'var(--color-hero)';
const B = 'var(--color-bg)';
const T = 'var(--color-text)';
const mix = (c: string, pct: number, other = 'transparent') => `color-mix(in srgb, ${c} ${pct}%, ${other})`;

export const BACKDROPS = {
  none: 'none',
  plain: B,
  hero: `linear-gradient(180deg, ${H} 0, ${B} 420px)`,
  aurora: `radial-gradient(60% 50% at 8% 0%, ${mix(P, 32)} 0, transparent 70%), radial-gradient(45% 45% at 92% 8%, ${mix(P2, 26)} 0, transparent 70%), radial-gradient(55% 45% at 60% 100%, ${mix(A, 70)} 0, transparent 70%), ${B}`,
  auroraStrong: `radial-gradient(55% 55% at 10% 10%, ${mix(P, 48)} 0, transparent 70%), radial-gradient(50% 50% at 90% 15%, ${mix(P2, 42)} 0, transparent 70%), radial-gradient(60% 50% at 50% 100%, ${mix(A, 85)} 0, transparent 70%), ${B}`,
  mesh: `radial-gradient(at 0% 0%, ${mix(P, 30)} 0, transparent 50%), radial-gradient(at 100% 0%, ${mix(A, 80)} 0, transparent 50%), radial-gradient(at 100% 100%, ${mix(P2, 26)} 0, transparent 50%), radial-gradient(at 0% 100%, ${mix(H, 90)} 0, transparent 50%), ${B}`,
  meshSoft: `radial-gradient(at 15% 10%, ${mix(P, 14)} 0, transparent 45%), radial-gradient(at 85% 20%, ${mix(A, 55)} 0, transparent 45%), radial-gradient(at 50% 95%, ${mix(P2, 12)} 0, transparent 50%), ${B}`,
  spotlight: `radial-gradient(70% 55% at 50% -10%, ${mix(P, 24)} 0, transparent 70%), ${B}`,
  vignette: `radial-gradient(120% 90% at 50% 30%, transparent 40%, ${mix(T, 14)} 100%), ${B}`,
  cinematic: `radial-gradient(90% 70% at 50% 0%, ${mix(P, 22)} 0, transparent 60%), radial-gradient(130% 100% at 50% 40%, transparent 45%, ${mix('#000', 35)} 100%), ${B}`,
  sunset: `linear-gradient(180deg, ${mix('#ff71ce', 22, B)} 0%, ${mix('#b967ff', 18, B)} 45%, ${mix('#01cdfe', 16, B)} 100%)`,
  sky: `radial-gradient(40% 35% at 85% 0%, ${mix('#ffffff', 70)} 0, transparent 70%), linear-gradient(180deg, ${mix(P, 26, B)} 0%, ${B} 55%, ${mix('#7ee8a2', 18, B)} 100%)`,
  split: `linear-gradient(90deg, ${H} 0 50%, ${B} 50% 100%)`,
  diagonal: `linear-gradient(135deg, ${H} 0 38%, ${B} 38% 100%)`,
  duotone: `linear-gradient(135deg, ${mix(P, 16, B)} 0%, ${B} 50%, ${mix(P2, 16, B)} 100%)`,
  burst: `conic-gradient(from 200deg at 85% 15%, ${mix(P, 22)} 0 8%, transparent 8% 16%, ${mix(A, 70)} 16% 24%, transparent 24% 32%, ${mix(P2, 18)} 32% 40%, transparent 40%), ${B}`,
  bauhaus: `radial-gradient(circle at 92% 12%, ${mix(P, 26)} 0 110px, transparent 111px), linear-gradient(135deg, transparent 70%, ${mix(A, 80)} 70%), radial-gradient(circle at 6% 92%, ${mix('var(--color-warning)', 22)} 0 140px, transparent 141px), ${B}`,
  holo: `linear-gradient(120deg, ${mix('#a5f3fc', 22, B)} 0%, ${mix('#f0abfc', 22, B)} 35%, ${mix('#fde68a', 20, B)} 65%, ${mix('#a7f3d0', 22, B)} 100%)`,
  chrome: `linear-gradient(180deg, ${mix('#ffffff', 55, B)} 0%, ${B} 40%, ${mix(T, 8, B)} 100%)`,
  paper: `linear-gradient(180deg, ${mix('#f5e9cf', 30, B)}, ${B})`,
  dusk: `linear-gradient(180deg, ${mix(P, 18, B)} 0%, ${B} 50%, ${mix(A, 60, B)} 100%)`,
  ambient: `radial-gradient(50% 40% at 20% 30%, ${mix(P, 14)} 0, transparent 70%), radial-gradient(50% 40% at 80% 70%, ${mix(P2, 12)} 0, transparent 70%), ${B}`,
  terminal: `radial-gradient(120% 80% at 50% 0%, ${mix(P, 10)} 0, transparent 60%), ${B}`,
  luxe: `radial-gradient(80% 60% at 50% -10%, ${mix(P, 20)} 0, transparent 60%), radial-gradient(120% 100% at 50% 50%, transparent 55%, ${mix('#000', 18)} 100%), ${B}`,
  nature: `radial-gradient(60% 50% at 0% 100%, ${mix('#16a34a', 14)} 0, transparent 70%), radial-gradient(50% 40% at 100% 0%, ${mix(A, 70)} 0, transparent 70%), ${B}`,
  blueprint: `linear-gradient(${mix(P, 9, B)}, ${mix(P, 9, B)})`,
} as const;

export type BackdropKey = keyof typeof BACKDROPS;
