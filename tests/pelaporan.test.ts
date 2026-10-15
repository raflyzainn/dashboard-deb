import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveReportAward } from '../src/lib/server/deb/pelaporan';

test('periode tidak memilih SK pertama bila kampus memiliki beberapa SK', () => {
  const awards = [{ id: 'sk1', skNumber: 'SK/1' }, { id: 'sk2', skNumber: 'SK/2' }];
  assert.throws(() => resolveReportAward({}, awards, []), /SK/);
  assert.equal(resolveReportAward({}, awards, [{ created: '2026-01-01', generation: { award: { id: 'sk2' } } }]), 'sk2');
  assert.equal(resolveReportAward({ properties: { reportingAward: 'sk1' } }, awards, [{ created: '2026-01-01', generation: { award: { id: 'sk2' } } }]), 'sk1');
  assert.throws(() => resolveReportAward({ properties: { reportingAward: 'missing' } }, awards, []), /SK/);
});

test('snapshot nomor SK lama tetap dapat digunakan tanpa menebak tahun komputer', () => {
  assert.equal(resolveReportAward({}, [{ id: 'old', skNumber: 'SK/2025' }], [{ generation: { award: { skNumber: 'SK/2025' } } }]), 'old');
});
