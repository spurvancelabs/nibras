'use client';

// =============================================================================
// FILE: app/(app)/attendance/LearnerTable.tsx   (NEW FILE)
// Learner list in the attendance hub: search, sort, flag filter.
// =============================================================================

import { useState } from 'react';
import Link from 'next/link';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui';
import type { LearnerAttendance } from '@/lib/attendance-reports';
import { formatDate } from '@/lib/time';

type Filter = 'all' | 'flagged' | 'low' | 'repeated';

export default function LearnerTable({ learners, threshold, streakAlert }: { learners: LearnerAttendance[]; threshold: number; streakAlert: number }) {
  const [filter, setFilter] = useState<Filter>('all');
  const rows = learners.filter((l) => (filter === 'all' ? true : filter === 'low' ? l.low : filter === 'repeated' ? l.repeated : l.low || l.repeated));
  const flagged = learners.filter((l) => l.low || l.repeated).length;

  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.studentId}
      caption="Learner attendance"
      searchText={(r) => `${r.name} ${r.email} ${r.memberId} ${r.programs.join(' ')}`}
      searchPlaceholder="Search learners…"
      empty={filter === 'all' ? 'No learners in these programs yet.' : 'No learners need attention. 🎉'}
      toolbar={
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', `All (${learners.length})`],
              ['flagged', `Need attention (${flagged})`],
              ['low', `Below ${threshold}%`],
              ...(streakAlert > 0 ? [['repeated', `${streakAlert}+ in a row`]] : []),
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${
                filter === id ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      }
      columns={[
        {
          key: 'name',
          header: 'Learner',
          sort: (r) => r.name.toLowerCase(),
          cell: (r) => (
            <Link href={`/attendance/learners/${r.studentId}`} className="block min-w-0 group">
              <span className="block font-medium truncate group-hover:underline">{r.name}</span>
              <span className="block text-xs text-muted truncate">{r.programs.join(', ')}</span>
            </Link>
          ),
        },
        {
          key: 'rate',
          header: 'Rate',
          sort: (r) => r.rate ?? -1,
          cell: (r) =>
            r.rate === null ? (
              <span className="text-muted text-xs">no records</span>
            ) : (
              <span className="flex items-center gap-2 min-w-[7rem]">
                <span className="flex-1 h-1.5 rounded-full bg-hero overflow-hidden">
                  <span className={`block h-full rounded-full ${r.low ? 'bg-danger' : 'bg-success'}`} style={{ width: `${Math.round(r.rate * 100)}%` }} />
                </span>
                <span className="tabular-nums text-xs w-9 text-right">{Math.round(r.rate * 100)}%</span>
              </span>
            ),
        },
        { key: 'present', header: 'Present', numeric: true, hideOnMobile: true, sort: (r) => r.present, cell: (r) => r.present },
        { key: 'late', header: 'Late', numeric: true, hideOnMobile: true, sort: (r) => r.late, cell: (r) => r.late },
        { key: 'absent', header: 'Absent', numeric: true, sort: (r) => r.absent, cell: (r) => r.absent },
        { key: 'excused', header: 'Excused', numeric: true, hideOnMobile: true, sort: (r) => r.excused, cell: (r) => r.excused },
        {
          key: 'flags',
          header: 'Flags',
          sort: (r) => (r.low ? 2 : 0) + (r.repeated ? 1 : 0),
          cell: (r) => (
            <span className="flex flex-wrap gap-1">
              {r.low && <Badge tone="danger">low</Badge>}
              {r.repeated && <Badge tone="warning">{r.streak} in a row</Badge>}
              {!r.low && !r.repeated && <span className="text-xs text-muted">—</span>}
            </span>
          ),
        },
        { key: 'last', header: 'Last attended', hideOnMobile: true, sort: (r) => (r.lastSeen ? new Date(r.lastSeen).getTime() : 0), cell: (r) => <span className="text-xs">{r.lastSeen ? formatDate(r.lastSeen) : '—'}</span> },
      ]}
    />
  );
}
