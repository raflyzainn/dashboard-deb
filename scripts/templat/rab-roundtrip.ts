/**
 * Checks the official layout end to end without touching the server: builds the template workbook from the example rows,
 * reads it back with the import parser, and reads a few real campus workbooks from D:\deb the same way.
 * Usage: npx tsx scripts/templat/rab-roundtrip.ts
 */
import ExcelJS from 'exceljs';
import { readFileSync, existsSync } from 'node:fs';
import { buildRabWorkbook, exampleRows } from '../../src/lib/rab-excel';
import { parseWorkbook } from '../../src/lib/server/deb/rab';
import { formatSen } from '../../src/lib/pencairan';

const report = (label: string, bytes: ArrayBuffer | Uint8Array, name: string) => {
  try {
    const r = parseWorkbook(bytes, 'UJI', name);
    console.log(`${label}: kind ${r.kind}, share ${r.share}, ${r.rows} items, ${r.lines.length} lines, 100% ${formatSen(r.totalSen)}, 70% ${formatSen(r.term1Sen)}, 30% ${formatSen(r.term2Sen || 0)}, ${r.problems.length} problems`);
    for (const p of r.problems.slice(0, 5)) console.log('   ', p.row, p.text);
    const sample = r.lines.filter(l => /^i/.test(l.key)).slice(0, 2);
    for (const l of sample) console.log('    item', JSON.stringify({ title: l.title, calc: l.calculation, vol: l.volume, unit: l.unit, harga: l.unitPriceSen / 100, jumlah: l.amountSen / 100, t1: l.term1Sen / 100, t2: (l.term2Sen || 0) / 100 }));
  } catch (e) { console.log(`${label}: FAILED ${e instanceof Error ? e.message : e}`); }
};

const wb = buildRabWorkbook(ExcelJS, { penuh: exampleRows('penuh'), tahap1: exampleRows('tahap1'), tahap2: exampleRows('tahap2') });
const buffer = await wb.xlsx.writeBuffer();
report('template (three sheets)', new Uint8Array(buffer as ArrayBuffer), 'RAB_DEB.xlsx');

const root = 'D:/deb/Review Draft Dokumen Pencairan DEB 2025/';
const files: [string, string][] = [
  ['UNDIP official single sheet', root + 'Universitas Diponegoro/04. 160726- Format RAB dan Penggunaan Dana DEB SoBI-2.xlsx'],
  ['UNMUL three sheets', root + 'Universitas Mulawarman/RAB KEBERLANJUTAN NEW 2026, fiks.xlsx'],
  ['IPB 70% file', root + 'Institut Pertanian Bogor/4. RAB 70_.xlsx'],
  ['UNTIRTA 70% file', root + 'Universitas Sultan Syarif Ageng Tirtayasa/RAB DEB UNTIRTA 2026 70%.xlsx']
];
for (const [label, path] of files) {
  if (!existsSync(path)) { console.log(label, 'missing', path); continue; }
  report(label, readFileSync(path), path.split('/').pop() || '');
}
