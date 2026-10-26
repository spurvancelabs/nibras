// =============================================================================
// FILE: lib/daily-jobs.ts   (NEW FILE — server only)
// The jobs run once a day by /api/cron/daily, per organisation:
//   1. premium      — "ends soon" / "ended" notices (access itself already
//                     stops at the end date, no job needed for that)
//   2. attendance   — low-attendance & repeated-absence alerts
//   3. automation   — enabled inactivity rules
//   4. retention    — remove old audit entries / read notifications / run logs
// Each job is time-boxed and safe to run again (idempotent); results are
// logged in AutomationRun so Reports → System health can show them.
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Program from '@/models/Program';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import AutomationRun from '@/models/AutomationRun';
import { getSettings } from './settings';
import { premiumSweep } from './premium';
import { attendanceOverview } from './attendance-reports';
import { automationDaily } from './automation';
import { notify } from './notifications';
import { audit } from './audit';

const oid = (id: string) => new Types.ObjectId(id);
const DAY = 86_400_000;

function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - y.getTime()) / DAY + 1) / 7)}`;
}

/** Weekly (deduplicated) alerts to learners below the threshold and their mentors. */
export async function attendanceAlerts(orgId: string, deadline: number): Promise<Record<string, number>> {
  const s = await getSettings();
  if (!s.attendanceAlerts) return { skipped: 1 };
  const admin = (await User.findOne({ orgId: oid(orgId), role: 'admin', status: 'active' }).select('_id').lean()) as { _id: unknown } | null;
  if (!admin) return { skipped: 1 };
  const o = await attendanceOverview({ id: String(admin._id), orgId, role: 'admin' }, { days: 60, threshold: s.attendanceThreshold, streakAlert: s.absenceStreakAlert });
  const week = isoWeek(new Date());
  let learners = 0;
  const flagged = o.learners.filter((l) => l.low || l.repeated);
  for (const l of flagged) {
    if (Date.now() > deadline) break;
    const why = l.repeated ? `you missed the last ${l.streak} sessions` : `your attendance is ${Math.round((l.rate ?? 0) * 100)}%, below ${s.attendanceThreshold}%`;
    const sent = await notify({
      orgId,
      userId: l.studentId,
      type: 'attendance.alert',
      title: 'Your attendance needs attention',
      body: `Heads up — ${why}. If something is getting in the way, reply to your mentor; they're happy to help.`,
      link: '/attendance',
      email: true,
      dedupeKey: `att-alert:${week}`,
    });
    if (sent) learners++;
  }
  // Mentors: one summary per week
  let mentors = 0;
  if (flagged.length && Date.now() < deadline) {
    const flaggedIds = new Set(flagged.map((l) => l.studentId));
    const progs = (await Program.find({ orgId: oid(orgId), status: { $ne: 'draft' } }).select('mentors students').lean()) as { mentors?: unknown[]; students?: unknown[] }[];
    const per = new Map<string, number>();
    for (const p of progs) {
      const n = (p.students ?? []).map(String).filter((x) => flaggedIds.has(x)).length;
      if (n) for (const m of (p.mentors ?? []).map(String)) per.set(m, (per.get(m) ?? 0) + n);
    }
    for (const [m, n] of per) {
      if (Date.now() > deadline) break;
      const sent = await notify({
        orgId,
        userId: m,
        type: 'attendance.alert',
        title: `${n} learner${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} attention`,
        body: `Below ${s.attendanceThreshold}% or ${s.absenceStreakAlert}+ absences in a row. See who in Attendance.`,
        link: '/attendance',
        dedupeKey: `att-mentor:${week}`,
      });
      if (sent) mentors++;
    }
  }
  return { flagged: flagged.length, learners, mentors };
}

/** Removes old records according to Settings → Data retention. Learning data is never touched. */
export async function retentionCleanup(orgId: string): Promise<Record<string, number>> {
  const s = await getSettings();
  const now = Date.now();
  const org = oid(orgId);
  const [a, n, r] = await Promise.all([
    AuditLog.deleteMany({ orgId: org, at: { $lt: new Date(now - s.auditRetentionDays * DAY) } }),
    Notification.deleteMany({ orgId: org, readAt: { $ne: null, $lt: new Date(now - s.notificationRetentionDays * DAY) } }),
    AutomationRun.deleteMany({ orgId: org, startedAt: { $lt: new Date(now - 180 * DAY) } }),
  ]);
  const counts = { audit: a.deletedCount ?? 0, notifications: n.deletedCount ?? 0, runs: r.deletedCount ?? 0 };
  if (counts.audit || counts.notifications) {
    await audit({ orgId, action: 'system.retention', actorEmail: 'system', actorName: 'Daily maintenance', summary: `Removed ${counts.audit} audit entries and ${counts.notifications} read notifications`, meta: counts });
  }
  return counts;
}

type JobName = 'premium' | 'attendance' | 'automation' | 'retention';

async function logged(orgId: string, job: JobName, fn: () => Promise<Record<string, unknown>>): Promise<Record<string, unknown>> {
  const run = await AutomationRun.create({ orgId: oid(orgId), job, mode: 'live', by: 'schedule', byName: 'Daily schedule' });
  try {
    const counts = await fn();
    await AutomationRun.updateOne({ _id: run._id }, { $set: { finishedAt: new Date(), counts } });
    return counts;
  } catch (e) {
    console.error(`[daily:${job}]`, e);
    await AutomationRun.updateOne({ _id: run._id }, { $set: { finishedAt: new Date(), ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) } });
    return { error: 1 };
  }
}

/** Runs every job for every active organisation within the time budget. */
export async function runDailyJobs(budgetMs: number): Promise<Record<string, unknown>> {
  await db();
  const deadline = Date.now() + budgetMs;
  const orgs = (await Organization.find({ status: { $ne: 'suspended' } }).select('_id').lean()) as { _id: unknown }[];
  const s = await getSettings();
  const out: Record<string, unknown> = {};
  for (const o of orgs) {
    const orgId = String(o._id);
    const r: Record<string, unknown> = {};
    if (s.premiumEnabled && Date.now() < deadline) r.premium = await logged(orgId, 'premium', () => premiumSweep(orgId, deadline));
    if (Date.now() < deadline) r.attendance = await logged(orgId, 'attendance', () => attendanceAlerts(orgId, deadline));
    if (Date.now() < deadline) r.automation = await logged(orgId, 'automation', () => automationDaily(orgId, deadline));
    if (Date.now() < deadline) r.retention = await logged(orgId, 'retention', () => retentionCleanup(orgId));
    out[orgId] = r;
  }
  return out;
}
