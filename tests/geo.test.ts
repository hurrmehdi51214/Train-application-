import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  bearingDegrees,
  boundsOf,
  cumulativeDistances,
  distanceMeters,
  formatDistance,
  pointAlong,
  projector,
  walkingMinutes,
} from '../src/utils/geo.ts';

const KGX = { lat: 51.5308, lon: -0.1238 };
const YRK = { lat: 53.9578, lon: -1.0934 };

test('distanceMeters matches the known King’s Cross – York great-circle distance', () => {
  const km = distanceMeters(KGX, YRK) / 1000;
  // Published straight-line distance is 173 miles, i.e. about 278 km. Allow 1%
  // for the spherical-earth approximation.
  assert.ok(km > 275 && km < 281, `expected ~278 km, got ${km.toFixed(1)}`);
});

test('distance is symmetric and zero for a point against itself', () => {
  assert.equal(distanceMeters(KGX, KGX), 0);
  assert.ok(Math.abs(distanceMeters(KGX, YRK) - distanceMeters(YRK, KGX)) < 1e-6);
});

test('bearing from London to York points broadly north', () => {
  const bearing = bearingDegrees(KGX, YRK);
  assert.ok(bearing > 330 || bearing < 30, `expected roughly north, got ${bearing.toFixed(1)}`);
});

test('bearing is reported clockwise from north in the 0..360 range', () => {
  assert.ok(bearingDegrees(KGX, { lat: 51.5308, lon: 0.5 }) > 85);
  assert.ok(bearingDegrees(KGX, { lat: 51.5308, lon: 0.5 }) < 95);
  const westward = bearingDegrees(KGX, { lat: 51.5308, lon: -1.5 });
  assert.ok(westward > 265 && westward < 275, `expected ~270, got ${westward}`);
});

test('pointAlong walks a polyline by distance, not by vertex count', () => {
  // Three vertices, but the first segment is ten times the length of the second.
  const line = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
    { lat: 0, lon: 1.1 },
  ];
  const { point } = pointAlong(line, 0.5);
  // Half the total distance lands inside the long first segment, near lon 0.55 -
  // a naive per-vertex interpolation would wrongly put it at the second vertex.
  assert.ok(point.lon > 0.5 && point.lon < 0.6, `got ${point.lon}`);
});

test('pointAlong clamps outside 0..1 instead of extrapolating off the route', () => {
  const line = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
  ];
  assert.equal(pointAlong(line, -3).point.lon, 0);
  assert.equal(pointAlong(line, 4).point.lon, 1);
});

test('pointAlong survives degenerate lines', () => {
  assert.deepEqual(pointAlong([], 0.5).point, { lat: 0, lon: 0 });
  assert.deepEqual(pointAlong([{ lat: 1, lon: 2 }], 0.5).point, { lat: 1, lon: 2 });
});

test('cumulativeDistances is monotonically increasing and starts at zero', () => {
  const distances = cumulativeDistances([KGX, { lat: 52.5744, lon: -0.2503 }, YRK]);
  assert.equal(distances[0], 0);
  assert.ok(distances[1]! > 0);
  assert.ok(distances[2]! > distances[1]!);
});

test('boundsOf gives a usable extent even for a single point', () => {
  const bounds = boundsOf([KGX]);
  assert.ok(bounds.maxLat > bounds.minLat);
  assert.ok(bounds.maxLon > bounds.minLon);
});

test('projector keeps every point inside the viewport it was given', () => {
  const points = [KGX, YRK, { lat: 53.5218, lon: -1.1398 }];
  const project = projector(boundsOf(points), 320, 240);
  for (const point of points) {
    const { x, y } = project(point);
    assert.ok(x >= -0.5 && x <= 320.5, `x out of range: ${x}`);
    assert.ok(y >= -0.5 && y <= 240.5, `y out of range: ${y}`);
  }
});

test('projector puts north at the top', () => {
  const project = projector(boundsOf([KGX, YRK]), 300, 300);
  assert.ok(project(YRK).y < project(KGX).y);
});

test('formatDistance switches to kilometres and rounds sensibly', () => {
  assert.equal(formatDistance(12), '10 m');
  assert.equal(formatDistance(848), '850 m');
  assert.equal(formatDistance(1240), '1.2 km');
  assert.equal(formatDistance(12400), '12 km');
});

test('walkingMinutes never returns zero for a real distance', () => {
  assert.equal(walkingMinutes(5), 1);
  assert.equal(walkingMinutes(400), 5);
});
