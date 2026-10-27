// =============================================================================
// FILE: app/(app)/courses/CourseBits.tsx   (NEW FILE — server + client safe)
// Course card, access badge, and the SAFE renderer for lesson explanations
// (text is parsed by lib/courses-core.ts and rendered as plain React nodes —
// no HTML from the database is ever injected).
// =============================================================================

import Link from 'next/link';
import { formatDuration, parseBlocks, type Inline } from '@/lib/courses-core';
import type { CourseCard } from '@/lib/courses';

export function AccessBadge({ access, price, tokenIcon, premiumName, className = '' }: { access: string; price: number; tokenIcon: string; premiumName: string; className?: string }) {
  if (access === 'premium')
    return <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold bg-warning/15 text-warning ${className}`}>👑 {premiumName}</span>;
  if (access === 'tokens')
    return (
      <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold bg-primary/12 text-text ${className}`}>
        {tokenIcon} {price}
      </span>
    );
  return <span className={`inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold bg-success/12 text-success ${className}`}>Free</span>;
}

const LEVEL: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', all: 'All levels' };
export const levelLabel = (l: string) => LEVEL[l] ?? 'All levels';

/** Gradient placeholder when a course has no cover image. */
function Cover({ cover, title }: { cover: string; title: string }) {
  if (cover)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />;
  return (
    <div className="w-full h-full grid place-items-center bg-gradient-to-br from-primary/25 via-hero to-accent/20">
      <span className="text-3xl font-semibold text-text/70">{title.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}

export function CourseCardView({ c, tokenIcon, premiumName, href }: { c: CourseCard; tokenIcon: string; premiumName: string; href?: string }) {
  return (
    <Link
      href={href ?? `/courses/${c.slug}`}
      prefetch={false}
      className="group flex flex-col overflow-hidden bg-surface border border-border rounded-[var(--radius-lg)] hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-primary"
      style={{ transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease' }}
    >
      <div className="relative aspect-video overflow-hidden bg-hero">
        <Cover cover={c.cover} title={c.title} />
        <AccessBadge access={c.access} price={c.tokenPrice} tokenIcon={tokenIcon} premiumName={premiumName} className="absolute top-2 left-2 shadow-sm backdrop-blur" />
        {c.completed && <span className="absolute top-2 right-2 h-6 px-2 inline-flex items-center rounded-full text-[11px] font-semibold bg-success text-white">✓ Done</span>}
      </div>
      <div className="flex-1 flex flex-col p-4 gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{[c.category, levelLabel(c.level)].filter(Boolean).join(' · ')}</p>
        <h3 className="font-semibold leading-snug line-clamp-2">{c.title}</h3>
        {c.subtitle && <p className="text-sm text-muted line-clamp-2">{c.subtitle}</p>}
        <div className="mt-auto pt-2 flex items-center gap-3 text-xs text-muted">
          <span>{c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'}</span>
          {c.totalDuration > 0 && <span>{formatDuration(c.totalDuration)}</span>}
          {c.enrolledCount > 0 && <span>{c.enrolledCount} learner{c.enrolledCount === 1 ? '' : 's'}</span>}
        </div>
        {c.progress !== null && (
          <div className="pt-2" aria-label={`${c.progress}% complete`}>
            <div className="h-1.5 rounded-full bg-hero overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${c.progress}%`, transition: 'width 400ms ease' }} />
            </div>
            <p className="mt-1 text-[11px] text-muted">{c.progress}% complete</p>
          </div>
        )}
      </div>
    </Link>
  );
}

function Inl({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.t === 'bold' ? (
          <strong key={i}>{p.v}</strong>
        ) : p.t === 'code' ? (
          <code key={i} className="px-1 py-0.5 rounded bg-hero text-[0.9em]">
            {p.v}
          </code>
        ) : p.t === 'link' ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 break-all">
            {p.v}
          </a>
        ) : (
          <span key={i}>{p.v}</span>
        )
      )}
    </>
  );
}

export function RichText({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {blocks.map((b, i) =>
        b.k === 'h' ? (
          <h3 key={i} className="text-lg font-semibold pt-2">
            <Inl parts={b.inl} />
          </h3>
        ) : b.k === 'p' ? (
          <p key={i}>
            <Inl parts={b.inl} />
          </p>
        ) : b.k === 'code' ? (
          <pre key={i} className="p-3 rounded-[var(--radius-md)] bg-hero overflow-x-auto text-sm">
            <code>{b.v}</code>
          </pre>
        ) : b.k === 'ul' ? (
          <ul key={i} className="list-disc pl-5 space-y-1">
            {b.items.map((it, j) => (
              <li key={j}>
                <Inl parts={it} />
              </li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="list-decimal pl-5 space-y-1">
            {b.items.map((it, j) => (
              <li key={j}>
                <Inl parts={it} />
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  );
}
