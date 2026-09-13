import assert from 'node:assert/strict';
import { test } from 'node:test';

import { berthNoun, groupPnr, initials, money, moneyShort, pluralise } from '../src/utils/format.ts';

test('money renders whole rupees with thousands separators', () => {
  assert.equal(money(175_000), 'Rs 1,750');
  assert.equal(money(515_000), 'Rs 5,150');
  // Paisa never show: Pakistani rail fares are whole rupees.
  assert.equal(money(175_049), 'Rs 1,750');
});

test('money compacts large amounts when asked', () => {
  assert.equal(money(500_000, { compact: true }), 'Rs 5k');
  assert.equal(money(515_000, { compact: true }), 'Rs 5.2k');
  assert.equal(money(45_000, { compact: true }), 'Rs 450');
});

test('moneyShort drops the currency for map pins', () => {
  assert.equal(moneyShort(175_000), '1.8k');
  assert.equal(moneyShort(45_000), '450');
});

test('groupPnr breaks a PNR into what a person reads aloud', () => {
  assert.equal(groupPnr('KQ7M2XR4NP'), 'KQ7 M2X R4NP');
});

test('initials takes at most two, uppercased', () => {
  assert.equal(initials('ayesha khan'), 'AK');
  assert.equal(initials('Muhammad Bilal Ahmed Sheikh'), 'MB');
  assert.equal(initials('Nadia'), 'N');
});

test('pluralise picks the right form', () => {
  assert.equal(pluralise(1, 'traveller'), '1 traveller');
  assert.equal(pluralise(3, 'traveller'), '3 travellers');
});

test('berthNoun distinguishes a seat from a berth', () => {
  // Getting this wrong tells someone in Economy they have a berth to sleep in.
  assert.equal(berthNoun('economy'), 'seat');
  assert.equal(berthNoun('ac-business'), 'seat');
  assert.equal(berthNoun('parlour'), 'seat');
  assert.equal(berthNoun('ac-standard'), 'berth');
  assert.equal(berthNoun('ac-sleeper'), 'berth');
});
