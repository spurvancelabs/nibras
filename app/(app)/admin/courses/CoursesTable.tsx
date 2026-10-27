'use client';

// =============================================================================
// FILE: app/(app)/admin/courses/CoursesTable.tsx   (NEW FILE)
// Staff list of courses with status, access, learners and quick actions.
// =============================================================================

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import { useConfirm, useToast } from '@/components/feedback';
import { formatDuration } from '@/lib/courses-core';
import type { ManagedRow } from '@/lib/courses';
import { deleteCourseAction } from './actions';

const STATUS: Record<string, string> = {
  published: 'bg-success/12 text-success',
  draft: 'bg-muted/12 text-muted',
  archived: 'bg-warning/15 text-warning',
};

export default function CoursesTable({ rows, tokenIcon, premiumName }: { rows: ManagedRow[]; tokenIcon: string; premiumName: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const remove = async (r: ManagedRow) => {
    const has = r.enrolledCount > 0;
    if (
      !(await confirm({
        title: has ? `Archive “${r.title}”?` : `Delete “${r.title}”?`,
        body: has ? 'People are enrolled, so it will be archived: hidden from the catalog, but enrolled learners keep access.' : 'This can’t be undone.',
        confirmLabel: has ? 'Archive' : 'Delete',
        tone: 'danger',
      }))
    )
      return;
    start(async () => {
      const res = await deleteCourseAction({ id: r.id });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.archived ? 'Archived' : 'Deleted');
        router.refresh();
      }
    });
  };

  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.id}
      searchText={(r) => `${r.title} ${r.category} ${r.status}`}
      searchPlaceholder="Search courses…"
      initialSort={{ key: 'updated', dir: 'desc' }}
      caption="Courses"
      columns={[
        {
          key: 'title',
          header: 'Course',
          sort: (r) => r.title.toLowerCase(),
          cell: (r) => (
            <div className="min-w-0">
              <Link href={`/admin/courses/${r.id}`} className="font-medium hover:underline">
                {r.title}
              </Link>
              <p className="text-xs text-muted">
                {r.lessonCount} lessons{r.totalDuration ? ` · ${formatDuration(r.totalDuration)}` : ''}
                {r.category ? ` · ${r.category}` : ''}
              </p>
            </div>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          sort: (r) => r.status,
          cell: (r) => <span className={`inline-flex h-6 px-2 items-center rounded-full text-[11px] font-semibold capitalize ${STATUS[r.status] ?? ''}`}>{r.status}</span>,
        },
        {
          key: 'access',
          header: 'Access',
          sort: (r) => r.access,
          cell: (r) => (r.access === 'premium' ? `👑 ${premiumName}` : r.access === 'tokens' ? `${tokenIcon} ${r.tokenPrice}` : 'Free'),
        },
        { key: 'learners', header: 'Learners', numeric: true, sort: (r) => r.enrolledCount, cell: (r) => r.enrolledCount },
        { key: 'done', header: 'Finished', numeric: true, hideOnMobile: true, sort: (r) => r.completedCount, cell: (r) => r.completedCount },
        { key: 'updated', header: 'Updated', hideOnMobile: true, sort: (r) => r.updatedAt, cell: (r) => new Date(r.updatedAt).toLocaleDateString() },
        {
          key: 'actions',
          header: <span className="sr-only">Actions</span>,
          cell: (r) => (
            <div className="flex justify-end gap-1.5">
              {r.status !== 'draft' && (
                <Link href={`/courses/${r.slug}`} className="btn-ghost h-8 px-2.5 text-xs">
                  View
                </Link>
              )}
              <Link href={`/admin/courses/${r.id}`} className="btn-outline h-8 px-2.5 text-xs">
                Edit
              </Link>
              <button type="button" className="btn-ghost h-8 px-2.5 text-xs text-danger" disabled={pending} onClick={() => remove(r)}>
                {r.enrolledCount ? 'Archive' : 'Delete'}
              </button>
            </div>
          ),
        },
      ]}
    />
  );
}
