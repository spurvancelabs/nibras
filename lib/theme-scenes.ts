// =============================================================================
// FILE: lib/theme-scenes.ts   (NEW FILE — client-safe)
// Original illustrated backgrounds ("scenes") for the Deluxe and Anime Deluxe
// colour themes: sakura, moonlit shrine, lantern festival, starfall, waves,
// mountains, frost, storm, forest, embers, wind, crystals, koi pond, sky
// islands, art deco, marble, filigree, velvet and starlight.
//
// All artwork is drawn here in code (no characters, no copyrighted art) and
// coloured from the theme palette, with a separate night version for dark
// mode. Decoration stays near the edges so text stays readable.
// =============================================================================

import { rng, svgUrl } from './ui-patterns';
import type { ThemePalette } from './theme-config';

export const SCENES = [
  'sakura',
  'moon-shrine',
  'lanterns',
  'starfall',
  'waves',
  'mountains',
  'frost',
  'storm',
  'forest',
  'ember',
  'wind',
  'crystal',
  'koi',
  'sky-islands',
  'deco',
  'marble',
  'filigree',
  'velvet',
  'starlight',
] as const;
export type SceneId = (typeof SCENES)[number];

export const SCENE_LABELS: Record<SceneId, string> = {
  sakura: 'Sakura petals',
  'moon-shrine': 'Moonlit shrine',
  lanterns: 'Lantern festival',
  starfall: 'Starfall night',
  waves: 'Great waves',
  mountains: 'Misty mountains',
  frost: 'Frost crystals',
  storm: 'Thunderstorm',
  forest: 'Firefly forest',
  ember: 'Rising embers',
  wind: 'Wind & seeds',
  crystal: 'Crystal cavern',
  koi: 'Koi pond',
  'sky-islands': 'Sky islands',
  deco: 'Art deco gold',
  marble: 'Marble veins',
  filigree: 'Royal filigree',
  velvet: 'Velvet spotlight',
  starlight: 'Gold starlight',
};

type Pal = { p: string; p2: string; a: string; h: string; bg: string; t: string; dark: boolean };

const W = 1600;
const Hh = 1000;
const n1 = (v: number) => Math.round(v * 10) / 10;

function petal(x: number, y: number, s: number, rot: number, fill: string, op: number) {
  return `<path transform='translate(${n1(x)} ${n1(y)}) rotate(${Math.round(rot)}) scale(${n1(s)})' d='M0 0C6-8 16-8 18 0C16 8 6 8 0 0Z' fill='${fill}' opacity='${op}'/>`;
}
function blossom(x: number, y: number, r: number, fill: string, center: string) {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 * Math.PI) / 180;
    out += `<circle cx='${n1(x + Math.cos(a) * r * 0.55)}' cy='${n1(y + Math.sin(a) * r * 0.55)}' r='${n1(r * 0.5)}' fill='${fill}'/>`;
  }
  return out + `<circle cx='${n1(x)}' cy='${n1(y)}' r='${n1(r * 0.22)}' fill='${center}'/>`;
}
function star4(x: number, y: number, r: number, fill: string, op = 1) {
  const k = r * 0.25;
  return `<path d='M${n1(x)} ${n1(y - r)}Q${n1(x + k)} ${n1(y - k)} ${n1(x + r)} ${n1(y)}Q${n1(x + k)} ${n1(y + k)} ${n1(x)} ${n1(y + r)}Q${n1(x - k)} ${n1(y + k)} ${n1(x - r)} ${n1(y)}Q${n1(x - k)} ${n1(y - k)} ${n1(x)} ${n1(y - r)}Z' fill='${fill}' opacity='${op}'/>`;
}
function stars(seed: number, count: number, fill: string, area = { x: 0, y: 0, w: W, h: Hh * 0.6 }) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = area.x + r() * area.w;
    const y = area.y + r() * area.h;
    out += i % 7 === 0 ? star4(x, y, 3 + r() * 5, fill, 0.9) : `<circle cx='${n1(x)}' cy='${n1(y)}' r='${n1(0.6 + r() * 1.6)}' fill='${fill}' opacity='${n1(0.35 + r() * 0.6)}'/>`;
  }
  return out;
}
function ridge(seed: number, baseY: number, amp: number, fill: string, op: number) {
  const r = rng(seed);
  let d = `M0 ${Hh}L0 ${baseY}`;
  const steps = 9;
  for (let i = 1; i <= steps; i++) {
    const x = (W / steps) * i;
    const y = baseY - r() * amp;
    const cx = x - W / steps / 2;
    d += `Q${n1(cx)} ${n1(y - amp * 0.4)} ${n1(x)} ${n1(baseY - r() * amp * 0.6)}`;
  }
  return `<path d='${d}L${W} ${Hh}Z' fill='${fill}' opacity='${op}'/>`;
}
function cloud(x: number, y: number, s: number, fill: string, op: number) {
  return `<g fill='${fill}' opacity='${op}' transform='translate(${n1(x)} ${n1(y)}) scale(${n1(s)})'><circle cx='0' cy='0' r='40'/><circle cx='45' cy='-18' r='52'/><circle cx='100' cy='0' r='42'/><rect x='-10' y='0' width='120' height='40' rx='20'/></g>`;
}
function snowflake(x: number, y: number, r: number, stroke: string, op: number) {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const ex = x + Math.cos(a) * r;
    const ey = y + Math.sin(a) * r;
    d += `M${n1(x)} ${n1(y)}L${n1(ex)} ${n1(ey)}`;
    const bx = x + Math.cos(a) * r * 0.6;
    const by = y + Math.sin(a) * r * 0.6;
    d += `M${n1(bx)} ${n1(by)}L${n1(bx + Math.cos(a + 0.6) * r * 0.25)} ${n1(by + Math.sin(a + 0.6) * r * 0.25)}`;
    d += `M${n1(bx)} ${n1(by)}L${n1(bx + Math.cos(a - 0.6) * r * 0.25)} ${n1(by + Math.sin(a - 0.6) * r * 0.25)}`;
  }
  return `<path d='${d}' stroke='${stroke}' stroke-width='${n1(Math.max(1, r / 12))}' stroke-linecap='round' fill='none' opacity='${op}'/>`;
}
const grad = (id: string, stops: [string, string, number][], vertical = true) =>
  `<linearGradient id='${id}' x1='0' y1='0' x2='${vertical ? 0 : 1}' y2='${vertical ? 1 : 0}'>${stops
    .map(([off, col, op]) => `<stop offset='${off}' stop-color='${col}' stop-opacity='${op}'/>`)
    .join('')}</linearGradient>`;
const radial = (id: string, col: string, op: number) =>
  `<radialGradient id='${id}'><stop offset='0' stop-color='${col}' stop-opacity='${op}'/><stop offset='1' stop-color='${col}' stop-opacity='0'/></radialGradient>`;

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

const DRAW: Record<SceneId, (c: Pal) => string> = {
  sakura: (c) => {
    const r = rng(3);
    let petals = '';
    for (let i = 0; i < 34; i++) petals += petal(r() * W, r() * Hh, 0.7 + r() * 1.1, r() * 360, i % 3 ? c.p : c.a, n1(0.25 + r() * 0.45));
    let blossoms = '';
    const pts = [
      [1600, 40], [1530, 70], [1470, 120], [1410, 150], [1350, 210], [1500, 160], [1440, 240], [1560, 210], [1300, 260], [1380, 300],
    ];
    for (const [x, y] of pts) blossoms += blossom(x, y, 14 + r() * 10, c.p, c.a);
    return `<defs>${grad('sk', [['0', c.h, 0.9], ['.55', c.h, 0], ['1', c.p, 0.08]])}</defs><rect width='${W}' height='${Hh}' fill='url(#sk)'/>${
      c.dark ? `<circle cx='240' cy='170' r='70' fill='${c.a}' opacity='.5'/>${stars(5, 40, c.t)}` : ''
    }<path d='M1600 0C1520 60 1460 90 1380 170S1260 280 1180 300M1520 70C1500 140 1470 190 1440 240M1410 150C1380 200 1390 260 1380 300' stroke='${c.t}' stroke-width='9' stroke-linecap='round' fill='none' opacity='.55'/>${blossoms}${petals}${ridge(9, 930, 70, c.p, 0.1)}`;
  },
  'moon-shrine': (c) =>
    `<defs>${grad('ms', [['0', c.dark ? c.p : c.h, c.dark ? 0.18 : 0.9], ['.6', c.bg, 0]])}${radial('mg', c.a, 0.8)}</defs><rect width='${W}' height='${Hh}' fill='url(#ms)'/><circle cx='1280' cy='190' r='180' fill='url(#mg)'/><circle cx='1280' cy='190' r='86' fill='${c.dark ? c.a : '#ffffff'}' opacity='${c.dark ? 0.9 : 0.8}'/>${
      c.dark ? stars(21, 70, c.t) : ''
    }${ridge(4, 820, 140, c.p, 0.12)}${ridge(8, 900, 90, c.p, 0.18)}<g fill='${c.p}' opacity='.55' transform='translate(210 640)'><rect x='0' y='30' width='240' height='16' rx='4'/><rect x='-24' y='0' width='288' height='22' rx='8'/><rect x='30' y='46' width='16' height='180'/><rect x='194' y='46' width='16' height='180'/><rect x='20' y='78' width='200' height='10'/></g>`,
  lanterns: (c) => {
    const r = rng(17);
    let out = '';
    for (let i = 0; i < 18; i++) {
      const x = (i % 2 ? 60 + r() * 380 : 1160 + r() * 380) + (i > 12 ? 300 : 0) * (r() > 0.5 ? 1 : -1);
      const y = 80 + r() * 760;
      const s = 0.5 + r() * 0.9;
      out += `<g transform='translate(${n1(x)} ${n1(y)}) scale(${n1(s)})'><circle cx='0' cy='0' r='60' fill='url(#lg)'/><rect x='-16' y='-22' width='32' height='44' rx='12' fill='${c.p}' opacity='.85'/><rect x='-10' y='-26' width='20' height='6' rx='2' fill='${c.t}' opacity='.5'/><rect x='-10' y='20' width='20' height='6' rx='2' fill='${c.t}' opacity='.5'/></g>`;
    }
    return `<defs>${radial('lg', c.a, c.dark ? 0.7 : 0.5)}${grad('lb', [['0', c.dark ? c.p : c.h, c.dark ? 0.2 : 0.7], ['1', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#lb)'/>${c.dark ? stars(31, 50, c.t) : ''}${out}<path d='M0 940Q400 910 800 940T1600 935V1000H0Z' fill='${c.p}' opacity='.12'/>`;
  },
  starfall: (c) => {
    const r = rng(41);
    let streaks = '';
    for (let i = 0; i < 7; i++) {
      const x = 200 + r() * 1300;
      const y = 40 + r() * 380;
      const len = 120 + r() * 160;
      streaks += `<path d='M${n1(x)} ${n1(y)}l${n1(-len)} ${n1(len * 0.45)}' stroke='url(#sf)' stroke-width='2.4' stroke-linecap='round'/>${star4(x, y, 7, c.a, 0.95)}`;
    }
    return `<defs>${grad('sf', [['0', c.a, 1], ['1', c.a, 0]], false)}${grad('sb', [['0', c.dark ? c.p : c.h, c.dark ? 0.22 : 0.85], ['.7', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#sb)'/>${stars(43, 120, c.dark ? c.t : c.p)}${streaks}${ridge(12, 900, 120, c.p, 0.14)}`;
  },
  waves: (c) => {
    let arcs = '';
    for (let row = 0; row < 3; row++) {
      for (let i = -1; i < 18; i++) {
        const x = i * 100 + (row % 2) * 50;
        const y = 870 + row * 50;
        arcs += `<g fill='none' stroke='${c.p}' stroke-width='3' opacity='${0.25 + row * 0.1}'><path d='M${x - 50} ${y}A50 50 0 0 1 ${x + 50} ${y}'/><path d='M${x - 34} ${y}A34 34 0 0 1 ${x + 34} ${y}'/><path d='M${x - 18} ${y}A18 18 0 0 1 ${x + 18} ${y}'/></g>`;
      }
    }
    return `<defs>${grad('wv', [['0', c.h, c.dark ? 0.25 : 0.85], ['.6', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#wv)'/><circle cx='1340' cy='200' r='110' fill='${c.a}' opacity='.6'/>${c.dark ? stars(13, 40, c.t) : ''}<path d='M0 860C160 700 340 690 420 780C470 840 400 900 330 870C390 860 410 800 360 780C280 750 180 820 100 900L0 960Z' fill='${c.p}' opacity='.35'/>${arcs}`;
  },
  mountains: (c) => {
    let birds = '';
    const r = rng(77);
    for (let i = 0; i < 6; i++) birds += `<path d='M${n1(1050 + r() * 300)} ${n1(150 + r() * 120)}q10-10 20 0q10-10 20 0' stroke='${c.t}' stroke-width='2.4' fill='none' opacity='.45'/>`;
    return `<defs>${grad('mt', [['0', c.dark ? c.p : c.h, c.dark ? 0.18 : 0.9], ['.5', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#mt)'/><circle cx='300' cy='220' r='90' fill='${c.a}' opacity='.55'/>${c.dark ? stars(18, 60, c.t) : ''}${birds}${ridge(21, 700, 260, c.p, 0.1)}<rect x='0' y='760' width='${W}' height='50' fill='${c.bg}' opacity='.35'/>${ridge(22, 820, 170, c.p, 0.16)}${ridge(23, 920, 90, c.p, 0.24)}`;
  },
  frost: (c) => {
    const r = rng(55);
    let flakes = '';
    for (let i = 0; i < 26; i++) flakes += snowflake(r() * W, r() * Hh, 8 + r() * 26, c.dark ? c.t : c.p, n1(0.2 + r() * 0.4));
    return `<defs>${grad('fr', [['0', c.h, c.dark ? 0.25 : 0.9], ['.6', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#fr)'/>${flakes}<g fill='${c.p}' opacity='.18'><path d='M0 1000L60 760L120 1000Z'/><path d='M80 1000L170 690L240 1000Z'/><path d='M1600 1000L1530 720L1470 1000Z'/><path d='M1480 1000L1400 800L1350 1000Z'/></g>`;
  },
  storm: (c) => {
    const r = rng(61);
    let rain = '';
    for (let i = 0; i < 60; i++) {
      const x = r() * W;
      const y = 200 + r() * 760;
      rain += `<path d='M${n1(x)} ${n1(y)}l-8 26' stroke='${c.p}' stroke-width='1.6' opacity='${n1(0.15 + r() * 0.3)}'/>`;
    }
    return `<defs>${grad('st', [['0', c.dark ? c.p : c.h, c.dark ? 0.22 : 0.9], ['.6', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#st)'/>${cloud(80, 90, 1.6, c.p, 0.22)}${cloud(1180, 60, 1.9, c.p, 0.2)}${cloud(620, 20, 1.2, c.p, 0.12)}<path d='M1330 230L1280 380H1330L1290 520L1400 330H1345L1385 230Z' fill='${c.a}' opacity='.9'/><path d='M230 260L200 360H236L210 450L282 330H245L270 260Z' fill='${c.a}' opacity='.7'/>${rain}`;
  },
  forest: (c) => {
    const r = rng(29);
    let trees = '';
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 16; i++) {
        const x = i * 110 + r() * 60 - 40;
        const h = 160 + r() * 160 - layer * 30;
        const base = 1000 - layer * 25;
        trees += `<path d='M${n1(x)} ${base}L${n1(x + 45)} ${n1(base - h)}L${n1(x + 90)} ${base}Z' fill='${c.p}' opacity='${0.1 + layer * 0.07}'/>`;
      }
    }
    let flies = '';
    for (let i = 0; i < 26; i++) flies += `<circle cx='${n1(r() * W)}' cy='${n1(300 + r() * 600)}' r='${n1(2 + r() * 3)}' fill='${c.a}' opacity='.9'/><circle cx='${n1(r() * W)}' cy='${n1(300 + r() * 600)}' r='14' fill='url(#ff)'/>`;
    return `<defs>${radial('ff', c.a, 0.6)}${grad('fo', [['0', c.h, c.dark ? 0.2 : 0.85], ['.6', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#fo)'/>${trees}${flies}`;
  },
  ember: (c) => {
    const r = rng(83);
    let embers = '';
    for (let i = 0; i < 40; i++) embers += `<circle cx='${n1(r() * W)}' cy='${n1(250 + r() * 700)}' r='${n1(1.5 + r() * 3.5)}' fill='${i % 2 ? c.p : c.a}' opacity='${n1(0.35 + r() * 0.55)}'/>`;
    let flames = '';
    for (let i = 0; i < 14; i++) {
      const x = i * 120 + r() * 40;
      const h = 90 + r() * 140;
      flames += `<path d='M${n1(x)} 1000C${n1(x - 30)} ${n1(1000 - h * 0.5)} ${n1(x + 20)} ${n1(1000 - h * 0.7)} ${n1(x + 10)} ${n1(1000 - h)}C${n1(x + 60)} ${n1(1000 - h * 0.6)} ${n1(x + 80)} ${n1(1000 - h * 0.3)} ${n1(x + 60)} 1000Z' fill='${i % 2 ? c.p : c.a}' opacity='.22'/>`;
    }
    return `<defs>${grad('em', [['0', c.bg, 0], ['.6', c.bg, 0], ['1', c.p, c.dark ? 0.3 : 0.15]])}</defs><rect width='${W}' height='${Hh}' fill='url(#em)'/>${flames}${embers}`;
  },
  wind: (c) => {
    const r = rng(91);
    let seeds = '';
    for (let i = 0; i < 18; i++) {
      const x = r() * W;
      const y = r() * Hh;
      seeds += `<g transform='translate(${n1(x)} ${n1(y)}) rotate(${Math.round(r() * 360)})' stroke='${c.p}' stroke-width='1.4' opacity='.5'><path d='M0 0v-16M0 -16l-6-6M0 -16l6-6M0 -16v-9'/></g>`;
    }
    return `<defs>${grad('wd', [['0', c.h, c.dark ? 0.2 : 0.85], ['.6', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#wd)'/><g fill='none' stroke='${c.p}' stroke-width='3' stroke-linecap='round' opacity='.28'><path d='M-20 200C200 140 420 260 640 200S980 120 1060 180C1120 230 1060 300 1000 270'/><path d='M500 820C700 760 920 860 1140 800S1460 720 1640 780'/><path d='M1100 420C1250 380 1380 450 1480 410C1540 385 1530 330 1480 340'/><path d='M60 560C180 530 280 590 360 560'/></g>${seeds}`;
  },
  crystal: (c) => {
    const cluster = (x: number, flip: number) =>
      [
        [0, 0, 70, 320],
        [70, 30, 60, 240],
        [-60, 40, 55, 220],
        [130, 70, 45, 160],
        [-110, 80, 40, 140],
      ]
        .map(([dx, dy, w, h], i) => {
          const bx = x + dx * flip;
          const by = 1000 - dy;
          return `<path d='M${bx} ${by}L${n1(bx - w / 2)} ${n1(by - h * 0.75)}L${bx} ${n1(by - h)}L${n1(bx + w / 2)} ${n1(by - h * 0.75)}Z' fill='${i % 2 ? c.p : c.a}' opacity='${0.22 + (i % 3) * 0.08}'/><path d='M${bx} ${by}L${bx} ${n1(by - h)}' stroke='${c.bg}' stroke-width='2' opacity='.4'/>`;
        })
        .join('');
    return `<defs>${grad('cr', [['0', c.h, c.dark ? 0.2 : 0.85], ['.6', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#cr)'/>${stars(7, 30, c.a)}${cluster(150, 1)}${cluster(1450, -1)}`;
  },
  koi: (c) => {
    const fish = (x: number, y: number, rot: number, col: string) =>
      `<g transform='translate(${x} ${y}) rotate(${rot})' opacity='.5'><ellipse cx='0' cy='0' rx='46' ry='16' fill='${col}'/><path d='M40 0L72 -18Q64 0 72 18Z' fill='${col}'/><circle cx='-30' cy='-4' r='3' fill='${c.bg}'/></g>`;
    let ripples = '';
    for (const [x, y] of [[300, 300], [1250, 720], [900, 180]]) for (let i = 1; i < 4; i++) ripples += `<ellipse cx='${x}' cy='${y}' rx='${i * 50}' ry='${i * 18}' fill='none' stroke='${c.p}' stroke-width='2' opacity='${0.3 - i * 0.07}'/>`;
    return `<defs>${grad('ko', [['0', c.h, c.dark ? 0.25 : 0.85], ['1', c.p, 0.08]])}</defs><rect width='${W}' height='${Hh}' fill='url(#ko)'/>${ripples}${fish(240, 620, -20, c.p)}${fish(1350, 260, 160, c.a)}${fish(1180, 860, 200, c.p)}<g fill='${c.p}' opacity='.18'><circle cx='120' cy='880' r='70'/><circle cx='1500' cy='560' r='60'/><circle cx='1430' cy='120' r='40'/></g>`;
  },
  'sky-islands': (c) =>
    `<defs>${grad('si', [['0', c.dark ? c.p : c.h, c.dark ? 0.2 : 0.95], ['.7', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#si)'/>${c.dark ? stars(66, 60, c.t) : ''}${cloud(40, 820, 2.4, c.dark ? c.p : '#ffffff', c.dark ? 0.15 : 0.75)}${cloud(1200, 860, 2.1, c.dark ? c.p : '#ffffff', c.dark ? 0.15 : 0.75)}<g fill='${c.p}' opacity='.3'><path d='M180 260h220l-40 40-50 90-40-50-30-40Z'/><path d='M1180 160h260l-50 50-70 110-60-70-40-50Z'/></g><g fill='${c.a}' opacity='.8'><rect x='170' y='246' width='240' height='16' rx='8'/><rect x='1170' y='146' width='280' height='16' rx='8'/></g>${cloud(600, 120, 0.9, c.dark ? c.p : '#ffffff', c.dark ? 0.12 : 0.7)}`,
  deco: (c) => {
    const fan = (x: number, y: number, rot: number) =>
      `<g transform='translate(${x} ${y}) rotate(${rot})' fill='none' stroke='${c.p}' stroke-width='2' opacity='.55'>${[60, 100, 140, 180].map((r) => `<path d='M${-r} 0A${r} ${r} 0 0 1 ${r} 0'/>`).join('')}${Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI + (i * Math.PI) / 8;
        return `<path d='M0 0L${n1(Math.cos(a) * 180)} ${n1(Math.sin(a) * 180)}'/>`;
      }).join('')}</g>`;
    return `<defs>${grad('dc', [['0', c.p, c.dark ? 0.12 : 0.08], ['.5', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#dc)'/>${fan(0, 0, 135)}${fan(1600, 0, 225)}${fan(0, 1000, 45)}${fan(1600, 1000, -45)}<g stroke='${c.p}' stroke-width='1.5' opacity='.35'><path d='M24 24H1576V976H24Z' fill='none'/><path d='M40 40H1560V960H40Z' fill='none'/></g>`;
  },
  marble: (c) => {
    const r = rng(101);
    let veins = '';
    for (let i = 0; i < 9; i++) {
      let d = `M${n1(r() * 300 - 100)} ${n1(r() * Hh)}`;
      for (let k = 0; k < 6; k++) d += `Q${n1(200 + k * 260 + r() * 100)} ${n1(r() * Hh)} ${n1(330 + k * 260)} ${n1(r() * Hh)}`;
      veins += `<path d='${d}' fill='none' stroke='${i % 3 ? c.t : c.p}' stroke-width='${n1(0.8 + r() * 2.4)}' opacity='${n1(0.05 + r() * 0.08)}'/>`;
    }
    return `<defs>${grad('mb', [['0', c.h, 0.5], ['1', c.bg, 0]])}</defs><rect width='${W}' height='${Hh}' fill='url(#mb)'/>${veins}`;
  },
  filigree: (c) => {
    const corner = (tx: number, ty: number, sx: number, sy: number) =>
      `<g transform='translate(${tx} ${ty}) scale(${sx} ${sy})' fill='none' stroke='${c.p}' stroke-width='2' opacity='.5'><path d='M0 220C40 140 80 100 160 90C110 60 70 60 40 90C60 40 110 20 160 40C140 0 90-10 60 10'/><path d='M220 0C140 40 100 80 90 160C60 110 60 70 90 40C40 60 20 110 40 160C0 140-10 90 10 60'/><circle cx='90' cy='90' r='14'/><circle cx='90' cy='90' r='5' fill='${c.p}'/></g>`;
    return `<defs>${radial('fl', c.p, c.dark ? 0.16 : 0.1)}</defs><rect width='${W}' height='${Hh}' fill='url(#fl)'/>${corner(20, 20, 1, 1)}${corner(1580, 20, -1, 1)}${corner(20, 980, 1, -1)}${corner(1580, 980, -1, -1)}`;
  },
  velvet: (c) =>
    `<defs><radialGradient id='vv' cx='.5' cy='0' r='.9'><stop offset='0' stop-color='${c.a}' stop-opacity='${c.dark ? 0.35 : 0.5}'/><stop offset='.6' stop-color='${c.p}' stop-opacity='.05'/><stop offset='1' stop-color='${c.t}' stop-opacity='${c.dark ? 0.25 : 0.06}'/></radialGradient></defs><rect width='${W}' height='${Hh}' fill='url(#vv)'/><g fill='none' stroke='${c.p}' stroke-width='1.2' opacity='.12'>${Array.from({ length: 8 }, (_, i) => `<path d='M${i * 220 - 100} 1000Q${i * 220} 600 ${i * 220 + 100} 1000'/>`).join('')}</g>`,
  starlight: (c) => {
    const r = rng(121);
    let dust = '';
    for (let i = 0; i < 90; i++) {
      const x = r() * W;
      const y = r() * Hh;
      const edge = Math.min(x, W - x, y, Hh - y) < 260 || r() > 0.7;
      if (!edge) continue;
      dust += i % 6 === 0 ? star4(x, y, 4 + r() * 7, c.p, 0.8) : `<circle cx='${n1(x)}' cy='${n1(y)}' r='${n1(0.8 + r() * 2)}' fill='${c.p}' opacity='${n1(0.3 + r() * 0.6)}'/>`;
    }
    return `<defs>${radial('sl', c.p, c.dark ? 0.18 : 0.12)}</defs><ellipse cx='800' cy='0' rx='900' ry='420' fill='url(#sl)'/>${dust}`;
  },
};

function pal(p: ThemePalette, dark: boolean): Pal {
  return { p: p.primary, p2: p.primary2 || p.primary, a: p.accent, h: p.heroBg, bg: p.bg, t: p.text, dark };
}

/** CSS url() for one scene in one mode. */
export function sceneUrl(id: SceneId, palette: ThemePalette, dark: boolean): string {
  const draw = DRAW[id];
  if (!draw) return 'none';
  return svgUrl(W, Hh, draw(pal(palette, dark)));
}

/** Value for --theme-scene (adds sizing so the art covers the screen). */
export function sceneBackground(id: SceneId, palette: ThemePalette, dark: boolean): string {
  return `${sceneUrl(id, palette, dark)} center / cover no-repeat`;
}

export function isSceneId(v: unknown): v is SceneId {
  return typeof v === 'string' && (SCENES as readonly string[]).includes(v);
}
