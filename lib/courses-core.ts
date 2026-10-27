// =============================================================================
// FILE: lib/courses-core.ts   (NEW FILE — pure, client-safe)
// Helpers for video courses: slugs, video links, durations, progress and a
// tiny SAFE text formatter for lesson explanations (no raw HTML is ever
// rendered — everything becomes plain React text).
// =============================================================================

export type VideoSource =
  | { kind: 'youtube'; id: string }
  | { kind: 'vimeo'; id: string }
  | { kind: 'file'; url: string }
  | { kind: 'none' };

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'course'
  );
}

/** Recognise YouTube, Vimeo, or a direct https video file (e.g. Cloudinary). */
export function parseVideo(url: string | null | undefined): VideoSource {
  const raw = (url ?? '').trim();
  if (!raw) return { kind: 'none' };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { kind: 'none' };
  }
  if (u.protocol !== 'https:') return { kind: 'none' };
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return /^[\w-]{6,20}$/.test(id) ? { kind: 'youtube', id } : { kind: 'none' };
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,20})/)?.[1] ?? '';
    return /^[\w-]{6,20}$/.test(id) ? { kind: 'youtube', id } : { kind: 'none' };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d{6,12})/)?.[1] ?? '';
    return id ? { kind: 'vimeo', id } : { kind: 'none' };
  }
  if (/\.(mp4|webm|m4v|mov|ogg)(\?|$)/i.test(u.pathname) || host === 'res.cloudinary.com') return { kind: 'file', url: u.toString() };
  return { kind: 'none' };
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m} min`;
  return s ? `${s}s` : '';
}

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

// ---------------------------------------------------------------------------
// Safe text blocks for lesson explanations
//   blank line = new paragraph · "- " list · "1. " numbered · "## " heading
//   ``` code block ``` · inline **bold**, `code`, and https links
// ---------------------------------------------------------------------------

export type Inline = { t: 'text' | 'bold' | 'code' | 'link'; v: string; href?: string };
export type Block =
  | { k: 'p'; inl: Inline[] }
  | { k: 'h'; inl: Inline[] }
  | { k: 'ul' | 'ol'; items: Inline[][] }
  | { k: 'code'; v: string };

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|https:\/\/[^\s<>()]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ t: 'bold', v: tok.slice(2, -2) });
    else if (tok.startsWith('`')) out.push({ t: 'code', v: tok.slice(1, -1) });
    else {
      const clean = tok.replace(/[.,;:!?]+$/, '');
      out.push({ t: 'link', v: clean, href: clean });
      if (clean.length < tok.length) out.push({ t: 'text', v: tok.slice(clean.length) });
    }
    last = m.index + tok.length;
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
  return out;
}

export function parseBlocks(text: string): Block[] {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { k: 'ul' | 'ol'; items: Inline[][] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ k: 'p', inl: parseInline(para.join(' ')) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      flushPara();
      flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      blocks.push({ k: 'code', v: code.join('\n') });
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const k = ul ? 'ul' : 'ol';
      if (!list || list.k !== k) {
        flushList();
        list = { k, items: [] };
      }
      list.items.push(parseInline((ul ?? ol)![1]));
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ k: 'h', inl: parseInline(line.replace(/^#{1,3}\s+/, '')) });
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return blocks;
}
