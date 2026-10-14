import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonitoring, validateMonth, latestApproved, DEFAULT_FORMULA, monitoringPeriods } from '../src/lib/monitoring';

test('monitoring tanpa master indikator memakai periode awal; arsip tidak diaktifkan kembali', () => {
  assert.deepEqual(monitoringPeriods([]), [{ id: '', name: 'Periode awal', state: 'active' }]);
  const periods = monitoringPeriods([{ period: '2026', periodState: 'archived' }]);
  assert.equal(periods.find(p => p.id === '2026')?.state, 'archived');
  assert.equal(periods.find(p => p.id === '')?.state, 'archived');
});

test('annualisasi memakai bulan dilaporkan termasuk nol, bukan bulan kalender yang kosong', () => {
  const rows = [0, 10000000, 20000000].map(incomeSen => ({ incomeSen, electricityKwh: 0, biogasM3: 0 }));
  const result = calculateMonitoring(rows, 10, DEFAULT_FORMULA);
  assert.equal(result.annualIncomeSen, 120000000);
  assert.equal(result.perCapitaSen, 12000000);
  assert.equal(calculateMonitoring([], 10, DEFAULT_FORMULA).perCapitaSen, null);
  assert.equal(calculateMonitoring(rows, 0, DEFAULT_FORMULA).perCapitaSen, null);
});
test('biogas adalah energi setara; perubahan faktor tidak mengubah snapshot rumus lama', () => {
  const rows = [{ incomeSen: 0, electricityKwh: 10, biogasM3: 100 }];
  assert.equal(calculateMonitoring(rows, 1, DEFAULT_FORMULA).equivalentKwh, 610);
  assert.equal(calculateMonitoring(rows, 1, { ...DEFAULT_FORMULA, biogasFactor: 5 }).equivalentKwh, 510);
  assert.equal(DEFAULT_FORMULA.biogasFactor, 6);
});
test('annualisasi konsisten untuk 6, 12 dan 18 bulan, tidak menjumlahkan penerima manfaat tiap bulan', () => {
  for (const months of [6, 12, 18]) {
    const rows = Array.from({ length: months }, () => ({ incomeSen: 10000000, electricityKwh: 0, biogasM3: 0 }));
    assert.equal(calculateMonitoring(rows, 10, DEFAULT_FORMULA).perCapitaSen, 12000000);
  }
});
test('bulan mendatang, bulan tidak valid dan nilai negatif ditolak', () => {
  assert.throws(() => validateMonth({ month: '2026-13', incomeSen: 0, electricityKwh: 0, biogasM3: 0, note: '' }, '2026-10'));
  assert.throws(() => validateMonth({ month: '2026-11', incomeSen: 0, electricityKwh: 0, biogasM3: 0, note: '' }, '2026-10'));
  assert.throws(() => validateMonth({ month: '2026-10', incomeSen: -1, electricityKwh: 0, biogasM3: 0, note: '' }, '2026-10'));
});
test('ringkasan memakai versi sesuai terakhir setiap bulan, bukan revisi yang belum disetujui', () => {
  const rows = [{ month: '2026-01', version: 1, status: 'approved' }, { month: '2026-01', version: 2, status: 'pending' }, { month: '2026-02', version: 1, status: 'approved' }];
  assert.deepEqual(latestApproved(rows), [rows[0], rows[2]]);
});
