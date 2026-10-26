// =============================================================================
// FILE: components/charts.tsx   (NEW FILE — server + client safe)
// Small, dependency-free SVG charts that follow the active theme:
//   <TrendChart points={[{label, value}]} max={100} unit="%" />  one series
//   <BarList rows={[{label, value, href?}]} max unit />           horizontal bars
// Single series → no legend (the panel title names it). Every mark has a
// hover tooltip (<title>) and a hidden table for screen readers.
// =============================================================================

type Point = { label: string; value: number };

export function TrendChart({ points, max = 100, unit = '', height = 140, label }: { points: Point[]; max?: number; unit?: string; height?: number; label: string }) {
  if (points.length === 0) return <p className="text-sm text-muted">Nothing to show yet.</p>;
  const W = 600;
  const H = height;
  const pad = { l: 34, r: 12, t: 10, b: 18 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (Math.max(0, Math.min(max, v)) / max) * ih;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;
  const ticks = [0, max / 2, max];
  const last = points[points.length - 1];
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label={`${label}: latest ${last.value}${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth="1" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
              {Math.round(t)}
              {unit}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--color-primary)" opacity="0.08" />
        <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r="4" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="2" />
            {/* larger invisible hit target with tooltip */}
            <circle cx={x(i)} cy={y(p.value)} r="12" fill="transparent">
              <title>{`${p.label}: ${p.value}${unit}`}</title>
            </circle>
          </g>
        ))}
        <text x={x(points.length - 1)} y={y(last.value) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--color-text)">
          {last.value}
          {unit}
        </text>
      </svg>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.label}</th>
              <td>
                {p.value}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function BarList({ rows, max, unit = '', tone = 'primary' }: { rows: { label: string; value: number; hint?: string }[]; max?: number; unit?: string; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  const color = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone];
  if (!rows.length) return <p className="text-sm text-muted">Nothing to show yet.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${r.value}${unit}${r.hint ? ` — ${r.hint}` : ''}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="tabular-nums text-muted shrink-0">
              {r.value}
              {unit}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-hero overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
