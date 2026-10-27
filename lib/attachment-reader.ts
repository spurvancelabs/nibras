// =============================================================================
// FILE: lib/attachment-reader.ts   (NEW FILE — server only)
// Reads a submission's attachments so the AI grader can see them.
//
//   PDF                 → text (first 40 pages). A scanned PDF with no text
//                         is sent as page images when vision is on.
//   Word / PowerPoint / Excel / OpenDocument / notebooks / code / text → text
//   Images (png, jpg…)  → sent to the model as images when vision is on
//                         (AI_VISION=on and a vision-capable AI_MODEL)
//
// Safety
//   - only https files in THIS deployment's Cloudinary account are fetched
//     (no other hosts → no server-side request forgery), redirects refused
//   - size limits per type, at most 6 files, strict time budget so a grading
//     call still fits in Vercel's 10 s limit
//   - everything read is untrusted DATA for the prompt (see ai-grading-core)
// =============================================================================

import 'server-only';
import { extensionOf } from './upload-policy';
import { kindOf, officeText, notebookText } from './attachment-text';

export type Att = { url: string; format?: string; size?: number; originalName?: string };
export type ReadSource = { name: string; kind: string; status: 'read' | 'image' | 'skipped' | 'failed'; note: string; chars: number };
export type ReadResult = { text: string; images: string[]; sources: ReadSource[]; unread: number };

const LIMIT = { text: 500_000, pdf: 15 * 1024 * 1024, office: 15 * 1024 * 1024, image: 8 * 1024 * 1024 };
const MAX_FILES = 6;
const MAX_IMAGES = 4;

export function visionEnabled(): boolean {
  return process.env.AI_PROVIDER !== 'mock' && /^(on|true|1|yes)$/i.test(process.env.AI_VISION ?? '');
}

/** True only for https files in our own Cloudinary account. */
export function ownCloudinaryUrl(raw: string): URL | null {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com' || !cloud || !u.pathname.startsWith(`/${cloud}/`)) return null;
    if (u.username || u.password || u.port) return null;
    return u;
  } catch {
    return null;
  }
}

/** Cloudinary delivery URL for one page of a PDF (as an image), sized for vision models. */
function pdfPageImage(u: URL, page: number): string | null {
  if (!u.pathname.includes('/image/upload/')) return null;
  const p = u.pathname.replace('/image/upload/', `/image/upload/pg_${page},w_1600,c_limit,q_auto/`).replace(/\.pdf$/i, '.jpg');
  return `${u.origin}${p}`;
}

function resizedImage(u: URL): string {
  if (!u.pathname.includes('/image/upload/')) return u.toString();
  return `${u.origin}${u.pathname.replace('/image/upload/', '/image/upload/w_1600,c_limit,q_auto,f_jpg/')}`;
}

async function fetchBytes(u: URL, max: number, deadline: number): Promise<Uint8Array> {
  const left = deadline - Date.now();
  if (left < 300) throw new Error('time');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.min(left, 3500));
  try {
    const res = await fetch(u, { signal: ctrl.signal, redirect: 'error', cache: 'no-store' });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const len = Number(res.headers.get('content-length') || 0);
    if (len > max) throw new Error('too large');
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.byteLength;
      if (got > max) {
        ctrl.abort();
        throw new Error('too large');
      }
      chunks.push(value);
    }
    const out = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.byteLength;
    }
    return out;
  } finally {
    clearTimeout(t);
  }
}

async function pdfText(buf: Uint8Array): Promise<{ text: string; pages: number }> {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const pdf = await getDocumentProxy(buf);
  try {
    const pages = pdf.numPages;
    const { text } = await extractText(pdf, { mergePages: false });
    const parts = (text as string[]).slice(0, 40).map((t, i) => `[Page ${i + 1}]\n${t.trim()}`);
    return { text: parts.join('\n\n'), pages };
  } finally {
    void (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.();
  }
}

const fmtNum = (n: number) => n.toLocaleString('en-US');

/**
 * Read attachments within `budgetMs`. Never throws: anything unreadable is
 * listed in `sources` so the mentor sees exactly what the AI looked at.
 */
export async function readAttachments(atts: Att[], budgetMs = 4500): Promise<ReadResult> {
  const deadline = Date.now() + budgetMs;
  const vision = visionEnabled();
  const sources: ReadSource[] = [];
  const images: string[] = [];
  let text = '';
  let unread = 0;
  for (const [i, a] of atts.entries()) {
    const name = (a.originalName || `file ${i + 1}`).slice(0, 120);
    const ext = (a.format || extensionOf(a.originalName ?? '') || extensionOf(safePath(a.url))).toLowerCase();
    const kind = kindOf(ext);
    const src: ReadSource = { name, kind, status: 'skipped', note: '', chars: 0 };
    sources.push(src);
    if (i >= MAX_FILES) {
      src.note = `only the first ${MAX_FILES} files are read`;
      unread++;
      continue;
    }
    const u = ownCloudinaryUrl(a.url);
    if (!u) {
      src.note = 'not an uploaded file';
      unread++;
      continue;
    }
    if (Date.now() > deadline - 300) {
      src.note = 'ran out of time';
      unread++;
      continue;
    }
    try {
      if (kind === 'image') {
        if (!vision) {
          src.note = 'images need AI_VISION=on';
          unread++;
          continue;
        }
        if ((a.size ?? 0) > LIMIT.image) throw new Error('too large');
        if (images.length >= MAX_IMAGES) {
          src.note = `max ${MAX_IMAGES} images`;
          unread++;
          continue;
        }
        images.push(resizedImage(u));
        src.status = 'image';
        src.note = 'sent as image';
        continue;
      }
      if (kind === 'other') {
        src.note = `.${ext || '?'} can’t be read`;
        unread++;
        continue;
      }
      const max = kind === 'text' ? LIMIT.text : kind === 'pdf' ? LIMIT.pdf : LIMIT.office;
      if ((a.size ?? 0) > max) throw new Error('too large');
      const buf = await fetchBytes(u, max, deadline);
      let body = '';
      if (kind === 'text') {
        const raw = new TextDecoder('utf-8', { fatal: false }).decode(buf);
        body = ext === 'ipynb' ? notebookText(raw) : raw;
        src.note = `${fmtNum(body.length)} characters`;
      } else if (kind === 'office') {
        body = officeText(ext, buf);
        src.note = `${fmtNum(body.length)} characters`;
      } else {
        const r = await pdfText(buf);
        body = r.text;
        const meaningful = body.replace(/\[Page \d+\]/g, '').replace(/\s+/g, '').length;
        src.note = `${r.pages} page${r.pages === 1 ? '' : 's'}${r.pages > 40 ? ' (first 40 read)' : ''}`;
        if (meaningful < 40) {
          // Probably a scan/photo PDF → look at the pages instead.
          body = '';
          if (vision) {
            for (let p = 1; p <= Math.min(r.pages, MAX_IMAGES - images.length); p++) {
              const img = pdfPageImage(u, p);
              if (img) images.push(img);
            }
          }
          if (vision && images.length) {
            src.status = 'image';
            src.note += ' · scanned, sent as page images';
            continue;
          }
          src.note += ' · no text (scanned?)';
          src.status = 'failed';
          unread++;
          continue;
        }
      }
      body = body.trim();
      if (!body) {
        src.status = 'failed';
        src.note = 'empty';
        unread++;
        continue;
      }
      src.status = 'read';
      src.chars = body.length;
      text += `\n[File: ${name}]\n${body.slice(0, 120_000)}\n`;
    } catch (e) {
      src.status = 'failed';
      src.note = (e as Error).message === 'too large' ? 'too large to read' : (e as Error).message === 'time' ? 'ran out of time' : 'could not be read';
      unread++;
    }
  }
  return { text, images, sources, unread };
}

function safePath(u: string): string {
  try {
    return new URL(u).pathname;
  } catch {
    return '';
  }
}
