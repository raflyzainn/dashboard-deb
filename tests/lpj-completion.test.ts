import test from 'node:test';
import assert from 'node:assert/strict';
import { lpjEvidenceReady, lpjExceedsReceived } from '../src/lib/pelaporan';

test('Bukti LPJ tidak boleh melebihi dana Tahap 1 yang diterima', () => {
  assert.equal(lpjExceedsReceived(4_000_000_000, []), false);
  assert.equal(lpjExceedsReceived(4_000_000_000, [2_500_000_000, 1_500_000_000]), false);
  assert.equal(lpjExceedsReceived(4_000_000_000, [2_500_000_000, 1_500_000_001]), true);
  assert.equal(lpjExceedsReceived(4_000_000_000, [4_000_000_100]), true);
});

test('LPJ mensyaratkan pembayaran nyata dan sedikitnya satu bukti Sesuai', () => {
  const paid = { paidAt: '2026-10-14', paidSen: 100 };
  assert.equal(lpjEvidenceReady(paid, []), false);
  assert.equal(lpjEvidenceReady({ paidSen: 100 }, [{ status: 'sesuai' }]), false);
  assert.equal(lpjEvidenceReady({ paidAt: '2026-10-14', paidSen: 0 }, [{ status: 'sesuai' }]), false);
  for (const status of ['menunggu_review', 'perlu_revisi']) assert.equal(lpjEvidenceReady(paid, [{ status: 'sesuai' }, { status }]), false);
  assert.equal(lpjEvidenceReady(paid, [{ status: 'sesuai' }]), true);
});
