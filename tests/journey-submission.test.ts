import test from 'node:test';
import assert from 'node:assert/strict';
import { submissionProblem } from '../src/lib/pengajuan/journey';

test('complete fields with stale chronology PKS point to PF, not missing campus data', () => {
  assert.match(submissionProblem({journey:{datePolicy:'chronology'},blockers:[],stale:['pks']}), /Admin PF/);
  assert.equal(submissionProblem({journey:{datePolicy:'chronology'},blockers:[],stale:[]}), '');
});

test('missing fields and legacy stale documents retain their own instructions', () => {
  assert.equal(submissionProblem({journey:{datePolicy:'chronology'},blockers:[{text:'Nama bank belum diisi.'}],stale:['pks']}), 'Nama bank belum diisi.');
  assert.match(submissionProblem({journey:{datePolicy:'legacy'},blockers:[],stale:['pks']}), /Buat ulang/);
});
