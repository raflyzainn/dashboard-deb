import { parseGridSheet } from '../rab-grid';
import { parseRabTemplate, validRabUnit, type TemplateQuantity } from '../rab-template';
import { checkedOfficeZip } from '../upload-file';

export const validQuantity = (quantity: unknown, volume: number): quantity is number =>
  typeof quantity === 'number' && Number.isSafeInteger(quantity) && Number.isSafeInteger(volume) && quantity >= 0 && quantity <= volume;
export const validEditedVolume = (volume: unknown, _originalVolume: number): volume is number =>
  typeof volume === 'number' && volume > 0 && validQuantity(volume, volume);
export type Item = { id: string; group: string; activity: string; section: string; title: string; volume: number; unit: string; priceSen: number; amountSen: number; term1Sen: number | null; templateQuantity?: TemplateQuantity };
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

export async function readExcel(file: File): Promise<Item[]> {
  if (!/\.xlsx$/i.test(file.name)) throw Error('Pilih file Excel .xlsx dari template RAB.');
  if (!file.size || file.size > 2 * 1024 * 1024) throw Error('File harus berisi data dan berukuran maksimal 2 MB.');
  const XLSX = await import('xlsx');
  const bytes=new Uint8Array(await file.arrayBuffer());
  checkedOfficeZip(bytes,'xlsx');
  const book = XLSX.read(bytes, { type: 'array', sheets:['RAB 100%'], sheetRows: 1001, cellFormula: false });
  const sheet = book.Sheets['RAB 100%'];
  if (!sheet) throw Error('Lembar RAB 100% tidak ditemukan. Gunakan template yang disediakan.');
  const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
  if (range.e.r >= 1000 || range.e.c >= 30) throw Error('Impor menerima maksimal 1.000 baris dan 30 kolom. Hapus baris atau kolom kosong berlebih.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  return readRabRows(rows);
}

export function readRabRows(rows: unknown[][]): Item[] {
  const parsed = parseRabTemplate(rows) ?? parseGridSheet(rows);
  if (parsed.problems.length) throw Error(parsed.problems.slice(0, 3).map(p => `Baris ${p.row}: ${p.text}`).join(' '));
  const byKey = new Map(parsed.lines.map(i => [i.key, i]));
  const items = parsed.lines.filter(i => i.key.startsWith('i')).map((i, n) => {
    const section = byKey.get(i.parentKey);
    const activity = section && byKey.get(section.parentKey);
    const group = activity && byKey.get(activity.parentKey);
    return { id: `item-${n}`, group: group?.title || 'Lainnya', activity: activity?.title || 'Kegiatan', section: section?.title || 'Rincian', title: i.title,
      volume: i.volume, unit: i.unit, priceSen: i.unitPriceSen, amountSen: i.amountSen, term1Sen: 0, templateQuantity: i.flags?.templateQuantity as TemplateQuantity | undefined };
  });
  if (!items.length || items.length > 500) throw Error('Isi 1 sampai 500 baris barang/jasa pada lembar RAB 100%.');
  if(items.some(i=>!validRabUnit(i.unit)||i.templateQuantity&&(!validRabUnit(i.templateQuantity.unit)||!validRabUnit(i.templateQuantity.volumeUnit))))throw Error('Satuan tidak boleh hanya angka. Gunakan satuan seperti unit, orang, atau hari.');
  if (items.some(i => !Number.isSafeInteger(i.volume) || i.priceSen % 100 !== 0)) throw Error('Volume dan Harga Satuan wajib bilangan bulat tanpa desimal. Perbaiki angka pada Excel.');
  if (items.some(i => !i.title || !i.unit || !(i.volume > 0) || !Number.isFinite(i.volume) || !Number.isSafeInteger(i.priceSen) || i.priceSen <= 0 || !Number.isSafeInteger(i.amountSen) || i.amountSen <= 0 || Math.round(i.volume * i.priceSen) !== i.amountSen) || total(items, 'amountSen') > 1e12) throw Error('Periksa uraian, satuan, volume, harga dan jumlah. Angka harus positif dan jumlah sama dengan volume × harga satuan.');
  return allocate(items);
}
