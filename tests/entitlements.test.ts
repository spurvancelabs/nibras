import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeTier, styleTier, hasPremiumAccess, canUseTier, isPremiumActive, isLifetime, daysLeft, LIFETIME } from '../lib/entitlements';

const on = { premiumEnabled: true, themeTiers: { Deluxe: 'premium' }, themeOverrides: { 'royal-gold': 'free', 'ocean-x': 'premium' }, styleTiers: { Deluxe: 'premium' }, styleOverrides: {} };
const off = { ...on, premiumEnabled: false };
const now = Date.parse('2026-10-26T12:00:00Z');

test('premium off = everything free and usable', () => {
  assert.equal(themeTier({ id: 'x', category: 'Deluxe' }, off), 'free');
  assert.ok(hasPremiumAccess({ role: 'student', premiumUntil: null }, off));
});

test('category tiers and single-theme overrides', () => {
  assert.equal(themeTier({ id: 'black-pearl', category: 'Deluxe' }, on), 'premium');
  assert.equal(themeTier({ id: 'royal-gold', category: 'Deluxe' }, on), 'free');
  assert.equal(themeTier({ id: 'ocean-x', category: 'Ocean' }, on), 'premium');
  assert.equal(themeTier({ id: 'teal', category: 'Classic' }, on), 'free');
  assert.equal(styleTier({ id: 'deluxe', category: 'Deluxe' }, on), 'premium');
});

test('who can use premium', () => {
  const future = new Date(now + 86_400_000).toISOString();
  const past = new Date(now - 1000).toISOString();
  assert.ok(canUseTier('premium', { role: 'student', premiumUntil: future }, on, now));
  assert.ok(!canUseTier('premium', { role: 'student', premiumUntil: past }, on, now));
  assert.ok(!canUseTier('premium', { role: 'mentor', premiumUntil: null }, on, now));
  assert.ok(canUseTier('premium', { role: 'admin', premiumUntil: null }, on, now));
  assert.ok(canUseTier('free', { role: 'student', premiumUntil: null }, on, now));
});

test('dates', () => {
  assert.ok(isLifetime(LIFETIME));
  assert.ok(isPremiumActive(LIFETIME, now));
  assert.equal(daysLeft(LIFETIME, now), Infinity);
  assert.equal(daysLeft(new Date(now + 1.5 * 86_400_000), now), 2);
  assert.equal(daysLeft(null, now), 0);
});
