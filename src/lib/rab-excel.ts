/**
 * The one RAB workbook layout, used for the downloadable template and for every export, in the browser and in Node.
 * Sheet Petunjuk: how to fill, and a summary with live formulas (limit, totals, per kelompok, per kegiatan, Tahap 1 and 2 and combined).
 * Sheets RAB Tahap 1 and RAB Tahap 2: five columns (No, Uraian, Satuan, Volume, Jumlah). Headings are styled by conditional
 * formatting on the numbering, so rows a campus adds look the same. No indentation, no hidden metadata: the file name is for people.
 */
import type ExcelJS from 'exceljs';

export interface RabRow { no: string; uraian: string; satuan?: string; volume?: number | null; jumlah?: number | null }
export interface RabWorkbookInput { title?: string; subtitle?: string; tahap1: RabRow[]; tahap2?: RabRow[] }

export const SHEET_T1 = 'RAB Tahap 1';
export const SHEET_T2 = 'RAB Tahap 2';
const BLUE = 'FF0066B2';
const MUTED = 'FF475569';
const NAVY = 'FF0B2545';
const HEAD_FILL = 'FFDFF0FF';
const KELOMPOK_FILL = 'FFB8E2FF';
const GROUP_FILL = 'FFEEF3FA';
const MUTED_FILL = 'FFD9DEE6';
const INPUT_FILL = 'FFFFF7CC';
const LINE = 'FFC6D3E4';
const MONEY = '#,##0';
const LAST_ROW = 500;
const STEPS = [
  'Isi lembar RAB Tahap 1 (dan RAB Tahap 2 bila sudah ada). Satu baris untuk satu barang atau jasa.',
  'Kolom No menentukan tingkat: A = kelompok, A.1 = kegiatan, A.1.a = sub kegiatan, A.1.a.1 = barang. Sub kegiatan boleh dilewati, lihat kelompok B pada contoh.',
  'Baris judul (kelompok, kegiatan, sub kegiatan) cukup diisi No dan Uraian. Baris barang diisi Satuan, Volume, dan Jumlah.',
  'Jumlah adalah nilai baris dalam rupiah, angka saja tanpa Rp dan tanpa titik. Harga satuan dihitung aplikasi.',
  'Jangan menambah baris total di lembar RAB. Ringkasan di bawah menghitungnya sendiri, termasuk gabungan Tahap 1 dan Tahap 2.',
  'Ganti baris contoh dengan RAB kampus, simpan dengan nama RAB_<kode kampus>_Tahap1_v1.xlsx, lalu unggah di aplikasi pada butir RAB.'
];
/** Real rows: groups A and B from Institut Pertanian Bogor, group C from Universitas Mulawarman (Termin 1 set). No personal data. */
export const EXAMPLE_ROWS: RabRow[] = [
  { no: 'A', uraian: 'Bantuan Program' }, { no: 'A.1', uraian: 'Kegiatan Pemberdayaan Masyarakat' }, { no: 'A.1.a', uraian: 'BioTani' },
  { no: 'A.1.a.1', uraian: 'Sarung Tangan Karet', satuan: 'PU', volume: 10, jumlah: 200000 }, { no: 'A.1.a.2', uraian: 'Tepung Tulang Ikan', satuan: 'PU', volume: 8, jumlah: 200000 },
  { no: 'A.1.b', uraian: 'BioKreasi' }, { no: 'A.1.b.1', uraian: 'Tempat Studio Branding (Wadah + LED)', satuan: 'PU', volume: 2, jumlah: 60000 }, { no: 'A.1.b.2', uraian: 'Alas foto lipat uk 30 x 45cm', satuan: 'PU', volume: 2, jumlah: 50000 },
  { no: 'A.2', uraian: 'Kegiatan Peningkatan Pembangunan EBT' }, { no: 'A.2.a', uraian: 'Dapur Usaha UMKM' }, { no: 'A.2.a.1', uraian: 'Selang Pompa Air 2 inch', satuan: 'PU', volume: 20, jumlah: 1600000 }, { no: 'A.2.a.2', uraian: 'Tandon', satuan: 'PU', volume: 4, jumlah: 6000000 },
  { no: 'B', uraian: 'Bantuan Pendampingan' }, { no: 'B.1', uraian: 'Bantuan Transport' }, { no: 'B.1.1', uraian: 'Pelaksanaan kegiatan', satuan: 'PO', volume: 84, jumlah: 1680000 },
  { no: 'B.2', uraian: 'Bantuan Mentoring Mentor' }, { no: 'B.2.1', uraian: 'Honor Pemateri', satuan: 'PO', volume: 1, jumlah: 350000 },
  { no: 'C', uraian: 'Biaya Pendukung' }, { no: 'C.1', uraian: 'Kegiatan Penurunan Emisi CO2' }, { no: 'C.1.a', uraian: 'Program Penanaman Pohon Buah' },
  { no: 'C.1.a.1', uraian: 'Bibit Pohon', satuan: 'PU', volume: 50, jumlah: 1000000 }, { no: 'C.1.a.2', uraian: 'Konsumsi Penanaman', satuan: 'PU', volume: 30, jumlah: 750000 }
];
const GROUPS = ['A', 'B', 'C', 'D', 'E'];
const ACTIVITIES = GROUPS.flatMap(g => Array.from({ length: g === 'A' || g === 'B' ? 6 : 4 }, (_, i) => `${g}.${i + 1}`));

const border: Partial<ExcelJS.Borders> = { top: { style: 'thin', color: { argb: LINE } }, left: { style: 'thin', color: { argb: LINE } }, bottom: { style: 'thin', color: { argb: LINE } }, right: { style: 'thin', color: { argb: LINE } } };
const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const q = (sheet: string) => `'${sheet}'`;

function rabSheet(wb: ExcelJS.Workbook, name: string, rows: RabRow[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [{ header: 'No', key: 'no', width: 12 }, { header: 'Uraian', key: 'uraian', width: 52 }, { header: 'Satuan', key: 'satuan', width: 10 }, { header: 'Volume', key: 'volume', width: 10 }, { header: 'Jumlah', key: 'jumlah', width: 18 }];
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: BLUE } };
  head.eachCell(cell => { cell.fill = fill(HEAD_FILL); cell.border = border; });
  for (const r of rows) ws.addRow({ no: r.no, uraian: r.uraian, satuan: r.satuan || null, volume: r.volume ?? null, jumlah: r.jumlah ?? null });
  for (let i = 2; i <= LAST_ROW; i++) {
    const row = ws.getRow(i);
    row.getCell(4).numFmt = 'General';
    row.getCell(5).numFmt = MONEY;
    if (i <= rows.length + 1) row.eachCell({ includeEmpty: true }, cell => { cell.border = border; });
  }
  // Headings are recognised by their numbering: no dot = kelompok, one dot = kegiatan, two dots = sub kegiatan (unless it carries a Jumlah, then it is an item).
  const depth = `LEN($A2)-LEN(SUBSTITUTE($A2,".",""))`;
  const isKelompok = `AND(LEN($A2)>0,${depth}=0)`;
  const isKegiatan = `AND(LEN($A2)>0,${depth}=1)`;
  const isSub = `AND(LEN($A2)>0,${depth}=2,LEN($E2)=0)`;
  const solid = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', bgColor: { argb } });
  // Satuan, Volume and Jumlah are greyed out on heading rows so nobody fills them there. These rules come first so they win over the row fills.
  ws.addConditionalFormatting({ ref: `C2:E${LAST_ROW}`, rules: [
    { type: 'expression', priority: 1, formulae: [`OR(${isKelompok},${isKegiatan},${isSub})`], style: { fill: solid(MUTED_FILL) } }
  ] });
  ws.addConditionalFormatting({ ref: `A2:E${LAST_ROW}`, rules: [
    { type: 'expression', priority: 2, formulae: [isKelompok], style: { font: { bold: true, color: { argb: NAVY } }, fill: solid(KELOMPOK_FILL), border: { top: { style: 'medium', color: { argb: BLUE } } } } },
    { type: 'expression', priority: 3, formulae: [isKegiatan], style: { font: { bold: true, color: { argb: NAVY } }, fill: solid(GROUP_FILL) } },
    { type: 'expression', priority: 4, formulae: [isSub], style: { font: { bold: true, italic: true, color: { argb: MUTED } } } }
  ] });
  return ws;
}

function guideSheet(wb: ExcelJS.Workbook, input: RabWorkbookInput) {
  const ws = wb.addWorksheet('Petunjuk', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 30 }, { width: 44 }, { width: 16 }, { width: 16 }, { width: 16 }];
  const label = (row: number, text: string, opts: Partial<ExcelJS.Font> = {}) => { const c = ws.getCell(row, 1); c.value = text; c.font = { bold: true, ...opts }; return c; };
  ws.getCell(1, 1).value = input.title || 'RAB · Program Desa Energi Berdikari Sobat Bumi';
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: BLUE } };
  ws.getCell(2, 1).value = input.subtitle || 'Tahap 1 paling banyak 70% dari Nilai SK, tepat, tanpa pembulatan. Tahap 1 dan Tahap 2 bersama sama sama dengan Nilai SK.';
  ws.getCell(2, 1).font = { color: { argb: MUTED } };
  label(4, 'Cara mengisi', { color: { argb: BLUE } });
  let row = 5;
  for (const [i, step] of STEPS.entries()) {
    ws.mergeCells(row, 1, row, 5);
    const c = ws.getCell(row, 1);
    c.value = `${i + 1}. ${step}`;
    c.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(row).height = 30;
    row++;
  }
  row++;
  label(row, 'Ringkasan', { color: { argb: BLUE } });
  row++;
  const sk = row;
  const t1 = `SUM(${q(SHEET_T1)}!E:E)`, t2 = `SUM(${q(SHEET_T2)}!E:E)`;
  const lines: [string, string | null, string][] = [
    ['Nilai SK (Rp)', null, 'isi dari SK penetapan'],
    ['Batas Tahap 1 (70%)', `B${sk}*70%`, ''],
    ['Total RAB Tahap 1', t1, `dari lembar ${SHEET_T1}`],
    ['Total RAB Tahap 2', t2, `dari lembar ${SHEET_T2}`],
    ['Total RAB (Tahap 1 + Tahap 2)', `B${sk + 2}+B${sk + 3}`, ''],
    ['Sisa batas Tahap 1', `B${sk + 1}-B${sk + 2}`, ''],
    ['Selisih RAB terhadap Nilai SK', `B${sk}-B${sk + 4}`, ''],
    ['Keterangan Tahap 1', `IF(B${sk}=0,"Isi Nilai SK dulu",IF(B${sk + 2}<=B${sk + 1},"Tidak melebihi batas","Melebihi batas"))`, ''],
    ['Keterangan RAB gabungan', `IF(B${sk}=0,"",IF(B${sk + 4}=B${sk},"Sama dengan Nilai SK",IF(B${sk + 4}<B${sk},"Di bawah Nilai SK","Di atas Nilai SK")))`, '']
  ];
  for (const [text, formula, hint] of lines) {
    label(row, text);
    const c = ws.getCell(row, 2);
    if (formula) c.value = { formula }; else c.fill = fill(INPUT_FILL);
    c.numFmt = MONEY; c.border = border;
    if (hint) { ws.getCell(row, 3).value = hint; ws.getCell(row, 3).font = { color: { argb: MUTED } }; }
    row++;
  }
  const table = (title: string, codes: string[]) => {
    row++;
    label(row, title, { color: { argb: BLUE } });
    row++;
    ['Kode', 'Nama', 'Tahap 1', 'Tahap 2', 'Total'].forEach((h, i) => { const c = ws.getCell(row, i + 1); c.value = h; c.font = { bold: true, color: { argb: BLUE } }; c.fill = fill(HEAD_FILL); c.border = border; });
    row++;
    for (const code of codes) {
      const r = row;
      ws.getCell(r, 1).value = code;
      const name = (sheet: string) => `INDEX(${q(sheet)}!B:B,MATCH($A${r},${q(sheet)}!A:A,0))`;
      ws.getCell(r, 2).value = { formula: `IFERROR(${name(SHEET_T1)},IFERROR(${name(SHEET_T2)},""))` };
      const sum = (sheet: string) => `SUMIF(${q(sheet)}!A:A,$A${r}&".*",${q(sheet)}!E:E)`;
      ws.getCell(r, 3).value = { formula: `IF($B${r}="","",${sum(SHEET_T1)})` };
      ws.getCell(r, 4).value = { formula: `IF($B${r}="","",${sum(SHEET_T2)})` };
      ws.getCell(r, 5).value = { formula: `IF($B${r}="","",C${r}+D${r})` };
      for (let c = 1; c <= 5; c++) { ws.getCell(r, c).border = border; if (c >= 3) ws.getCell(r, c).numFmt = MONEY; }
      row++;
    }
    const totalRow = row;
    ws.getCell(totalRow, 2).value = 'Jumlah';
    ws.getCell(totalRow, 2).font = { bold: true };
    for (const col of [3, 4, 5]) { const L = String.fromCharCode(64 + col); ws.getCell(totalRow, col).value = { formula: `SUM(${L}${totalRow - codes.length}:${L}${totalRow - 1})` }; ws.getCell(totalRow, col).numFmt = MONEY; ws.getCell(totalRow, col).font = { bold: true }; ws.getCell(totalRow, col).border = border; }
    ws.getCell(totalRow, 1).border = border; ws.getCell(totalRow, 2).border = border;
    row++;
  };
  table('Per kelompok', GROUPS);
  table('Per kegiatan', ACTIVITIES);
  return ws;
}

/** Builds the workbook. ExcelJS is passed in so the same code runs in the browser (dynamic import) and in Node. */
export function buildRabWorkbook(Excel: typeof ExcelJS, input: RabWorkbookInput): ExcelJS.Workbook {
  const wb = new Excel.Workbook();
  wb.creator = 'MonevDEB';
  guideSheet(wb, input);
  rabSheet(wb, SHEET_T1, input.tahap1);
  rabSheet(wb, SHEET_T2, input.tahap2 || []);
  return wb;
}

/** Managed RAB lines (as the overview API returns them) into template rows: headings with a name, items with the Tahap 1 amount in rupiah. */
export function linesToRows(lines: { level: number; code: string; title: string; unit: string; volume: number; amountSen: number; term1Sen: number }[], maxLevel = 4): RabRow[] {
  const out: RabRow[] = [];
  for (const line of lines) {
    if (line.level < maxLevel) { if (line.title) out.push({ no: line.code, uraian: line.title }); continue; }
    out.push({ no: line.code, uraian: line.title, satuan: line.unit, volume: line.volume, jumlah: Math.round(line.term1Sen || line.amountSen) / 100 });
  }
  return out;
}

/** Browser: builds the workbook for one campus and hands it to the download. */
export async function downloadRabWorkbook(fileName: string, input: RabWorkbookInput) {
  const mod = await import('exceljs');
  const Excel = ((mod as { default?: typeof ExcelJS }).default ?? mod) as typeof ExcelJS;
  const wb = buildRabWorkbook(Excel, input);
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
