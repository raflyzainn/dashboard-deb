import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payoutTimeline } from '../src/lib/payout-progress';

test('payout timeline follows current documents, submission, signatures and payment', () => {
  const journey = { status: 'draf' as const, revision: 2, fields: {}, files: {} };
  const documents = ['pks', 'permohonan', 'invois', 'kuitansi'].map(kind => ({ kind, generated: true, signedReceived: false,
    currentVersionId: kind, versions: [{ id: kind, origin: 'generated', generation: { journeyRevision: 2 } }] }));
  const input = { journey, documents, hasRab: true };
  assert.equal(payoutTimeline({ ...input, documents: [] }).label, 'Isi pengajuan');
  assert.equal(payoutTimeline({ ...input, documents: documents.slice(0, 1) }).label, 'Siapkan dokumen');
  assert.equal(payoutTimeline(input).label, 'Kirim pengajuan');
  assert.equal(payoutTimeline({ ...input, journey: { ...journey, revision: 3 } }).label, 'Isi pengajuan');
  assert.equal(payoutTimeline({ ...input, journey: { ...journey, status: 'menunggu' } }).label, 'Pemeriksaan PF');
  assert.equal(payoutTimeline({ ...input, journey: { ...journey, status: 'revisi' } }).label, 'Isi pengajuan');
  assert.equal(payoutTimeline({ ...input, journey: { ...journey, status: 'selesai' } }).label, 'Tanda tangan');
  assert.equal(payoutTimeline({ ...input, journey: { ...journey, status: 'selesai' }, documents: documents.map(d => ({ ...d, signedReceived: true })) }).label, 'Pembayaran');
  assert.equal(payoutTimeline({ ...input, paidAt: '2026-10-13' }).label, 'Dana dibayar');
  assert.equal(payoutTimeline({ hasRab: false, documents: [], stage: 3 }).label, 'Periksa berkas');
});
