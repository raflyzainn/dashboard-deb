import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRevise, canEditField, canUploadFile } from '../src/lib/pengajuan/revisions';
import { maskAccountNumber } from '../src/lib/pencairan';

test('document regeneration does not grant PKS field edits, including mixed revision scopes', () => {
 const journey = (scopes:string[], status='revisi') => ({status,revisionRequests:[{status:'open',scopes}]});
 const documents=journey(['dokumen']);
 assert.equal(canRevise(documents,'pks'),true);
 assert.equal(canEditField(documents,'nomorPksKampus'),false);
 assert.equal(canUploadFile(documents,'rekening'),false);
 assert.equal(canEditField(journey(['dokumen','program']),'judulProgram'),true);
 assert.equal(canEditField(journey(['dokumen','program']),'nomorPksKampus'),false);
 assert.equal(canEditField(journey(['pks']),'nomorPksKampus'),true);
 assert.equal(canEditField(journey(['pks']),'namaBank'),false);
 assert.equal(canUploadFile(journey(['administrasi']),'rekening'),true);
 assert.equal(canUploadFile(journey(['surat']),'rekening'),false);
 assert.equal(canEditField(journey(['pks'],'menunggu'),'nomorPksKampus'),false);
 assert.equal(canEditField(journey(['pks'],'selesai'),'nomorPksKampus'),false);
 assert.equal(canEditField({status:'revisi',revisionRequests:[{status:'submitted',scopes:['pks']}]},'nomorPksKampus'),false);
});

test('account summaries only reveal the final three digits, keeping short numbers hidden', () => {
 assert.equal(maskAccountNumber('00123456789'),'•••• •••• 789');
 assert.equal(maskAccountNumber('123'),'•••');
 assert.equal(maskAccountNumber('0'),'•••');
 assert.equal(maskAccountNumber(''),'');
});
