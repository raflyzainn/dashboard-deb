import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import PizZip from 'pizzip';
import { buildRabWorkbook, SHEET_T1 } from '../src/lib/rab-excel';
import { journeyDocx } from '../src/lib/pengajuan/journey-documents';
import { MERGE_KINDS, TEMPLATE_FILE, type MergeKind } from '../src/lib/merge';

const rows = [{ no: 'A', uraian: 'Bantuan Program' }, { no: 'A.1.a.1', uraian: 'Panel', satuan: 'unit', volume: 1, hargaSatuan: 1000, jumlah: 1000 }];
const texts = (ws: ExcelJS.Worksheet) => { const out: string[] = []; ws.eachRow(row => row.eachCell(cell => { if (typeof cell.value === 'string') out.push(cell.value); })); return out; };

test('exported RAB carries the city, the download date, the mentor and the coordinator', () => {
 const wb = buildRabWorkbook(ExcelJS, { penuh: rows, tahap1: rows, tahap2: rows, signing: { place: 'Bandung', mentor: 'Mentor Uji', coordinator: 'Koordinator Uji', date: new Date(2026, 9, 19) } });
 const values = texts(wb.getWorksheet(SHEET_T1)!);
 assert.ok(values.includes('Bandung, 19 Oktober 2026'));
 assert.ok(values.includes('Mentor Uji'));
 assert.ok(values.includes('Koordinator Uji'));
 assert.ok(!values.some(v => v.includes('(Nama Mentor)') || v.includes('DD-MM-YY')));
});

test('the blank template keeps the signature placeholders', () => {
 const values = texts(buildRabWorkbook(ExcelJS, { penuh: rows, tahap1: rows, tahap2: rows }).getWorksheet(SHEET_T1)!);
 assert.ok(values.includes('(Nama Mentor)'));
 assert.ok(values.includes('(Nama Koordinator)'));
});

test('letters are signed by the mentor while the PKS keeps the campus signatory', () => {
 const templates = Object.fromEntries(MERGE_KINDS.map(kind => [kind, new Uint8Array(readFileSync('static/templat/' + TEMPLATE_FILE[kind]))])) as Record<MergeKind, Uint8Array>;
 const c = { id: 'c1', name: 'Kampus Uji', city: 'Bandung', programYear: 'kedua', award: { skNumber: 'SK-1', skDate: '2026-06-01', amountSen: 1000000 }, program: {} };
 const r = { versions: [{ term1Sen: 700000 }], journey: { status: 'draf', lastSection: 'sk', revision: 1, history: [], files: {}, datePolicy: 'chronology', fields: { mentor: 'Mentor Uji', koordinator: 'Koordinator Uji', penandatanganNama: 'Rektor Uji', penandatanganJabatan: 'Rektor', jenisRekening: 'kampus' } } };
 const body = async (kind: MergeKind) => new PizZip(await journeyDocx(kind, c, structuredClone(r), {}, templates).arrayBuffer()).file('word/document.xml')!.asText().replace(/<[^>]+>/g, '');
 return Promise.all((['permohonan', 'invois', 'kuitansi'] as const).map(async kind => {
  const text = await body(kind);
  assert.ok(text.includes('Mentor Uji'), kind);
  assert.ok(!text.includes('Rektor Uji'), kind);
 })).then(async () => assert.ok((await body('pks')).includes('REKTOR UJI')));
});
