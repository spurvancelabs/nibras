'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { setMembersAction } from '../actions';

type Candidate = { id: string; name: string; email: string; avatar: string };

type Props = {
  programId: string;
  role: 'mentor' | 'student';
  allCandidates: Candidate[];
  initialSelected: string[];
};

export default function MembersPicker({
  programId,
  role,
  allCandidates,
  initialSelected,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  const filtered = allCandidates.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function save() {
    setMsg('');
    start(async () => {
      const res = await setMembersAction({
        programId,
        role,
        userIds: selected,
      });
      if (res.ok) {
        setMsg('Saved.');
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold capitalize">{role}s</h2>
        <span className="text-xs text-muted">{selected.length} selected</span>
      </div>

      {msg && <p className="text-sm text-muted">{msg}</p>}

      {allCandidates.length === 0 ? (
        <p className="text-sm text-muted">
          No {role}s exist yet. Create one from the Users page first.
        </p>
      ) : (
        <>
          <input
            className="input"
            placeholder={`Search ${role}s…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-72 overflow-y-auto border border-border rounded-md divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted p-4">No matches.</p>
            ) : (
              filtered.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-bg"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <Avatar name={c.name} src={c.avatar} size={28} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted truncate">{c.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="btn-primary"
            >
              {pending ? 'Saving…' : `Save ${role}s`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}