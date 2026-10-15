import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, KINDS, type Kind, type Status } from '../src/lib/pencairan';

test('payment readiness requires checked scans and attachments, not paper originals', () => {
 const statuses=Object.fromEntries(KINDS.map(kind=>[kind,'sesuai'])) as Record<Kind,Status>;
 const input={suratKuasaRequired:false,redChecks:0,paidAt:'',signedAll:true,lampiranCount:1,submissionStatus:'selesai'};
 assert.equal(assess(statuses,input).state,'siap_dibayar');
 assert.notEqual(assess(statuses,{...input,signedAll:false}).state,'siap_dibayar');
 assert.notEqual(assess(statuses,{...input,lampiranCount:0}).state,'siap_dibayar');
 assert.notEqual(assess(statuses,{...input,submissionStatus:'revisi'}).state,'siap_dibayar');
});
