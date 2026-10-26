// =============================================================================
// FILE: lib/automation.ts   (NEW FILE — server only)
// Inactive-account automation engine.
//
//   evaluateRule()  → who matches, why, and what would happen (no writes)
//   runRule()       → 'dry' records a run without changing anyone,
//                     'live' sends reminders, raises flags, suspends
//   automationDaily() → called by the daily cron for every enabled rule
//
// Safety rails
//   - admins are never matched; exempt accounts are skipped
//   - staged: remind → flag (after N days) → suspend (after grace days);
//     nobody is suspended on the first run
//   - suspension = account disabled + signed out; NEVER deleted; reason kept
//   - per-run suspension cap; partial runs resume next day (idempotent)
//   - people who become active again are cleared automatically
//   - everything is audited and logged in AutomationRun
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import User from '@/models/User';
import Program from '@/models/Program';
import Session from '@/models/Session';
import Assignment from '@/models/Assignment';
import Submission from '@/models/Submission';
import Attendance from '@/models/Attendance';
import AutomationRule from '@/models/AutomationRule';
import AccountFlag from '@/models/AccountFlag';
import AutomationRun from '@/models/AutomationRun';
import { matchRule, nextAction, nextStepDate, type NextAction } from './automation-match';
import { notify } from './notifications';
import { audit } from './audit';
import { invalidateAuthState } from './auth-state';

const oid = (id: string) => new Types.ObjectId(id);
const DAY = 86_400_000;

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  roles: ('student' | 'mentor')[];
  programIds: string[];
  noLoginDays: number;
  noSubmissionDays: number;
  noAttendanceDays: number;
  combine: 'any' | 'all';
  newAccountDays: number;
  remind: boolean;
  flag: boolean;
  flagAfterDays: number;
  suspend: boolean;
  graceDays: number;
  notifyMentors: boolean;
  maxSuspendPerRun: number;
  frequency: 'daily' | 'weekly';
  lastRunAt: string | null;
  updatedAt: string;
};

export type RuleInput = Omit<Rule, 'id' | 'lastRunAt' | 'updatedAt'>;

type Actor = { id: string; orgId: string; email?: string | null; name?: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRule(r: any): Rule {
  return {
    id: String(r._id),
    name: r.name,
    enabled: r.enabled === true,
    roles: (r.roles ?? ['student']).filter((x: string) => x === 'student' || x === 'mentor'),
    programIds: (r.programIds ?? []).map(String),
    noLoginDays: r.noLoginDays ?? 0,
    noSubmissionDays: r.noSubmissionDays ?? 0,
    noAttendanceDays: r.noAttendanceDays ?? 0,
    combine: r.combine === 'all' ? 'all' : 'any',
    newAccountDays: r.newAccountDays ?? 14,
    remind: r.remind !== false,
    flag: r.flag !== false,
    flagAfterDays: r.flagAfterDays ?? 7,
    suspend: r.suspend === true,
    graceDays: r.graceDays ?? 14,
    notifyMentors: r.notifyMentors !== false,
    maxSuspendPerRun: r.maxSuspendPerRun ?? 25,
    frequency: r.frequency === 'weekly' ? 'weekly' : 'daily',
    lastRunAt: r.lastRunAt ? new Date(r.lastRunAt).toISOString() : null,
    updatedAt: new Date(r.updatedAt ?? Date.now()).toISOString(),
  };
}

export async function listRules(orgId: string): Promise<Rule[]> {
  await db();
  const rows = await AutomationRule.find({ orgId: oid(orgId) }).sort({ createdAt: 1 }).lean();
  return rows.map(toRule);
}

export async function getRule(orgId: string, id: string): Promise<Rule | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await db();
  const r = await AutomationRule.findOne({ _id: oid(id), orgId: oid(orgId) }).lean();
  return r ? toRule(r) : null;
}

export async function saveRule(actor: Actor, input: RuleInput, id?: string): Promise<Rule> {
  await db();
  const doc = {
    ...input,
    roles: input.roles.filter((r) => r === 'student' || r === 'mentor'),
    programIds: input.programIds.filter((p) => Types.ObjectId.isValid(p)).map(oid),
    updatedBy: oid(actor.id),
  };
  let saved;
  if (id) {
    saved = await AutomationRule.findOneAndUpdate({ _id: oid(id), orgId: oid(actor.orgId) }, { $set: doc }, { new: true }).lean();
    if (!saved) throw new Error('Rule not found');
  } else {
    saved = (await AutomationRule.create({ ...doc, orgId: oid(actor.orgId), createdBy: oid(actor.id) })).toObject();
  }
  const r = toRule(saved);
  await audit({
    orgId: actor.orgId,
    action: 'automation.rule_saved',
    actorId: actor.id,
    actorEmail: actor.email ?? '',
    actorName: actor.name ?? '',
    summary: `${r.name} (${r.enabled ? 'on' : 'off'}${r.suspend ? ', can suspend' : ''})`,
    meta: { ruleId: r.id, ...input },
  });
  return r;
}

export async function deleteRule(actor: Actor, id: string): Promise<boolean> {
  await db();
  const r = await AutomationRule.findOneAndDelete({ _id: oid(id), orgId: oid(actor.orgId) }).lean();
  if (!r) return false;
  // Close its open reminders/flags (suspended accounts stay suspended until an admin reviews them).
  await AccountFlag.updateMany(
    { orgId: oid(actor.orgId), ruleId: oid(id), stage: { $in: ['reminded', 'flagged'] } },
    { $set: { stage: 'resolved', resolution: 'dismissed', resolvedAt: new Date(), resolvedBy: oid(actor.id), resolvedNote: 'Rule deleted' } }
  );
  await audit({ orgId: actor.orgId, action: 'automation.rule_deleted', actorId: actor.id, actorEmail: actor.email ?? '', actorName: actor.name ?? '', summary: (r as { name?: string }).name ?? '' });
  return true;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export type EvalRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  reasons: string[];
  stage: 'reminded' | 'flagged' | 'suspended' | null;
  action: NextAction;
  nextDate: string | null;
  programIds: string[];
};

export type Evaluation = {
  rows: EvalRow[];
  /** People with a live flag who are active again (will be cleared). */
  cleared: { userId: string; name: string }[];
  /** Suspended by automation but reactivated by hand since. */
  reopened: string[];
  counts: { checked: number; matched: number; remind: number; flag: number; suspend: number; wait: number; cleared: number; skipped: number };
};

export async function evaluateRule(orgId: string, rule: Rule, now: number = Date.now()): Promise<Evaluation> {
  await db();
  const org = oid(orgId);
  const q: Record<string, unknown> = { orgId: org, role: { $in: rule.roles.length ? rule.roles : ['student'] }, status: 'active' };
  if (rule.programIds.length) q.programIds = { $in: rule.programIds.map(oid) };
  const users = (await User.find(q)
    .select('name email role status createdAt lastLoginAt reactivatedAt automationExempt programIds')
    .limit(5000)
    .lean()) as {
    _id: unknown;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: Date;
    lastLoginAt?: Date | null;
    reactivatedAt?: Date | null;
    automationExempt?: boolean;
    programIds?: unknown[];
  }[];
  const ids = users.map((u) => u._id);
  const latest = (a?: Date | null, b?: Date | null) => {
    const x = a ? new Date(a).getTime() : 0;
    const y = b ? new Date(b).getTime() : 0;
    return x || y ? new Date(Math.max(x, y)) : null;
  };

  const subCut = new Date(now - rule.noSubmissionDays * DAY);
  const attCut = new Date(now - rule.noAttendanceDays * DAY);
  const nowD = new Date(now);
  const [submitted, dueProgs, attended, sessProgs, flags] = await Promise.all([
    rule.noSubmissionDays ? Submission.distinct('studentId', { orgId: org, studentId: { $in: ids }, submittedAt: { $gte: subCut } }) : Promise.resolve([]),
    rule.noSubmissionDays ? Assignment.distinct('programId', { orgId: org, dueAt: { $gte: subCut, $lte: nowD } }) : Promise.resolve([]),
    rule.noAttendanceDays ? Attendance.distinct('studentId', { orgId: org, studentId: { $in: ids }, status: { $in: ['present', 'late'] }, markedAt: { $gte: attCut } }) : Promise.resolve([]),
    rule.noAttendanceDays ? Session.distinct('programId', { orgId: org, startsAt: { $gte: attCut, $lte: nowD }, status: { $ne: 'cancelled' } }) : Promise.resolve([]),
    Types.ObjectId.isValid(rule.id)
      ? AccountFlag.find({ orgId: org, ruleId: oid(rule.id), stage: { $in: ['reminded', 'flagged', 'suspended'] } })
          .select('userId stage remindedAt flaggedAt')
          .lean()
      : Promise.resolve([]), // unsaved draft (preview only)
  ]);
  const subSet = new Set((submitted as unknown[]).map(String));
  const dueSet = new Set((dueProgs as unknown[]).map(String));
  const attSet = new Set((attended as unknown[]).map(String));
  const sessSet = new Set((sessProgs as unknown[]).map(String));
  const activeIds = new Set(users.map((u) => String(u._id)));
  type LiveFlag = { userId: unknown; stage: 'reminded' | 'flagged' | 'suspended'; remindedAt?: Date | null; flaggedAt?: Date | null };
  // A "suspended" flag whose account is active again was reactivated by hand
  // (e.g. from the Users page): the cycle starts over for that person.
  const reopened = (flags as LiveFlag[]).filter((f) => f.stage === 'suspended' && activeIds.has(String(f.userId))).map((f) => String(f.userId));
  const flagMap = new Map((flags as LiveFlag[]).filter((f) => !reopened.includes(String(f.userId))).map((f) => [String(f.userId), f]));

  const rows: EvalRow[] = [];
  const counts = { checked: users.length, matched: 0, remind: 0, flag: 0, suspend: 0, wait: 0, cleared: 0, skipped: 0 };
  const matchedIds = new Set<string>();
  for (const u of users) {
    const id = String(u._id);
    const progs = (u.programIds ?? []).map(String);
    const learner = u.role === 'student';
    const m = matchRule(
      rule,
      {
        role: u.role,
        status: u.status,
        exempt: u.automationExempt === true,
        createdAt: new Date(u.createdAt),
        // Being reactivated by an admin counts as fresh activity.
        lastLoginAt: latest(u.lastLoginAt, u.reactivatedAt),
        submittedInWindow: subSet.has(id),
        hadWorkDue: learner && progs.some((p) => dueSet.has(p)),
        attendedInWindow: attSet.has(id),
        hadSessions: learner && progs.some((p) => sessSet.has(p)),
      },
      now
    );
    if (m.skipped) counts.skipped++;
    if (!m.matched) continue;
    matchedIds.add(id);
    counts.matched++;
    const f = flagMap.get(id);
    const state = f ? { stage: f.stage, remindedAt: f.remindedAt ? new Date(f.remindedAt) : null, flaggedAt: f.flaggedAt ? new Date(f.flaggedAt) : null } : null;
    const action = nextAction(rule, state, now);
    if (action === 'remind') counts.remind++;
    else if (action === 'flag') counts.flag++;
    else if (action === 'suspend') counts.suspend++;
    else if (action === 'wait') counts.wait++;
    const nd = nextStepDate(rule, action, now);
    rows.push({ userId: id, name: u.name, email: u.email, role: u.role, reasons: m.reasons, stage: f?.stage ?? null, action, nextDate: nd ? nd.toISOString() : null, programIds: progs });
  }

  // Live flags for people who no longer match → cleared (not suspended ones: those need a human).
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));
  const cleared = [...flagMap.entries()]
    .filter(([uid, f]) => f.stage !== 'suspended' && !matchedIds.has(uid))
    .map(([uid]) => ({ userId: uid, name: nameOf.get(uid) ?? 'Unknown' }));
  counts.cleared = cleared.length;

  const order: Record<NextAction, number> = { suspend: 0, flag: 1, remind: 2, wait: 3, none: 4 };
  rows.sort((a, b) => order[a.action] - order[b.action] || a.name.localeCompare(b.name));
  return { rows, cleared, reopened, counts };
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

export type RunSummary = { runId: string; mode: 'dry' | 'live'; counts: Record<string, number | boolean>; partial: boolean };

function fmtDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function runRule(
  orgId: string,
  rule: Rule,
  mode: 'dry' | 'live',
  by: { id: string; name: string } | 'schedule',
  deadline: number = Date.now() + 8000
): Promise<RunSummary> {
  await db();
  const org = oid(orgId);
  const run = await AutomationRun.create({
    orgId: org,
    job: 'automation',
    ruleId: oid(rule.id),
    ruleName: rule.name,
    mode,
    by: by === 'schedule' ? 'schedule' : by.id,
    byName: by === 'schedule' ? 'Daily schedule' : by.name,
  });
  const ev = await evaluateRule(orgId, rule);
  const done = { reminded: 0, flagged: 0, suspended: 0, cleared: 0, capped: 0 };
  let partial = false;
  const sample: { userId: string; name: string; action: string; reasons: string[] }[] = [];

  if (mode === 'live') {
    const now = new Date();
    if (ev.reopened.length) {
      await AccountFlag.updateMany(
        { orgId: org, ruleId: oid(rule.id), userId: { $in: ev.reopened.map(oid) }, stage: 'suspended' },
        { $set: { stage: 'resolved', resolution: 'reactivated', resolvedAt: now, resolvedNote: 'Reactivated outside automation' } }
      );
    }
    const flaggedForMentors: EvalRow[] = [];
    const suspendedIds: string[] = [];
    for (const r of ev.rows) {
      if (Date.now() > deadline) {
        partial = true;
        break;
      }
      const key = { orgId: org, ruleId: oid(rule.id), userId: oid(r.userId), stage: { $in: ['reminded', 'flagged', 'suspended'] } };
      if (r.action === 'remind') {
        await AccountFlag.updateOne(key, { $setOnInsert: { stage: 'reminded', remindedAt: now }, $set: { reasons: r.reasons, lastMatchedAt: now } }, { upsert: true });
        await notify({
          orgId,
          userId: r.userId,
          type: 'account.inactive',
          title: 'We miss you!',
          body: `We noticed ${r.reasons.join(' and ')}. Sign in and catch up${r.nextDate && rule.flag ? ` — your mentors will be told after ${fmtDay(new Date(r.nextDate))} if nothing changes` : ''}.`,
          link: '/dashboard',
          email: true,
          dedupeKey: `inactive:${rule.id}:${fmtDay(now)}`,
        });
        done.reminded++;
      } else if (r.action === 'flag') {
        await AccountFlag.updateOne(key, { $set: { stage: 'flagged', flaggedAt: now, reasons: r.reasons, lastMatchedAt: now }, $setOnInsert: { remindedAt: null } }, { upsert: true });
        const pauseOn = rule.suspend ? fmtDay(new Date(now.getTime() + rule.graceDays * DAY)) : '';
        await notify({
          orgId,
          userId: r.userId,
          type: 'account.inactive',
          title: rule.suspend ? `Your account will be paused on ${pauseOn}` : 'Your account was flagged as inactive',
          body: rule.suspend
            ? `Because of ${r.reasons.join(' and ')}, your account will be paused on ${pauseOn} unless you become active again. Just sign in and take part — or contact your admin.`
            : `Because of ${r.reasons.join(' and ')}, your admin has been asked to check in with you.`,
          link: '/dashboard',
          email: true,
          dedupeKey: `inactive-flag:${rule.id}:${fmtDay(now)}`,
        });
        flaggedForMentors.push(r);
        done.flagged++;
      } else if (r.action === 'suspend') {
        if (done.suspended >= rule.maxSuspendPerRun) {
          done.capped++;
          continue;
        }
        const reason = `Inactive: ${r.reasons.join(', ')} (rule “${rule.name}”)`.slice(0, 300);
        const res = await User.updateOne(
          { _id: oid(r.userId), orgId: org, role: { $ne: 'admin' }, status: 'active', automationExempt: { $ne: true } },
          { $set: { status: 'disabled', suspendedReason: reason, suspendedAt: now, suspendedBy: 'automation' }, $inc: { sessionVersion: 1 } }
        );
        if (!res.modifiedCount) continue;
        await AccountFlag.updateOne(key, { $set: { stage: 'suspended', suspendedAt: now, reasons: r.reasons, lastMatchedAt: now } });
        suspendedIds.push(r.userId);
        await notify({
          orgId,
          userId: r.userId,
          type: 'account.suspended',
          title: 'Your account has been paused',
          body: 'Your account was paused because of inactivity. Nothing was deleted — contact your admin to reactivate it.',
          email: true,
          dedupeKey: `suspended:${rule.id}:${fmtDay(now)}`,
        });
        await audit({ orgId, action: 'automation.suspended', actorEmail: 'automation', actorName: `Automation: ${rule.name}`, targetIds: [r.userId], summary: `${r.name} — ${reason}` });
        done.suspended++;
      }
      if (sample.length < 50 && r.action !== 'wait' && r.action !== 'none') sample.push({ userId: r.userId, name: r.name, action: r.action, reasons: r.reasons });
    }
    if (suspendedIds.length) await invalidateAuthState(suspendedIds);

    // Clear people who are active again.
    if (!partial && ev.cleared.length) {
      await AccountFlag.updateMany(
        { orgId: org, ruleId: oid(rule.id), userId: { $in: ev.cleared.map((c) => oid(c.userId)) }, stage: { $in: ['reminded', 'flagged'] } },
        { $set: { stage: 'resolved', resolution: 'active-again', resolvedAt: now } }
      );
      done.cleared = ev.cleared.length;
    }

    // One summary notification per admin (and per mentor for their learners).
    if (done.flagged || done.suspended || done.capped) {
      const admins = (await User.find({ orgId: org, role: 'admin', status: 'active' }).select('_id').lean()).map((a) => String(a._id));
      for (const a of admins) {
        await notify({
          orgId,
          userId: a,
          type: 'account.inactive',
          title: `Inactivity: ${done.flagged} flagged, ${done.suspended} paused`,
          body: `Rule “${rule.name}”.${done.capped ? ` ${done.capped} more reached the suspension limit and need a manual review.` : ''}`,
          link: '/admin/automation?tab=flags',
          dedupeKey: `automation-admin:${rule.id}:${fmtDay(now)}`,
        });
      }
      if (rule.notifyMentors && flaggedForMentors.length) {
        const progIds = [...new Set(flaggedForMentors.flatMap((r) => r.programIds))].filter((p) => Types.ObjectId.isValid(p));
        const progs = (await Program.find({ _id: { $in: progIds.map(oid) }, orgId: org }).select('mentors students').lean()) as { mentors?: unknown[]; students?: unknown[] }[];
        const perMentor = new Map<string, number>();
        const flaggedSet = new Set(flaggedForMentors.map((r) => r.userId));
        for (const p of progs) {
          const n = (p.students ?? []).map(String).filter((s) => flaggedSet.has(s)).length;
          if (!n) continue;
          for (const m of (p.mentors ?? []).map(String)) perMentor.set(m, (perMentor.get(m) ?? 0) + n);
        }
        for (const [m, n] of perMentor) {
          await notify({
            orgId,
            userId: m,
            type: 'account.inactive',
            title: `${n} of your learners ${n === 1 ? 'seems' : 'seem'} inactive`,
            body: 'A quick message from you can make a big difference. See who in Attendance.',
            link: '/attendance',
            dedupeKey: `automation-mentor:${rule.id}:${fmtDay(now)}`,
          });
        }
      }
    }

    await AutomationRule.updateOne({ _id: oid(rule.id), orgId: org }, { $set: { lastRunAt: now } });
    await audit({
      orgId,
      action: 'automation.run',
      actorId: by === 'schedule' ? undefined : by.id,
      actorEmail: by === 'schedule' ? 'automation' : '',
      actorName: by === 'schedule' ? 'Daily schedule' : by.name,
      summary: `“${rule.name}”: ${done.reminded} reminded, ${done.flagged} flagged, ${done.suspended} paused, ${done.cleared} cleared${partial ? ' (partial — continues next run)' : ''}`,
      meta: { ruleId: rule.id, ...done, partial },
    });
  } else {
    for (const r of ev.rows) if (sample.length < 50 && r.action !== 'wait' && r.action !== 'none') sample.push({ userId: r.userId, name: r.name, action: r.action, reasons: r.reasons });
  }

  const counts = mode === 'live' ? { ...ev.counts, ...done } : { ...ev.counts };
  await AutomationRun.updateOne({ _id: run._id }, { $set: { finishedAt: new Date(), counts: { ...counts, partial }, sample } });
  return { runId: String(run._id), mode, counts: { ...counts, partial }, partial };
}

/** Daily cron: every enabled rule (weekly ones on Mondays, UTC). */
export async function automationDaily(orgId: string, deadline: number): Promise<{ rules: number; partial: boolean }> {
  const rules = (await listRules(orgId)).filter((r) => r.enabled);
  let ran = 0;
  let partial = false;
  const today = new Date();
  for (const r of rules) {
    if (Date.now() > deadline) {
      partial = true;
      break;
    }
    if (r.frequency === 'weekly' && today.getUTCDay() !== 1) continue;
    if (r.lastRunAt && Date.now() - new Date(r.lastRunAt).getTime() < 20 * 3600_000) continue; // already ran today
    const res = await runRule(orgId, r, 'live', 'schedule', deadline);
    partial = partial || res.partial;
    ran++;
  }
  return { rules: ran, partial };
}

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

export type FlagRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  ruleName: string;
  stage: 'reminded' | 'flagged' | 'suspended' | 'resolved';
  reasons: string[];
  at: string;
  resolution: string;
  resolvedNote: string;
};

export async function listFlags(orgId: string, stages: string[], limit = 300): Promise<FlagRow[]> {
  await db();
  const org = oid(orgId);
  const flags = (await AccountFlag.find({ orgId: org, stage: { $in: stages } }).sort({ updatedAt: -1 }).limit(limit).lean()) as {
    _id: unknown;
    userId: unknown;
    ruleId: unknown;
    stage: FlagRow['stage'];
    reasons?: string[];
    updatedAt: Date;
    resolution?: string;
    resolvedNote?: string;
  }[];
  const [users, rules] = await Promise.all([
    User.find({ _id: { $in: flags.map((f) => f.userId) }, orgId: org }).select('name email role').lean(),
    AutomationRule.find({ _id: { $in: flags.map((f) => f.ruleId) }, orgId: org }).select('name').lean(),
  ]);
  const u = new Map((users as { _id: unknown; name: string; email: string; role: string }[]).map((x) => [String(x._id), x]));
  const rn = new Map((rules as { _id: unknown; name: string }[]).map((x) => [String(x._id), x.name]));
  return flags.map((f) => ({
    id: String(f._id),
    userId: String(f.userId),
    name: u.get(String(f.userId))?.name ?? 'Deleted user',
    email: u.get(String(f.userId))?.email ?? '',
    role: u.get(String(f.userId))?.role ?? '',
    ruleName: rn.get(String(f.ruleId)) ?? 'Deleted rule',
    stage: f.stage,
    reasons: f.reasons ?? [],
    at: new Date(f.updatedAt).toISOString(),
    resolution: f.resolution ?? '',
    resolvedNote: f.resolvedNote ?? '',
  }));
}

/** Admin review: reactivate, exempt or dismiss. Reactivation restores access (nothing was deleted). */
export async function resolveFlag(actor: Actor, flagId: string, resolution: 'reactivated' | 'exempted' | 'dismissed', note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Types.ObjectId.isValid(flagId)) return { ok: false, error: 'Not found' };
  await db();
  const org = oid(actor.orgId);
  const f = (await AccountFlag.findOne({ _id: oid(flagId), orgId: org, stage: { $in: ['reminded', 'flagged', 'suspended'] } }).lean()) as
    | { _id: unknown; userId: unknown; stage: string }
    | null;
  if (!f) return { ok: false, error: 'This item was already handled.' };
  const uid = String(f.userId);
  const target = (await User.findOne({ _id: oid(uid), orgId: org }).select('name email role status suspendedBy').lean()) as
    | { name: string; email: string; role: string; status: string; suspendedBy?: string }
    | null;
  if (!target) return { ok: false, error: 'User not found' };

  if (resolution === 'reactivated' || (resolution === 'exempted' && target.status === 'disabled' && target.suspendedBy === 'automation')) {
    await User.updateOne(
      { _id: oid(uid), orgId: org },
      { $set: { status: 'active', reactivatedAt: new Date(), suspendedReason: '', suspendedAt: null, suspendedBy: '', ...(resolution === 'exempted' ? { automationExempt: true } : {}) } }
    );
  }
  if (resolution === 'exempted') await User.updateOne({ _id: oid(uid), orgId: org }, { $set: { automationExempt: true } });
  await AccountFlag.updateOne(
    { _id: oid(flagId) },
    { $set: { stage: 'resolved', resolution, resolvedAt: new Date(), resolvedBy: oid(actor.id), resolvedNote: note.slice(0, 300) } }
  );
  await invalidateAuthState([uid]);
  if (resolution === 'reactivated' || (resolution === 'exempted' && f.stage === 'suspended')) {
    await notify({ orgId: actor.orgId, userId: uid, type: 'account.reactivated', title: 'Your account is active again', body: 'Welcome back! You can sign in and continue where you left off.', link: '/dashboard', email: true });
  }
  await audit({
    orgId: actor.orgId,
    action: resolution === 'reactivated' ? 'automation.reactivated' : resolution === 'exempted' ? 'automation.exempt' : 'automation.flag_resolved',
    actorId: actor.id,
    actorEmail: actor.email ?? '',
    actorName: actor.name ?? '',
    targetIds: [uid],
    summary: `${target.name} — ${resolution}${note ? `: ${note}` : ''}`,
  });
  return { ok: true };
}

export async function setExempt(actor: Actor, userId: string, exempt: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Types.ObjectId.isValid(userId)) return { ok: false, error: 'User not found' };
  await db();
  const r = await User.updateOne({ _id: oid(userId), orgId: oid(actor.orgId), role: { $ne: 'admin' } }, { $set: { automationExempt: exempt } });
  if (!r.matchedCount) return { ok: false, error: 'User not found' };
  await audit({ orgId: actor.orgId, action: 'automation.exempt', actorId: actor.id, actorEmail: actor.email ?? '', actorName: actor.name ?? '', targetIds: [userId], summary: exempt ? 'Exempted from automation' : 'Exemption removed' });
  return { ok: true };
}

export type RunRow = { id: string; job: string; ruleName: string; mode: string; byName: string; startedAt: string; finishedAt: string | null; ok: boolean; error: string; counts: Record<string, unknown> };

export async function listRuns(orgId: string, limit = 30, job?: string): Promise<RunRow[]> {
  await db();
  const q: Record<string, unknown> = { orgId: oid(orgId) };
  if (job) q.job = job;
  const rows = (await AutomationRun.find(q).sort({ startedAt: -1 }).limit(limit).lean()) as {
    _id: unknown;
    job: string;
    ruleName: string;
    mode: string;
    byName: string;
    startedAt: Date;
    finishedAt?: Date | null;
    ok: boolean;
    error?: string;
    counts?: Record<string, unknown>;
  }[];
  return rows.map((r) => ({
    id: String(r._id),
    job: r.job,
    ruleName: r.ruleName,
    mode: r.mode,
    byName: r.byName,
    startedAt: new Date(r.startedAt).toISOString(),
    finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : null,
    ok: r.ok,
    error: r.error ?? '',
    counts: r.counts ?? {},
  }));
}
