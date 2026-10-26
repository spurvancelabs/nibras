'use client';

// =============================================================================
// FILE: app/(app)/grading/QueueTable.tsx   (NEW FILE)
// Grading queue table with batch "Ask AI" (processed one by one with a
// progress bar — you can keep working meanwhile) and status badges that
// separate AI suggestions from mentor-approved grades.
// =============================================================================

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui';
import { useToast } from '@/components/feedback';
import { formatDateTime, formatRelative } from '@/lib/time';
import type { QueueRow } from '@/lib/grading';
import { requestAiAction, processNextAction } from './actions';

function AiBadge({ r }: { r: QueueRow }) {
  if (r.graded) return r.aiApproved ? <Badge tone="success">✓ approved · AI-assisted</Badge> : <Badge tone="success">✓ graded</Badge>;
  if (!r.ai) return <span className="text-xs text-muted">—</span>;
  const attention = r.ai.flags.length > 0 || (r.ai.confidence ?? 1) < 0.5;
  switch (r.ai.status) {
    case 'queued':
    case 'processing':
      return <Badge tone="muted">AI working…</Badge>;
    case 'ready':
      return (
        <Badge tone={attention ? 'warning' : 'primary'}>
          AI {r.ai.marks}/{r.maxMarks}
          {attention ? ' · check' : ''}
        </Badge>
      );
    case 'failed':
      return <Badge tone="danger">AI failed</Badge>;
    case 'rejected':
      return <Badge tone="muted">AI rejected</Badge>;
    default:
      return null;
  }
}

export default function QueueTable({ rows, aiAvailable, assignmentId, show }: { rows: QueueRow[]; aiAvailable: boolean; assignmentId?: string; show: string }) {
  const router = useRouter();
  const toast = useToast();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const stop = useRef(false);

  async function askAi(ids: string[], clear: () => void) {
    const r = await requestAiAction({ submissionIds: ids });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    clear();
    stop.current = false;
    const total = r.queued;
    setProgress({ done: 0, total });
    let done = 0;
    let failures = 0;
    for (let i = 0; i < total + 3 && !stop.current; i++) {
      const res = await processNextAction({ assignmentId });
      if (!res.ok) {
        toast.error(res.error);
        break;
      }
      if (!res.processed) break;
      if (res.status === 'failed') failures++;
      if (res.status !== 'queued') done++;
      setProgress({ done: Math.min(done, total), total });
      if (res.remaining === 0) break;
    }
    setProgress(null);
    toast.success(`AI suggestions ready: ${done - failures}${failures ? ` · ${failures} failed` : ''}. Review them before they count.`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {progress && (
        <div role="status" className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border border-primary/40 bg-primary/5 text-sm">
          <span className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0" aria-hidden />
          <span className="flex-1">
            AI is reading submissions… {progress.done}/{progress.total}
            <span className="block mt-1.5 h-1.5 rounded-full bg-hero overflow-hidden">
              <span className="block h-full bg-primary transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </span>
          </span>
          <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => (stop.current = true)}>
            Stop
          </button>
        </div>
      )}
      <DataTable
        rows={rows}
        rowKey={(r) => r.submissionId}
        caption="Submissions to grade"
        searchText={(r) => `${r.studentName} ${r.assignmentTitle} ${r.programName}`}
        searchPlaceholder="Search learner or assignment…"
        empty={show === 'todo' ? 'All caught up — nothing waiting for a grade. 🎉' : 'No submissions here.'}
        bulkActions={
          aiAvailable && show !== 'graded'
            ? (ids, clear) => (
                <button type="button" className="btn-primary h-8 px-3 text-xs" disabled={!!progress} onClick={() => askAi(ids.filter((id) => !rows.find((r) => r.submissionId === id)?.graded), clear)}>
                  ✨ Ask AI for {ids.length} suggestion{ids.length === 1 ? '' : 's'}
                </button>
              )
            : undefined
        }
        columns={[
          {
            key: 'student',
            header: 'Learner',
            sort: (r) => r.studentName.toLowerCase(),
            cell: (r) => (
              <Link href={`/grading/review/${r.submissionId}`} className="block min-w-0 group">
                <span className="block font-medium truncate group-hover:underline">{r.studentName}</span>
                <span className="block text-xs text-muted truncate">
                  {r.assignmentTitle} · {r.programName}
                </span>
              </Link>
            ),
          },
          {
            key: 'submitted',
            header: 'Submitted',
            sort: (r) => new Date(r.submittedAt).getTime(),
            cell: (r) => (
              <span className="text-xs" title={formatDateTime(r.submittedAt)}>
                {formatRelative(r.submittedAt)}
                {r.late && <Badge tone="warning" className="ml-1.5">late</Badge>}
              </span>
            ),
          },
          { key: 'ai', header: 'Status', cell: (r) => <AiBadge r={r} /> },
          { key: 'marks', header: 'Marks', numeric: true, hideOnMobile: true, sort: (r) => r.marks ?? -1, cell: (r) => (r.graded ? `${r.marks}/${r.maxMarks}` : '—') },
          {
            key: 'go',
            header: '',
            cell: (r) => (
              <Link href={`/grading/review/${r.submissionId}`} className="btn-outline h-8 px-3 text-xs">
                {r.graded ? 'Open' : r.ai?.status === 'ready' ? 'Review' : 'Grade'}
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
