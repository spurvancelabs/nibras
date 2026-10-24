// =============================================================================
// FILE: app/(app)/programs/[id]/syllabus/SyllabusEditor.tsx   (NEW FILE)
// Edit a program's syllabus: overview, outcomes, prerequisites, assessment and
// week-by-week modules (topics, linked sessions, resource links).
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SyllabusData, SyllabusModule } from '@/lib/program-hub';
import { formatDateTimeWeekday } from '@/lib/time';
import { saveSyllabusAction } from '../../actions';
import { Alert, Icons } from '@/components/ui';

type SessionOpt = { id: string; title: string; startsAt: string };

const toLines = (a: string[]) => a.join('\n');
const fromLines = (s: string) => s.split('\n');

const NEW_MODULE = (n: number): SyllabusModule => ({ title: '', weekLabel: `Week ${n}`, summary: '', topics: [], sessionIds: [], resources: [] });

export default function SyllabusEditor({ programId, initial, sessions }: { programId: string; initial: SyllabusData; sessions: SessionOpt[] }) {
  const router = useRouter();
  const [data, setData] = useState<SyllabusData>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  const setM = (i: number, patch: Partial<SyllabusModule>) =>
    setData((d) => ({ ...d, modules: d.modules.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const move = (i: number, dir: -1 | 1) =>
    setData((d) => {
      const a = [...d.modules];
      const j = i + dir;
      if (j < 0 || j >= a.length) return d;
      [a[i], a[j]] = [a[j], a[i]];
      return { ...d, modules: a };
    });

  function save() {
    setMsg(null);
    start(async () => {
      const clean: SyllabusData = {
        ...data,
        outcomes: data.outcomes.map((x) => x.trim()).filter(Boolean),
        prerequisites: data.prerequisites.map((x) => x.trim()).filter(Boolean),
        modules: data.modules.map((m) => ({ ...m, topics: m.topics.map((x) => x.trim()).filter(Boolean) })),
      };
      const res = await saveSyllabusAction({ programId, data: clean });
      if (res.ok) {
        setMsg({ tone: 'success', text: 'Syllabus saved.' });
        router.refresh();
      } else setMsg({ tone: 'error', text: res.error });
    });
  }

  function autoFillFromSessions() {
    if (!sessions.length) return;
    if (data.modules.length && !confirm('Add one module per session after the existing modules?')) return;
    setData((d) => ({
      ...d,
      modules: [
        ...d.modules,
        ...sessions.map((s, k) => ({ ...NEW_MODULE(d.modules.length + k + 1), title: s.title, weekLabel: formatDateTimeWeekday(s.startsAt), sessionIds: [s.id] })),
      ],
    }));
  }

  return (
    <div className="space-y-6">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold">About this program</h2>
        <div>
          <label className="label">Overview</label>
          <textarea className="input min-h-[110px]" maxLength={6000} value={data.overview} onChange={(e) => setData({ ...data, overview: e.target.value })} placeholder="What the program covers and who it is for." />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Learning outcomes (one per line)</label>
            <textarea className="input min-h-[120px]" value={toLines(data.outcomes)} onChange={(e) => setData({ ...data, outcomes: fromLines(e.target.value).slice(0, 30) })} placeholder={'Explain what cybersecurity is\nSpot phishing messages'} />
          </div>
          <div>
            <label className="label">Before you start (one per line)</label>
            <textarea className="input min-h-[120px]" value={toLines(data.prerequisites)} onChange={(e) => setData({ ...data, prerequisites: fromLines(e.target.value).slice(0, 20) })} placeholder={'No experience needed\nA phone or laptop'} />
          </div>
        </div>
        <div>
          <label className="label">How students are assessed</label>
          <textarea className="input min-h-[80px]" maxLength={3000} value={data.assessment} onChange={(e) => setData({ ...data, assessment: e.target.value })} placeholder="Weekly assignments (40%), quizzes (40%), attendance (20%)." />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Modules ({data.modules.length})</h2>
          <div className="flex gap-2">
            {sessions.length > 0 && (
              <button type="button" className="btn-outline h-9 text-sm" onClick={autoFillFromSessions}>
                Create from sessions
              </button>
            )}
            <button type="button" className="btn-outline h-9 text-sm" onClick={() => setData((d) => ({ ...d, modules: [...d.modules, NEW_MODULE(d.modules.length + 1)] }))}>
              {Icons.plus} Add module
            </button>
          </div>
        </div>

        {data.modules.map((m, i) => (
          <article key={m.id ?? `new-${i}`} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-border bg-bg">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-primary text-primary-fg text-xs font-semibold">{i + 1}</span>
              <input className="input h-9 flex-1 min-w-[160px]" maxLength={200} value={m.title} onChange={(e) => setM(i, { title: e.target.value })} placeholder="Module title" aria-label="Module title" />
              <input className="input h-9 w-40" maxLength={60} value={m.weekLabel} onChange={(e) => setM(i, { weekLabel: e.target.value })} placeholder="Week 1" aria-label="Week label" />
              <span className="flex gap-1">
                <button type="button" className="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] border border-border text-muted disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button type="button" className="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] border border-border text-muted disabled:opacity-30" disabled={i === data.modules.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                <button type="button" className="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] border border-border text-danger" onClick={() => confirm('Delete this module?') && setData((d) => ({ ...d, modules: d.modules.filter((_, j) => j !== i) }))} aria-label="Delete module">✕</button>
              </span>
            </header>
            <div className="p-4 sm:p-5 grid lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="label">Summary</label>
                  <textarea className="input min-h-[80px]" maxLength={3000} value={m.summary} onChange={(e) => setM(i, { summary: e.target.value })} />
                </div>
                <div>
                  <label className="label">Topics (one per line)</label>
                  <textarea className="input min-h-[90px]" value={toLines(m.topics)} onChange={(e) => setM(i, { topics: fromLines(e.target.value).slice(0, 40) })} />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">Linked sessions</label>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-muted">No sessions in this program yet.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border border-border rounded-[var(--radius-md)] divide-y divide-border">
                      {sessions.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-hero/40">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-[var(--color-primary)]"
                            checked={m.sessionIds.includes(s.id)}
                            onChange={(e) => setM(i, { sessionIds: e.target.checked ? [...m.sessionIds, s.id] : m.sessionIds.filter((x) => x !== s.id) })}
                          />
                          <span className="truncate">{s.title}</span>
                          <span className="ml-auto text-[11px] text-muted shrink-0">{formatDateTimeWeekday(s.startsAt)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Resources</label>
                  <div className="space-y-2">
                    {m.resources.map((r, k) => (
                      <div key={k} className="flex gap-2">
                        <input className="input h-9 text-sm" placeholder="Title" value={r.title} maxLength={200} onChange={(e) => setM(i, { resources: m.resources.map((x, j) => (j === k ? { ...x, title: e.target.value } : x)) })} />
                        <input className="input h-9 text-sm" placeholder="https://…" value={r.url} maxLength={500} onChange={(e) => setM(i, { resources: m.resources.map((x, j) => (j === k ? { ...x, url: e.target.value } : x)) })} />
                        <button type="button" className="grid place-items-center w-9 h-9 shrink-0 rounded-[var(--radius-md)] border border-border text-danger" onClick={() => setM(i, { resources: m.resources.filter((_, j) => j !== k) })} aria-label="Remove resource">✕</button>
                      </div>
                    ))}
                    {m.resources.length < 20 && (
                      <button type="button" className="btn-ghost h-8 text-xs" onClick={() => setM(i, { resources: [...m.resources, { title: '', url: '' }] })}>
                        {Icons.plus} Add link
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="sticky bottom-0 z-10 flex justify-end gap-2 py-3 bg-bg/90 backdrop-blur">
        <button type="button" className="btn-outline h-10" onClick={() => router.push(`/programs/${programId}`)}>View program</button>
        <button type="button" className="btn-primary h-10 px-6" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save syllabus'}</button>
      </div>
    </div>
  );
}
