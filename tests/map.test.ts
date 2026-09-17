import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../scripts/fixtures/seed';
import * as map from '../src/lib/map';
const { mapCampuses, progressBands, regionSummary, layoutMapPoints } = map;
import { CAMPUS_LOCATIONS } from '../scripts/fixtures/locations';

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

test('markers share the SVG geographic coordinate system without viewport padding', () => {
  const { data } = createSeed();
  const location = data.locations![0];
  location.longitude = 94.5; location.latitude = 6.5;
  const point = mapCampuses(data).find(point => point.id === location.campusId)!;
  assert.equal(point.x, 0);
  assert.equal(point.y, 0);
});

test('individual dots preserve anchors and separate nearby and coincident campuses', () => {
  const { data } = createSeed();
  const points = [...mapCampuses(data), { ...mapCampuses(data)[0], id: 'coincident' }];
  const original = structuredClone(points);
  for (const width of [270, 360, 1000]) for (const zoom of [1, 3]) {
    const markers = layoutMapPoints(points, width, width * .52, zoom, Math.max(310, width * .52));
    assert.equal(markers.length, points.length);
    assert.deepEqual(markers, layoutMapPoints([...points].reverse(), width, width * .52, zoom, Math.max(310, width * .52)));
    for (let i = 0; i < markers.length; i++) for (let j = i + 1; j < markers.length; j++) {
      assert.ok(Math.hypot((markers[i].markerX - markers[j].markerX) * width * zoom / 100, (markers[i].markerY - markers[j].markerY) * width * .52 * zoom / 100) >= 25.999);
    }
  }
  assert.deepEqual(points, original);
});
