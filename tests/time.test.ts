import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clockTime,
  dayOffset,
  delayLabel,
  durationLabel,
  minutesBetween,
  relativeLabel,
} from '../src/utils/time.ts';

test('clockTime renders 24-hour time and degrades safely', () => {
  assert.equal(clockTime('2026-03-14T09:07:00.000Z'), '09:07');
  assert.equal(clockTime(null), '--:--');
  assert.equal(clockTime('not a date'), '--:--');
});

test('durationLabel leads with hours, as a long-distance train demands', () => {
  assert.equal(durationLabel(45), '45 min');
  assert.equal(durationLabel(60), '1 hr');
  assert.equal(durationLabel(26 * 60 + 40), '26 hr 40 min');
  assert.equal(durationLabel(-15), '-15 min');
});

test('minutesBetween rounds to whole minutes in both directions', () => {
  assert.equal(minutesBetween('2026-03-14T09:00:00Z', '2026-03-14T10:08:00Z'), 68);
  assert.equal(minutesBetween('2026-03-14T10:08:00Z', '2026-03-14T09:00:00Z'), -68);
});

test('delayLabel treats a minute either side as on time', () => {
  assert.equal(delayLabel(0), 'On time');
  assert.equal(delayLabel(1), 'On time');
  assert.equal(delayLabel(-1), 'On time');
  assert.equal(delayLabel(12), '12 min late');
  assert.equal(delayLabel(-3), '3 min early');
});

test('delayLabel switches to hours once a delay gets serious', () => {
  // Pakistan Railways delays regularly run past an hour; "95 min late" is
  // harder to parse at a glance than "1 hr 35 min late".
  assert.equal(delayLabel(95), '1 hr 35 min late');
  assert.equal(delayLabel(60), '1 hr late');
});

test('relativeLabel is coarse on purpose', () => {
  const now = new Date('2026-03-14T09:00:00Z');
  assert.equal(relativeLabel('2026-03-14T09:00:20Z', now), 'now');
  assert.equal(relativeLabel('2026-03-14T09:06:00Z', now), 'in 6 min');
  assert.equal(relativeLabel('2026-03-14T08:52:00Z', now), '8 min ago');
  assert.equal(relativeLabel('2026-03-14T11:30:00Z', now), 'in 2 hr 30 min');
  assert.equal(relativeLabel(null, now), '');
});

test('dayOffset counts the nights a journey crosses', () => {
  // Most trains on this network are overnight; the "+1" on an arrival time is
  // load-bearing information, not decoration.
  assert.equal(dayOffset('2026-03-14T22:00:00', '2026-03-15T21:45:00'), 1);
  assert.equal(dayOffset('2026-03-14T06:00:00', '2026-03-14T18:00:00'), 0);
  assert.equal(dayOffset('2026-03-14T09:00:00', '2026-03-16T19:00:00'), 2);
});
