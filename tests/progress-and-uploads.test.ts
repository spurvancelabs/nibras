import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekKey, weeklyStreak, computeAchievements } from '../lib/progress-core';
import { attachmentAllowed, checkFileBeforeUpload, isHttpUrl } from '../lib/upload-policy';
import { visibleNav, mobileNav, groupedNav } from '../lib/nav';

const WEEK = 7 * 86_400_000;
const now = new Date('2026-10-26T12:00:00Z'); // a Monday

test('week keys', () => {
  assert.equal(weekKey(new Date('2026-01-01T00:00:00Z')), '2026-W01');
  assert.equal(weekKey(now), weekKey(new Date('2026-11-01T23:00:00Z')));
});

test('streak continues while the current week is in progress', () => {
  const active = new Set([weekKey(new Date(now.getTime() - WEEK)), weekKey(new Date(now.getTime() - 2 * WEEK))]);
  const s = weeklyStreak(active, now);
  assert.equal(s.current, 2);
  assert.equal(s.thisWeekActive, false);
  active.add(weekKey(now));
  assert.equal(weeklyStreak(active, now).current, 3);
  assert.equal(weeklyStreak(new Set([weekKey(new Date(now.getTime() - 3 * WEEK))]), now).current, 0);
});

test('achievements', () => {
  const a = computeAchievements({ submissions: 1, perfectScores: 0, onTimeRun: 5, attendanceRate: 0.95, sessionsMarked: 3, bestQuiz: 92, quizzesPassed: 1, bestStreak: 4, certificates: 0 });
  const by = Object.fromEntries(a.map((x) => [x.id, x.earned]));
  assert.ok(by['first-step']);
  assert.ok(by['on-time']);
  assert.ok(!by['present']); // needs 5 sessions
  assert.ok(by['quiz-whiz']);
  assert.ok(by['streak-4']);
  assert.ok(!by['certified']);
});

test('upload policy', () => {
  assert.ok(attachmentAllowed({ url: 'https://res.cloudinary.com/demo/raw/upload/v1/a.pdf', format: 'pdf' }));
  assert.ok(attachmentAllowed({ url: 'https://res.cloudinary.com/demo/raw/upload/v1/app.js', format: 'js' }));
  assert.ok(!attachmentAllowed({ url: 'javascript:alert(1)' }));
  assert.ok(!attachmentAllowed({ url: 'https://evil.example/a.pdf' }));
  assert.ok(!attachmentAllowed({ url: 'https://res.cloudinary.com/demo/raw/upload/v1/x.exe', format: 'exe' }));
  assert.ok(checkFileBeforeUpload({ name: 'setup.EXE', size: 10 }));
  assert.equal(checkFileBeforeUpload({ name: 'notes.pdf', size: 10 }), null);
  assert.ok(checkFileBeforeUpload({ name: 'big.mp4', size: 60 * 1024 * 1024 }));
  assert.ok(isHttpUrl('https://docs.google.com/x'));
  assert.ok(!isHttpUrl('data:text/html,hi'));
});

test('navigation is role-aware', () => {
  const hrefs = (u: Parameters<typeof visibleNav>[0], f = {}) => visibleNav(u, f).map((n) => n.href);
  const learner = hrefs({ role: 'student' });
  assert.ok(learner.includes('/progress'));
  assert.ok(!learner.includes('/grading'));
  assert.ok(!learner.includes('/admin/users'));
  assert.ok(!learner.includes('/premium')); // premium hidden unless switched on
  assert.ok(hrefs({ role: 'student' }, { premium: true }).includes('/premium'));
  const admin = hrefs({ role: 'admin' });
  assert.ok(admin.includes('/admin/reports'));
  assert.ok(!admin.includes('/admin/security')); // royal only
  assert.ok(hrefs({ role: 'admin', royal: true }).includes('/admin/security'));
  assert.ok(hrefs({ role: 'mentor' }).includes('/grading'));
  assert.equal(new Set(hrefs({ role: 'mentor' })).size, hrefs({ role: 'mentor' }).length); // no duplicate links
  assert.ok(mobileNav({ role: 'student' }).length <= 4);
  assert.ok(groupedNav(visibleNav({ role: 'admin', royal: true, superAdmin: true })).every((g) => g.items.length > 0));
});
