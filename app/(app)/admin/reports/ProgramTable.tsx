'use client';

// =============================================================================
// FILE: app/(app)/admin/reports/ProgramTable.tsx   (NEW FILE)
// Program summary table (search + sort).
// =============================================================================

import Link from 'next/link';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui';
import type { ProgramRow } from '@/lib/reports';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

export default function ProgramTable({ rows }: { rows: ProgramRow[] }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.id}
      caption="Program summaries"
      searchText={(r) => r.name}
      searchPlaceholder="Search programs…"
      empty="No programs yet."
      pageSize={15}
      columns={[
        {
          key: 'name',
          header: 'Program',
          sort: (r) => r.name.toLowerCase(),
          cell: (r) => (
            <Link href={`/admin/programs/${r.id}`} className="font-medium hover:underline">
              {r.name}
            </Link>
          ),
        },
        { key: 'status', header: 'Status', hideOnMobile: true, cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'muted'} dot>{r.status}</Badge> },
        { key: 'learners', header: 'Learners', numeric: true, sort: (r) => r.learners, cell: (r) => r.learners },
        { key: 'sessions', header: 'Sessions', numeric: true, hideOnMobile: true, sort: (r) => r.sessionsHeld, cell: (r) => r.sessionsHeld },
        { key: 'att', header: 'Attendance', numeric: true, sort: (r) => r.attendanceRate ?? -1, cell: (r) => pct(r.attendanceRate) },
        { key: 'grade', header: 'Avg grade', numeric: true, sort: (r) => r.avgGrade ?? -1, cell: (r) => (r.avgGrade === null ? '—' : `${r.avgGrade}%`) },
        { key: 'ungraded', header: 'Ungraded', numeric: true, sort: (r) => r.ungraded, cell: (r) => (r.ungraded ? <span className="text-warning font-medium">{r.ungraded}</span> : 0) },
      ]}
    />
  );
}
