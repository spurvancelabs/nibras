import 'server-only';
import { db } from './db';
import Notification from '@/models/Notification';
import User from '@/models/User';
import type { NotificationType } from '@/lib/constants';
import { sendEmail, sendEmails } from './email';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
};

type LeanRow = {
  _id: unknown;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  readAt: Date | null;
  createdAt: Date;
};

function map(row: LeanRow): NotificationItem {
  return {
    id: String(row._id),
    type: row.type,
    title: row.title,
    body: row.body ?? '',
    link: row.link ?? '',
    readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/** Creates one notification for one user. Optionally emails them. */
export async function notify(input: {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  email?: boolean;
  dedupeKey?: string;
}): Promise<boolean> {
  await db();

  const doc: Record<string, unknown> = {
    orgId: input.orgId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? '',
    link: input.link ?? '',
  };
  if (input.dedupeKey) doc.dedupeKey = input.dedupeKey;

  try {
    await Notification.create(doc);
  } catch (err: unknown) {
    // Unique-index violation means we already sent this — ignore.
    const code = (err as { code?: number })?.code;
    if (code === 11000) return false;
    console.error('[notify] failed', err);
    return false;
  }

  if (input.email) {
    const user = await User.findOne({ _id: input.userId, orgId: input.orgId })
      .select('email')
      .lean();
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: input.title,
        heading: input.title,
        body: input.body ?? '',
        link: input.link,
        ctaLabel: 'Open in LMS',
      });
    }
  }
  return true;
}

/** Bulk version — one DB write per user, emails optional per-user. */
export async function notifyMany(input: {
  orgId: string;
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  email?: boolean;
  dedupeKeyPrefix?: string;
  /** Include all admins in this org automatically. */
  includeAdmins?: boolean;
}): Promise<void> {
  let userIds = input.userIds;

  if (input.includeAdmins) {
    const admins = await User.find({
      orgId: input.orgId,
      role: 'admin',
      status: 'active',
    })
      .select('_id')
      .lean();
    const adminIds = admins.map((a) => String(a._id));
    const merged = new Set([...userIds, ...adminIds]);
    userIds = Array.from(merged);
  }

  if (userIds.length === 0) return;

  // Fire in parallel but bounded — chunk to 20 at a time to be gentle.
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 20) {
    chunks.push(userIds.slice(i, i + 20));
  }

  // In-app notifications first (fast), then ONE batched email send for the
  // users who actually got a new notification (respects dedupe keys and
  // Resend's rate limit — parallel single sends were being rejected).
  const created: string[] = [];
  for (const chunk of chunks) {
    const res = await Promise.all(
      chunk.map((userId) =>
        notify({
          orgId: input.orgId,
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link,
          email: false,
          dedupeKey: input.dedupeKeyPrefix
            ? `${input.dedupeKeyPrefix}:${userId}`
            : undefined,
        }).then((ok) => (ok ? userId : null))
      )
    );
    for (const id of res) if (id) created.push(id);
  }

  if (input.email && created.length) {
    const users = (await User.find({ orgId: input.orgId, _id: { $in: created }, status: 'active' })
      .select('email')
      .lean()) as { email?: string }[];
    const r = await sendEmails(
      users
        .filter((u) => !!u.email)
        .map((u) => ({
          to: u.email as string,
          subject: input.title,
          heading: input.title,
          body: input.body ?? '',
          link: input.link,
          ctaLabel: 'Open in LMS',
        }))
    );
    if (r.failed.length) console.error(`[notifyMany] ${r.failed.length} emails failed`);
  }
}

export async function listRecent(
  orgId: string,
  userId: string,
  limit = 15
): Promise<NotificationItem[]> {
  await db();
  const rows = await Notification.find({ orgId, userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return (rows as unknown as LeanRow[]).map(map);
}

export async function listAll(
  orgId: string,
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number }
): Promise<NotificationItem[]> {
  await db();
  const query: Record<string, unknown> = { orgId, userId };
  if (opts?.unreadOnly) query.readAt = null;

  const rows = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(opts?.limit ?? 100)
    .lean();
  return (rows as unknown as LeanRow[]).map(map);
}

export async function countUnread(
  orgId: string,
  userId: string
): Promise<number> {
  await db();
  return Notification.countDocuments({ orgId, userId, readAt: null });
}

export async function markRead(
  orgId: string,
  userId: string,
  id: string
): Promise<void> {
  await db();
  await Notification.updateOne(
    { _id: id, orgId, userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
}

export async function markAllRead(
  orgId: string,
  userId: string
): Promise<void> {
  await db();
  await Notification.updateMany(
    { orgId, userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
}