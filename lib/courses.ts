// =============================================================================
// FILE: lib/courses.ts   (NEW FILE — server only)
// Pre-recorded video courses: catalog, enrolment (free / Premium / tokens),
// lesson access, progress and rewards, plus the editor for staff.
//
// Access (all checked here, on the server)
//   - learners only see PUBLISHED courses for everyone or for their programs
//   - lesson videos, explanations and resources are only sent to people who
//     are enrolled, to staff who manage the course, or for "preview" lessons
//   - premium courses need Premium; token courses are paid once
//     (Premium members get token courses free)
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { db } from './db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import Program from '@/models/Program';
import TokenTransaction from '@/models/TokenTransaction';
import { getSettings } from './settings';
import { policyFrom } from './premium';
import { hasPremiumAccess } from './entitlements';
import { hasPermission, type SessionUser } from './auth-helpers';
import { spend, refund, reward } from './tokens';
import { auditBy } from './audit';
import { notify, notifyMany } from './notifications';
import { parseVideo, progressPercent, slugify } from './courses-core';
import { isHttpUrl } from './upload-policy';

const oid = (id: string) => new Types.ObjectId(id);
const isId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

export type Access = 'free' | 'premium' | 'tokens';
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'all';

export type LessonInput = {
  id: string;
  title: string;
  type: 'video' | 'article';
  videoUrl: string;
  duration: number;
  body: string;
  resources: { title: string; url: string; format: string; size: number }[];
  preview: boolean;
};
export type SectionInput = { id: string; title: string; lessons: LessonInput[] };
export type CourseInput = {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  cover: string;
  level: Level;
  category: string;
  status: 'draft' | 'published' | 'archived';
  access: Access;
  tokenPrice: number;
  programIds: string[];
  instructorIds: string[];
  sections: SectionInput[];
};

export type CourseCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  cover: string;
  level: Level;
  category: string;
  access: Access;
  tokenPrice: number;
  lessonCount: number;
  totalDuration: number;
  enrolledCount: number;
  status: string;
  progress: number | null;
  completed: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

function card(c: Raw, enr?: { completedLessons?: string[]; completedAt?: Date | null } | null): CourseCard {
  return {
    id: String(c._id),
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle ?? '',
    cover: c.cover ?? '',
    level: c.level ?? 'all',
    category: c.category ?? '',
    access: c.access ?? 'free',
    tokenPrice: c.tokenPrice ?? 0,
    lessonCount: c.lessonCount ?? 0,
    totalDuration: c.totalDuration ?? 0,
    enrolledCount: c.enrolledCount ?? 0,
    status: c.status,
    progress: enr ? progressPercent(enr.completedLessons?.length ?? 0, c.lessonCount ?? 0) : null,
    completed: !!enr?.completedAt,
  };
}

async function userProgramIds(user: SessionUser): Promise<string[]> {
  const u = (await User.findOne({ _id: oid(user.id), orgId: oid(user.orgId) }).select('programIds').lean()) as { programIds?: unknown[] } | null;
  return (u?.programIds ?? []).map(String);
}

async function audienceFilter(user: SessionUser): Promise<Record<string, unknown>> {
  if (user.role === 'admin') return {};
  const progs = await userProgramIds(user);
  return { $or: [{ programIds: { $size: 0 } }, { programIds: { $in: progs.map(oid) } }] };
}

export async function canManage(user: SessionUser, c?: { createdBy?: unknown; instructorIds?: unknown[] } | null): Promise<boolean> {
  if (user.role === 'student') return false;
  if (!(await hasPermission(user, 'courses.manage'))) return false;
  if (!c || user.role === 'admin') return true;
  return String(c.createdBy) === user.id || (c.instructorIds ?? []).map(String).includes(user.id);
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function catalog(user: SessionUser, opts: { q?: string; level?: string; access?: string } = {}): Promise<{ courses: CourseCard[]; mine: CourseCard[]; categories: string[] }> {
  await db();
  const q: Record<string, unknown> = { orgId: oid(user.orgId), status: 'published', ...(await audienceFilter(user)) };
  if (opts.level && ['beginner', 'intermediate', 'advanced', 'all'].includes(opts.level)) q.level = opts.level;
  if (opts.access && ['free', 'premium', 'tokens'].includes(opts.access)) q.access = opts.access;
  const term = (opts.q ?? '').trim().slice(0, 80);
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$and = [{ $or: [{ title: rx }, { subtitle: rx }, { category: rx }] }];
  }
  const rows = (await Course.find(q).select('-sections -description').sort({ publishedAt: -1 }).limit(300).lean()) as Raw[];
  const enr = (await Enrollment.find({ orgId: oid(user.orgId), userId: oid(user.id) }).select('courseId completedLessons completedAt lastSeenAt').sort({ lastSeenAt: -1 }).lean()) as Raw[];
  const byCourse = new Map(enr.map((e) => [String(e.courseId), e]));
  const courses = rows.map((c) => card(c, byCourse.get(String(c._id))));
  const mineIds = enr.map((e) => String(e.courseId));
  const mineRows = mineIds.length ? ((await Course.find({ _id: { $in: mineIds.map(oid) }, orgId: oid(user.orgId), status: { $ne: 'draft' } }).select('-sections -description').lean()) as Raw[]) : [];
  const order = new Map(mineIds.map((id, i) => [id, i]));
  const mine = mineRows.map((c) => card(c, byCourse.get(String(c._id)))).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const categories = [...new Set(rows.map((c) => c.category).filter(Boolean))].sort() as string[];
  return { courses, mine, categories };
}

// ---------------------------------------------------------------------------
// Course page
// ---------------------------------------------------------------------------

export type Gate = { enrolled: boolean; canEnroll: boolean; reason: 'premium' | 'tokens' | null; price: number; premiumFree: boolean };

export type CoursePage = {
  course: CourseCard & { description: string; instructors: { id: string; name: string; avatar: string }[]; updatedAt: string };
  curriculum: { id: string; title: string; lessons: { id: string; title: string; type: string; duration: number; preview: boolean; done: boolean }[] }[];
  gate: Gate;
  manage: boolean;
  progress: { done: number; total: number; lastLessonId: string };
};

async function loadVisible(user: SessionUser, slugOrId: string): Promise<Raw | null> {
  await db();
  const raw = String(slugOrId);
  const key = Types.ObjectId.isValid(raw) && /^[a-f0-9]{24}$/i.test(raw) ? { _id: oid(raw) } : { slug: raw.slice(0, 90) };
  const c = (await Course.findOne({ orgId: oid(user.orgId), ...key }).lean()) as Raw | null;
  if (!c) return null;
  if (await canManage(user, c)) return c;
  if (c.status !== 'published' && !(c.status === 'archived' && (await Enrollment.exists({ courseId: c._id, userId: oid(user.id) })))) return null;
  if (user.role !== 'admin' && (c.programIds ?? []).length) {
    const mine = await userProgramIds(user);
    const ok = (c.programIds as unknown[]).map(String).some((p) => mine.includes(p));
    if (!ok && !(await Enrollment.exists({ courseId: c._id, userId: oid(user.id) }))) return null;
  }
  return c;
}

async function gateFor(user: SessionUser, c: Raw, enrolled: boolean): Promise<Gate> {
  const s = await getSettings();
  const premium = s.premiumEnabled && hasPremiumAccess(user, policyFrom(s));
  if (enrolled) return { enrolled, canEnroll: false, reason: null, price: 0, premiumFree: false };
  if (c.access === 'premium' && s.premiumEnabled && !premium) return { enrolled, canEnroll: false, reason: 'premium', price: 0, premiumFree: false };
  if (c.access === 'tokens' && s.tokensEnabled && (c.tokenPrice ?? 0) > 0 && !premium) return { enrolled, canEnroll: true, reason: 'tokens', price: c.tokenPrice, premiumFree: false };
  return { enrolled, canEnroll: true, reason: null, price: 0, premiumFree: c.access !== 'free' && premium };
}

export async function coursePage(user: SessionUser, slug: string): Promise<CoursePage | null> {
  const c = await loadVisible(user, slug);
  if (!c) return null;
  const enr = (await Enrollment.findOne({ courseId: c._id, userId: oid(user.id) }).lean()) as Raw | null;
  const done = new Set<string>(enr?.completedLessons ?? []);
  const instructors = (await User.find({ _id: { $in: c.instructorIds ?? [] } }).select('name avatar').lean()) as Raw[];
  return {
    course: { ...card(c, enr), description: c.description ?? '', instructors: instructors.map((i) => ({ id: String(i._id), name: i.name, avatar: i.avatar ?? '' })), updatedAt: new Date(c.updatedAt).toISOString() },
    curriculum: (c.sections ?? []).map((s: Raw) => ({
      id: s.id,
      title: s.title,
      lessons: (s.lessons ?? []).map((l: Raw) => ({ id: l.id, title: l.title, type: l.type, duration: l.duration ?? 0, preview: !!l.preview, done: done.has(l.id) })),
    })),
    gate: await gateFor(user, c, !!enr),
    manage: await canManage(user, c),
    progress: { done: done.size, total: c.lessonCount ?? 0, lastLessonId: enr?.lastLessonId ?? '' },
  };
}

export async function enroll(user: SessionUser, courseId: string): Promise<{ ok: true; slug: string; firstLesson: string } | { ok: false; error: string }> {
  const c = await loadVisible(user, courseId);
  if (!c || c.status !== 'published') return { ok: false, error: 'This course is not available.' };
  const existing = await Enrollment.exists({ courseId: c._id, userId: oid(user.id) });
  const first = c.sections?.[0]?.lessons?.[0]?.id ?? '';
  if (existing) return { ok: true, slug: c.slug, firstLesson: first };
  const gate = await gateFor(user, c, false);
  if (!gate.canEnroll) return { ok: false, error: 'This course is for Premium members.' };
  let paid = 0;
  if (gate.reason === 'tokens') {
    // Recovery: paid earlier but the enrolment was never written (crash) →
    // enrol without charging again. A refunded attempt gets a fresh key.
    const cid = String(c._id);
    const [spends, refunds] = await Promise.all([
      TokenTransaction.countDocuments({ userId: oid(user.id), kind: 'spend', refType: 'course', refId: cid }),
      TokenTransaction.countDocuments({ userId: oid(user.id), kind: 'refund', refType: 'course', refId: cid }),
    ]);
    if (spends > refunds) {
      paid = 0;
    } else {
      const r = await spend(user, gate.price, { reason: `Course: ${c.title}`, refType: 'course', refId: cid, key: `course:${cid}${refunds ? `:${refunds}` : ''}` });
      if (!r.ok) return r;
      paid = gate.price;
    }
  }
  try {
    await Enrollment.create({ orgId: oid(user.orgId), courseId: c._id, userId: oid(user.id), via: gate.reason === 'tokens' ? 'tokens' : gate.premiumFree ? 'premium' : 'free', tokens: paid, lastSeenAt: new Date() });
    await Course.updateOne({ _id: c._id }, { $inc: { enrolledCount: 1 } });
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) {
      if (paid) await refund(user, paid, `Refund: ${c.title}`, 'course', String(c._id));
      return { ok: false, error: 'Could not enrol right now.' };
    }
  }
  await auditBy(user, 'course.enrolled', `${c.title}${paid ? ` (${paid} tokens)` : ''}`, [user.id], { courseId: String(c._id) });
  return { ok: true, slug: c.slug, firstLesson: first };
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export type LessonPage = {
  course: { id: string; slug: string; title: string };
  lesson: LessonInput & { sectionTitle: string };
  nav: { prev: { id: string; title: string } | null; next: { id: string; title: string } | null };
  curriculum: CoursePage['curriculum'];
  progress: { done: number; total: number; percent: number; completed: boolean };
  enrolled: boolean;
  manage: boolean;
};

export async function lessonPage(user: SessionUser, slug: string, lessonId: string): Promise<LessonPage | 'locked' | null> {
  const c = await loadVisible(user, slug);
  if (!c) return null;
  const flat: { s: Raw; l: Raw }[] = [];
  for (const s of c.sections ?? []) for (const l of s.lessons ?? []) flat.push({ s, l });
  const idx = flat.findIndex((x) => x.l.id === lessonId);
  if (idx < 0) return null;
  const { s, l } = flat[idx];
  const enr = (await Enrollment.findOne({ courseId: c._id, userId: oid(user.id) }).lean()) as Raw | null;
  const manage = await canManage(user, c);
  if (!enr && !manage && !l.preview) return 'locked';
  if (enr) await Enrollment.updateOne({ _id: enr._id }, { $set: { lastLessonId: l.id, lastSeenAt: new Date() } });
  const done = new Set<string>(enr?.completedLessons ?? []);
  return {
    course: { id: String(c._id), slug: c.slug, title: c.title },
    lesson: { id: l.id, title: l.title, type: l.type, videoUrl: l.videoUrl ?? '', duration: l.duration ?? 0, body: l.body ?? '', resources: l.resources ?? [], preview: !!l.preview, sectionTitle: s.title },
    nav: {
      prev: idx > 0 ? { id: flat[idx - 1].l.id, title: flat[idx - 1].l.title } : null,
      next: idx < flat.length - 1 ? { id: flat[idx + 1].l.id, title: flat[idx + 1].l.title } : null,
    },
    curriculum: (c.sections ?? []).map((sec: Raw) => ({
      id: sec.id,
      title: sec.title,
      lessons: (sec.lessons ?? []).map((x: Raw) => ({ id: x.id, title: x.title, type: x.type, duration: x.duration ?? 0, preview: !!x.preview, done: done.has(x.id) })),
    })),
    progress: { done: done.size, total: flat.length, percent: progressPercent(done.size, flat.length), completed: !!enr?.completedAt },
    enrolled: !!enr,
    manage,
  };
}

export async function completeLesson(user: SessionUser, courseId: string, lessonId: string): Promise<{ ok: true; percent: number; completedCourse: boolean } | { ok: false; error: string }> {
  if (!isId(courseId)) return { ok: false, error: 'Not found' };
  await db();
  const c = (await Course.findOne({ _id: oid(courseId), orgId: oid(user.orgId) }).select('title slug sections lessonCount').lean()) as Raw | null;
  if (!c) return { ok: false, error: 'Not found' };
  const ids = (c.sections ?? []).flatMap((s: Raw) => (s.lessons ?? []).map((l: Raw) => l.id as string));
  if (!ids.includes(lessonId)) return { ok: false, error: 'Not found' };
  const enr = (await Enrollment.findOneAndUpdate({ courseId: c._id, userId: oid(user.id) }, { $addToSet: { completedLessons: lessonId }, $set: { lastSeenAt: new Date() } }, { new: true }).lean()) as Raw | null;
  if (!enr) return { ok: false, error: 'Enrol in the course first.' };
  await reward(user.orgId, user.id, 'lessonComplete', `${courseId}:${lessonId}`, `Lesson done: ${c.title}`);
  const doneCount = (enr.completedLessons as string[]).filter((x) => ids.includes(x)).length;
  let completedCourse = false;
  if (doneCount >= ids.length && !enr.completedAt) {
    const r = await Enrollment.updateOne({ _id: enr._id, completedAt: null }, { $set: { completedAt: new Date() } });
    if (r.modifiedCount) {
      completedCourse = true;
      await reward(user.orgId, user.id, 'courseComplete', courseId, `Finished “${c.title}”`);
      await notify({ orgId: user.orgId, userId: user.id, type: 'achievement.earned', title: `You finished “${c.title}” 🎉`, body: 'Great work — keep going!', link: `/courses/${c.slug}` });
    }
  }
  return { ok: true, percent: progressPercent(doneCount, ids.length), completedCourse };
}

// ---------------------------------------------------------------------------
// Editor (staff)
// ---------------------------------------------------------------------------

export type ManagedRow = CourseCard & { updatedAt: string; completedCount: number };

export async function managedCourses(user: SessionUser): Promise<ManagedRow[]> {
  await db();
  const q: Record<string, unknown> = { orgId: oid(user.orgId) };
  if (user.role !== 'admin') q.$or = [{ createdBy: oid(user.id) }, { instructorIds: oid(user.id) }];
  const rows = (await Course.find(q).select('-sections -description').sort({ updatedAt: -1 }).limit(500).lean()) as Raw[];
  const done = (await Enrollment.find({ courseId: { $in: rows.map((r) => r._id) }, completedAt: { $ne: null } }).select('courseId').lean()) as Raw[];
  const dc = new Map<string, number>();
  for (const d of done) dc.set(String(d.courseId), (dc.get(String(d.courseId)) ?? 0) + 1);
  return rows.map((r) => ({ ...card(r), updatedAt: new Date(r.updatedAt).toISOString(), completedCount: dc.get(String(r._id)) ?? 0 }));
}

export async function editorData(user: SessionUser, id: string): Promise<(CourseInput & { id: string; enrolledCount: number }) | null> {
  if (!isId(id)) return null;
  await db();
  const c = (await Course.findOne({ _id: oid(id), orgId: oid(user.orgId) }).lean()) as Raw | null;
  if (!c || !(await canManage(user, c))) return null;
  return {
    id: String(c._id),
    title: c.title,
    slug: c.slug,
    subtitle: c.subtitle ?? '',
    description: c.description ?? '',
    cover: c.cover ?? '',
    level: c.level ?? 'all',
    category: c.category ?? '',
    status: c.status,
    access: c.access ?? 'free',
    tokenPrice: c.tokenPrice ?? 0,
    programIds: (c.programIds ?? []).map(String),
    instructorIds: (c.instructorIds ?? []).map(String),
    sections: (c.sections ?? []).map((s: Raw) => ({
      id: s.id,
      title: s.title,
      lessons: (s.lessons ?? []).map((l: Raw) => ({ id: l.id, title: l.title, type: l.type, videoUrl: l.videoUrl ?? '', duration: l.duration ?? 0, body: l.body ?? '', resources: l.resources ?? [], preview: !!l.preview })),
    })),
    enrolledCount: c.enrolledCount ?? 0,
  };
}

const newId = () => crypto.randomBytes(6).toString('hex');

function cleanSections(sections: SectionInput[]): { sections: SectionInput[]; lessonCount: number; totalDuration: number; error?: string } {
  let lessonCount = 0;
  let totalDuration = 0;
  const seen = new Set<string>();
  const uid = (id: string) => {
    let v = /^[a-z0-9]{4,24}$/i.test(id) && !seen.has(id) ? id : newId();
    while (seen.has(v)) v = newId();
    seen.add(v);
    return v;
  };
  const out: SectionInput[] = [];
  for (const s of sections.slice(0, 50)) {
    const lessons: LessonInput[] = [];
    for (const l of s.lessons.slice(0, 200)) {
      if (l.videoUrl && parseVideo(l.videoUrl).kind === 'none') return { sections: [], lessonCount: 0, totalDuration: 0, error: `“${l.title}”: the video link must be YouTube, Vimeo or an uploaded video (https).` };
      for (const r of l.resources) if (!isHttpUrl(r.url)) return { sections: [], lessonCount: 0, totalDuration: 0, error: `“${l.title}”: a resource link is not valid.` };
      const duration = Math.max(0, Math.min(86400, Math.round(l.duration || 0)));
      lessons.push({ ...l, id: uid(l.id), title: l.title.trim().slice(0, 200) || 'Untitled lesson', duration, body: l.body.slice(0, 20000), resources: l.resources.slice(0, 20) });
      lessonCount++;
      totalDuration += duration;
    }
    out.push({ id: uid(s.id), title: s.title.trim().slice(0, 200) || 'Section', lessons });
  }
  if (lessonCount > 500) return { sections: [], lessonCount: 0, totalDuration: 0, error: 'A course can have up to 500 lessons.' };
  return { sections: out, lessonCount, totalDuration };
}

export async function saveCourse(user: SessionUser, input: CourseInput, id?: string): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  await db();
  let existing: Raw | null = null;
  if (id) {
    if (!isId(id)) return { ok: false, error: 'Not found' };
    existing = (await Course.findOne({ _id: oid(id), orgId: oid(user.orgId) }).lean()) as Raw | null;
    if (!existing) return { ok: false, error: 'Not found' };
  }
  if (!(await canManage(user, existing))) return { ok: false, error: 'You can’t edit this course.' };
  if (input.cover && !isHttpUrl(input.cover)) return { ok: false, error: 'The cover image link is not valid.' };
  const cs = cleanSections(input.sections);
  if (cs.error) return { ok: false, error: cs.error };
  if (input.status === 'published' && cs.lessonCount === 0) return { ok: false, error: 'Add at least one lesson before publishing.' };

  // Unique slug inside the organisation
  let slug = slugify(input.slug || input.title);
  for (let i = 2; await Course.exists({ orgId: oid(user.orgId), slug, ...(existing ? { _id: { $ne: existing._id } } : {}) }); i++) slug = `${slugify(input.slug || input.title).slice(0, 75)}-${i}`;

  // Mentors may only target programs they teach and can't change instructors.
  const progQ: Record<string, unknown> = { _id: { $in: input.programIds.filter(isId).map(oid) }, orgId: oid(user.orgId) };
  if (user.role !== 'admin') progQ.mentors = oid(user.id);
  let programIds = (await Program.find(progQ).select('_id').lean()).map((p) => (p as Raw)._id);
  if (user.role !== 'admin' && existing) {
    // keep programs the mentor can't see that an admin already chose
    const mine = new Set(programIds.map(String));
    const keep = ((existing.programIds ?? []) as unknown[]).filter((id) => !mine.has(String(id)));
    const others = keep.length ? (await Program.find({ _id: { $in: keep }, mentors: { $ne: oid(user.id) } }).select('_id').lean()).map((p) => (p as Raw)._id) : [];
    programIds = [...programIds, ...others];
  }
  if (user.role !== 'admin' && !programIds.length && !existing) {
    const anyProg = await Program.exists({ orgId: oid(user.orgId), mentors: oid(user.id) });
    if (anyProg && input.programIds.length) return { ok: false, error: 'Choose programs you teach.' };
  }
  const instructorIds =
    user.role === 'admin'
      ? (await User.find({ _id: { $in: input.instructorIds.filter(isId).map(oid) }, orgId: oid(user.orgId), role: { $in: ['admin', 'mentor'] } }).select('_id').lean()).map((p) => (p as Raw)._id)
      : ((existing?.instructorIds as unknown[] | undefined) ?? [oid(user.id)]);
  const firstPublish = input.status === 'published' && !existing?.publishedAt;
  const doc = {
    title: input.title.trim().slice(0, 200),
    slug,
    subtitle: input.subtitle.slice(0, 300),
    description: input.description.slice(0, 10000),
    cover: input.cover,
    level: input.level,
    category: input.category.trim().slice(0, 60),
    status: input.status,
    access: input.access,
    tokenPrice: input.access === 'tokens' ? Math.max(1, Math.round(input.tokenPrice)) : 0,
    programIds,
    instructorIds: instructorIds.length ? instructorIds : [oid(user.id)],
    sections: cs.sections,
    lessonCount: cs.lessonCount,
    totalDuration: cs.totalDuration,
    updatedBy: oid(user.id),
    ...(firstPublish ? { publishedAt: new Date() } : {}),
  };
  let savedId: string;
  if (existing) {
    await Course.updateOne({ _id: existing._id }, { $set: doc });
    savedId = String(existing._id);
  } else {
    const created = await Course.create({ ...doc, orgId: oid(user.orgId), createdBy: oid(user.id) });
    savedId = String(created._id);
  }
  await auditBy(user, 'course.saved', `${doc.title} (${doc.status}, ${cs.lessonCount} lessons)`, [], { courseId: savedId });
  // Tell the audience when a course is first published (program-limited courses only).
  if (firstPublish && programIds.length) {
    const progs = (await Program.find({ _id: { $in: programIds } }).select('students').lean()) as Raw[];
    const ids = [...new Set(progs.flatMap((p) => (p.students ?? []).map(String)))] as string[];
    if (ids.length) await notifyMany({ orgId: user.orgId, userIds: ids, type: 'material.new', title: `New course: ${doc.title}`, body: doc.subtitle, link: `/courses/${slug}`, dedupeKeyPrefix: `course:${savedId}` });
  }
  return { ok: true, id: savedId, slug };
}

export async function deleteCourse(user: SessionUser, id: string): Promise<{ ok: true; archived: boolean } | { ok: false; error: string }> {
  if (!isId(id)) return { ok: false, error: 'Not found' };
  await db();
  const c = (await Course.findOne({ _id: oid(id), orgId: oid(user.orgId) }).lean()) as Raw | null;
  if (!c || !(await canManage(user, c))) return { ok: false, error: 'Not allowed' };
  if (await Enrollment.exists({ courseId: c._id })) {
    // People enrolled (maybe paid): keep their access, just hide it from the catalog.
    await Course.updateOne({ _id: c._id }, { $set: { status: 'archived' } });
    await auditBy(user, 'course.saved', `${c.title} archived (has learners)`, [], { courseId: id });
    return { ok: true, archived: true };
  }
  await Course.deleteOne({ _id: c._id });
  await auditBy(user, 'course.deleted', c.title, [], { courseId: id });
  return { ok: true, archived: false };
}

export type LearnerRow = { userId: string; name: string; email: string; via: string; percent: number; completedAt: string | null; lastSeenAt: string | null };

export async function courseLearners(user: SessionUser, id: string): Promise<LearnerRow[]> {
  const ed = await editorData(user, id);
  if (!ed) return [];
  const total = ed.sections.reduce((a, s) => a + s.lessons.length, 0);
  const rows = (await Enrollment.find({ courseId: oid(id) }).sort({ lastSeenAt: -1 }).limit(2000).lean()) as Raw[];
  const users = (await User.find({ _id: { $in: rows.map((r) => r.userId) } }).select('name email').lean()) as Raw[];
  const um = new Map(users.map((u) => [String(u._id), u]));
  return rows.map((r) => ({
    userId: String(r.userId),
    name: um.get(String(r.userId))?.name ?? 'Unknown',
    email: um.get(String(r.userId))?.email ?? '',
    via: r.via,
    percent: progressPercent((r.completedLessons ?? []).length, total),
    completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
    lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt).toISOString() : null,
  }));
}

/** People who can be listed as instructors (mentors and admins). */
export async function staffOptions(orgId: string): Promise<{ id: string; name: string; role: string }[]> {
  await db();
  const rows = (await User.find({ orgId: oid(orgId), role: { $in: ['admin', 'mentor'] }, status: 'active' }).select('name role').sort({ name: 1 }).limit(500).lean()) as Raw[];
  return rows.map((r) => ({ id: String(r._id), name: r.name, role: r.role }));
}
