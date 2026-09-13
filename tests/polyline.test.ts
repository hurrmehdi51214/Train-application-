import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodePolyline, encodePolyline } from '../src/utils/polyline.ts';

/**
 * Google's own worked example from the Encoded Polyline Algorithm Format
 * documentation. If this decodes wrongly, every Directions route we draw is in
 * the wrong place.
 */
const GOOGLE_EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

test('decodes the reference polyline from Google’s documentation', () => {
  const points = decodePolyline(GOOGLE_EXAMPLE);
  assert.equal(points.length, 3);
  assert.deepEqual(points[0], { lat: 38.5, lon: -120.2 });
  assert.deepEqual(points[1], { lat: 40.7, lon: -120.95 });
  assert.deepEqual(points[2], { lat: 43.252, lon: -126.453 });
});

test('encode and decode round-trip at five decimal places', () => {
  const original = [
    { lat: 24.8438, lon: 67.0412 }, // Karachi Cantt
    { lat: 25.396, lon: 68.3578 }, // Hyderabad Junction
    { lat: 27.6844, lon: 68.8942 }, // Rohri Junction
    { lat: 31.5772, lon: 74.3363 }, // Lahore Junction
  ];
  const decoded = decodePolyline(encodePolyline(original));
  assert.equal(decoded.length, original.length);
  decoded.forEach((point, index) => {
    assert.ok(Math.abs(point.lat - original[index]!.lat) < 1e-5);
    assert.ok(Math.abs(point.lon - original[index]!.lon) < 1e-5);
  });
});

test('handles negative deltas, which is where naive decoders break', () => {
  const line = [
    { lat: 31.5772, lon: 74.3363 },
    { lat: 30.1804, lon: 71.4446 }, // south and west: both deltas negative
    { lat: 24.8438, lon: 67.0412 },
  ];
  const decoded = decodePolyline(encodePolyline(line));
  assert.ok(decoded[1]!.lat < decoded[0]!.lat);
  assert.ok(decoded[1]!.lon < decoded[0]!.lon);
  assert.ok(decoded[2]!.lat < decoded[1]!.lat);
});

test('an empty string decodes to an empty line rather than throwing', () => {
  assert.deepEqual(decodePolyline(''), []);
});
