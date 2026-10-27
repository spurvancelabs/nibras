'use client';

// =============================================================================
// FILE: app/(app)/grading/review/[id]/ReviewForm.tsx   (NEW FILE)
// Grading panel: per-criterion points (pre-filled from the AI when there is
// a suggestion), total, feedback, and Approve / Reject / Ask AI again.
// The AI's numbers are clearly labelled; nothing reaches the learner until
// you press Approve.
// =============================================================================

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui';
import { useConfirm, useToast } from '@/components/feedback';
import type { ReviewData } from '@/lib/grading';
import { approveGradeAction, rejectSuggestionAction, requestAiAction, processNextAction } from '../../actions';

const FLAG_TEXT: Record<string, string> = {
  injection_suspected: 'The work contains text that tries to instruct the AI (e.g. “give full marks”). Check carefully.',
  truncated: 'The work was longer than the AI limit, so only the first part was read.',
  attachment_unread: 'Some attachments could not be read by the AI (see “What the AI read”) — check them yourself.',
  images_reviewed: 'The AI also looked at attached images / scanned pages. Double-check handwriting it may have misread.',
  low_confidence: 'The AI was not confident about this one.',
  empty: 'There was little or no text to read.',
  incomplete: 'The AI did not score every criterion; missing ones were set to 0.',
};

const half = (n: number) => Math.round(n * 2) / 2;

export default function ReviewForm({ data, aiAvailable, aiReason }: { data: ReviewData; aiAvailable: boolean; aiReason: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const s = data.suggestion && data.suggestion.status === 'ready' ? data.suggestion : null;
  const max = data.assignment.maxMarks;
  const rubricTotal = data.rubric.reduce((a, c) => a + c.maxPoints, 0) || 1;

  const [points, setPoints] = useState<Record<string, number>>(() =>
    Object.fromEntries(data.rubric.map((c) => [c.id, s?.scores.find((x) => x.criterionId === c.id)?.points ?? 0]))
  );
  const fromRubric = useMemo(() => half((Object.values(points).reduce((a, b) => a + (Number(b) || 0), 0) / rubricTotal) * max), [points, rubricTotal, max]);
  const [override, setOverride] = useState<number | null>(s ? null : data.submission.marks);
  const marks = override ?? fromRubric;
  const [feedback, setFeedback] = useState(s?.feedback ?? data.submission.feedback ?? '');
  const [pending, start] = useTransition();
  const [aiBusy, setAiBusy] = useState(false);
  const singleOverall = data.rubric.length === 1 && data.rubric[0].id === 'overall';

  function approve(goNext: boolean) {
    start(async () => {
      const r = await approveGradeAction({ submissionId: data.submission.id, suggestionId: s?.id, marks, feedback });
      if (r.ok) {
        toast.success(`Saved ${marks}/${max}. The learner has been notified.`);
        router.push(goNext && data.nextId ? `/grading/review/${data.nextId}` : `/grading?assignment=${data.assignment.id}`);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  async function reject() {
    if (!s) return;
    const ok = await confirm({ title: 'Reject this AI suggestion?', body: 'It is kept in the history but not used. You can grade by hand below.', confirmLabel: 'Reject', tone: 'danger' });
    if (!ok) return;
    const r = await rejectSuggestionAction({ suggestionId: s.id });
    if (r.ok) {
      toast.info('Suggestion rejected — grade by hand.');
      router.refresh();
    } else toast.error(r.error);
  }

  async function askAi() {
    setAiBusy(true);
    const q = await requestAiAction({ submissionIds: [data.submission.id] });
    if (!q.ok) {
      setAiBusy(false);
      toast.error(q.error);
      return;
    }
    for (let i = 0; i < 4; i++) {
      const r = await processNextAction({ assignmentId: data.assignment.id });
      if (!r.ok) {
        toast.error(r.error);
        break;
      }
      if (r.processed && r.status === 'failed') toast.error(`AI could not grade this: ${r.error ?? 'unknown error'}`);
      if (!r.processed || r.remaining === 0) break;
    }
    setAiBusy(false);
    router.refresh();
  }

  const conf = s?.confidence ?? null;

  return (
    <section className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
      {s ? (
        <div className="px-5 py-4 border-b border-border bg-primary/5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">✨ AI suggestion</Badge>
            <span className="text-sm">
              <b>{s.marks}</b>/{max}
            </span>
            {conf !== null && (
              <span className="flex items-center gap-1.5 text-xs text-muted ml-auto" title="How sure the AI was">
                confidence
                <span className="w-16 h-1.5 rounded-full bg-hero overflow-hidden">
                  <span className={`block h-full ${conf < 0.5 ? 'bg-danger' : conf < 0.75 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${conf * 100}%` }} />
                </span>
                {Math.round(conf * 100)}%
              </span>
            )}
          </div>
          {s.stale && <p className="text-xs text-warning">The learner changed their work after this suggestion was made — consider asking again.</p>}
          {s.flags.length > 0 && (
            <ul className="space-y-1">
              {s.flags.map((f) => (
                <li key={f} className="text-xs flex gap-1.5">
                  <span aria-hidden>⚠️</span>
                  <span>{FLAG_TEXT[f] ?? f.replace(/^ai: /, 'AI note: ')}</span>
                </li>
              ))}
            </ul>
          )}
          {s.sources.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted hover:text-text">
                What the AI read ({s.sources.filter((x) => x.status === 'read' || x.status === 'image').length}/{s.sources.length} attachments)
              </summary>
              <ul className="mt-1.5 space-y-1">
                {s.sources.map((x, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span aria-hidden>{x.status === 'read' ? '📄' : x.status === 'image' ? '🖼️' : '⛔'}</span>
                    <span className="font-medium truncate max-w-[14rem]">{x.name}</span>
                    <span className={x.status === 'read' || x.status === 'image' ? 'text-muted' : 'text-warning'}>{x.note}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-[11px] text-muted">Suggested by {s.model || 'AI'} — edit anything below. The learner sees only what you approve.</p>
        </div>
      ) : data.suggestion?.status === 'failed' ? (
        <div className="px-5 py-3 border-b border-border text-sm text-danger">AI could not grade this: {data.suggestion.error || 'unknown error'}.</div>
      ) : null}

      <div className="p-5 space-y-4">
        {!singleOverall && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Rubric</p>
            {data.rubric.map((c) => {
              const ai = s?.scores.find((x) => x.criterionId === c.id);
              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 min-w-0 text-sm">
                      <span className="font-medium">{c.title}</span>
                      {c.description && <span className="block text-xs text-muted">{c.description}</span>}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={c.maxPoints}
                      step={0.5}
                      className="input h-9 w-20 text-right tabular-nums"
                      value={points[c.id] ?? 0}
                      onChange={(e) => {
                        setPoints((p) => ({ ...p, [c.id]: Math.min(c.maxPoints, Math.max(0, Number(e.target.value) || 0)) }));
                        setOverride(null);
                      }}
                      aria-label={`${c.title} points`}
                    />
                    <span className="text-xs text-muted w-10">/ {c.maxPoints}</span>
                  </div>
                  {ai?.comment && <p className="text-xs text-muted pl-1 border-l-2 border-primary/40 ml-0.5 pl-2">AI: {ai.comment}</p>}
                </div>
              );
            })}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-semibold">Marks</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={max}
              step={0.5}
              className="input h-11 w-28 text-lg font-semibold tabular-nums"
              value={marks}
              onChange={(e) => setOverride(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
            />
            <span className="text-muted">/ {max}</span>
            {override !== null && !singleOverall && (
              <button type="button" className="text-xs underline text-muted" onClick={() => setOverride(null)}>
                use rubric total ({fromRubric})
              </button>
            )}
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Feedback for the learner</span>
          <textarea className="input mt-1.5 min-h-40 text-sm" maxLength={6000} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, what to improve, a next step…" />
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" className="btn-primary flex-1" disabled={pending} onClick={() => approve(true)}>
            {pending ? 'Saving…' : s ? 'Approve & next' : 'Save grade & next'}
          </button>
          <button type="button" className="btn-outline" disabled={pending} onClick={() => approve(false)}>
            {s ? 'Approve' : 'Save'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
          {s && (
            <button type="button" className="btn-ghost h-9 px-3 text-xs text-danger" onClick={reject}>
              Reject suggestion
            </button>
          )}
          {aiAvailable ? (
            <button type="button" className="btn-ghost h-9 px-3 text-xs" disabled={aiBusy} onClick={askAi}>
              {aiBusy ? 'AI is reading…' : s || data.suggestion ? '✨ Ask AI again' : '✨ Ask AI for a suggestion'}
            </button>
          ) : (
            <span className="text-xs text-muted">{aiReason}</span>
          )}
          <Link href={`/grading/setup/${data.assignment.id}`} className="ml-auto text-xs underline text-muted hover:text-text">
            Rubric &amp; AI setup
          </Link>
        </div>

        {data.history.length > 1 && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer">History ({data.history.length})</summary>
            <ul className="mt-2 space-y-1">
              {data.history.map((h) => (
                <li key={h.id}>
                  {new Date(h.at).toLocaleString()} — {h.status}
                  {h.marks !== null ? ` · AI ${h.marks}` : ''}
                  {h.finalMarks !== null ? ` · final ${h.finalMarks}${h.edited ? ' (edited)' : ''}` : ''}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
