import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listAll, markAllRead } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function markAllReadAction() {
  'use server';
  const user = await requireAuth();
  await markAllRead(user.orgId, user.id);
  revalidatePath('/notifications');
}

export default async function NotificationsPage() {
  const user = await requireAuth();
  const items = await listAll(user.orgId, user.id, { limit: 100 });
  const unreadCount = items.filter((i) => !i.readAt).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted">
            {items.length} total · {unreadCount} unread
          </p>
        </div>

        {unreadCount > 0 && (
          <form action={markAllReadAction}>
            <button type="submit" className="btn-outline text-sm">
              Mark all read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card text-center text-sm text-muted py-10">
          Nothing here yet.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden divide-y divide-border">
          {items.map((n) => {
            const unread = !n.readAt;
            const inner = (
              <div className="flex gap-3 p-4">
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    unread ? 'bg-primary' : 'bg-transparent'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="text-sm text-muted mt-0.5 whitespace-pre-wrap">
                      {n.body}
                    </p>
                  )}
                  <p className="text-xs text-muted mt-1">{fmt(n.createdAt)}</p>
                </div>
              </div>
            );

            return n.link ? (
              <Link
                key={n.id}
                href={n.link}
                className={`block hover:bg-bg transition ${unread ? '' : 'opacity-75'}`}
              >
                {inner}
              </Link>
            ) : (
              <div key={n.id} className={unread ? '' : 'opacity-75'}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}