// =============================================================================
// FILE: components/Character.tsx   (NEW FILE — server + client safe)
// ORIGINAL anime-style chibi characters drawn in SVG for the Anime Deluxe
// themes (no copyrighted characters). Full-body compositions; the outfit
// colours follow the active theme (primary / primary-2 / accent), so each
// character fits every palette and both light and dark mode.
//
//   <Character id="kitsune" />            a specific character
//   <Character scene="lanterns" />        the character that goes with a scene
//
// Gentle idle animation (float + blink + glow). Turned off automatically for
// people who prefer reduced motion (see .ch-* rules in app/globals.css).
// Decorative by default (aria-hidden); pass `title` to make it an image.
// =============================================================================

import type { SceneId } from '@/lib/theme-scenes';

export const CHARACTER_IDS = [
  'sage',
  'kitsune',
  'ember',
  'frost',
  'tide',
  'bloom',
  'storm',
  'grove',
  'star',
  'moon',
  'sky',
  'koi',
  'crystal',
] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

type Hair = 'long' | 'bob' | 'ponytail' | 'twintails' | 'buns' | 'spiky' | 'short' | 'braid';
type Item = 'book' | 'lantern' | 'flame' | 'snow' | 'shell' | 'branch' | 'bolt' | 'sprout' | 'wand' | 'moon' | 'kite' | 'umbrella' | 'crystal';
type Pose = 'hold' | 'raise';

type Spec = {
  name: string;
  blurb: string;
  hair: Hair;
  hairColor: string;
  hairShade: string;
  eye: string;
  skin: string;
  item: Item;
  pose: Pose;
  ears?: boolean;
  goggles?: boolean;
  hood?: boolean;
};

const SKIN_A = '#ffe1cc';
const SKIN_B = '#f6cfb0';
const SKIN_C = '#d9a37f';

export const CHARACTERS: Record<CharacterId, Spec> = {
  sage: { name: 'Nura', blurb: 'A young scholar who never closes a book.', hair: 'long', hairColor: '#3b2a4a', hairShade: '#241830', eye: '#6d4bd1', skin: SKIN_A, item: 'book', pose: 'hold' },
  kitsune: { name: 'Akari', blurb: 'A fox spirit who lights the festival road.', hair: 'long', hairColor: '#f2a65a', hairShade: '#c9742c', eye: '#d9480f', skin: SKIN_A, item: 'lantern', pose: 'raise', ears: true },
  ember: { name: 'Hiro', blurb: 'Hot-headed, warm-hearted, always first to help.', hair: 'spiky', hairColor: '#c2362b', hairShade: '#7f1d1d', eye: '#f59e0b', skin: SKIN_B, item: 'flame', pose: 'raise' },
  frost: { name: 'Yuki', blurb: 'Calm as fresh snow, sharp as winter air.', hair: 'bob', hairColor: '#dbeafe', hairShade: '#93c5fd', eye: '#2563eb', skin: SKIN_A, item: 'snow', pose: 'raise' },
  tide: { name: 'Kai', blurb: 'A sailor who can read the sea like a map.', hair: 'short', hairColor: '#1e3a5f', hairShade: '#0f2338', eye: '#0ea5e9', skin: SKIN_C, item: 'shell', pose: 'hold' },
  bloom: { name: 'Sakura', blurb: 'Plants a blossom wherever she studies.', hair: 'buns', hairColor: '#f9a8d4', hairShade: '#db2777', eye: '#be185d', skin: SKIN_A, item: 'branch', pose: 'hold' },
  storm: { name: 'Raiko', blurb: 'Fast thinker, faster runner.', hair: 'ponytail', hairColor: '#4c1d95', hairShade: '#2e1065', eye: '#a855f7', skin: SKIN_B, item: 'bolt', pose: 'raise' },
  grove: { name: 'Midori', blurb: 'Grows a sprout for every lesson learned.', hair: 'short', hairColor: '#3f6212', hairShade: '#1a2e05', eye: '#16a34a', skin: SKIN_B, item: 'sprout', pose: 'hold', hood: true },
  star: { name: 'Hoshi', blurb: 'Counts stars, makes wishes, keeps them.', hair: 'twintails', hairColor: '#fde68a', hairShade: '#d97706', eye: '#7c3aed', skin: SKIN_A, item: 'wand', pose: 'raise' },
  moon: { name: 'Tsuki', blurb: 'Keeper of the quiet shrine at night.', hair: 'long', hairColor: '#e5e7eb', hairShade: '#9ca3af', eye: '#6366f1', skin: SKIN_A, item: 'moon', pose: 'hold', hood: true },
  sky: { name: 'Sora', blurb: 'An inventor with her head in the clouds.', hair: 'bob', hairColor: '#7c2d12', hairShade: '#431407', eye: '#0284c7', skin: SKIN_B, item: 'kite', pose: 'raise', goggles: true },
  koi: { name: 'Mizu', blurb: 'Walks the garden in every kind of weather.', hair: 'braid', hairColor: '#111827', hairShade: '#000000', eye: '#f97316', skin: SKIN_A, item: 'umbrella', pose: 'raise' },
  crystal: { name: 'Hikari', blurb: 'Finds light hidden inside every stone.', hair: 'ponytail', hairColor: '#67e8f9', hairShade: '#0891b2', eye: '#0e7490', skin: SKIN_A, item: 'crystal', pose: 'hold' },
};

/** Which character appears with each illustrated scene. */
export const SCENE_CHARACTER: Partial<Record<SceneId, CharacterId>> = {
  sakura: 'bloom',
  'moon-shrine': 'moon',
  lanterns: 'kitsune',
  starfall: 'star',
  waves: 'tide',
  ember: 'ember',
  frost: 'frost',
  storm: 'storm',
  forest: 'grove',
  wind: 'sky',
  crystal: 'crystal',
  koi: 'koi',
  'sky-islands': 'sky',
  mountains: 'grove',
};

const P = 'var(--color-primary, #6d28d9)';
const P2 = 'var(--color-primary-2, var(--color-primary, #db2777))';
const A = 'var(--color-accent, #fde68a)';
const INK = '#2b2233';

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

function HairBack({ s }: { s: Spec }) {
  const c = s.hairColor;
  switch (s.hair) {
    case 'long':
      return <path d="M50 92 Q46 170 60 214 Q100 226 140 214 Q154 170 150 92 Q100 30 50 92Z" fill={c} />;
    case 'bob':
      return <path d="M50 96 Q46 140 62 150 L138 150 Q154 140 150 96 Q100 34 50 96Z" fill={c} />;
    case 'ponytail':
      return (
        <>
          <path d="M140 70 Q182 82 172 150 Q166 186 150 200 Q160 150 146 110Z" fill={c} />
          <path d="M52 96 Q50 128 60 136 L140 136 Q150 128 148 96 Q100 36 52 96Z" fill={c} />
        </>
      );
    case 'twintails':
      return (
        <>
          <path d="M56 78 Q14 96 22 168 Q28 200 44 214 Q38 160 60 112Z" fill={c} />
          <path d="M144 78 Q186 96 178 168 Q172 200 156 214 Q162 160 140 112Z" fill={c} />
          <path d="M52 96 Q50 128 60 134 L140 134 Q150 128 148 96 Q100 36 52 96Z" fill={c} />
        </>
      );
    case 'buns':
      return (
        <>
          <circle cx="58" cy="52" r="20" fill={c} />
          <circle cx="142" cy="52" r="20" fill={c} />
          <path d="M52 96 Q50 128 60 136 L140 136 Q150 128 148 96 Q100 36 52 96Z" fill={c} />
        </>
      );
    case 'braid':
      return (
        <>
          <path d="M52 96 Q50 128 60 136 L140 136 Q150 128 148 96 Q100 36 52 96Z" fill={c} />
          {[150, 168, 186, 204].map((y, i) => (
            <ellipse key={i} cx={144 - i * 2} cy={y} rx="10" ry="11" fill={c} stroke={s.hairShade} strokeWidth="1.5" />
          ))}
          <path d="M138 214 l6 14 l6 -14z" style={{ fill: P2 }} />
        </>
      );
    default:
      return <path d="M52 96 Q50 122 58 128 L142 128 Q150 122 148 96 Q100 38 52 96Z" fill={c} />;
  }
}

function HairFront({ s }: { s: Spec }) {
  const c = s.hairColor;
  const sh = s.hairShade;
  if (s.hair === 'spiky') {
    return (
      <>
        <path d="M46 96 L44 60 L62 72 L66 40 L84 62 L96 30 L108 60 L124 38 L130 68 L150 56 L152 96 Q140 74 100 70 Q60 74 46 96Z" fill={c} />
        <path d="M60 92 L70 74 L76 92 L88 72 L94 92 L106 72 L112 92 L124 74 L132 92 Q100 80 60 92Z" fill={sh} opacity="0.55" />
      </>
    );
  }
  if (s.hair === 'short') {
    return (
      <>
        <path d="M48 98 Q46 52 100 44 Q154 52 152 98 Q138 72 118 80 Q110 68 96 78 Q82 68 66 82 Q56 82 48 98Z" fill={c} />
        <path d="M66 82 Q74 90 70 100 M96 78 Q102 88 98 98 M118 80 Q124 90 122 100" stroke={sh} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
      </>
    );
  }
  return (
    <>
      <path d="M48 104 Q42 50 100 42 Q158 50 152 104 Q146 80 130 74 Q126 94 114 98 Q112 80 102 76 Q94 96 80 98 Q80 82 72 78 Q58 86 48 104Z" fill={c} />
      <path d="M72 78 Q76 90 74 98 M102 76 Q104 88 100 96 M130 74 Q134 86 132 96" stroke={sh} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M70 58 Q86 50 104 52" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.35" />
    </>
  );
}

function Face({ s }: { s: Spec }) {
  return (
    <g>
      {/* eyes (blink) */}
      <g className="ch-blink">
        {[80, 120].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="106" rx="9" ry="12" fill="#ffffff" />
            <ellipse cx={x} cy="108" rx="7.5" ry="10.5" fill={s.eye} />
            <ellipse cx={x} cy="111" rx="4.5" ry="6" fill={INK} opacity="0.85" />
            <circle cx={x - 3} cy="102" r="3.2" fill="#ffffff" />
            <circle cx={x + 3} cy="113" r="1.6" fill="#ffffff" opacity="0.9" />
          </g>
        ))}
      </g>
      {/* lashes & brows */}
      <path d="M69 96 Q80 90 91 96" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M109 96 Q120 90 131 96" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M72 86 Q80 83 88 85" stroke={s.hairShade} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M112 85 Q120 83 128 86" stroke={s.hairShade} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* blush + mouth */}
      <ellipse cx="70" cy="124" rx="8" ry="4" fill="#ff7a9a" opacity="0.35" />
      <ellipse cx="130" cy="124" rx="8" ry="4" fill="#ff7a9a" opacity="0.35" />
      <path d="M94 128 Q100 134 106 128" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function ItemArt({ item, x, y }: { item: Item; x: number; y: number }) {
  const t = `translate(${x} ${y})`;
  switch (item) {
    case 'book':
      return (
        <g transform={t}>
          <path d="M-22 -14 L0 -8 L22 -14 L22 14 L0 20 L-22 14Z" style={{ fill: P }} />
          <path d="M-19 -11 L-1 -6 L-1 16 L-19 11Z" fill="#fff" />
          <path d="M19 -11 L1 -6 L1 16 L19 11Z" fill="#fff" />
          <path d="M-15 -4 L-5 -1 M-15 2 L-5 5 M5 -1 L15 -4 M5 5 L15 2" strokeWidth="1.5" style={{ stroke: P2 }} />
          <circle cx="0" cy="-22" r="4" className="ch-glow" style={{ fill: A }} />
        </g>
      );
    case 'lantern':
      return (
        <g transform={t}>
          <path d="M0 -40 L0 -22" stroke={INK} strokeWidth="2" />
          <rect x="-14" y="-24" width="28" height="6" rx="2" fill={INK} />
          <ellipse cx="0" cy="0" rx="18" ry="22" className="ch-glow" style={{ fill: P2 }} />
          <path d="M-18 0 Q0 6 18 0 M-15 -12 Q0 -8 15 -12 M-15 12 Q0 16 15 12" stroke="#fff" strokeWidth="1.2" opacity="0.6" fill="none" />
          <rect x="-10" y="20" width="20" height="5" rx="2" fill={INK} />
          <path d="M0 25 L0 34" strokeWidth="2" style={{ stroke: A }} />
        </g>
      );
    case 'flame':
      return (
        <g transform={t} className="ch-glow">
          <path d="M0 -30 Q18 -10 12 8 Q8 20 0 20 Q-8 20 -12 8 Q-18 -10 0 -30Z" fill="#f97316" />
          <path d="M0 -14 Q9 -2 6 8 Q3 14 0 14 Q-3 14 -6 8 Q-9 -2 0 -14Z" fill="#fde047" />
        </g>
      );
    case 'snow':
      return (
        <g transform={t}>
          <path d="M0 -6 L0 60" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <g className="ch-glow" strokeWidth="3" strokeLinecap="round" style={{ stroke: P }}>
            {[0, 60, 120].map((r) => (
              <path key={r} d="M-16 -22 L16 -22 M-6 -30 L0 -22 L-6 -14 M6 -30 L0 -22 L6 -14" transform={`rotate(${r} 0 -22)`} />
            ))}
          </g>
        </g>
      );
    case 'shell':
      return (
        <g transform={t}>
          <path d="M-18 8 Q-18 -16 0 -18 Q18 -16 18 8 Q0 16 -18 8Z" strokeWidth="2" style={{ fill: A, stroke: P }} />
          <path d="M0 -16 L0 10 M-9 -12 L-5 10 M9 -12 L5 10" strokeWidth="1.5" style={{ stroke: P }} />
        </g>
      );
    case 'branch':
      return (
        <g transform={t}>
          <path d="M-20 18 Q0 0 22 -24" stroke="#6b4423" strokeWidth="3" fill="none" strokeLinecap="round" />
          {[
            [-8, 6],
            [6, -8],
            [18, -20],
            [12, 2],
          ].map(([bx, by], i) => (
            <g key={i} transform={`translate(${bx} ${by})`} className={i % 2 ? 'ch-glow' : undefined}>
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} cx="0" cy="-5" rx="3.2" ry="5" fill="#fbcfe8" transform={`rotate(${r})`} />
              ))}
              <circle r="2" fill="#db2777" />
            </g>
          ))}
        </g>
      );
    case 'bolt':
      return (
        <g transform={t} className="ch-glow">
          <path d="M4 -30 L-12 2 L0 2 L-6 30 L14 -6 L2 -6Z" fill="#facc15" strokeWidth="2" strokeLinejoin="round" style={{ stroke: P }} />
        </g>
      );
    case 'sprout':
      return (
        <g transform={t}>
          <path d="M-16 4 L16 4 L12 22 L-12 22Z" fill="#a16207" />
          <path d="M0 4 Q0 -10 0 -18" stroke="#16a34a" strokeWidth="3" fill="none" />
          <path d="M0 -14 Q-16 -24 -18 -10 Q-6 -6 0 -14Z" fill="#22c55e" className="ch-glow" />
          <path d="M0 -18 Q14 -30 18 -16 Q6 -10 0 -18Z" fill="#4ade80" />
        </g>
      );
    case 'wand':
      return (
        <g transform={t}>
          <path d="M0 0 L0 50" strokeWidth="3.5" strokeLinecap="round" style={{ stroke: P }} />
          <path d="M0 -22 L6 -8 L21 -7 L9 2 L13 17 L0 9 L-13 17 L-9 2 L-21 -7 L-6 -8Z" fill="#fde047" stroke="#f59e0b" strokeWidth="1.5" className="ch-glow" />
        </g>
      );
    case 'moon':
      return (
        <g transform={t} className="ch-glow">
          <circle r="19" fill="#fde68a" stroke="#d97706" strokeWidth="2" />
          <circle cx="-6" cy="-5" r="4" fill="#fbbf24" opacity="0.7" />
          <circle cx="7" cy="6" r="3" fill="#fbbf24" opacity="0.7" />
          <circle cx="5" cy="-9" r="2" fill="#fbbf24" opacity="0.6" />
          <circle cx="-9" cy="-12" r="3" fill="#fff" opacity="0.7" />
        </g>
      );
    case 'kite':
      return (
        <g transform={t}>
          <path d="M0 -40 L18 -14 L0 10 L-18 -14Z" stroke="#fff" strokeWidth="1.5" className="ch-glow" style={{ fill: P2 }} />
          <path d="M0 -40 L0 10 M-18 -14 L18 -14" stroke="#fff" strokeWidth="1.2" />
          <path d="M0 10 Q8 24 -4 34 Q-12 44 0 54" strokeWidth="1.5" fill="none" style={{ stroke: P }} />
        </g>
      );
    case 'umbrella':
      return (
        <g transform={t}>
          <path d="M-46 -2 Q0 -60 46 -2 Q34 -10 23 -2 Q12 -10 0 -2 Q-12 -10 -23 -2 Q-34 -10 -46 -2Z" style={{ fill: P }} />
          <path d="M-23 -2 Q-14 -40 0 -46 Q14 -40 23 -2" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.6" />
          <circle cx="12" cy="-24" r="5" fill="#f97316" className="ch-glow" />
          <path d="M0 -46 L0 58 Q0 66 -7 64" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'crystal':
      return (
        <g transform={t} className="ch-glow">
          <path d="M0 -26 L14 -6 L8 18 L-8 18 L-14 -6Z" fill="#a5f3fc" strokeWidth="2" strokeLinejoin="round" style={{ stroke: P }} />
          <path d="M0 -26 L0 18 M-14 -6 L14 -6" stroke="#fff" strokeWidth="1.2" opacity="0.8" />
        </g>
      );
  }
}

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------

export default function Character({
  id,
  scene,
  className = '',
  title,
  animated = true,
  uid = '',
}: {
  id?: CharacterId;
  scene?: SceneId;
  className?: string;
  /** Extra id suffix when the same character is drawn in several colour contexts on one page. */
  uid?: string;
  /** Accessible name; omitted = decorative. */
  title?: string;
  animated?: boolean;
}) {
  const cid: CharacterId = id ?? (scene ? SCENE_CHARACTER[scene] : undefined) ?? 'sage';
  const s = CHARACTERS[cid];
  const g = `ch-${cid}${uid ? `-${uid.replace(/[^a-z0-9-]/gi, '')}` : ''}`;
  const raise = s.pose === 'raise';
  const itemPos = raise ? { x: 160, y: 120 } : { x: 100, y: 196 };

  return (
    <svg
      viewBox="0 0 200 300"
      className={`${animated ? 'ch-anim' : ''} ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title ? `${title}: ${s.name}` : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${g}-robe`} x1="0" y1="0" x2="0" y2="1">
          {/* style (not attribute) so CSS variables resolve */}
          <stop offset="0" style={{ stopColor: P }} />
          <stop offset="1" style={{ stopColor: P2 }} />
        </linearGradient>
        <radialGradient id={`${g}-aura`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={{ stopColor: A, stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: A, stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {/* ground shadow + aura */}
      <ellipse cx="100" cy="290" rx="52" ry="7" fill="#000" opacity="0.14" className="ch-shadow" />
      <circle cx="100" cy="150" r="96" fill={`url(#${g}-aura)`} />

      <g className="ch-body">
        {/* legs + shoes */}
        <rect x="80" y="226" width="14" height="52" rx="7" fill={s.skin} />
        <rect x="106" y="226" width="14" height="52" rx="7" fill={s.skin} />
        <rect x="80" y="246" width="14" height="30" rx="6" fill="#f8fafc" opacity="0.92" />
        <rect x="106" y="246" width="14" height="30" rx="6" fill="#f8fafc" opacity="0.92" />
        <path d="M76 276 Q87 268 98 276 L98 284 L76 284Z" fill={INK} />
        <path d="M102 276 Q113 268 124 276 L124 284 L102 284Z" fill={INK} />

        <HairBack s={s} />

        {/* robe / dress */}
        <path d="M70 150 Q100 140 130 150 L152 236 Q100 252 48 236Z" fill={`url(#${g}-robe)`} />
        <path d="M100 146 L100 248" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
        <path d="M48 236 Q100 252 152 236 L150 228 Q100 244 50 228Z" opacity="0.9" style={{ fill: A }} />
        {/* collar + sash */}
        <path d="M82 148 L100 170 L118 148 Q100 156 82 148Z" fill="#fff" opacity="0.92" />
        <rect x="66" y="182" width="68" height="10" rx="5" style={{ fill: A }} />
        <path d="M128 186 q14 6 10 24 q-8 -10 -14 -14z" opacity="0.85" style={{ fill: A }} />
        {s.hood && <path d="M62 150 Q100 128 138 150 Q130 140 100 136 Q70 140 62 150Z" opacity="0.9" style={{ fill: P2 }} />}

        {/* arms */}
        {raise ? (
          <>
            <path d="M72 158 Q56 186 82 198" stroke={`url(#${g}-robe)`} strokeWidth="15" fill="none" strokeLinecap="round" />
            <circle cx="86" cy="198" r="7" fill={s.skin} />
            <path d="M128 158 Q150 148 156 128" stroke={`url(#${g}-robe)`} strokeWidth="15" fill="none" strokeLinecap="round" />
            <circle cx="158" cy="124" r="7" fill={s.skin} />
          </>
        ) : (
          <>
            <path d="M72 158 Q60 186 84 200" stroke={`url(#${g}-robe)`} strokeWidth="15" fill="none" strokeLinecap="round" />
            <path d="M128 158 Q140 186 116 200" stroke={`url(#${g}-robe)`} strokeWidth="15" fill="none" strokeLinecap="round" />
          </>
        )}

        <g className="ch-item">
          <ItemArt item={s.item} x={itemPos.x} y={itemPos.y} />
        </g>
        {!raise && (
          <>
            <circle cx="84" cy="202" r="7" fill={s.skin} />
            <circle cx="116" cy="202" r="7" fill={s.skin} />
          </>
        )}

        {/* head */}
        <rect x="92" y="132" width="16" height="16" rx="6" fill={s.skin} />
        <ellipse cx="100" cy="100" rx="50" ry="46" fill={s.skin} />
        {s.ears && (
          <>
            <path d="M58 70 L56 28 L86 52Z" fill={s.hairColor} />
            <path d="M62 62 L61 38 L78 52Z" fill="#fde2e4" />
            <path d="M142 70 L144 28 L114 52Z" fill={s.hairColor} />
            <path d="M138 62 L139 38 L122 52Z" fill="#fde2e4" />
          </>
        )}
        <Face s={s} />
        <HairFront s={s} />
        {s.goggles && (
          <g>
            <path d="M50 70 Q100 52 150 70" stroke={INK} strokeWidth="5" fill="none" />
            <circle cx="80" cy="62" r="11" fill="#bae6fd" stroke={INK} strokeWidth="3" />
            <circle cx="120" cy="62" r="11" fill="#bae6fd" stroke={INK} strokeWidth="3" />
            <circle cx="77" cy="59" r="3" fill="#fff" />
            <circle cx="117" cy="59" r="3" fill="#fff" />
          </g>
        )}
        {(s.hair === 'buns' || s.hair === 'twintails' || s.hair === 'ponytail') && (
          <g style={{ fill: P2 }}>
            <circle cx={s.hair === 'ponytail' ? 146 : 58} cy={s.hair === 'buns' ? 66 : 76} r="5" />
            {s.hair !== 'ponytail' && <circle cx="142" cy={s.hair === 'buns' ? 66 : 76} r="5" />}
          </g>
        )}
      </g>

      {/* sparkles */}
      <g className="ch-sparkle" style={{ fill: A }}>
        <path d="M30 60 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" />
        <path d="M172 210 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z" />
        <circle cx="178" cy="54" r="2.5" />
        <circle cx="24" cy="200" r="2" />
      </g>
    </svg>
  );
}
