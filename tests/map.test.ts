import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/lib/data/seed';
import { CAMPUS_LOCATIONS, mapCampuses, progressBands, regionSummary } from '../src/lib/map';

test('map covers every campus once with valid approximate coordinates and region summaries', () => {
  const { data } = createSeed();
  const points = mapCampuses(data);
  assert.equal(CAMPUS_LOCATIONS.length, 40);
  assert.equal(new Set(CAMPUS_LOCATIONS.map(location => location.campusId)).size, 40);
  assert.equal(points.length, data.campuses.length);
  assert.ok(points.every(point => point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100));
  assert.ok(points.every(point => progressBands[point.band]));
  const summaries = regionSummary(data);
  assert.equal(summaries.reduce((sum, row) => sum + row.campuses, 0), 40);
  assert.ok(summaries.every(row => row.provinces > 0 && Number.isFinite(row.average)));
  assert.equal(new Set(points.map(point => point.province)).size, 24);
});
