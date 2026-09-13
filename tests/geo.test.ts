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

const KARACHI_CANTT = { lat: 24.8438, lon: 67.0412 };
const LAHORE_JUNCTION = { lat: 31.5772, lon: 74.3363 };
const PESHAWAR_CANTT = { lat: 34.0027, lon: 71.5423 };

test('distanceMeters matches the known Karachi–Lahore great-circle distance', () => {
  const km = distanceMeters(KARACHI_CANTT, LAHORE_JUNCTION) / 1000;
  // Straight-line Karachi to Lahore is about 1,020 km; the rail route is
  // 1,214 km because it goes via Rohri and Multan rather than in a line.
  assert.ok(km > 1000 && km < 1045, `expected ~1020 km, got ${km.toFixed(1)}`);
});

test('distance is symmetric and zero against itself', () => {
  assert.equal(distanceMeters(KARACHI_CANTT, KARACHI_CANTT), 0);
  const there = distanceMeters(KARACHI_CANTT, PESHAWAR_CANTT);
  const back = distanceMeters(PESHAWAR_CANTT, KARACHI_CANTT);
  assert.ok(Math.abs(there - back) < 1e-6);
});

test('bearing from Karachi to Peshawar points broadly north', () => {
  const bearing = bearingDegrees(KARACHI_CANTT, PESHAWAR_CANTT);
  assert.ok(bearing > 330 || bearing < 30, `expected roughly north, got ${bearing.toFixed(1)}`);
});

test('bearing is clockwise from north in the 0..360 range', () => {
  const east = bearingDegrees(KARACHI_CANTT, { lat: 24.8438, lon: 68.5 });
  assert.ok(east > 85 && east < 95, `expected ~90, got ${east}`);
  const west = bearingDegrees(KARACHI_CANTT, { lat: 24.8438, lon: 65.5 });
  assert.ok(west > 265 && west < 275, `expected ~270, got ${west}`);
});

test('pointAlong walks a polyline by distance, not by vertex count', () => {
  // Three vertices, but the first segment is ten times the second.
  const line = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
    { lat: 0, lon: 1.1 },
  ];
  const { point } = pointAlong(line, 0.5);
  // Half the total distance lands inside the long first segment. A naive
  // per-vertex interpolation would wrongly put it at the second vertex.
  assert.ok(point.lon > 0.5 && point.lon < 0.6, `got ${point.lon}`);
});

test('pointAlong clamps rather than extrapolating off the end of the route', () => {
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

test('cumulativeDistances starts at zero and increases', () => {
  const distances = cumulativeDistances([KARACHI_CANTT, LAHORE_JUNCTION, PESHAWAR_CANTT]);
  assert.equal(distances[0], 0);
  assert.ok(distances[1]! > 0);
  assert.ok(distances[2]! > distances[1]!);
});

test('boundsOf gives a usable extent even for a single point', () => {
  const bounds = boundsOf([KARACHI_CANTT]);
  assert.ok(bounds.maxLat > bounds.minLat);
  assert.ok(bounds.maxLon > bounds.minLon);
});

test('projector keeps every point inside the viewport it was given', () => {
  const points = [KARACHI_CANTT, LAHORE_JUNCTION, PESHAWAR_CANTT];
  const project = projector(boundsOf(points), 360, 240);
  for (const point of points) {
    const { x, y } = project(point);
    assert.ok(x >= -0.5 && x <= 360.5, `x out of range: ${x}`);
    assert.ok(y >= -0.5 && y <= 240.5, `y out of range: ${y}`);
  }
});

test('projector puts north at the top', () => {
  const project = projector(boundsOf([KARACHI_CANTT, PESHAWAR_CANTT]), 300, 300);
  assert.ok(project(PESHAWAR_CANTT).y < project(KARACHI_CANTT).y);
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
