import 'server-only';
import { db } from './db';
import Session, { type SessionStatus } from '@/models/Session';
import Program from '@/models/Program';
import User from '@/models/User';
import { Types } from 'mongoose';

export type SessionListItem = {
  id: string;
  title: string;
  agenda: string;
  programId: string;
  programName: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar: string;
  startsAt: string;
  endsAt: string;
  meetingUrl: string;
  recordingUrl: string;
  status: SessionStatus;
  createdAt: string;
  access: 'free' | 'premium' | 'tokens';
  tokenPrice: number;
};

export type SessionDetail = SessionListItem & {
  canManage: boolean;
};

type LeanPopulated = {
  _id: unknown;
  title: string;
  agenda?: string;
  programId: { _id: unknown; name: string } | null;
  mentorId: { _id: unknown; name: string; avatar?: string } | null;
  startsAt: Date;
  endsAt: Date;
  meetingUrl?: string;
  recordingUrl?: string;
  status: SessionStatus;
  createdAt: Date;
  access?: 'free' | 'premium' | 'tokens';
  tokenPrice?: number;
};

function effectiveStatus(
  status: SessionStatus,
  startsAt: Date,
  endsAt: Date
): SessionStatus {
  // Respect explicit non-scheduled states
  if (status !== 'scheduled') return status;
  // Past session with no explicit status → completed
  if (endsAt.getTime() < Date.now()) return 'completed';
  return 'scheduled';
}

function mapRow(r: LeanPopulated): SessionListItem {
  return {
    id: String(r._id),
    title: r.title,
    agenda: r.agenda ?? '',
    programId: r.programId ? String(r.programId._id) : '',
    programName: r.programId?.name ?? 'Unknown program',
    mentorId: r.mentorId ? String(r.mentorId._id) : '',
    mentorName: r.mentorId?.name ?? 'Unknown mentor',
    mentorAvatar: r.mentorId?.avatar ?? '',
    startsAt: new Date(r.startsAt).toISOString(),
    endsAt: new Date(r.endsAt).toISOString(),
    meetingUrl: r.meetingUrl ?? '',
    recordingUrl: r.recordingUrl ?? '',
    status: effectiveStatus(
      r.status,
      new Date(r.startsAt),
      new Date(r.endsAt)
    ),
    createdAt: new Date(r.createdAt).toISOString(),
    access: r.access === 'premium' || r.access === 'tokens' ? r.access : 'free',
    tokenPrice: Number(r.tokenPrice ?? 0) || 0,
  };
}

/**
 * Returns sessions visible to the current user.
 * - admin: all sessions in org
 * - mentor: sessions from programs they're enrolled in
 * - student: sessions from programs they're enrolled in
 */
export async function listSessionsForUser(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' }
): Promise<SessionListItem[]> {
  await db();

  let programIds: string[] = [];
  if (user.role === 'student') {
    // Students only see active programs
    const activePrograms = await Program.find({
      orgId,
      status: 'active',
      students: user.id,
    })
      .select('_id')
      .lean();
    const activeIds = activePrograms.map((p) => String(p._id));
    if (activeIds.length === 0) return [];
    programIds = activeIds;
  } else if (user.role === 'mentor') {
    const me = await User.findOne({ _id: user.id, orgId })
      .select('programIds')
      .lean();
    programIds = (me?.programIds ?? []).map(String);
    if (programIds.length === 0) return [];
  }

  const query: Record<string, unknown> = { orgId };
  if (programIds.length > 0) {
    query.programId = { $in: programIds };
  }

  const rows = await Session.find(query)
    .sort({ startsAt: -1 })
    .limit(200)
    .populate('programId', 'name')
    .populate('mentorId', 'name avatar')
    .lean();

  return (rows as unknown as LeanPopulated[]).map(mapRow);
}

export async function listUpcomingForUser(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' },
  limit = 5
): Promise<SessionListItem[]> {
  await db();

  let programIds: string[] = [];
  if (user.role === 'student') {
    // Students only see active programs
    const activePrograms = await Program.find({
      orgId,
      status: 'active',
      students: user.id,
    })
      .select('_id')
      .lean();
    const activeIds = activePrograms.map((p) => String(p._id));
    if (activeIds.length === 0) return [];
    programIds = activeIds;
  } else if (user.role === 'mentor') {
    const me = await User.findOne({ _id: user.id, orgId })
      .select('programIds')
      .lean();
    programIds = (me?.programIds ?? []).map(String);
    if (programIds.length === 0) return [];
  }

  const query: Record<string, unknown> = {
    orgId,
    status: 'scheduled',
    startsAt: { $gte: new Date() },
  };
  if (programIds.length > 0) {
    query.programId = { $in: programIds };
  }

  const rows = await Session.find(query)
    .sort({ startsAt: 1 })
    .limit(limit)
    .populate('programId', 'name')
    .populate('mentorId', 'name avatar')
    .lean();

  return (rows as unknown as LeanPopulated[]).map(mapRow);
}

export async function getSession(
  orgId: string,
  id: string
): Promise<SessionListItem | null> {
  await db();

  const row = await Session.findOne({ _id: id, orgId })
    .populate('programId', 'name')
    .populate('mentorId', 'name avatar')
    .lean();

  if (!row) return null;
  return mapRow(row as unknown as LeanPopulated);
}

/** Checks the user can manage (edit/delete) this session. */
export async function canManageSession(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' },
  sessionMentorId: string,
  programId: string
): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (user.role !== 'mentor') return false;
  if (sessionMentorId === user.id) return true;

  // Any mentor of the program can manage sessions in it
  const program = await Program.findOne({
    _id: programId,
    orgId,
    mentors: user.id,
  })
    .select('_id')
    .lean();

  return !!program;
}

export async function createSession(input: {
  orgId: string;
  programId: string;
  title: string;
  agenda?: string;
  mentorId: string;
  startsAt: string;
  endsAt: string;
  meetingUrl?: string;
  recordingUrl?: string;
  status?: SessionStatus;
  createdBy: string;
  access?: 'free' | 'premium' | 'tokens';
  tokenPrice?: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await db();

  if (!Types.ObjectId.isValid(input.programId)) {
    return { ok: false, error: 'Invalid program' };
  }

  const doc = await Session.create({
    orgId: input.orgId,
    programId: input.programId,
    title: input.title.trim(),
    agenda: input.agenda ?? '',
    mentorId: input.mentorId,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    meetingUrl: input.meetingUrl ?? '',
    recordingUrl: input.recordingUrl ?? '',
    status: input.status ?? 'scheduled',
    createdBy: input.createdBy,
    access: input.access ?? 'free',
    tokenPrice: Math.max(0, Math.round(input.tokenPrice ?? 0)),
  });

  return { ok: true, id: String(doc._id) };
}

export async function updateSession(
  orgId: string,
  id: string,
  patch: {
    title?: string;
    agenda?: string;
    startsAt?: string;
    endsAt?: string;
    meetingUrl?: string;
    recordingUrl?: string;
    status?: SessionStatus;
    access?: 'free' | 'premium' | 'tokens';
    tokenPrice?: number;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();

  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.agenda !== undefined) set.agenda = patch.agenda;
  if (patch.startsAt !== undefined) set.startsAt = new Date(patch.startsAt);
  if (patch.endsAt !== undefined) set.endsAt = new Date(patch.endsAt);
  if (patch.meetingUrl !== undefined) set.meetingUrl = patch.meetingUrl;
  if (patch.recordingUrl !== undefined) set.recordingUrl = patch.recordingUrl;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.access !== undefined) set.access = patch.access;
  if (patch.tokenPrice !== undefined) set.tokenPrice = Math.max(0, Math.round(patch.tokenPrice));

  const res = await Session.updateOne({ _id: id, orgId }, { $set: set });
  if (res.matchedCount === 0) return { ok: false, error: 'Session not found' };
  return { ok: true };
}

export async function deleteSession(
  orgId: string,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();
  await Session.deleteOne({ _id: id, orgId });
  return { ok: true };
}