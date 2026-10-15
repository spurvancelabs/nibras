// =============================================================================
// FILE: lib/member-id.ts   (NEW FILE)
// Member ID helpers — client-safe (no mongoose / server-only imports).
//
// Format tokens:
//   {YYYY} 2026   {YY} 26   {MM} 10   {DD} 15
//   {###}  running number, padded to the number of # (one counter token, 1–8 #)
// Example: "NIB-{YYYY}-{####}"  ->  NIB-2026-0001, NIB-2026-0002, …
// =============================================================================

export const DEFAULT_MEMBER_ID_FORMAT = 'MEM-{YYYY}-{####}';
export const MEMBER_ID_MAX = 40;

const COUNTER_RE = /\{(#{1,8})\}/;
const ALLOWED_RE = /^[A-Za-z0-9\-_/.{}#]+$/;

/** Stored form of a member ID: trimmed + upper-case. */
export function normalizeMemberId(v: string | null | undefined): string {
  return (v ?? '').trim().toUpperCase();
}

/** Returns an error message, or null when the format is usable. */
export function validateMemberIdFormat(format: string): string | null {
  const f = (format ?? '').trim();
  if (!f) return 'Enter a format, e.g. MEM-{YYYY}-{####}';
  if (f.length > MEMBER_ID_MAX) return `Format must be ${MEMBER_ID_MAX} characters or fewer`;
  if (!ALLOWED_RE.test(f)) return 'Use letters, numbers, - _ / . and tokens only (no spaces)';
  const counters = f.match(/\{#+\}/g) ?? [];
  if (counters.length === 0) return 'Add a running number like {###} or {####}';
  if (counters.length > 1) return 'Use only one running-number token';
  if (!COUNTER_RE.test(f)) return 'Running number can have 1–8 # characters';
  const unknown = (f.match(/\{[^}]*\}/g) ?? []).filter(
    (t) => !/^\{(YYYY|YY|MM|DD|#{1,8})\}$/.test(t)
  );
  if (unknown.length) return `Unknown token ${unknown[0]} — use {YYYY} {YY} {MM} {DD} {###}`;
  return null;
}

function pad(n: number, len: number) {
  return String(n).padStart(len, '0');
}

function applyDateTokens(format: string, date: Date) {
  return format
    .replace(/\{YYYY\}/g, String(date.getFullYear()))
    .replace(/\{YY\}/g, String(date.getFullYear()).slice(-2))
    .replace(/\{MM\}/g, pad(date.getMonth() + 1, 2))
    .replace(/\{DD\}/g, pad(date.getDate(), 2));
}

/** Build one ID for counter value n. */
export function formatMemberId(format: string, n: number, date = new Date()): string {
  const withDate = applyDateTokens(format.trim(), date);
  return normalizeMemberId(
    withDate.replace(COUNTER_RE, (_m, hashes: string) => pad(n, hashes.length))
  );
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex (source) matching IDs produced by this format today; group 1 = counter. */
export function memberIdPattern(format: string, date = new Date()): string {
  const withDate = normalizeMemberId(applyDateTokens(format.trim(), date));
  const m = withDate.match(/\{#{1,8}\}/);
  if (!m || m.index === undefined) return `^${escapeRe(withDate)}$`;
  const before = withDate.slice(0, m.index);
  const after = withDate.slice(m.index + m[0].length);
  return `^${escapeRe(before)}(\\d+)${escapeRe(after)}$`;
}

/** Next counter value after the highest one already used. */
export function nextCounter(format: string, existing: string[], date = new Date()): number {
  const re = new RegExp(memberIdPattern(format, date));
  let max = 0;
  for (const id of existing) {
    const m = normalizeMemberId(id).match(re);
    if (m) max = Math.max(max, Number(m[1]) || 0);
  }
  return max + 1;
}

/** Generate `count` sequential IDs that don't clash with `existing`. */
export function generateMemberIds(
  format: string,
  count: number,
  existing: string[],
  date = new Date()
): string[] {
  const taken = new Set(existing.map(normalizeMemberId));
  let n = nextCounter(format, existing, date);
  const out: string[] = [];
  while (out.length < count) {
    const id = formatMemberId(format, n, date);
    if (!taken.has(id)) {
      out.push(id);
      taken.add(id);
    }
    n++;
  }
  return out;
}