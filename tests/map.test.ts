import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../scripts/fixtures/seed';
import * as map from '../src/lib/map';
const { mapCampuses, progressBands, regionSummary, layoutMapPoints } = map;
import { CAMPUS_LOCATIONS } from '../scripts/fixtures/locations';
import { emptyPageData } from '../src/lib/page-data';
import { assess, KINDS, type Kind, type Status } from '../src/lib/pencairan';

test('map uses the saved program pin and keeps campuses without a usable pin in regional totals', () => {
  const data = emptyPageData();
  data.campuses = [
    { id: 'valid', name: 'Valid', initials: 'V', region: 'Jawa', program: { coordinates: '-6.2, 106.8', province: 'DKI Jakarta' } },
    { id: 'missing', name: 'Missing', initials: 'M', region: 'Jawa', program: { coordinates: '', province: 'DKI Jakarta' } },
    { id: 'invalid', name: 'Invalid', initials: 'I', region: 'Jawa', program: { coordinates: '91, 200' } }
  ];
  data.locations = data.campuses.map(c => ({ campusId: c.id, province: '', island: '', longitude: 110, latitude: -6, approximate: true }));
  data.campusMetrics = { valid: { progress: 75, achieved: 1, total: 1, revisions: 0 } };
  data.campusPayouts = { valid: { stage: 'Pemeriksaan PF', uploaded: 5,
    assessment: assess(Object.fromEntries(KINDS.map((kind, i) => [kind, i < 3 ? 'sesuai' : 'belum_ada'])) as Record<Kind, Status>,
      { suratKuasaRequired: true, redChecks: 0, paidAt: '', signedAll: false, lampiranCount: 0 }) } };
  const points = mapCampuses(data);
  assert.equal(points.length, 1);
  assert.equal(points[0].latitude, -6.2);
  assert.equal(points[0].longitude, 106.8);
  assert.equal(points[0].score, 30);
  assert.equal(points[0].province, 'DKI Jakarta');
  assert.deepEqual(regionSummary(data), [{ island: 'Jawa', campuses: 3, provinces: 1, average: 10 }]);
  assert.deepEqual(regionSummary({ ...data, campuses: [data.campuses[0]] }), [{ island: 'Jawa', campuses: 1, provinces: 1, average: 30 }]);
  delete data.campuses[1].program!.coordinates;
  const legacy = mapCampuses(data).find(point => point.id === 'missing')!;
  assert.equal(legacy.longitude, 110);
  assert.equal(legacy.latitude, -6);
  assert.equal(legacy.approximate, true);
  assert.equal(legacy.score, 0);
  data.campusPayouts.valid.assessment.total = 0;
  assert.equal(mapCampuses(data).find(point => point.id === 'valid')!.score, 0);
});

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
