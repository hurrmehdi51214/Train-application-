import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clockTime, delayLabel, durationLabel, minutesBetween, relativeLabel } from '../src/utils/time.ts';

test('clockTime renders 24-hour time and degrades safely', () => {
  assert.equal(clockTime('2026-03-14T09:07:00.000Z'), '09:07');
  assert.equal(clockTime(null), '--:--');
  assert.equal(clockTime('not a date'), '--:--');
});

test('durationLabel reads the way a passenger says it', () => {
  assert.equal(durationLabel(45), '45m');
  assert.equal(durationLabel(60), '1h');
  assert.equal(durationLabel(128), '2h 8m');
  assert.equal(durationLabel(-15), '-15m');
});

test('minutesBetween rounds to whole minutes in both directions', () => {
  assert.equal(minutesBetween('2026-03-14T09:00:00Z', '2026-03-14T10:08:00Z'), 68);
  assert.equal(minutesBetween('2026-03-14T10:08:00Z', '2026-03-14T09:00:00Z'), -68);
});

test('delayLabel treats a minute either side of the mark as on time', () => {
  assert.equal(delayLabel(0), 'On time');
  assert.equal(delayLabel(1), 'On time');
  assert.equal(delayLabel(-1), 'On time');
  assert.equal(delayLabel(4), '4 min late');
  assert.equal(delayLabel(-3), '3 min early');
});

test('relativeLabel is coarse on purpose', () => {
  const now = new Date('2026-03-14T09:00:00Z');
  assert.equal(relativeLabel('2026-03-14T09:00:20Z', now), 'now');
  assert.equal(relativeLabel('2026-03-14T09:06:00Z', now), 'in 6 min');
  assert.equal(relativeLabel('2026-03-14T08:52:00Z', now), '8 min ago');
  assert.equal(relativeLabel('2026-03-14T11:30:00Z', now), 'in 2h 30m');
  assert.equal(relativeLabel(null, now), '');
});
