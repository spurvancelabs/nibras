// =============================================================================
// FILE: lib/attachment-text.ts   (NEW FILE — pure, no network)
// Turns the files learners attach into plain text for AI grading:
//   Word (.docx), PowerPoint (.pptx), Excel (.xlsx), OpenDocument (.odt/.odp),
//   Jupyter notebooks (.ipynb) and plain text / code.
// PDFs are handled in lib/attachment-reader.ts (needs the PDF library).
// Zip bombs are refused: entries are size-checked BEFORE they are inflated.
// =============================================================================

import { unzipSync } from 'fflate';

export const TEXT_EXT = new Set(['txt', 'md', 'csv', 'tsv', 'json', 'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rb', 'php', 'html', 'css', 'scss', 'sql', 'xml', 'yaml', 'yml', 'r', 'kt', 'swift', 'rs', 'sh', 'm', 'tex', 'dart', 'lua', 'pl', 'scala', 'ipynb']);
export const OFFICE_EXT = new Set(['docx', 'pptx', 'xlsx', 'odt', 'odp']);
export const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export type AttachmentKind = 'text' | 'pdf' | 'office' | 'image' | 'other';

export function kindOf(ext: string): AttachmentKind {
  const e = ext.toLowerCase();
  if (e === 'pdf') return 'pdf';
  if (OFFICE_EXT.has(e)) return 'office';
  if (IMAGE_EXT.has(e)) return 'image';
  if (TEXT_EXT.has(e)) return 'text';
  return 'other';
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[e.toLowerCase()] ?? '';
  });
}

/** Text runs inside an Office XML part, one line per paragraph. */
export function xmlText(xml: string, runTag: string, paraTag: string): string {
  const out: string[] = [];
  const paraRe = new RegExp(`<${paraTag}[\\s>][\\s\\S]*?</${paraTag}>`, 'g');
  const runRe = new RegExp(`<${runTag}(?:\\s[^>]*)?>([\\s\\S]*?)</${runTag}>`, 'g');
  for (const p of xml.match(paraRe) ?? []) {
    let line = '';
    let m: RegExpExecArray | null;
    runRe.lastIndex = 0;
    while ((m = runRe.exec(p))) line += m[1];
    if (/<w:tab\/>/.test(p) && !line) line = '\t';
    const t = decode(line.replace(/<[^>]+>/g, '')).trim();
    if (t) out.push(t);
  }
  return out.join('\n');
}

const MAX_UNZIPPED = 40 * 1024 * 1024; // total bytes we'll inflate
const MAX_ENTRY = 15 * 1024 * 1024;

/** Unzip only the parts we need, refusing suspiciously large entries. */
function unzipParts(buf: Uint8Array, want: (name: string) => boolean): Record<string, string> {
  let total = 0;
  let tooBig = false;
  const files = unzipSync(buf, {
    filter: (f) => {
      if (!want(f.name)) return false;
      if (f.originalSize > MAX_ENTRY || total + f.originalSize > MAX_UNZIPPED) {
        tooBig = true;
        return false;
      }
      total += f.originalSize;
      return true;
    },
  });
  if (tooBig) throw new Error('file too large when unpacked');
  const dec = new TextDecoder('utf-8');
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) out[k] = dec.decode(v);
  return out;
}

const slideNo = (n: string) => Number(/(\d+)\.xml$/.exec(n)?.[1] ?? 0);

/** Extract readable text from an Office / OpenDocument file. */
export function officeText(ext: string, buf: Uint8Array): string {
  const e = ext.toLowerCase();
  if (e === 'docx') {
    const parts = unzipParts(buf, (n) => n === 'word/document.xml' || /^word\/(footnotes|endnotes)\.xml$/.test(n));
    return [parts['word/document.xml'], parts['word/footnotes.xml'], parts['word/endnotes.xml']]
      .filter(Boolean)
      .map((x) => xmlText(x!, 'w:t', 'w:p'))
      .join('\n');
  }
  if (e === 'pptx') {
    const parts = unzipParts(buf, (n) => /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(n));
    const slides = Object.keys(parts)
      .filter((n) => n.includes('/slides/'))
      .sort((a, b) => slideNo(a) - slideNo(b));
    return slides
      .map((n) => {
        const notes = parts[`ppt/notesSlides/notesSlide${slideNo(n)}.xml`];
        const body = xmlText(parts[n], 'a:t', 'a:p');
        const nt = notes ? xmlText(notes, 'a:t', 'a:p').replace(/^\d+$/m, '').trim() : '';
        return `[Slide ${slideNo(n)}]\n${body}${nt ? `\n(Notes) ${nt}` : ''}`;
      })
      .join('\n\n');
  }
  if (e === 'xlsx') {
    const parts = unzipParts(buf, (n) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
    const shared = parts['xl/sharedStrings.xml'] ? (parts['xl/sharedStrings.xml'].match(/<si>[\s\S]*?<\/si>/g) ?? []).map((si) => decode((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(''))) : [];
    const sheets = Object.keys(parts)
      .filter((n) => n.includes('worksheets'))
      .sort((a, b) => slideNo(a) - slideNo(b));
    return sheets
      .map((n) => {
        const rows = (parts[n].match(/<row[\s\S]*?<\/row>/g) ?? []).slice(0, 500).map((row) =>
          (row.match(/<c\b[^>]*>[\s\S]*?<\/c>/g) ?? [])
            .map((c) => {
              const v = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(c)?.[1] ?? '';
              return /t="s"/.test(c) ? shared[Number(v)] ?? '' : decode(v);
            })
            .join('\t')
        );
        return `[Sheet ${slideNo(n)}]\n${rows.join('\n')}`;
      })
      .join('\n\n');
  }
  if (e === 'odt' || e === 'odp') {
    const parts = unzipParts(buf, (n) => n === 'content.xml');
    const x = parts['content.xml'] ?? '';
    return decode(
      x
        .replace(/<text:(p|h)\b[^>]*\/>/g, '\n')
        .replace(/<\/text:(p|h)>/g, '\n')
        .replace(/<text:tab\/>/g, '\t')
        .replace(/<[^>]+>/g, '')
    )
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

/** Jupyter notebook → markdown + code cells (outputs skipped). */
export function notebookText(raw: string): string {
  try {
    const nb = JSON.parse(raw) as { cells?: { cell_type?: string; source?: string | string[] }[] };
    return (nb.cells ?? [])
      .slice(0, 500)
      .map((c) => {
        const src = Array.isArray(c.source) ? c.source.join('') : String(c.source ?? '');
        return c.cell_type === 'code' ? `[code]\n${src}` : src;
      })
      .join('\n\n');
  } catch {
    return raw;
  }
}
