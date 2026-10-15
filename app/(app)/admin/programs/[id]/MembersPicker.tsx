// =============================================================================
// FILE: app/(app)/admin/programs/[id]/MembersPicker.tsx
// Pick mentors / students for a program (client).
// NEW: All / Selected / Not selected tabs, select-all-visible, clear,
//      "Add by email" (paste a list of emails), unsaved-changes indicator,
//      reset, sticky save bar. Save logic unchanged (setMembersAction).
// =============================================================================

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { setMembersAction } from '../actions';
import { Alert, Icons } from '@/components/ui';

type Candidate = { id: string; name: string; email: string; avatar: string };

type Props = {
  programId: string;
  role: 'mentor' | 'student';
  allCandidates: Candidate[];
  initialSelected: string[];
};

type View = 'all' | 'selected' | 'unselected';

export default function MembersPicker({
  programId,
  role,
  allCandidates,
  initialSelected,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('all');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const initialSet = useMemo(() => new Set(initialSelected), [initialSelected]);

  const added = selected.filter((id) => !initialSet.has(id)).length;
  const removed = initialSelected.filter((id) => !selectedSet.has(id)).length;
  const dirty = added > 0 || removed > 0;

  const filtered = allCandidates.filter((c) => {
    const q = search.toLowerCase();
    const matches = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    if (!matches) return false;
    if (view === 'selected') return selectedSet.has(c.id);
    if (view === 'unselected') return !selectedSet.has(c.id);
    return true;
  });

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllVisible() {
    setSelected((prev) => Array.from(new Set([...prev, ...filtered.map((c) => c.id)])));
  }

  function clearVisible() {
    const visible = new Set(filtered.map((c) => c.id));
    setSelected((prev) => prev.filter((id) => !visible.has(id)));
  }

  function addByEmail() {
    const emails = bulkText
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) return;
    const byEmail = new Map(allCandidates.map((c) => [c.email.toLowerCase(), c.id]));
    const found: string[] = [];
    const missing: string[] = [];
    for (const e of emails) {
      const id = byEmail.get(e);
      if (id) found.push(id);
      else missing.push(e);
    }
    setSelected((prev) => Array.from(new Set([...prev, ...found])));
    setBulkText('');
    setBulkOpen(missing.length > 0);
    setMsg(
      missing.length
        ? {
            kind: 'info',
            text: `Selected ${found.length}. Not found as ${role}: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` +${missing.length - 5} more` : ''}`,
          }
        : { kind: 'info', text: `Selected ${found.length} ${role}${found.length === 1 ? '' : 's'} — remember to save.` }
    );
  }

  function save() {
    setMsg(null);
    start(async () => {
      const res = await setMembersAction({
        programId,
        role,
        userIds: selected,
      });
      if (res.ok) {
        setMsg({ kind: 'ok', text: 'Saved.' });
        router.refresh();
      } else {
        setMsg({ kind: 'err', text: res.error });
      }
    });
  }

  const title = role === 'mentor' ? 'Mentors' : 'Students';

  return (
    <section className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-[var(--radius-md)] bg-hero">
            {role === 'mentor' ? Icons.mentor : Icons.student}
          </span>
          <h2 className="font-semibold">{title}</h2>
          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-fg text-[11px] font-semibold tabular-nums">
            {selected.length}
          </span>
        </div>
        {allCandidates.length > 0 && (
          <button
            type="button"
            onClick={() => setBulkOpen((v) => !v)}
            aria-expanded={bulkOpen}
            className="btn-ghost text-xs h-8"
          >
            Add by email
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-3 flex-1">
        {msg && (
          <Alert tone={msg.kind === 'err' ? 'error' : msg.kind === 'ok' ? 'success' : 'info'}>
            {msg.text}
          </Alert>
        )}

        {allCandidates.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">
              No {role}s exist yet. Create one from the Users page first.
            </p>
            <Link href="/admin/users/new" className="btn-outline text-sm mt-3 inline-flex">
              Add {role}
            </Link>
          </div>
        ) : (
          <>
            {bulkOpen && (
              <div className="p-3 rounded-[var(--radius-md)] bg-bg border border-border space-y-2">
                <label className="label" htmlFor={`bulk-${role}`}>
                  Paste emails (comma, space or new line separated)
                </label>
                <textarea
                  id={`bulk-${role}`}
                  className="input min-h-[80px] text-xs font-mono"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`ali@example.com\nsara@example.com`}
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setBulkOpen(false)} className="btn-outline h-9 text-xs">
                    Close
                  </button>
                  <button type="button" onClick={addByEmail} className="btn-primary h-9 text-xs">
                    Select matches
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                className="input pl-9"
                placeholder={`Search ${role}s by name or email…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={`Search ${role}s`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex p-0.5 rounded-[var(--radius-md)] bg-bg border border-border text-xs">
                {(
                  [
                    ['all', `All ${allCandidates.length}`],
                    ['selected', `Selected ${selected.length}`],
                    ['unselected', 'Not selected'],
                  ] as [View, string][]
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className={`h-7 px-2.5 rounded-[calc(var(--radius-md)-2px)] font-medium transition ${
                      view === v ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={selectAllVisible} className="btn-ghost h-7 text-xs px-2">
                  Select all
                </button>
                <button type="button" onClick={clearVisible} className="btn-ghost h-7 text-xs px-2">
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto overscroll-contain border border-border rounded-[var(--radius-md)] divide-y divide-border">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted p-4 text-center">No matches.</p>
              ) : (
                filtered.map((c) => {
                  const on = selectedSet.has(c.id);
                  const changed = on !== initialSet.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition ${
                        on ? 'bg-hero/50' : 'hover:bg-bg'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(c.id)}
                        className="w-4 h-4 shrink-0 accent-[var(--color-primary)]"
                      />
                      <Avatar name={c.name} src={c.avatar} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted truncate">{c.email}</p>
                      </div>
                      {changed && (
                        <span className={`text-[10px] font-semibold uppercase ${on ? 'text-success' : 'text-danger'}`}>
                          {on ? 'adding' : 'removing'}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {allCandidates.length > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-border bg-surface/95 backdrop-blur">
          <p className="text-xs text-muted">
            {dirty ? (
              <>
                <span className="text-warning font-medium">Unsaved</span>
                {added > 0 && <> · +{added}</>}
                {removed > 0 && <> · −{removed}</>}
              </>
            ) : (
              'No changes'
            )}
          </p>
          <div className="flex gap-2">
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setSelected(initialSelected);
                  setMsg(null);
                }}
                className="btn-outline h-9 text-sm"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="btn-primary h-9 text-sm px-4"
            >
              {pending ? 'Saving…' : `Save ${role}s`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}