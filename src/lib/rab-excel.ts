/**
 * The RAB workbook in the official Pertamina Foundation layout ("Format RAB dan Penggunaan Dana DEB SoBI"), used for the
 * downloadable template and for every export, in the browser and in Node. Three sheets, RAB 100%, RAB 70%, RAB 30%, each with
 * the same columns as the official form: No, URAIAN KEGIATAN/ PROGRAM, PERHITUNGAN (its parts in separate cells), VOLUME with
 * its unit, HARGA SATUAN, JUMLAH, plus Sub total, Jumlah per kegiatan, the grand total and the signature block. A Petunjuk sheet
 * carries the steps and a summary that reconciles the three sheets. No hidden metadata.
 */
import type ExcelJS from 'exceljs';

/** One row of a sheet: headings carry a code and a name; items carry the calculation, volume, unit, unit price and amount in rupiah. */
export interface RabRow { no: string; uraian: string; calculation?: string; satuan?: string; volume?: number | null; hargaSatuan?: number | null; jumlah?: number | null }
export interface RabWorkbookInput { title?: string; university?: string; village?: string; penuh: RabRow[]; tahap1: RabRow[]; tahap2: RabRow[] }

export const SHEET_FULL = 'RAB 100%';
export const SHEET_T1 = 'RAB 70%';
export const SHEET_T2 = 'RAB 30%';
const BLUE = 'FF0066B2';
const MUTED = 'FF475569';
const NAVY = 'FF0B2545';
const HEAD_FILL = 'FFDFF0FF';
const KELOMPOK_FILL = 'FFEEF3FA';
const INPUT_FILL = 'FFFFF7CC';
const LINE = 'FF8A96A8';
const MONEY = '#,##0';
/** Columns of the official form: B No, C kegiatan, D sub, E sub name, F uraian, G to N perhitungan, O volume, P satuan, Q harga satuan, R jumlah. */
const COL = { no: 2, kegiatan: 3, sub: 4, subName: 5, uraian: 6, calcStart: 7, calcEnd: 14, volume: 15, unit: 16, price: 17, amount: 18 } as const;
const WIDTHS: Record<number, number> = { 1: 1.7, 2: 4.4, 3: 2.7, 4: 2.7, 5: 3.4, 6: 39, 7: 5.9, 8: 4.7, 9: 2.4, 10: 4.3, 11: 5.1, 12: 3, 13: 4, 14: 4.7, 15: 8.4, 16: 4.1, 17: 12.4, 18: 13.1 };
const FIRST_DATA_ROW = 10;
const STEPS = [
  'Isi tiga lembar dengan format resmi yang sama: RAB 100% (seluruh anggaran program), RAB 70% (bagian yang dicairkan di Tahap 1), RAB 30% (bagian Tahap 2). Satu baris untuk satu barang atau jasa.',
  'Kolom No memuat huruf kelompok (A, B, C), kolom berikutnya nomor kegiatan (1, 2) dan huruf sub kegiatan (a., b.). Nama barang ditulis di kolom URAIAN; nama kelompok, kegiatan, dan sub kegiatan di sebelah kanan nomornya, seperti pada contoh.',
  'PERHITUNGAN diisi per sel: angka, satuan, x, angka, satuan, x, angka, satuan (misalnya 1 Pkt x 25 Org x 2 Hari). VOLUME adalah hasil kalinya, dengan satuannya di sel sebelah kanan (PU, PO, OH).',
  'JUMLAH = VOLUME x HARGA SATUAN, dalam rupiah, angka saja. Baris Sub total, Jumlah, dan Total dihitung rumus; jangan diketik.',
  'Pakai nama kelompok, kegiatan, sub kegiatan, dan uraian yang sama di ketiga lembar agar tiap baris RAB 70% dan RAB 30% bertemu baris RAB 100% nya. Untuk tiap baris, RAB 70% + RAB 30% = RAB 100%.',
  'Ganti baris contoh dengan RAB kampus, isi nama universitas dan desa di atas tabel, simpan dengan nama RAB_<kode kampus>_v1.xlsx, lalu unggah di aplikasi pada butir RAB.'
];

/**
 * Real rows (Institut Pertanian Bogor groups A and B, Universitas Mulawarman group C, Termin 1 sets, with their own calculations).
 * The example puts groups A and B in Tahap 1 and group C in Tahap 2, so every line's RAB 70% plus RAB 30% equals its RAB 100%.
 */
export const EXAMPLE_ROWS: RabRow[] = [
  { no: 'A', uraian: 'Bantuan Program' }, { no: 'A.1', uraian: 'Kegiatan Pemberdayaan Masyarakat' }, { no: 'A.1.a', uraian: 'BioTani' },
  { no: 'A.1.a.1', uraian: 'Sarung Tangan Karet', calculation: '1 Pkt x 10 Unit x 1 Kali', volume: 10, satuan: 'PU', hargaSatuan: 20000, jumlah: 200000 },
  { no: 'A.1.a.2', uraian: 'Tepung Tulang Ikan', calculation: '1 Pkt x 8 Unit x 1 Kali', volume: 8, satuan: 'PU', hargaSatuan: 25000, jumlah: 200000 },
  { no: 'A.1.b', uraian: 'BioKreasi' },
  { no: 'A.1.b.1', uraian: 'Tempat Studio Branding (Wadah + LED)', calculation: '1 Pkt x 2 Unit x 1 Kali', volume: 2, satuan: 'PU', hargaSatuan: 30000, jumlah: 60000 },
  { no: 'A.1.b.2', uraian: 'Alas foto lipat uk 30 x 45cm', calculation: '1 Pkt x 2 Unit x 1 Kali', volume: 2, satuan: 'PU', hargaSatuan: 25000, jumlah: 50000 },
  { no: 'A.2', uraian: 'Kegiatan Peningkatan Pembangunan EBT' }, { no: 'A.2.a', uraian: 'Dapur Usaha UMKM' },
  { no: 'A.2.a.1', uraian: 'Selang Pompa Air 2 inch', calculation: '1 Pkt x 20 Unit x 1 Kali', volume: 20, satuan: 'PU', hargaSatuan: 80000, jumlah: 1600000 },
  { no: 'B', uraian: 'Bantuan Pendampingan' }, { no: 'B.1', uraian: 'Bantuan Transport' },
  { no: 'B.1.1', uraian: 'Pelaksanaan kegiatan', calculation: '28 Org x 3 Hari x 1 Kali', volume: 84, satuan: 'PO', hargaSatuan: 20000, jumlah: 1680000 },
  { no: 'B.2', uraian: 'Bantuan Mentoring Mentor' },
  { no: 'B.2.1', uraian: 'Honor Pemateri', calculation: '1 Pkt x 1 Org x 1 Kali', volume: 1, satuan: 'PO', hargaSatuan: 350000, jumlah: 350000 },
  { no: 'C', uraian: 'Biaya Pendukung' }, { no: 'C.1', uraian: 'Kegiatan Penurunan Emisi CO2' }, { no: 'C.1.a', uraian: 'Program Penanaman Pohon Buah' },
  { no: 'C.1.a.1', uraian: 'Bibit Pohon', calculation: '1 Pkt x 50 Phn x 1 Kali', volume: 50, satuan: 'PU', hargaSatuan: 20000, jumlah: 1000000 },
  { no: 'C.1.a.2', uraian: 'Konsumsi Penanaman', calculation: '1 Pkt x 30 Org x 1 Kali', volume: 30, satuan: 'PU', hargaSatuan: 25000, jumlah: 750000 }
];
const isHeading = (r: RabRow) => r.jumlah === null || r.jumlah === undefined;
/** The example rows of one sheet: all lines for RAB 100%; for a part, the headings plus the lines of the groups in that part. */
export const exampleRows = (share: 'penuh' | 'tahap1' | 'tahap2'): RabRow[] => (share === 'penuh' ? EXAMPLE_ROWS : EXAMPLE_ROWS.filter(r => isHeading(r) || (share === 'tahap1' ? !r.no.startsWith('C') : r.no.startsWith('C'))));

const border: Partial<ExcelJS.Borders> = { top: { style: 'thin', color: { argb: LINE } }, left: { style: 'thin', color: { argb: LINE } }, bottom: { style: 'thin', color: { argb: LINE } }, right: { style: 'thin', color: { argb: LINE } } };
const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const q = (sheet: string) => `'${sheet}'`;
const depthOf = (no: string) => no.split('.').length;
/** The enumerator the official form shows beside a heading: A for a kelompok, 1 for a kegiatan, a. for a sub kegiatan. */
const enumerator = (no: string) => { const parts = no.split('.'); const last = parts[parts.length - 1]; return parts.length === 3 ? `${last}.` : last; };

/** One RAB sheet in the official layout. Rows come flat with codes; the code depth decides the row kind. */
function rabSheet(wb: ExcelJS.Workbook, name: string, rows: RabRow[], input: RabWorkbookInput) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: FIRST_DATA_ROW - 1 }] });
  for (const [col, width] of Object.entries(WIDTHS)) ws.getColumn(Number(col)).width = width;
  const cell = (r: number, c: number) => ws.getCell(r, c);
  cell(4, COL.no).value = input.title || 'RAB PROGRAM DESA ENERGI BERDIKARI (DEB) SOBAT BUMI PERTAMINA';
  cell(4, COL.no).font = { bold: true, size: 12 };
  cell(5, COL.no).value = input.university || 'UNIVERSITAS ……………………';
  cell(5, COL.no).font = { bold: true };
  cell(6, COL.no).value = input.village || 'Desa ……………………';
  cell(7, COL.no).value = `Lembar ${name}`;
  cell(7, COL.no).font = { color: { argb: MUTED }, italic: true };
  // Header on two rows, merged as in the official form.
  const heads: [number, number, string][] = [[COL.no, COL.no, 'No'], [COL.kegiatan, COL.uraian, 'URAIAN KEGIATAN/ PROGRAM'], [COL.calcStart, COL.calcEnd, 'PERHITUNGAN'], [COL.volume, COL.unit, 'VOLUME'], [COL.price, COL.price, 'HARGA SATUAN'], [COL.amount, COL.amount, 'JUMLAH']];
  for (const [from, to, text] of heads) {
    ws.mergeCells(8, from, 9, to);
    const c = cell(8, from);
    c.value = text; c.font = { bold: true, color: { argb: NAVY } }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.fill = fill(HEAD_FILL);
    for (let r = 8; r <= 9; r++) for (let k = from; k <= to; k++) cell(r, k).border = border;
  }
  ws.getRow(8).height = 18; ws.getRow(9).height = 18;

  let r = FIRST_DATA_ROW;
  const itemRows: number[] = [];       // rows of the items of the current sub kegiatan (or kegiatan without sub)
  const subTotalRows: number[] = [];   // Sub total rows of the current kegiatan
  const kegiatanRows: number[] = [];   // Jumlah rows of the current kelompok
  const kelompokRows: number[] = [];   // Jumlah rows of every kelompok
  let kegiatanNo = '';
  let kelompokName = '';
  let hasSub = false;
  const styleRow = (row: number, bold = false, fillArgb?: string) => {
    for (let k = COL.no; k <= COL.amount; k++) { const c = cell(row, k); c.border = border; if (bold) c.font = { bold: true }; if (fillArgb) c.fill = fill(fillArgb); }
    cell(row, COL.volume).numFmt = '#,##0.####'; cell(row, COL.price).numFmt = MONEY; cell(row, COL.amount).numFmt = MONEY;
  };
  const sumFormula = (cells: number[]) => (cells.length ? { formula: cells.length > 1 && cells.every((v, i) => i === 0 || v === cells[i - 1] + 1) ? `SUM(R${cells[0]}:R${cells[cells.length - 1]})` : cells.map(v => `R${v}`).join('+') } : 0);
  const closeSub = () => { if (!itemRows.length) return; cell(r, COL.uraian).value = 'Sub total'; cell(r, COL.uraian).alignment = { horizontal: 'right' }; cell(r, COL.amount).value = sumFormula(itemRows); styleRow(r, true); subTotalRows.push(r); itemRows.length = 0; r++; };
  const closeKegiatan = () => { closeSub(); if (!subTotalRows.length) return; cell(r, COL.uraian).value = `Jumlah-${kegiatanNo}`; cell(r, COL.uraian).alignment = { horizontal: 'right' }; cell(r, COL.amount).value = sumFormula(subTotalRows); styleRow(r, true); kegiatanRows.push(r); subTotalRows.length = 0; r++; };
  const closeKelompok = () => { closeKegiatan(); if (!kegiatanRows.length) return; cell(r, COL.uraian).value = `Jumlah ${kelompokName}`; cell(r, COL.uraian).alignment = { horizontal: 'right' }; cell(r, COL.amount).value = sumFormula(kegiatanRows); styleRow(r, true, KELOMPOK_FILL); kelompokRows.push(r); kegiatanRows.length = 0; r++; };

  for (const row of rows) {
    const depth = depthOf(row.no);
    if (isHeading(row)) {
      if (depth === 1) { closeKelompok(); kelompokName = row.uraian; hasSub = false; cell(r, COL.no).value = enumerator(row.no); cell(r, COL.kegiatan).value = row.uraian; styleRow(r, true, KELOMPOK_FILL); r++; }
      else if (depth === 2) { closeKegiatan(); kegiatanNo = enumerator(row.no); hasSub = false; cell(r, COL.kegiatan).value = kegiatanNo; cell(r, COL.sub).value = row.uraian; styleRow(r, true); r++; }
      else { closeSub(); hasSub = true; cell(r, COL.sub).value = enumerator(row.no); cell(r, COL.subName).value = row.uraian; styleRow(r); cell(r, COL.subName).font = { bold: true, italic: true }; r++; }
      continue;
    }
    if (depth === 2 && kegiatanRows.length + subTotalRows.length + itemRows.length === 0 && !kelompokName) { /* item straight under a kelompok: treated like a kegiatan item */ }
    void hasSub;
    cell(r, COL.uraian).value = row.uraian;
    const tokens = String(row.calculation || '').trim().split(/\s+/).filter(Boolean).slice(0, COL.calcEnd - COL.calcStart + 1);
    tokens.forEach((t, i) => { const c = cell(r, COL.calcStart + i); const n = Number(t.replace(',', '.')); c.value = t !== '' && !Number.isNaN(n) && /^[\d.,]+$/.test(t) ? n : t; c.alignment = { horizontal: /^x$/i.test(t) ? 'center' : 'left' }; });
    cell(r, COL.volume).value = row.volume ?? null;
    cell(r, COL.unit).value = row.satuan || null;
    cell(r, COL.price).value = row.hargaSatuan ?? null;
    const product = (row.volume ?? 0) * (row.hargaSatuan ?? 0);
    cell(r, COL.amount).value = row.jumlah !== null && row.jumlah !== undefined && row.jumlah === product ? { formula: `O${r}*Q${r}`, result: row.jumlah } : row.jumlah ?? null;
    styleRow(r);
    itemRows.push(r);
    r++;
  }
  closeKelompok();
  const grand = r;
  cell(grand, COL.uraian).value = 'Total Anggaran DEB Sobat Bumi Pertamina';
  cell(grand, COL.uraian).alignment = { horizontal: 'right' };
  cell(grand, COL.amount).value = sumFormula(kelompokRows);
  styleRow(grand, true, HEAD_FILL);
  // Signature block as in the official form.
  cell(grand + 2, COL.calcStart + 5).value = '…........................, (DD-MM-YY)';
  cell(grand + 4, COL.uraian).value = 'Tandatangan'; cell(grand + 4, COL.calcStart + 5).value = 'Tandatangan';
  cell(grand + 8, COL.uraian).value = '(Nama Mentor)'; cell(grand + 8, COL.calcStart + 5).value = '(Nama Koordinator)';
  return ws;
}

function guideSheet(wb: ExcelJS.Workbook, input: RabWorkbookInput) {
  const ws = wb.addWorksheet('Petunjuk', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 40 }];
  const label = (row: number, text: string, opts: Partial<ExcelJS.Font> = {}) => { const c = ws.getCell(row, 1); c.value = text; c.font = { bold: true, ...opts }; return c; };
  ws.getCell(1, 1).value = input.title || 'RAB · Program Desa Energi Berdikari Sobat Bumi';
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: BLUE } };
  ws.getCell(2, 1).value = 'Format resmi Pertamina Foundation. RAB 100% sama dengan Nilai SK. RAB 70% paling banyak 70% dari Nilai SK, tepat, tanpa pembulatan. RAB 70% dan RAB 30% bersama sama sama dengan RAB 100%.';
  ws.getCell(2, 1).font = { color: { argb: MUTED } };
  label(4, 'Cara mengisi', { color: { argb: BLUE } });
  let row = 5;
  for (const [i, step] of STEPS.entries()) {
    ws.mergeCells(row, 1, row, 3);
    const c = ws.getCell(row, 1);
    c.value = `${i + 1}. ${step}`;
    c.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(row).height = 34;
    row++;
  }
  row++;
  label(row, 'Ringkasan', { color: { argb: BLUE } });
  row++;
  const sk = row;
  // Item rows are the ones with a unit in column P; Sub total, Jumlah and Total rows have none, so they are not counted twice.
  const total = (sheet: string) => `SUMIF(${q(sheet)}!P:P,"?*",${q(sheet)}!R:R)`;
  const lines: [string, string | null, string][] = [
    ['Nilai SK (Rp)', null, 'isi dari SK penetapan'],
    ['Batas Tahap 1 (70%)', `B${sk}*70%`, ''],
    ['Total RAB 100%', total(SHEET_FULL), `dari lembar ${SHEET_FULL}`],
    ['Total RAB 70%', total(SHEET_T1), `dari lembar ${SHEET_T1}`],
    ['Total RAB 30%', total(SHEET_T2), `dari lembar ${SHEET_T2}`],
    ['RAB 70% + RAB 30%', `B${sk + 3}+B${sk + 4}`, ''],
    ['Sisa batas Tahap 1', `B${sk + 1}-B${sk + 3}`, ''],
    ['Selisih RAB 100% terhadap Nilai SK', `B${sk}-B${sk + 2}`, ''],
    ['Keterangan RAB 100%', `IF(B${sk}=0,"Isi Nilai SK dulu",IF(B${sk + 2}=B${sk},"Sama dengan Nilai SK",IF(B${sk + 2}<B${sk},"Di bawah Nilai SK","Di atas Nilai SK")))`, ''],
    ['Keterangan RAB 70%', `IF(B${sk}=0,"Isi Nilai SK dulu",IF(B${sk + 3}<=B${sk + 1},"Tidak melebihi batas","Melebihi batas"))`, ''],
    ['Keterangan RAB 70% + RAB 30%', `IF(B${sk + 5}=B${sk + 2},"Sama dengan RAB 100%","Berbeda dari RAB 100%")`, '']
  ];
  for (const [text, formula, hint] of lines) {
    label(row, text);
    const c = ws.getCell(row, 2);
    if (formula) c.value = { formula }; else c.fill = fill(INPUT_FILL);
    c.numFmt = MONEY; c.border = border;
    if (hint) { ws.getCell(row, 3).value = hint; ws.getCell(row, 3).font = { color: { argb: MUTED } }; }
    row++;
  }
  return ws;
}

/** Builds the workbook. ExcelJS is passed in so the same code runs in the browser (dynamic import) and in Node. */
export function buildRabWorkbook(Excel: typeof ExcelJS, input: RabWorkbookInput): ExcelJS.Workbook {
  const wb = new Excel.Workbook();
  wb.creator = 'MonevDEB';
  guideSheet(wb, input);
  rabSheet(wb, SHEET_FULL, input.penuh, input);
  rabSheet(wb, SHEET_T1, input.tahap1, input);
  rabSheet(wb, SHEET_T2, input.tahap2, input);
  return wb;
}

/**
 * Managed RAB lines (as the overview API returns them) into the rows of one sheet: headings with a name, items with that share's
 * amount in rupiah and their calculation. RAB 100% carries every line; RAB 70% and RAB 30% carry the lines that have a part there.
 */
export function linesToRows(lines: { level: number; code: string; title: string; calculation?: string; unit: string; volume: number; unitPriceSen: number; amountSen: number; term1Sen: number; term2Sen?: number; flags?: Record<string, unknown> }[], share: 'penuh' | 'tahap1' | 'tahap2' = 'tahap1', maxLevel = 4): RabRow[] {
  const out: RabRow[] = [];
  const sen = (line: (typeof lines)[number]) => (share === 'penuh' ? line.amountSen : share === 'tahap1' ? line.term1Sen : line.term2Sen || 0);
  for (const line of lines) {
    if (share !== 'penuh' && !sen(line)) continue;
    if (line.level < maxLevel) { out.push({ no: line.code, uraian: line.title }); continue; }
    const allocated = share === 'penuh' ? undefined : line.flags?.[share === 'tahap1' ? 'term1Volume' : 'term2Volume'];
    const volume = typeof allocated === 'number' ? allocated : line.volume;
    out.push({ no: line.code, uraian: line.title, calculation: typeof allocated === 'number' ? `${volume} ${line.unit}` : line.calculation || '', satuan: line.unit, volume, hargaSatuan: Math.round(line.unitPriceSen) / 100, jumlah: Math.round(sen(line)) / 100 });
  }
  return out;
}

/** Browser: builds the workbook for one campus and hands it to the download. */
export async function downloadRabWorkbook(fileName: string, input: RabWorkbookInput, share?: 'penuh' | 'tahap1' | 'tahap2') {
  const Excel = (await import('exceljs')).default;
  const wb = buildRabWorkbook(Excel, input);
  if (share) {
    const selected = { penuh: SHEET_FULL, tahap1: SHEET_T1, tahap2: SHEET_T2 }[share];
    for (const sheet of [...wb.worksheets]) if (sheet.name !== selected) wb.removeWorksheet(sheet.id);
  }
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
