import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupReference, initials, money, pluralise } from '../src/utils/format.ts';

test('money drops the decimals on whole amounts only', () => {
  assert.equal(money(2100), '£21');
  assert.equal(money(2150), '£21.50');
});

test('groupReference breaks a reference into readable quads', () => {
  assert.equal(groupReference('AB12CD34'), 'AB12 CD34');
  assert.equal(groupReference('AB12CD'), 'AB12 CD');
});

test('initials takes at most two, uppercased', () => {
  assert.equal(initials('ada lovelace'), 'AL');
  assert.equal(initials('Grace Brewster Murray Hopper'), 'GB');
  assert.equal(initials('Prince'), 'P');
});

test('pluralise picks the right form', () => {
  assert.equal(pluralise(1, 'change'), '1 change');
  assert.equal(pluralise(2, 'change'), '2 changes');
});
