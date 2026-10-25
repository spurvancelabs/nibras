// =============================================================================
// FILE: lib/search.ts   (NEW FILE — server only)
// Quick search for the command palette (Ctrl/⌘ K). Role-aware: people only
// ever see programs, sessions, assignments, quizzes and users they could open
// anyway. The query is escaped (no regex injection) and results are capped.
// =============================================================================

import 'server-only';
import { db } from './db';
import Program from '@/models/Program';
import Session from '@/models/Session';
import Assignment from '@/models/Assignment';
import Quiz from '@/models/Quiz';
import User from '@/models/User';
import type { Role } from './constants';
import { formatDateTime, formatDate } from './time';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SearchHit = {
  kind: 'program' | 'session' | 'assignment' | 'quiz' | 'user';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function quickSearch(orgId: string, user: { id: string; role: Role }, raw: string): Promise<SearchHit[]> {
  const q = (raw ?? '').trim().slice(0, 60);
  if (q.length < 2) return [];
  await db();
  const rx = new RegExp(escape(q), 'i');

  // Programs this person can see
  const progFilter: Record<string, unknown> = { orgId };
  if (user.role === 'mentor') progFilter.mentors = user.id;
  if (user.role === 'student') {
    progFilter.students = user.id;
    progFilter.status = 'active';
  }
  const myPrograms = (await Program.find(progFilter).select('_id name status').lean()) as any[];
  const pIds = myPrograms.map((p) => p._id);
  const pName = new Map(myPrograms.map((p) => [String(p._id), p.name as string]));

  const [sessions, assignments, quizzes, users] = await Promise.all([
    Session.find({ orgId, programId: { $in: pIds }, title: rx }).select('title startsAt programId').sort({ startsAt: -1 }).limit(5).lean() as Promise<any[]>,
    Assignment.find({ orgId, programId: { $in: pIds }, title: rx }).select('title dueAt programId').sort({ dueAt: -1 }).limit(5).lean() as Promise<any[]>,
    Quiz.find({
      orgId,
      programId: { $in: pIds },
      title: rx,
      ...(user.role === 'student' ? { status: { $in: ['published', 'closed'] } } : {}),
    })
      .select('title programId status')
      .limit(5)
      .lean() as Promise<any[]>,
    user.role === 'admin'
      ? (User.find({ orgId, $or: [{ name: rx }, { email: rx }, { memberId: rx }] }).select('name email role memberId').limit(6).lean() as Promise<any[]>)
      : Promise.resolve([] as any[]),
  ]);

  const hits: SearchHit[] = [];
  for (const p of myPrograms.filter((p) => rx.test(p.name)).slice(0, 5)) {
    hits.push({
      kind: 'program',
      id: String(p._id),
      title: p.name,
      subtitle: `Program · ${p.status}`,
      href: user.role === 'admin' ? `/admin/programs/${p._id}` : `/programs/${p._id}`,
    });
  }
  for (const s of sessions)
    hits.push({ kind: 'session', id: String(s._id), title: s.title, subtitle: `${formatDateTime(s.startsAt)} · ${pName.get(String(s.programId)) ?? ''}`, href: `/sessions/${s._id}` });
  for (const a of assignments)
    hits.push({ kind: 'assignment', id: String(a._id), title: a.title, subtitle: `Due ${formatDate(a.dueAt)} · ${pName.get(String(a.programId)) ?? ''}`, href: `/assignments/${a._id}` });
  for (const z of quizzes)
    hits.push({ kind: 'quiz', id: String(z._id), title: z.title, subtitle: `Quiz · ${pName.get(String(z.programId)) ?? ''}`, href: `/quizzes/${z._id}` });
  for (const u of users)
    hits.push({ kind: 'user', id: String(u._id), title: u.name, subtitle: `${u.role} · ${u.memberId || u.email}`, href: `/admin/users/${u._id}` });
  return hits;
}
