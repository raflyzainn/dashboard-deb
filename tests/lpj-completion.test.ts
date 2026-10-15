import test from 'node:test';
import assert from 'node:assert/strict';
import { lpjEvidenceReady } from '../src/lib/pelaporan';

test('LPJ mensyaratkan pembayaran nyata dan sedikitnya satu bukti Sesuai', () => {
  const paid = { paidAt: '2026-10-14', paidSen: 100 };
  assert.equal(lpjEvidenceReady(paid, []), false);
  assert.equal(lpjEvidenceReady({ paidSen: 100 }, [{ status: 'sesuai' }]), false);
  assert.equal(lpjEvidenceReady({ paidAt: '2026-10-14', paidSen: 0 }, [{ status: 'sesuai' }]), false);
  for (const status of ['menunggu_review', 'perlu_revisi']) assert.equal(lpjEvidenceReady(paid, [{ status: 'sesuai' }, { status }]), false);
  assert.equal(lpjEvidenceReady(paid, [{ status: 'sesuai' }]), true);
});
