import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRule, nextAction } from '../lib/automation-match';

const DAY = 86_400_000;
const now = Date.parse('2026-10-26T12:00:00Z');
const rule = { noLoginDays: 30, noSubmissionDays: 0, noAttendanceDays: 0, combine: 'any' as const, newAccountDays: 14 };
const base = {
  role: 'student',
  status: 'active',
  exempt: false,
  createdAt: new Date(now - 200 * DAY),
  lastLoginAt: new Date(now - 45 * DAY),
  submittedInWindow: false,
  hadWorkDue: true,
  attendedInWindow: false,
  hadSessions: true,
};

test('matches inactivity and explains why', () => {
  const m = matchRule(rule, base, now);
  assert.ok(m.matched);
  assert.match(m.reasons[0], /45 days/);
});

test('protections', () => {
  assert.ok(!matchRule(rule, { ...base, role: 'admin' }, now).matched);
  assert.ok(!matchRule(rule, { ...base, exempt: true }, now).matched);
  assert.ok(!matchRule(rule, { ...base, status: 'disabled' }, now).matched);
  assert.ok(!matchRule(rule, { ...base, createdAt: new Date(now - 3 * DAY), lastLoginAt: null }, now).matched);
  assert.ok(!matchRule(rule, { ...base, lastLoginAt: new Date(now - 2 * DAY) }, now).matched);
});

test('never signed in counts from creation', () => {
  const m = matchRule(rule, { ...base, lastLoginAt: null, createdAt: new Date(now - 40 * DAY) }, now);
  assert.ok(m.matched);
  assert.match(m.reasons[0], /never signed in/);
});

test('submission check only when work was due', () => {
  const r = { ...rule, noLoginDays: 0, noSubmissionDays: 14 };
  assert.ok(matchRule(r, base, now).matched);
  assert.ok(!matchRule(r, { ...base, hadWorkDue: false }, now).matched);
  assert.ok(!matchRule(r, { ...base, submittedInWindow: true }, now).matched);
});

test('combine all', () => {
  const r = { ...rule, noSubmissionDays: 14, combine: 'all' as const };
  assert.ok(matchRule(r, base, now).matched);
  assert.ok(!matchRule(r, { ...base, submittedInWindow: true }, now).matched);
  assert.ok(!matchRule(r, { ...base, hadWorkDue: false }, now).matched);
});

test('staged pipeline: remind → flag → suspend after grace', () => {
  const p = { remind: true, flag: true, flagAfterDays: 7, suspend: true, graceDays: 14 };
  assert.equal(nextAction(p, null, now), 'remind');
  assert.equal(nextAction(p, { stage: 'reminded', remindedAt: new Date(now - 3 * DAY), flaggedAt: null }, now), 'wait');
  assert.equal(nextAction(p, { stage: 'reminded', remindedAt: new Date(now - 8 * DAY), flaggedAt: null }, now), 'flag');
  assert.equal(nextAction(p, { stage: 'flagged', remindedAt: null, flaggedAt: new Date(now - 10 * DAY) }, now), 'wait');
  assert.equal(nextAction(p, { stage: 'flagged', remindedAt: null, flaggedAt: new Date(now - 15 * DAY) }, now), 'suspend');
  assert.equal(nextAction(p, { stage: 'suspended', remindedAt: null, flaggedAt: null }, now), 'none');
  assert.equal(nextAction({ ...p, suspend: false }, { stage: 'flagged', remindedAt: null, flaggedAt: new Date(now - 99 * DAY) }, now), 'wait');
});
