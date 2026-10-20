import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capaian, monthsWindow, niceMax, rabRealisasi } from '../src/lib/capaian';
import { DEFAULT_FORMULA, emptyProgram } from '../src/lib/monitoring';

const version = (month: string, status: string, n: number, incomeSen: number, electricityKwh: number, biogasM3: number) =>
  ({ id: month + n, campus: 'c', period: '', month, version: n, status, note: '', created: '', snapshot: { month: { month, incomeSen, electricityKwh, biogasM3, note: '' } } }) as any;

test('capaian counts approved and pending months, never revisions or drafts', () => {
  const program = { ...emptyProgram(), beneficiaries: 64 };
  program.evidence.solar.fileId = 'f1';
  const ws = { program, formula: DEFAULT_FORMULA, months: [{ id: 'd', month: '2026-10', revision: 1, payload: {} as any, status: 'draft' }],
    versions: [version('2026-05', 'approved', 1, 260000000, 480, 28), version('2026-07', 'revision', 1, 345000000, 510, 30), version('2026-08', 'approved', 1, 380000000, 545, 36), version('2026-09', 'pending', 1, 365000000, 525, 39), version('2026-05', 'revision', 0, 1, 1, 1)] } as any;
  const result = capaian(ws, '2026-10');
  assert.deepEqual(result.counted.map(m => m.month), ['2026-05', '2026-08', '2026-09']);
  assert.equal(result.totals.incomeSen, 1005000000);
  assert.equal(result.totals.electricityKwh, 1550);
  assert.equal(result.totals.gasEquivalentKwh, 103 * 6);
  assert.equal(result.pending, 1);
  assert.deepEqual(result.revision.map(m => m.month), ['2026-07']);
  assert.deepEqual(result.missing.map(m => m.month), ['2026-06']);
  assert.equal(result.window.find(m => m.month === '2026-10')?.status, 'draf');
  assert.equal(result.evidenceReady, 1);
});

test('window, axis and RAB helpers', () => {
  assert.deepEqual(monthsWindow('2026-02', 3), ['2025-12', '2026-01', '2026-02']);
  assert.equal(niceMax(3800000), 5000000);
  assert.equal(niceMax(545), 1000);
  assert.equal(niceMax(39), 50);
  const rows = rabRealisasi({ paid: true, receivedSen: 0, reportedSen: 0, hasApprovedRab: true,
    rabNodes: [{ code: 'A', title: 'Peralatan', level: 1, amountSen: 0, term1Sen: 900000000 }, { code: 'A.1.a', title: 'Rincian', level: 3, amountSen: 0 }, { code: 'B', title: 'Operasional', level: 1, amountSen: 0, term1Sen: 400000000 }],
    entries: [{ amountSen: 650000000, rabCode: 'A.1.a' }, { amountSen: 180000000, rabCode: 'B' }, { amountSen: 5000000, rabCode: '' }] });
  assert.deepEqual(rows.map(r => [r.title, r.planSen, r.realSen]), [['Peralatan', 900000000, 650000000], ['Operasional', 400000000, 180000000], ['Tanpa butir RAB', 0, 5000000]]);
});
