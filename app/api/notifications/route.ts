import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { listRecent, countUnread } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [items, unread] = await Promise.all([
    listRecent(user.orgId, user.id, 15),
    countUnread(user.orgId, user.id),
  ]);

  return NextResponse.json({ items, unread });
}