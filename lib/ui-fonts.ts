// =============================================================================
// FILE: lib/ui-fonts.ts   (NEW FILE — client-safe)
// Font families used by the design styles and theme presets, and a helper that
// builds ONE Google Fonts stylesheet URL for any set of them.
// =============================================================================

export type FontKey = keyof typeof UI_FONTS;

/** css = font-family stack, g = Google Fonts "family" spec ('' = system font). */
export const UI_FONTS = {
  poppins: { css: 'Poppins, ui-sans-serif, system-ui, sans-serif', g: 'Poppins:wght@400;500;600;700' },
  inter: { css: 'Inter, ui-sans-serif, system-ui, sans-serif', g: 'Inter:wght@400;500;600;700;800' },
  dm: { css: '"DM Sans", ui-sans-serif, system-ui, sans-serif', g: 'DM+Sans:wght@400;500;600;700' },
  jakarta: { css: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif', g: 'Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  system: { css: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', g: '' },
  apple: { css: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif', g: '' },
  segoe: { css: '"Segoe UI Variable", "Segoe UI", "Noto Sans", system-ui, sans-serif', g: 'Noto+Sans:wght@400;500;600;700' },
  tahoma: { css: 'Tahoma, Verdana, "Segoe UI", sans-serif', g: '' },
  georgia: { css: 'Georgia, Cambria, "Times New Roman", serif', g: '' },
  mono: { css: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', g: '' },
  roboto: { css: 'Roboto, "Helvetica Neue", Arial, sans-serif', g: 'Roboto:wght@400;500;700' },
  nunito: { css: 'Nunito, ui-sans-serif, system-ui, sans-serif', g: 'Nunito:wght@400;600;700;800' },
  quicksand: { css: 'Quicksand, ui-sans-serif, system-ui, sans-serif', g: 'Quicksand:wght@400;500;600;700' },
  lexend: { css: 'Lexend, ui-sans-serif, system-ui, sans-serif', g: 'Lexend:wght@300;400;500;600;700' },
  manrope: { css: 'Manrope, ui-sans-serif, system-ui, sans-serif', g: 'Manrope:wght@400;500;600;700;800' },
  sora: { css: 'Sora, ui-sans-serif, system-ui, sans-serif', g: 'Sora:wght@400;500;600;700' },
  outfit: { css: 'Outfit, ui-sans-serif, system-ui, sans-serif', g: 'Outfit:wght@400;500;600;700' },
  urbanist: { css: 'Urbanist, ui-sans-serif, system-ui, sans-serif', g: 'Urbanist:wght@400;500;600;700;800' },
  spaceGrotesk: { css: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif', g: 'Space+Grotesk:wght@400;500;600;700' },
  syne: { css: 'Syne, ui-sans-serif, system-ui, sans-serif', g: 'Syne:wght@500;600;700;800' },
  unbounded: { css: 'Unbounded, ui-sans-serif, system-ui, sans-serif', g: 'Unbounded:wght@400;500;600;700' },
  archivoBlack: { css: '"Archivo Black", Impact, ui-sans-serif, sans-serif', g: 'Archivo+Black' },
  bebas: { css: '"Bebas Neue", Impact, ui-sans-serif, sans-serif', g: 'Bebas+Neue' },
  josefin: { css: '"Josefin Sans", ui-sans-serif, system-ui, sans-serif', g: 'Josefin+Sans:wght@400;600;700' },
  righteous: { css: 'Righteous, ui-sans-serif, system-ui, sans-serif', g: 'Righteous' },
  fredoka: { css: 'Fredoka, ui-rounded, ui-sans-serif, system-ui, sans-serif', g: 'Fredoka:wght@400;500;600;700' },
  baloo: { css: '"Baloo 2", ui-rounded, ui-sans-serif, sans-serif', g: 'Baloo+2:wght@400;500;600;700;800' },
  bangers: { css: 'Bangers, Impact, ui-sans-serif, sans-serif', g: 'Bangers' },
  caveat: { css: 'Caveat, "Comic Sans MS", cursive', g: 'Caveat:wght@500;600;700' },
  patrick: { css: '"Patrick Hand", "Comic Sans MS", cursive', g: 'Patrick+Hand' },
  playfair: { css: '"Playfair Display", Georgia, serif', g: 'Playfair+Display:wght@500;600;700;800' },
  cormorant: { css: '"Cormorant Garamond", Georgia, serif', g: 'Cormorant+Garamond:wght@500;600;700' },
  dmSerif: { css: '"DM Serif Display", Georgia, serif', g: 'DM+Serif+Display' },
  instrument: { css: '"Instrument Serif", Georgia, serif', g: 'Instrument+Serif' },
  fraunces: { css: 'Fraunces, Georgia, serif', g: 'Fraunces:wght@500;600;700;800' },
  lora: { css: 'Lora, Georgia, serif', g: 'Lora:wght@400;500;600;700' },
  literata: { css: 'Literata, Georgia, serif', g: 'Literata:wght@400;500;600;700' },
  bodoni: { css: '"Bodoni Moda", Didot, Georgia, serif', g: 'Bodoni+Moda:wght@500;600;700' },
  cinzel: { css: 'Cinzel, "Trajan Pro", Georgia, serif', g: 'Cinzel:wght@500;600;700' },
  poiret: { css: '"Poiret One", "Josefin Sans", sans-serif', g: 'Poiret+One' },
  unifraktur: { css: '"UnifrakturMaguntia", "Old English Text MT", serif', g: 'UnifrakturMaguntia' },
  orbitron: { css: 'Orbitron, "Rajdhani", ui-sans-serif, sans-serif', g: 'Orbitron:wght@500;600;700' },
  rajdhani: { css: 'Rajdhani, ui-sans-serif, system-ui, sans-serif', g: 'Rajdhani:wght@500;600;700' },
  exo: { css: '"Exo 2", ui-sans-serif, system-ui, sans-serif', g: 'Exo+2:wght@400;500;600;700' },
  michroma: { css: 'Michroma, Orbitron, ui-sans-serif, sans-serif', g: 'Michroma' },
  audiowide: { css: 'Audiowide, Orbitron, ui-sans-serif, sans-serif', g: 'Audiowide' },
  monoton: { css: 'Monoton, Righteous, ui-sans-serif, sans-serif', g: 'Monoton' },
  spaceMono: { css: '"Space Mono", ui-monospace, monospace', g: 'Space+Mono:wght@400;700' },
  jetbrains: { css: '"JetBrains Mono", ui-monospace, monospace', g: 'JetBrains+Mono:wght@400;500;600;700' },
  plexMono: { css: '"IBM Plex Mono", ui-monospace, monospace', g: 'IBM+Plex+Mono:wght@400;500;600' },
  vt323: { css: 'VT323, ui-monospace, monospace', g: 'VT323' },
  silkscreen: { css: 'Silkscreen, "Press Start 2P", ui-monospace, monospace', g: 'Silkscreen:wght@400;700' },
  pixelify: { css: '"Pixelify Sans", ui-monospace, monospace', g: 'Pixelify+Sans:wght@400;500;600;700' },
  majorMono: { css: '"Major Mono Display", ui-monospace, monospace', g: 'Major+Mono+Display' },
  zenMaru: { css: '"Zen Maru Gothic", "M PLUS Rounded 1c", ui-rounded, sans-serif', g: 'Zen+Maru+Gothic:wght@500;700' },
  mplusRounded: { css: '"M PLUS Rounded 1c", ui-rounded, ui-sans-serif, sans-serif', g: 'M+PLUS+Rounded+1c:wght@400;500;700;800' },
  kaisei: { css: '"Kaisei Decol", "Zen Maru Gothic", serif', g: 'Kaisei+Decol:wght@500;700' },
} as const;

/** Google family spec for the FIRST family in a css font stack (or null). */
export function googleSpecForStack(stack: string): string | null {
  const first = (stack.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
  for (const f of Object.values(UI_FONTS)) {
    const fFirst = f.css.split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (fFirst === first) return f.g || null;
  }
  return null;
}

/** One stylesheet URL for several families (deduplicated), or null. */
export function googleFontsHref(specs: (string | null | undefined)[]): string | null {
  const uniq = Array.from(new Set(specs.filter((s): s is string => !!s)));
  if (!uniq.length) return null;
  return `https://fonts.googleapis.com/css2?${uniq.map((s) => `family=${s}`).join('&')}&display=swap`;
}
