import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, levelOf, requiredLevel } from '../lib/rbac';

const learner = { role: 'student' };
const mentor = { role: 'mentor' };
const admin = { role: 'admin' };
const royal = { role: 'admin', royal: true };
const sup = { role: 'admin', royal: true, superAdmin: true };

test('levels', () => {
  assert.equal(levelOf(learner), 'student');
  assert.equal(levelOf(mentor), 'mentor');
  assert.equal(levelOf(admin), 'admin');
  assert.equal(levelOf(royal), 'royal');
  assert.equal(levelOf(sup), 'super');
  // superAdmin/royal flags on non-admins never elevate
  assert.equal(levelOf({ role: 'student', royal: true, superAdmin: true }), 'student');
});

test('hierarchy', () => {
  assert.ok(can(mentor, 'grading.review'));
  assert.ok(!can(learner, 'grading.review'));
  assert.ok(!can(admin, 'premium.grant'));
  assert.ok(can(royal, 'premium.grant'));
  assert.ok(!can(royal, 'automation.configure'));
  assert.ok(can(sup, 'automation.configure'));
  assert.ok(can(sup, 'learning.view'));
});

test('delegation only within allowed levels', () => {
  assert.ok(can(admin, 'premium.grant', { 'premium.grant': 'admin' }));
  // not delegable → override ignored
  assert.ok(!can(admin, 'automation.configure', { 'automation.configure': 'admin' } as never));
  // invalid level for a delegable permission → ignored
  assert.equal(requiredLevel('premium.grant', { 'premium.grant': 'student' }), 'royal');
});
