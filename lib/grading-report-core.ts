// =============================================================================
// FILE: lib/grading-report-core.ts   (NEW FILE — pure, client-safe)
// Statistics for grading reports: summary numbers, grade bands, and how
// closely AI suggestions matched the mentor's final grade.
// =============================================================================

export type Summary = { count: number; average: number | null; median: number | null; highest: number | null; lowest: number | null; stdev: number | null; passRate: number | null };

/** `percents` are 0–100. Pass = at least `passMark` percent. */
export function summarize(percents: number[], passMark = 50): Summary {
  const xs = percents.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const n = xs.length;
  if (!n) return { count: 0, average: null, median: null, highest: null, lowest: null, stdev: null, passRate: null };
  const avg = xs.reduce((a, b) => a + b, 0) / n;
  const med = n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - avg) ** 2, 0) / n);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return { count: n, average: r1(avg), median: r1(med), highest: r1(xs[n - 1]), lowest: r1(xs[0]), stdev: r1(sd), passRate: Math.round((xs.filter((x) => x >= passMark).length / n) * 100) };
}

export const BANDS = [
  { label: '90–100%', min: 90, tone: 'success' },
  { label: '80–89%', min: 80, tone: 'success' },
  { label: '70–79%', min: 70, tone: 'primary' },
  { label: '60–69%', min: 60, tone: 'primary' },
  { label: '50–59%', min: 50, tone: 'warning' },
  { label: 'Below 50%', min: -Infinity, tone: 'danger' },
] as const;

export function bands(percents: number[]): { label: string; value: number }[] {
  const counts = BANDS.map(() => 0);
  for (const p of percents) {
    const i = BANDS.findIndex((b) => p >= b.min);
    counts[i >= 0 ? i : BANDS.length - 1]++;
  }
  return BANDS.map((b, i) => ({ label: b.label, value: counts[i] }));
}

export type Agreement = { pairs: number; meanAbsDiff: number | null; within10: number | null; edited: number | null; aiHigher: number; aiLower: number };

/** Compare AI-suggested marks with the mentor's final marks (as % of max). */
export function agreement(pairs: { ai: number; final: number; max: number; edited: boolean }[]): Agreement {
  const ok = pairs.filter((p) => p.max > 0 && Number.isFinite(p.ai) && Number.isFinite(p.final));
  if (!ok.length) return { pairs: 0, meanAbsDiff: null, within10: null, edited: null, aiHigher: 0, aiLower: 0 };
  const diffs = ok.map((p) => ((p.ai - p.final) / p.max) * 100);
  return {
    pairs: ok.length,
    meanAbsDiff: Math.round((diffs.reduce((a, d) => a + Math.abs(d), 0) / ok.length) * 10) / 10,
    within10: Math.round((diffs.filter((d) => Math.abs(d) <= 10).length / ok.length) * 100),
    edited: Math.round((ok.filter((p) => p.edited).length / ok.length) * 100),
    aiHigher: diffs.filter((d) => d > 0.01).length,
    aiLower: diffs.filter((d) => d < -0.01).length,
  };
}

export function csvCell(raw: unknown): string {
  let s = raw === null || raw === undefined ? '' : String(raw);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // no spreadsheet formulas
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
