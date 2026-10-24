// =============================================================================
// FILE: lib/program-hub.ts   (NEW FILE — server only)
// Program pages for members (students & mentors) and admins: access, "my
// programs" with progress, the program hub, and the syllabus.
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import Program from '@/models/Program';
import Session from '@/models/Session';
import Assignment from '@/models/Assignment';
import Syllabus from '@/models/Syllabus';
import User from '@/models/User';
import type { Role } from './constants';
import { computeProgramProgress, type StudentProgress } from './progress';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Viewer = { id: string; role: Role };
const isId = (v: unknown): v is string => typeof v === 'string' && Types.ObjectId.isValid(v);

/** 'manage' = admin or a mentor of the program; 'member' = enrolled student (active program). */
export async function hubAccess(orgId: string, user: Viewer, programId: string): Promise<'manage' | 'member' | null> {
  if (!isId(programId)) return null;
  await db();
  if (user.role === 'admin') return (await Program.exists({ _id: programId, orgId })) ? 'manage' : null;
  if (user.role === 'mentor') return (await Program.exists({ _id: programId, orgId, mentors: user.id })) ? 'manage' : null;
  return (await Program.exists({ _id: programId, orgId, students: user.id, status: 'active' })) ? 'member' : null;
}

export type MyProgramCard = {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  mentorNames: string[];
  studentCount: number;
  progress: StudentProgress | null;
  hasSyllabus: boolean;
};

export async function listMyPrograms(orgId: string, user: Viewer): Promise<MyProgramCard[]> {
  await db();
  const q: Record<string, unknown> = { orgId };
  if (user.role === 'mentor') q.mentors = user.id;
  if (user.role === 'student') {
    q.students = user.id;
    q.status = 'active';
  }
  const programs = (await Program.find(q).sort({ startDate: -1, createdAt: -1 }).limit(100).lean()) as any[];
  if (!programs.length) return [];
  const [mentors, syllabi] = await Promise.all([
    User.find({ _id: { $in: programs.flatMap((p) => p.mentors ?? []) } }).select('name').lean() as Promise<any[]>,
    Syllabus.find({ programId: { $in: programs.map((p) => p._id) } }).select('programId modules').lean() as Promise<any[]>,
  ]);
  const mName = new Map(mentors.map((m) => [String(m._id), m.name as string]));
  const out: MyProgramCard[] = [];
  for (const p of programs) {
    let progress: StudentProgress | null = null;
    if (user.role === 'student') {
      const pp = await computeProgramProgress(orgId, String(p._id), [user.id]);
      progress = pp?.students[0] ?? null;
    }
    out.push({
      id: String(p._id),
      name: p.name,
      description: p.description ?? '',
      status: p.status,
      startDate: p.startDate ? new Date(p.startDate).toISOString() : null,
      endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
      mentorNames: (p.mentors ?? []).map((m: unknown) => mName.get(String(m))).filter(Boolean) as string[],
      studentCount: (p.students ?? []).length,
      progress,
      hasSyllabus: syllabi.some((s) => String(s.programId) === String(p._id) && (s.modules ?? []).length > 0),
    });
  }
  return out;
}

export async function getProgramHub(orgId: string, user: Viewer, programId: string) {
  const access = await hubAccess(orgId, user, programId);
  if (!access) return null;
  const p = (await Program.findOne({ _id: programId, orgId }).lean()) as any;
  if (!p) return null;
  const now = new Date();
  const [mentors, sessions, assignments] = await Promise.all([
    User.find({ _id: { $in: p.mentors ?? [] } }).select('name avatar email').lean() as Promise<any[]>,
    Session.find({ orgId, programId }).select('title startsAt endsAt status mentorId').sort({ startsAt: 1 }).lean() as Promise<any[]>,
    Assignment.find({ orgId, programId }).select('title dueAt maxMarks').sort({ dueAt: 1 }).lean() as Promise<any[]>,
  ]);
  const progress = user.role === 'student' ? (await computeProgramProgress(orgId, programId, [user.id]))?.students[0] ?? null : null;
  return {
    access,
    program: {
      id: String(p._id),
      name: p.name as string,
      description: (p.description as string) ?? '',
      status: p.status as string,
      startDate: p.startDate ? new Date(p.startDate).toISOString() : null,
      endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
      studentCount: (p.students ?? []).length,
    },
    mentors: mentors.map((m) => ({ id: String(m._id), name: m.name as string, avatar: (m.avatar as string) ?? '' })),
    sessions: sessions.map((s) => ({
      id: String(s._id),
      title: s.title as string,
      startsAt: new Date(s.startsAt).toISOString(),
      endsAt: new Date(s.endsAt).toISOString(),
      status: s.status === 'scheduled' && new Date(s.endsAt) < now ? 'completed' : (s.status as string),
    })),
    assignments: assignments.map((a) => ({
      id: String(a._id),
      title: a.title as string,
      dueAt: a.dueAt ? new Date(a.dueAt).toISOString() : null,
      maxMarks: a.maxMarks ?? 100,
    })),
    progress,
  };
}

// ---------------------------------------------------------------------------
// Syllabus
// ---------------------------------------------------------------------------

export type SyllabusModule = {
  id?: string;
  title: string;
  weekLabel: string;
  summary: string;
  topics: string[];
  sessionIds: string[];
  resources: { title: string; url: string }[];
};

export type SyllabusData = {
  overview: string;
  outcomes: string[];
  prerequisites: string[];
  assessment: string;
  modules: SyllabusModule[];
  updatedAt: string | null;
};

export const EMPTY_SYLLABUS: SyllabusData = { overview: '', outcomes: [], prerequisites: [], assessment: '', modules: [], updatedAt: null };

export async function getSyllabus(orgId: string, programId: string): Promise<SyllabusData> {
  if (!isId(programId)) return EMPTY_SYLLABUS;
  await db();
  const s = (await Syllabus.findOne({ orgId, programId }).lean()) as any;
  if (!s) return EMPTY_SYLLABUS;
  return {
    overview: s.overview ?? '',
    outcomes: s.outcomes ?? [],
    prerequisites: s.prerequisites ?? [],
    assessment: s.assessment ?? '',
    modules: (s.modules ?? []).map((m: any) => ({
      id: String(m._id),
      title: m.title,
      weekLabel: m.weekLabel ?? '',
      summary: m.summary ?? '',
      topics: m.topics ?? [],
      sessionIds: (m.sessionIds ?? []).map(String),
      resources: (m.resources ?? []).map((r: any) => ({ title: r.title, url: r.url })),
    })),
    updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
  };
}

const lines = (a: string[], max: number, len: number) => a.map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, max);

export async function saveSyllabus(orgId: string, userId: string, programId: string, data: SyllabusData) {
  await db();
  const validSessions = new Set(
    ((await Session.find({ orgId, programId }).select('_id').lean()) as any[]).map((s) => String(s._id))
  );
  const doc = {
    overview: data.overview.slice(0, 6000),
    outcomes: lines(data.outcomes, 30, 300),
    prerequisites: lines(data.prerequisites, 20, 300),
    assessment: data.assessment.slice(0, 3000),
    modules: data.modules.slice(0, 60).map((m) => ({
      _id: isId(m.id) ? new Types.ObjectId(m.id) : new Types.ObjectId(),
      title: m.title.trim().slice(0, 200) || 'Untitled module',
      weekLabel: m.weekLabel.trim().slice(0, 60),
      summary: m.summary.slice(0, 3000),
      topics: lines(m.topics, 40, 300),
      sessionIds: m.sessionIds.filter((id) => validSessions.has(id)).map((id) => new Types.ObjectId(id)),
      resources: m.resources
        .filter((r) => r.title.trim() && /^https?:\/\/\S+$/i.test(r.url.trim()))
        .slice(0, 20)
        .map((r) => ({ title: r.title.trim().slice(0, 200), url: r.url.trim().slice(0, 500) })),
    })),
    updatedBy: new Types.ObjectId(userId),
  };
  await Syllabus.updateOne({ orgId, programId }, { $set: doc, $setOnInsert: { orgId, programId } }, { upsert: true });
  return { modules: doc.modules.length };
}
