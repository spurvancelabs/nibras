// =============================================================================
// FILE: lib/automation-match.ts   (NEW FILE — pure, no database)
// Decides whether one person matches an inactivity rule, and what the next
// step in the pipeline is. Kept free of I/O so it can be unit-tested.
// =============================================================================

export type RuleCriteria = {
  noLoginDays: number;
  noSubmissionDays: number;
  noAttendanceDays: number;
  combine: 'any' | 'all';
  newAccountDays: number;
};

export type ActivityFacts = {
  role: string;
  status: string;
  exempt: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  /** Did they submit anything inside the submission window? */
  submittedInWindow: boolean;
  /** Was any work due for them inside the submission window? */
  hadWorkDue: boolean;
  /** Present/late at any session inside the attendance window? */
  attendedInWindow: boolean;
  /** Did any of their sessions happen inside the attendance window? */
  hadSessions: boolean;
};

export type MatchResult = { matched: boolean; reasons: string[]; skipped?: string };

const DAY = 86_400_000;

export function matchRule(rule: RuleCriteria, f: ActivityFacts, now: number = Date.now()): MatchResult {
  if (f.role === 'admin') return { matched: false, reasons: [], skipped: 'admins are protected' };
  if (f.exempt) return { matched: false, reasons: [], skipped: 'exempt' };
  if (f.status === 'disabled') return { matched: false, reasons: [], skipped: 'already disabled' };
  if (rule.newAccountDays > 0 && now - f.createdAt.getTime() < rule.newAccountDays * DAY) {
    return { matched: false, reasons: [], skipped: 'new account' };
  }

  const checks: { used: boolean; hit: boolean; reason: string }[] = [];

  if (rule.noLoginDays > 0) {
    const ref = f.lastLoginAt ?? f.createdAt;
    const days = Math.floor((now - ref.getTime()) / DAY);
    checks.push({
      used: true,
      hit: days >= rule.noLoginDays,
      reason: f.lastLoginAt ? `no sign-in for ${days} days` : `never signed in (${days} days)`,
    });
  }
  if (rule.noSubmissionDays > 0) {
    // Only fair when they actually had something due.
    if (f.hadWorkDue) checks.push({ used: true, hit: !f.submittedInWindow, reason: `no submission in ${rule.noSubmissionDays} days` });
    else if (rule.combine === 'all') checks.push({ used: true, hit: false, reason: '' });
  }
  if (rule.noAttendanceDays > 0) {
    if (f.hadSessions) checks.push({ used: true, hit: !f.attendedInWindow, reason: `no attendance in ${rule.noAttendanceDays} days` });
    else if (rule.combine === 'all') checks.push({ used: true, hit: false, reason: '' });
  }

  const used = checks.filter((c) => c.used);
  if (!used.length) return { matched: false, reasons: [] };
  const matched = rule.combine === 'all' ? used.every((c) => c.hit) : used.some((c) => c.hit);
  return { matched, reasons: matched ? used.filter((c) => c.hit).map((c) => c.reason) : [] };
}

export type PipelineRule = { remind: boolean; flag: boolean; flagAfterDays: number; suspend: boolean; graceDays: number };
export type FlagState = { stage: 'reminded' | 'flagged' | 'suspended'; remindedAt: Date | null; flaggedAt: Date | null } | null;
export type NextAction = 'remind' | 'flag' | 'suspend' | 'wait' | 'none';

/** Next step for a person who currently MATCHES the rule. */
export function nextAction(rule: PipelineRule, state: FlagState, now: number = Date.now()): NextAction {
  if (!state) {
    if (rule.remind) return 'remind';
    if (rule.flag) return 'flag';
    return 'none';
  }
  if (state.stage === 'suspended') return 'none';
  if (state.stage === 'reminded') {
    if (!rule.flag) return 'wait';
    const since = state.remindedAt ? now - state.remindedAt.getTime() : Infinity;
    return since >= rule.flagAfterDays * DAY ? 'flag' : 'wait';
  }
  // flagged
  if (!rule.suspend) return 'wait';
  const since = state.flaggedAt ? now - state.flaggedAt.getTime() : 0;
  return since >= rule.graceDays * DAY ? 'suspend' : 'wait';
}

/** Date the next step will happen (for "will be paused on …" notices). */
export function nextStepDate(rule: PipelineRule, action: NextAction, now: number = Date.now()): Date | null {
  if (action === 'remind' && rule.flag) return new Date(now + rule.flagAfterDays * DAY);
  if (action === 'flag' && rule.suspend) return new Date(now + rule.graceDays * DAY);
  return null;
}
