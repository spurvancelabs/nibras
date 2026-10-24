// =============================================================================
// FILE: lib/time.ts   (NEW FILE — client-safe, no server imports)
//
// One place for dates & times so the whole LMS uses the SAME time zone.
//
// Why: the server (Vercel) runs in UTC, browsers in Pakistan run in UTC+5.
// Anything that does `new Date('2026-10-24T19:00')` on the server, or
// `toLocaleDateString()` without a timeZone, is off by 5 hours — sessions show
// at the wrong time, dates flip to "yesterday" between 00:00–05:00 PKT, and
// server/client renders disagree (hydration warnings).
//
// Set NEXT_PUBLIC_APP_TIMEZONE to change the zone (default Asia/Karachi).
// =============================================================================

export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Karachi';
export const APP_LOCALE = 'en-GB';

type DateInput = Date | string | number | null | undefined;

export type ZonedParts = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 0–23
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
};

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(key: string, make: () => Intl.DateTimeFormat) {
  let f = fmtCache.get(key);
  if (!f) {
    f = make();
    fmtCache.set(key, f);
  }
  return f;
}

function toDate(v: DateInput): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Calendar parts of `date` as seen on a wall clock in `tz`. */
export function zonedParts(date: DateInput, tz: string = APP_TIME_ZONE): ZonedParts {
  const d = toDate(date) ?? new Date();
  const f = formatter(`parts|${tz}`, () =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
  );
  const out: Record<string, string> = {};
  for (const p of f.formatToParts(d)) if (p.type !== 'literal') out[p.type] = p.value;
  const hour = Number(out.hour);
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS[out.weekday] ?? 0,
  };
}

/** Minutes the zone is ahead of UTC at that instant (Asia/Karachi → 300). */
export function tzOffsetMinutes(date: DateInput, tz: string = APP_TIME_ZONE): number {
  const d = toDate(date) ?? new Date();
  const p = zonedParts(d, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const actual = Math.floor(d.getTime() / 1000) * 1000;
  return Math.round((asUtc - actual) / 60000);
}

/** Wall-clock time in `tz` → the real instant (Date). Handles DST where it exists. */
export function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  tz: string = APP_TIME_ZONE
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const off1 = tzOffsetMinutes(guess, tz);
  let t = guess - off1 * 60000;
  const off2 = tzOffsetMinutes(t, tz);
  if (off2 !== off1) t = guess - off2 * 60000;
  return new Date(t);
}

/**
 * Parse a value from <input type="datetime-local"> or <input type="date">
 * ("2026-10-24T19:00", "2026-10-24 19:00", "2026-10-24") as wall-clock time in
 * the app time zone. Use this on the SERVER instead of `new Date(value)`.
 * Values that already carry a zone ("...Z", "+05:00") are parsed as-is.
 */
export function parseLocalDateTime(value: string | null | undefined, tz: string = APP_TIME_ZONE): Date | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(v)) return toDate(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(v);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] ?? '0', m[5] ?? '0', m[6] ?? '0'].map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const out = zonedToUtc(y, mo, d, h, mi, s, tz);
  // Reject impossible dates like 31 Feb (they would roll over)
  const back = zonedParts(out, tz);
  if (back.year !== y || back.month !== mo || back.day !== d) return null;
  return out;
}

function pad(n: number, len = 2) {
  return String(n).padStart(len, '0');
}

/** Date → "2026-10-24T19:00" for <input type="datetime-local"> (app time zone). */
export function toLocalDateTimeInput(date: DateInput, tz: string = APP_TIME_ZONE): string {
  const d = toDate(date);
  if (!d) return '';
  const p = zonedParts(d, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Date → "2026-10-24" for <input type="date"> (app time zone). */
export function toLocalDateInput(date: DateInput, tz: string = APP_TIME_ZONE): string {
  const d = toDate(date);
  if (!d) return '';
  const p = zonedParts(d, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Start of the day (00:00 in the app zone) that contains `date`. */
export function startOfLocalDay(date: DateInput = new Date(), tz: string = APP_TIME_ZONE): Date {
  const p = zonedParts(date, tz);
  return zonedToUtc(p.year, p.month, p.day, 0, 0, 0, tz);
}

/** True when two instants fall on the same calendar day in the app zone. */
export function isSameLocalDay(a: DateInput, b: DateInput, tz: string = APP_TIME_ZONE): boolean {
  const x = toDate(a);
  const y = toDate(b);
  if (!x || !y) return false;
  return toLocalDateInput(x, tz) === toLocalDateInput(y, tz);
}

type FormatOpts = { tz?: string; locale?: string; fallback?: string };

function fmt(date: DateInput, key: string, options: Intl.DateTimeFormatOptions, o: FormatOpts = {}) {
  const d = toDate(date);
  if (!d) return o.fallback ?? '—';
  const tz = o.tz ?? APP_TIME_ZONE;
  const locale = o.locale ?? APP_LOCALE;
  return formatter(`${key}|${tz}|${locale}`, () => new Intl.DateTimeFormat(locale, { timeZone: tz, ...options })).format(d);
}

/** "24 Oct 2026" */
export function formatDate(date: DateInput, o?: FormatOpts) {
  return fmt(date, 'date', { day: 'numeric', month: 'short', year: 'numeric' }, o);
}

/** "Sat, 24 Oct 2026" */
export function formatDateLong(date: DateInput, o?: FormatOpts) {
  return fmt(date, 'datelong', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, o);
}

/** "7:00 pm" */
export function formatTime(date: DateInput, o?: FormatOpts) {
  return fmt(date, 'time', { hour: 'numeric', minute: '2-digit', hour12: true }, o);
}

/** "24 Oct 2026, 7:00 pm" */
export function formatDateTime(date: DateInput, o?: FormatOpts) {
  return fmt(date, 'datetime', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }, o);
}

/** "Sat, 24 Oct 2026, 7:00 pm" */
export function formatDateTimeWeekday(date: DateInput, o?: FormatOpts) {
  return fmt(date, 'datetimewd', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }, o);
}

/** "Saturday, 24 October 2026" */
export function formatDayFull(date: DateInput, o?: FormatOpts) {
  return fmt(date, 'dayfull', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, o);
}

/** "Saturday, 24 October" */
export function formatDayMonth(date: DateInput, o?: FormatOpts) {
  return fmt(date, 'daymonth', { weekday: 'long', day: 'numeric', month: 'long' }, o);
}

/** Any Intl options, always in the app time zone. */
export function formatInZone(date: DateInput, options: Intl.DateTimeFormatOptions, o?: FormatOpts) {
  return fmt(date, 'custom:' + JSON.stringify(options), options, o);
}

/** Browser/server-safe: value of <input type="datetime-local"> (app zone) → ISO string, or '' */
export function localInputToIso(value: string | null | undefined): string {
  return parseLocalDateTime(value)?.toISOString() ?? '';
}

/** "Good morning" / "Good afternoon" / "Good evening" in the app zone. */
export function greetingFor(date: DateInput = new Date()): string {
  const h = zonedParts(date).hour;
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Oct 2026" */
export function formatMonthYear(date: DateInput, o?: FormatOpts) {
  return fmt(date, 'monthyear', { month: 'short', year: 'numeric' }, o);
}

/** "3 min ago", "2 days ago", "in 4 hours" — for last-sign-in style labels. */
export function formatRelative(date: DateInput, now: Date = new Date()): string {
  const d = toDate(date);
  if (!d) return 'never';
  const diff = (d.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (abs >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return 'just now';
}

/** Short label for the zone, e.g. "PKT (UTC+5)". */
export function timeZoneLabel(tz: string = APP_TIME_ZONE): string {
  const off = tzOffsetMinutes(new Date(), tz);
  const sign = off >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  const name = tz === 'Asia/Karachi' ? 'PKT' : tz;
  return `${name} (UTC${sign}${h}${m ? ':' + pad(m) : ''})`;
}
