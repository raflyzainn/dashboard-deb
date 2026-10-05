import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campusUploadBlockedReason, type Kind, type Status } from '../src/lib/pencairan';

test('campus uploads only missing or revision documents, never RAB or finalized documents', () => {
  const doc = { signedReceived: false, originalReceived: false };
  for (const kind of ['pks', 'permohonan', 'kuitansi', 'invois', 'rekening', 'surat_kuasa'] as Kind[]) {
    for (const state of ['belum_ada', 'perlu_revisi'] as Status[]) {
      assert.equal(campusUploadBlockedReason(kind, state, doc, false), '');
    }
  }
  for (const kind of ['sk', 'rab', 'rab_penuh', 'rab_tahap2'] as Kind[]) {
    assert.ok(campusUploadBlockedReason(kind, 'perlu_revisi', doc, false));
  }
  for (const state of ['sesuai', 'tidak_perlu', 'menunggu_review', 'perlu_konfirmasi'] as Status[]) {
    assert.ok(campusUploadBlockedReason('pks', state, doc, false));
  }
  assert.ok(campusUploadBlockedReason('pks', 'perlu_revisi', doc, true));
  assert.ok(campusUploadBlockedReason('pks', 'perlu_revisi', { ...doc, signedReceived: true }, false));
  assert.ok(campusUploadBlockedReason('pks', 'perlu_revisi', { ...doc, originalReceived: true }, false));
});
