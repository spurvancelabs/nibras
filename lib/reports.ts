// =============================================================================
// FILE: lib/reports.ts   (NEW FILE — server only)
// Admin reports: program summaries, grading workload, inactivity, premium &
// theme usage, and system health (configuration + last daily job runs).
// Plain finds and in-memory grouping (works on any MongoDB-compatible DB).
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { db } from './db';
import Program from '@/models/Program';
import User from '@/models/User';
import Session from '@/models/Session';
import Attendance from '@/models/Attendance';
import Assignment from '@/models/Assignment';
import Submission from '@/models/Submission';
import AccountFlag from '@/models/AccountFlag';
import AutomationRun from '@/models/AutomationRun';
import AiUsage from '@/models/AiUsage';
import GradeSuggestion from '@/models/GradeSuggestion';
import { findPreset } from './theme-config';
import { findUiStyle } from './ui-styles';
import { aiConfigured } from './ai-provider';

const oid = (id: string) => new Types.ObjectId(id);
const DAY = 86_400_000;

export type ProgramRow = {
  id: string;
  name: string;
  status: string;
  learners: number;
  mentors: number;
  sessionsHeld: number;
  attendanceRate: number | null;
  assignments: number;
  submissions: number;
  ungraded: number;
  avgGrade: number | null;
};

export async function programSummaries(orgId: string): Promise<ProgramRow[]> {
  await db();
  const org = oid(orgId);
  const now = new Date();
  const progs = (await Program.find({ orgId: org }).select('name status students mentors').sort({ name: 1 }).lean()) as {
    _id: unknown;
    name: string;
    status: string;
    students?: unknown[];
    mentors?: unknown[];
  }[];
  const [sessions, att, assigns] = await Promise.all([
    Session.find({ orgId: org, startsAt: { $lte: now }, status: { $ne: 'cancelled' } }).select('programId').lean() as Promise<{ programId: unknown }[]>,
    Attendance.find({ orgId: org }).select('programId status').lean() as Promise<{ programId: unknown; status: string }[]>,
    Assignment.find({ orgId: org }).select('programId maxMarks').lean() as Promise<{ _id: unknown; programId: unknown; maxMarks: number }[]>,
  ]);
  const subs = (await Submission.find({ orgId: org, assignmentId: { $in: assigns.map((a) => a._id) } }).select('assignmentId marks').lean()) as {
    assignmentId: unknown;
    marks: number | null;
  }[];
  const aProg = new Map(assigns.map((a) => [String(a._id), { p: String(a.programId), max: a.maxMarks }]));
  const by = new Map<string, { s: number; pr: number; ab: number; a: number; sub: number; ung: number; g: number[] }>();
  const get = (p: string) => {
    if (!by.has(p)) by.set(p, { s: 0, pr: 0, ab: 0, a: 0, sub: 0, ung: 0, g: [] });
    return by.get(p)!;
  };
  for (const s of sessions) get(String(s.programId)).s++;
  for (const r of att) {
    const b = get(String(r.programId));
    if (r.status === 'present' || r.status === 'late') b.pr++;
    else if (r.status === 'absent') b.ab++;
  }
  for (const a of assigns) get(String(a.programId)).a++;
  for (const s of subs) {
    const ap = aProg.get(String(s.assignmentId));
    if (!ap) continue;
    const b = get(ap.p);
    b.sub++;
    if (s.marks === null || s.marks === undefined) b.ung++;
    else if (ap.max > 0) b.g.push((s.marks / ap.max) * 100);
  }
  return progs.map((p) => {
    const b = by.get(String(p._id)) ?? { s: 0, pr: 0, ab: 0, a: 0, sub: 0, ung: 0, g: [] };
    return {
      id: String(p._id),
      name: p.name,
      status: p.status,
      learners: (p.students ?? []).length,
      mentors: (p.mentors ?? []).length,
      sessionsHeld: b.s,
      attendanceRate: b.pr + b.ab ? b.pr / (b.pr + b.ab) : null,
      assignments: b.a,
      submissions: b.sub,
      ungraded: b.ung,
      avgGrade: b.g.length ? Math.round(b.g.reduce((x, y) => x + y, 0) / b.g.length) : null,
    };
  });
}

export type UsageRow = { label: string; value: number };

export async function appearanceUsage(orgId: string): Promise<{ themes: UsageRow[]; styles: UsageRow[]; personalised: number; total: number; premiumActive: number }> {
  await db();
  const org = oid(orgId);
  const users = (await User.find({ orgId: org, status: 'active' }).select('themePreset uiStyle premiumUntil').lean()) as { themePreset?: string; uiStyle?: string; premiumUntil?: Date | null }[];
  const t = new Map<string, number>();
  const s = new Map<string, number>();
  let personalised = 0;
  let premiumActive = 0;
  const now = Date.now();
  for (const u of users) {
    if (u.themePreset) t.set(u.themePreset, (t.get(u.themePreset) ?? 0) + 1);
    if (u.uiStyle) s.set(u.uiStyle, (s.get(u.uiStyle) ?? 0) + 1);
    if (u.themePreset || u.uiStyle) personalised++;
    if (u.premiumUntil && new Date(u.premiumUntil).getTime() > now) premiumActive++;
  }
  const top = (m: Map<string, number>, name: (id: string) => string) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, v]) => ({ label: name(id), value: v }));
  return {
    themes: top(t, (id) => findPreset(id)?.name ?? id),
    styles: top(s, (id) => findUiStyle(id)?.name ?? id),
    personalised,
    total: users.length,
    premiumActive,
  };
}

export async function automationSummary(orgId: string): Promise<{ reminded: number; flagged: number; suspended: number; resolved30: number }> {
  await db();
  const org = oid(orgId);
  const [reminded, flagged, suspended, resolved30] = await Promise.all([
    AccountFlag.countDocuments({ orgId: org, stage: 'reminded' }),
    AccountFlag.countDocuments({ orgId: org, stage: 'flagged' }),
    AccountFlag.countDocuments({ orgId: org, stage: 'suspended' }),
    AccountFlag.countDocuments({ orgId: org, stage: 'resolved', resolvedAt: { $gte: new Date(Date.now() - 30 * DAY) } }),
  ]);
  return { reminded, flagged, suspended, resolved30 };
}

export async function aiSummary(orgId: string): Promise<{ month: string; requests: number; tokens: number; approved: number; edited: number; rejected: number }> {
  await db();
  const org = oid(orgId);
  const month = new Date().toISOString().slice(0, 7);
  const since = new Date(Date.now() - 30 * DAY);
  const [u, approved, edited, rejected] = await Promise.all([
    AiUsage.findOne({ orgId: org, month }).lean() as Promise<{ requests?: number; tokens?: number } | null>,
    GradeSuggestion.countDocuments({ orgId: org, status: 'approved', reviewedAt: { $gte: since } }),
    GradeSuggestion.countDocuments({ orgId: org, status: 'approved', edited: true, reviewedAt: { $gte: since } }),
    GradeSuggestion.countDocuments({ orgId: org, status: 'rejected', reviewedAt: { $gte: since } }),
  ]);
  return { month, requests: u?.requests ?? 0, tokens: u?.tokens ?? 0, approved, edited, rejected };
}

export type HealthCheck = { label: string; ok: boolean | null; detail: string };

/** Configuration and job checks. Never reveals secret values — only whether they are set. */
export async function systemHealth(orgId: string): Promise<{ checks: HealthCheck[]; jobs: { job: string; at: string | null; ok: boolean | null; detail: string }[]; dbMs: number | null }> {
  let dbMs: number | null = null;
  try {
    await db();
    const t = Date.now();
    await mongoose.connection.db?.admin().ping();
    dbMs = Date.now() - t;
  } catch {
    dbMs = null;
  }
  const env = (k: string) => !!process.env[k];
  const checks: HealthCheck[] = [
    { label: 'Database', ok: dbMs !== null, detail: dbMs !== null ? `responding in ${dbMs} ms` : 'not reachable' },
    { label: 'Sign-in secret', ok: env('NEXTAUTH_SECRET') || env('AUTH_SECRET'), detail: 'NEXTAUTH_SECRET — also signs the audit log and 2FA secrets' },
    { label: 'Daily jobs', ok: env('CRON_SECRET'), detail: env('CRON_SECRET') ? 'CRON_SECRET is set' : 'Set CRON_SECRET in Vercel so premium notices, attendance alerts, automation and clean-up run' },
    { label: 'Email', ok: env('RESEND_API_KEY'), detail: env('RESEND_API_KEY') ? 'Resend is configured' : 'RESEND_API_KEY missing — only in-app notifications are sent' },
    { label: 'File uploads', ok: env('CLOUDINARY_CLOUD_NAME') && env('CLOUDINARY_API_KEY') && env('CLOUDINARY_API_SECRET'), detail: 'Cloudinary' },
    { label: 'AI provider', ok: aiConfigured() ? true : null, detail: aiConfigured() ? `${process.env.AI_PROVIDER === 'mock' ? 'mock (testing only)' : process.env.AI_MODEL}` : 'optional — not configured' },
  ];
  const jobsList = ['premium', 'attendance', 'automation', 'retention'];
  const jobs = await Promise.all(
    jobsList.map(async (job) => {
      const r = (await AutomationRun.findOne({ orgId: oid(orgId), job, by: 'schedule' }).sort({ startedAt: -1 }).lean()) as { startedAt: Date; ok: boolean; error?: string; finishedAt?: Date | null } | null;
      if (!r) return { job, at: null, ok: null, detail: 'has not run yet' };
      const stale = Date.now() - new Date(r.startedAt).getTime() > 2 * DAY;
      return { job, at: new Date(r.startedAt).toISOString(), ok: r.ok && !stale, detail: !r.ok ? r.error || 'failed' : stale ? 'last run is more than 2 days old' : r.finishedAt ? 'ok' : 'did not finish' };
    })
  );
  return { checks, jobs, dbMs };
}

export function programsCsv(rows: ProgramRow[]): string {
  const esc = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Program', 'Status', 'Learners', 'Mentors', 'Sessions held', 'Attendance %', 'Assignments', 'Submissions', 'Ungraded', 'Average grade %'];
  const lines = rows.map((r) =>
    [r.name, r.status, r.learners, r.mentors, r.sessionsHeld, r.attendanceRate === null ? '' : Math.round(r.attendanceRate * 100), r.assignments, r.submissions, r.ungraded, r.avgGrade ?? ''].map(esc).join(',')
  );
  return '﻿' + [head.join(','), ...lines].join('\n');
}
