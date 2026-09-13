import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceBetween } from '../src/data/chainage.ts';
import { CLASS_ORDER, fareMinor, partyFareMinor } from '../src/data/fares.ts';

/**
 * The fare model is calibrated against Pakistan Railways' published 2025 fares
 * for the Karachi-Lahore corridor. If these assertions ever fail, the model has
 * drifted away from reality and the prices in the app are fiction.
 */

const KARACHI_LAHORE_KM = 1214;

test('the network agrees with its own published chainage', () => {
  assert.equal(distanceBetween('stn-khi-cantt', 'stn-lhr'), KARACHI_LAHORE_KM);
  // Green Line: Karachi Cantt to Islamabad, 1,518 km, per the operator.
  assert.equal(distanceBetween('stn-khi-cantt', 'stn-isb'), 1518);
  // ML-1 end to end: Karachi to Peshawar, 1,687 km.
  assert.equal(distanceBetween('stn-khi-cantt', 'stn-pew'), 1687);
});

test('Karachi to Lahore Economy lands in the published band', () => {
  const fare = fareMinor(KARACHI_LAHORE_KM, 'economy') / 100;
  // Published 2025: PKR 1,750 on the Karachi Express, 1,950 on the Karakoram.
  assert.ok(fare >= 1700 && fare <= 2100, `expected PKR 1,700-2,100, got ${fare}`);
});

test('Karachi to Lahore AC Business lands in the published band', () => {
  const fare = fareMinor(KARACHI_LAHORE_KM, 'ac-business') / 100;
  // Published 2025: PKR 4,950 to 5,450 depending on the train.
  assert.ok(fare >= 4800 && fare <= 5600, `expected PKR 4,800-5,600, got ${fare}`);
});

test('a premium multiplier stays inside the observed spread between trains', () => {
  const standard = fareMinor(KARACHI_LAHORE_KM, 'ac-business');
  const greenLine = fareMinor(KARACHI_LAHORE_KM, 'ac-business', 1.15);
  const ratio = greenLine / standard;
  assert.ok(ratio > 1.1 && ratio < 1.2, `expected ~1.15x, got ${ratio.toFixed(3)}`);
});

test('classes are monotonically priced, cheapest first', () => {
  const fares = CLASS_ORDER.map((travelClass) => fareMinor(KARACHI_LAHORE_KM, travelClass));
  for (let i = 1; i < fares.length; i += 1) {
    assert.ok(
      fares[i]! > fares[i - 1]!,
      `${CLASS_ORDER[i]} (${fares[i]}) should cost more than ${CLASS_ORDER[i - 1]} (${fares[i - 1]})`,
    );
  }
});

test('fares round to the nearest PKR 50, as the counter prices them', () => {
  for (const km of [165, 480, 920, 1214, 1687]) {
    for (const travelClass of CLASS_ORDER) {
      const rupees = fareMinor(km, travelClass) / 100;
      assert.equal(rupees % 50, 0, `${travelClass} at ${km} km came out at PKR ${rupees}`);
    }
  }
});

test('a short hop is cheaper than a long one on every class', () => {
  const hyderabad = distanceBetween('stn-khi-cantt', 'stn-hyd');
  for (const travelClass of CLASS_ORDER) {
    assert.ok(fareMinor(hyderabad, travelClass) < fareMinor(KARACHI_LAHORE_KM, travelClass));
  }
});

test('children are half fare and infants are free', () => {
  const adult = fareMinor(KARACHI_LAHORE_KM, 'ac-standard');
  assert.equal(partyFareMinor(adult, { adults: 2, children: 0, infants: 0 }), adult * 2);
  assert.equal(
    partyFareMinor(adult, { adults: 1, children: 1, infants: 0 }),
    adult + Math.round(adult * 0.5),
  );
  // An infant adds nothing at all.
  assert.equal(
    partyFareMinor(adult, { adults: 1, children: 0, infants: 3 }),
    partyFareMinor(adult, { adults: 1, children: 0, infants: 0 }),
  );
});

test('money stays in integers all the way through', () => {
  const total = partyFareMinor(fareMinor(KARACHI_LAHORE_KM, 'ac-sleeper'), {
    adults: 2,
    children: 1,
    infants: 1,
  });
  assert.equal(Number.isInteger(total), true);
});
