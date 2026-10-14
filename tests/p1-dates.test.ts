import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validDate, nextDate, minimumDate, chronologyErrors } from '../src/lib/pengajuan/dates';

test('tanggal kalender ketat dan pergantian bulan/tahun',()=>{
 assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2028-02-29'),true);
 assert.equal(validDate('2026-4-01'),false);assert.equal(validDate('0000-01-01'),false);
 assert.equal(nextDate('2026-12-31'),'2027-01-01');assert.equal(nextDate('2028-02-28'),'2028-02-29');
});
test('SK boleh sama dengan PKS, invoice boleh sama dengan permohonan; kuitansi harus setelah invoice',()=>{
 const fields={tanggalPerjanjian:'2030-01-01',tanggalSuratPermohonan:'2030-01-02',tanggalInvois:'2030-01-02',tanggalKuitansi:'2030-01-03',jenisRekening:'kuasa',tanggalKuasa:'2030-01-02'};
 const period={agreementStart:'2029-01-01',agreementEnd:'2029-01-01'};
 assert.deepEqual(chronologyErrors(fields,'2030-01-01',period),[]);
 assert.equal(minimumDate('tanggalInvois',fields),'2030-01-02');
 assert.equal(minimumDate('tanggalKuitansi',fields),'2030-01-03');
 assert.ok(chronologyErrors({...fields,tanggalKuitansi:'2030-01-02'},'2030-01-01',period).some(e=>e.key==='tanggalKuitansi'));
 assert.ok(chronologyErrors({...fields,tanggalKuasa:'2030-01-01'},'2030-01-01',period).some(e=>e.key==='tanggalKuasa'));
 assert.ok(chronologyErrors(fields,'2030-01-02',period).some(e=>e.key==='tanggalPerjanjian'));
});
