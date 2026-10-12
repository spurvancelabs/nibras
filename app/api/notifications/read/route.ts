import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { markRead, markAllRead } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string; all?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // empty body = mark all? No — require explicit flag.
  }

  if (body.all) {
    await markAllRead(user.orgId, user.id);
  } else if (body.id) {
    await markRead(user.orgId, user.id, body.id);
  } else {
    return NextResponse.json({ error: 'id or all required' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}