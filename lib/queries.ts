import 'server-only';
import { db } from './db';
import Query from '@/models/Query';
import QueryMessage, {
  type MessageAttachment,
} from '@/models/QueryMessage';
import Program from '@/models/Program';
import User from '@/models/User';
import type { QueryStatus } from '@/lib/constants';

export type QueryListItem = {
  id: string;
  subject: string;
  status: QueryStatus;
  programId: string;
  programName: string;
  sessionId: string | null;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  assignedMentorId: string | null;
  assignedMentorName: string | null;
  assignedMentorAvatar: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  /** Last message preview + sender for list view */
  lastMessagePreview: string;
  lastMessageSenderId: string | null;
};

export type QueryMessageItem = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: 'admin' | 'mentor' | 'student';
  body: string;
  attachments: MessageAttachment[];
  createdAt: string;
};

type QueryLean = {
  _id: unknown;
  subject: string;
  status: QueryStatus;
  programId: { _id: unknown; name: string } | null;
  sessionId: unknown;
  studentId: { _id: unknown; name: string; avatar?: string } | null;
  assignedMentorId: { _id: unknown; name: string; avatar?: string } | null;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
};

type MsgLean = {
  _id: unknown;
  senderId: {
    _id: unknown;
    name: string;
    avatar?: string;
    role: 'admin' | 'mentor' | 'student';
  } | null;
  body: string;
  attachments?: MessageAttachment[];
  createdAt: Date;
};

function mapQuery(r: QueryLean, preview?: MsgLean | null): QueryListItem {
  return {
    id: String(r._id),
    subject: r.subject,
    status: r.status,
    programId: r.programId ? String(r.programId._id) : '',
    programName: r.programId?.name ?? 'Unknown',
    sessionId: r.sessionId ? String(r.sessionId) : null,
    studentId: r.studentId ? String(r.studentId._id) : '',
    studentName: r.studentId?.name ?? 'Unknown',
    studentAvatar: r.studentId?.avatar ?? '',
    assignedMentorId: r.assignedMentorId ? String(r.assignedMentorId._id) : null,
    assignedMentorName: r.assignedMentorId?.name ?? null,
    assignedMentorAvatar: r.assignedMentorId?.avatar ?? null,
    messageCount: r.messageCount ?? 0,
    lastMessageAt: new Date(r.lastMessageAt).toISOString(),
    createdAt: new Date(r.createdAt).toISOString(),
    lastMessagePreview: preview?.body
      ? preview.body.length > 90
        ? preview.body.slice(0, 90) + '…'
        : preview.body
      : '',
    lastMessageSenderId: preview?.senderId ? String(preview.senderId._id) : null,
  };
}

async function attachPreviews(rows: QueryLean[]): Promise<QueryListItem[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r._id);

  const previews = await QueryMessage.find({ queryId: { $in: ids } })
    .sort({ createdAt: -1 })
    .populate('senderId', 'name avatar role')
    .lean();

  const latest = new Map<string, MsgLean>();
  for (const m of previews as unknown as MsgLean[]) {
    const key = String((m as unknown as { queryId: unknown }).queryId);
    if (!latest.has(key)) latest.set(key, m);
  }

  return rows.map((r) => mapQuery(r, latest.get(String(r._id)) ?? null));
}

/**
 * Returns query threads visible to a user.
 * - admin: all queries in org
 * - mentor: queries in programs they mentor
 * - student: their own queries
 */
export async function listQueries(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' },
  filters?: { status?: QueryStatus }
): Promise<QueryListItem[]> {
  await db();

  const query: Record<string, unknown> = { orgId };
  if (filters?.status) query.status = filters.status;

  if (user.role === 'student') {
    query.studentId = user.id;
  } else if (user.role === 'mentor') {
    const programs = await Program.find({ orgId, mentors: user.id })
      .select('_id')
      .lean();
    const ids = programs.map((p) => String(p._id));
    if (ids.length === 0) return [];
    query.programId = { $in: ids };
  }

  const rows = await Query.find(query)
    .sort({ lastMessageAt: -1 })
    .limit(200)
    .populate('programId', 'name')
    .populate('studentId', 'name avatar')
    .populate('assignedMentorId', 'name avatar')
    .lean();

  return attachPreviews(rows as unknown as QueryLean[]);
}

export async function getQuery(
  orgId: string,
  id: string
): Promise<QueryListItem | null> {
  await db();
  const row = await Query.findOne({ _id: id, orgId })
    .populate('programId', 'name')
    .populate('studentId', 'name avatar')
    .populate('assignedMentorId', 'name avatar')
    .lean();
  if (!row) return null;
  return mapQuery(row as unknown as QueryLean);
}

export async function listMessages(
  orgId: string,
  queryId: string
): Promise<QueryMessageItem[]> {
  await db();
  const rows = await QueryMessage.find({ orgId, queryId })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name avatar role')
    .lean();

  return (rows as unknown as MsgLean[]).map((r) => ({
    id: String(r._id),
    senderId: r.senderId ? String(r.senderId._id) : '',
    senderName: r.senderId?.name ?? 'Unknown',
    senderAvatar: r.senderId?.avatar ?? '',
    senderRole: r.senderId?.role ?? 'student',
    body: r.body,
    attachments: r.attachments ?? [],
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

/** Can this user view this query thread? */
export async function canViewQuery(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' },
  q: { studentId: string; programId: string }
): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (user.role === 'student') return q.studentId === user.id;
  const p = await Program.findOne({
    _id: q.programId,
    orgId,
    mentors: user.id,
  })
    .select('_id')
    .lean();
  return !!p;
}

export async function createQuery(input: {
  orgId: string;
  programId: string;
  sessionId?: string | null;
  studentId: string;
  subject: string;
  body: string;
  attachments?: MessageAttachment[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await db();

  const program = await Program.findOne({
    _id: input.programId,
    orgId: input.orgId,
    students: input.studentId,
  })
    .select('_id')
    .lean();
  if (!program) return { ok: false, error: 'You are not in this program' };

  const q = await Query.create({
    orgId: input.orgId,
    programId: input.programId,
    sessionId: input.sessionId ?? null,
    studentId: input.studentId,
    subject: input.subject.trim(),
    status: 'open',
    lastMessageAt: new Date(),
    messageCount: 1,
  });

  await QueryMessage.create({
    orgId: input.orgId,
    queryId: q._id,
    senderId: input.studentId,
    body: input.body.trim(),
    attachments: input.attachments ?? [],
  });

  return { ok: true, id: String(q._id) };
}

export async function addReply(input: {
  orgId: string;
  queryId: string;
  senderId: string;
  senderRole: 'admin' | 'mentor' | 'student';
  body: string;
  attachments?: MessageAttachment[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await db();

  const q = await Query.findOne({ _id: input.queryId, orgId: input.orgId })
    .select('status assignedMentorId studentId')
    .lean();
  if (!q) return { ok: false, error: 'Query not found' };
  if (q.status === 'resolved') {
    return { ok: false, error: 'This thread is resolved — reopen it to reply' };
  }

  const msg = await QueryMessage.create({
    orgId: input.orgId,
    queryId: input.queryId,
    senderId: input.senderId,
    body: input.body.trim(),
    attachments: input.attachments ?? [],
  });

  const set: Record<string, unknown> = {
    lastMessageAt: new Date(),
  };

  // Auto-assign mentor on first mentor reply
  if (input.senderRole === 'mentor' && !q.assignedMentorId) {
    set.assignedMentorId = input.senderId;
  }

  await Query.updateOne(
    { _id: input.queryId },
    { $set: set, $inc: { messageCount: 1 } }
  );

  return { ok: true, id: String(msg._id) };
}

export async function setQueryStatus(
  orgId: string,
  id: string,
  status: QueryStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();
  const res = await Query.updateOne({ _id: id, orgId }, { $set: { status } });
  if (res.matchedCount === 0) return { ok: false, error: 'Query not found' };
  return { ok: true };
}

export async function deleteQuery(
  orgId: string,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();
  await Query.deleteOne({ _id: id, orgId });
  await QueryMessage.deleteMany({ orgId, queryId: id });
  return { ok: true };
}

/** For dashboards: queries needing attention. */
export async function listOpenQueries(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' },
  limit = 5
): Promise<QueryListItem[]> {
  const all = await listQueries(orgId, user, { status: 'open' });
  return all.slice(0, limit);
}