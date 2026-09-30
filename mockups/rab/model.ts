import { buildRabWorkbook, type RabRow } from '../../src/lib/rab-excel';
import { parseGridSheet } from '../../src/lib/rab-grid';

export const BUDGET = 2_000_000_000; // Rp20 juta, stored in integer sen.
export const LIMIT = BUDGET * 7 / 10;
export const validQuantity = (quantity: unknown, volume: number): quantity is number =>
  typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0 && quantity <= volume &&
  (Number.isInteger(volume) ? Number.isInteger(quantity) : Math.abs(quantity * 10000 - Math.round(quantity * 10000)) < 0.00001);
export const validEditedVolume = (volume: unknown, originalVolume: number): volume is number =>
  typeof volume === 'number' && volume > 0 && validQuantity(volume, volume) &&
  (!Number.isInteger(originalVolume) || Number.isInteger(volume));
export const STORE_KEY = 'deb-rab-mockup-v1';
export type Item = { id: string; group: string; activity: string; section: string; title: string; volume: number; unit: string; priceSen: number; amountSen: number; term1Sen: number | null };
export type Status = 'draft' | 'pending' | 'revision' | 'approved';
export type Version = { number: number; status: Status; fileName: string; items: Item[]; note: string; events: { label: string; at: string }[] };
export const statusText: Record<Status, string> = { draft: 'Draf', pending: 'Menunggu review PF', revision: 'Perlu revisi', approved: 'Disetujui PF' };
export const fresh = (number = 1): Version => ({ number, status: 'draft', fileName: '', items: [], note: '', events: [] });
export const money = (sen: number | null) => sen === null || !Number.isFinite(sen) ? 'Belum diisi' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: sen % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(sen / 100);
export const percent = (sen: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(sen / BUDGET * 100) + '%';
export const total = (items: Item[], field: 'amountSen' | 'term1Sen') => items.reduce((sum, item) => sum + (item[field] ?? 0), 0);

export function allocate(items: Item[]): Item[] {
  // Distribute rounding in sen cumulatively: the row sum equals floor(70% of the total).
  let cumulative = 0;
  let allocated = 0;
  return items.map(item => {
    cumulative += item.amountSen;
    const next = Math.floor(cumulative * 7 / 10);
    const term1Sen = next - allocated;
    allocated = next;
    return { ...item, term1Sen };
  });
}

export function issues(items: Item[]): string[] {
  if (!items.length) return ['Unggah RAB 100% atau gunakan data contoh terlebih dahulu.'];
  const result: string[] = [];
  if (total(items, 'amountSen') !== BUDGET) result.push(`Total RAB 100% harus sama dengan nilai SK contoh ${money(BUDGET)}. Selisih ${money(Math.abs(total(items, 'amountSen') - BUDGET))}.`);
  if (items.some(i => i.term1Sen === null || !Number.isSafeInteger(i.term1Sen) || i.term1Sen < 0 || i.term1Sen > i.amountSen)) result.push('Isi alokasi setiap baris dari Rp0 sampai nilai anggaran baris tersebut, maksimal dua angka desimal.');
  if (total(items, 'term1Sen') <= 0) result.push('Total Tahap 1 harus lebih dari Rp0.');
  if (total(items, 'term1Sen') > LIMIT) result.push(`Tahap 1 melebihi batas sebesar ${money(total(items, 'term1Sen') - LIMIT)}. Kurangi alokasi sebelum mengajukan.`);
  return result;
}

// Entirely fictional campus/program/items. No imported production fixtures or records.
export function sampleItems(): Item[] {
  const rows = [
    ['A', 'Infrastruktur energi', 'Pemasangan energi surya', 'Peralatan', 'Panel surya dan baterai', 2, 'paket', 4_000_000],
    ['A', 'Infrastruktur energi', 'Pemasangan energi surya', 'Peralatan', 'Instalasi dan pengujian', 1, 'paket', 2_000_000],
    ['B', 'Pemberdayaan masyarakat', 'Pengembangan usaha desa', 'Pelatihan', 'Bahan praktik usaha desa', 20, 'paket', 200_000],
    ['B', 'Pemberdayaan masyarakat', 'Pengembangan usaha desa', 'Pelatihan', 'Lokakarya pengelolaan energi', 2, 'kegiatan', 1_500_000],
    ['C', 'Pendampingan dan evaluasi', 'Keberlanjutan program', 'Pendampingan', 'Pendampingan kelompok usaha', 2, 'kunjungan', 500_000],
    ['C', 'Pendampingan dan evaluasi', 'Keberlanjutan program', 'Pendampingan', 'Evaluasi dan laporan akhir', 1, 'paket', 2_000_000]
  ] as const;
  return allocate(rows.map(([code, group, activity, section, title, volume, unit, price], index) => ({
    id: `${code}.${index + 1}`, group, activity, section, title, volume, unit, priceSen: price * 100, amountSen: volume * price * 100, term1Sen: 0
  })));
}

function fullRows(items: Item[]): RabRow[] {
  const rows: RabRow[] = [];
  const groups = [...new Set(items.map(i => i.group))];
  groups.forEach((group, g) => {
    const code = String.fromCharCode(65 + g);
    rows.push({ no: code, uraian: group });
    const activities = [...new Set(items.filter(i => i.group === group).map(i => i.activity))];
    activities.forEach((activity, a) => {
      const ac = `${code}.${a + 1}`;
      rows.push({ no: ac, uraian: activity });
      const sections = [...new Set(items.filter(i => i.group === group && i.activity === activity).map(i => i.section))];
      sections.forEach((section, s) => {
        const sc = `${ac}.${String.fromCharCode(97 + s)}`;
        rows.push({ no: sc, uraian: section });
        items.filter(i => i.group === group && i.activity === activity && i.section === section).forEach((i, n) => {
          rows.push({ no: `${sc}.${n + 1}`, uraian: i.title, calculation: `${i.volume} ${i.unit}`, volume: i.volume, satuan: i.unit, hargaSatuan: i.priceSen / 100, jumlah: i.amountSen / 100 });
        });
      });
    });
  });
  return rows;
}

export async function downloadExcel(items: Item[], template: boolean, version = 1, approved = false) {
  const Excel = (await import('exceljs')).default;
  const wb = buildRabWorkbook(Excel, {
    title: template ? 'TEMPLATE RAB 100% · DATA CONTOH' : `${approved ? 'DISETUJUI' : 'DRAF'} · SIMULASI RAB V${version}`,
    university: 'Universitas Cakrawala (simulasi)', village: 'Desa Sumber Harapan (simulasi)',
    penuh: fullRows(items), tahap1: [], tahap2: []
  });
  ['Petunjuk', 'RAB 70%', 'RAB 30%'].forEach(name => { const sheet = wb.getWorksheet(name); if (sheet) wb.removeWorksheet(sheet.id); });
  const full = wb.getWorksheet('RAB 100%')!;
  full.getColumn(17).numFmt = '#,##0.00'; full.getColumn(18).numFmt = '#,##0.00';
  const guide = wb.addWorksheet('Petunjuk');
  guide.getColumn(1).width = 105;
  const lines = [
    'MOCKUP RAB · SELURUH DATA ADALAH SIMULASI',
    'Isi hanya lembar RAB 100%. Ganti baris contoh dengan data uji Anda.',
    'Pertahankan kepala tabel. Isi kelompok, kegiatan, sub kegiatan, uraian, volume, satuan, harga satuan dan jumlah.',
    'Jumlah = volume × harga satuan. Gunakan sel angka, bukan teks rupiah. Batas contoh: Rp20.000.000.',
    'Simpan sebagai .xlsx. Unggah ke mockup, lalu periksa rincian yang terbaca sebelum melanjutkan.',
    'Setelah unggah, pilih jumlah setiap item untuk Tahap 1 (70%) di website. Sisa jumlah masuk Tahap 2 (30%).',
    'Item boleh seluruhnya masuk salah satu tahap atau dibagi jumlahnya. Contoh: 10 unit menjadi 7 unit dan 3 unit.',
    'Batas mockup: 2 MB, 500 barang/jasa, 1.000 baris dan 30 kolom. File hanya dibaca di browser.',
    'Subtotal dan total dihitung ulang di website dari baris barang/jasa. Periksa kembali hasilnya.'
  ];
  lines.forEach((line, i) => { const r = guide.addRow([line]); r.height = i === 0 ? 30 : 42; r.alignment = { wrapText: true, vertical: 'middle' }; });
  guide.getRow(1).font = { bold: true, color: { argb: 'FF0066B2' }, size: 14 };
  if (!template) {
    for (const [name, field] of [['RAB 70%', 'term1Sen'], ['RAB 30%', 'remainder']] as const) {
      const sheet = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 2 }] });
      sheet.addRow([`${name} · ${approved ? 'Disetujui' : 'Draf'} · Simulasi v${version}`]);
      sheet.addRow(['Kelompok', 'Kegiatan', 'Sub kegiatan', 'Uraian', 'RAB 100% (Rp)', 'Alokasi dana (Rp)']);
      for (const i of items) sheet.addRow([i.group, i.activity, i.section, i.title, i.amountSen / 100, (field === 'term1Sen' ? i.term1Sen! : i.amountSen - i.term1Sen!) / 100]);
      sheet.addRow(['TOTAL', '', '', '', total(items, 'amountSen') / 100, (field === 'term1Sen' ? total(items, 'term1Sen') : total(items, 'amountSen') - total(items, 'term1Sen')) / 100]);
      sheet.columns.forEach((column, i) => { column.width = i < 4 ? 30 : 22; if (i >= 4) column.numFmt = '#,##0.00'; });
      sheet.getRow(2).font = { bold: true, color: { argb: 'FF0066B2' } };
      sheet.getRow(sheet.rowCount).font = { bold: true };
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = template ? 'Template_RAB_100_DUMMY.xlsx' : `RAB_DUMMY_v${version}_${approved ? 'disetujui' : 'draf'}.xlsx`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function readExcel(file: File): Promise<Item[]> {
  if (!/\.xlsx$/i.test(file.name)) throw Error('Pilih file Excel .xlsx dari template mockup.');
  if (!file.size || file.size > 2 * 1024 * 1024) throw Error('File harus berisi data dan berukuran maksimal 2 MB.');
  const XLSX = await import('xlsx');
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array', sheetRows: 1001, cellFormula: false });
  const sheet = book.Sheets['RAB 100%'];
  if (!sheet) throw Error('Lembar RAB 100% tidak ditemukan. Gunakan template yang disediakan.');
  const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
  if (range.e.r >= 1000 || range.e.c >= 30) throw Error('Mockup menerima maksimal 1.000 baris dan 30 kolom. Hapus baris atau kolom kosong berlebih.');
  const parsed = parseGridSheet(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null }));
  if (parsed.problems.length) throw Error(parsed.problems.slice(0, 3).map(p => `Baris ${p.row}: ${p.text}`).join(' '));
  const byKey = new Map(parsed.lines.map(i => [i.key, i]));
  const items = parsed.lines.filter(i => i.key.startsWith('i')).map((i, n) => {
    const section = byKey.get(i.parentKey);
    const activity = section && byKey.get(section.parentKey);
    const group = activity && byKey.get(activity.parentKey);
    return { id: `item-${n}`, group: group?.title || 'Lainnya', activity: activity?.title || 'Kegiatan', section: section?.title || 'Rincian', title: i.title,
      volume: i.volume, unit: i.unit, priceSen: i.unitPriceSen, amountSen: i.amountSen, term1Sen: 0 };
  });
  if (!items.length || items.length > 500) throw Error('Isi 1 sampai 500 baris barang/jasa pada lembar RAB 100%.');
  if (items.some(i => !i.title || !i.unit || !(i.volume > 0) || !Number.isFinite(i.volume) || !Number.isSafeInteger(i.priceSen) || i.priceSen <= 0 || !Number.isSafeInteger(i.amountSen) || i.amountSen <= 0 || Math.round(i.volume * i.priceSen) !== i.amountSen) || total(items, 'amountSen') > 1e12) throw Error('Periksa uraian, satuan, volume, harga dan jumlah. Angka harus positif dan jumlah sama dengan volume × harga satuan.');
  return allocate(items);
}
