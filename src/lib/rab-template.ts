import type { GridResult } from './rab-grid';
import type { LineInput } from './rab';

export const RAB_TEMPLATE_HEADERS = ['Kategori', 'Sub Kategori', 'Nama', 'Qty', 'Satuan', 'Volume', 'Satuan Volume', 'Harga Satuan', 'Total Harga'];
export type TemplateQuantity = { qty: number; unit: string; volume: number; volumeUnit: string };
const text = (value: unknown) => String(value ?? '').trim();
export const validRabUnit = (value: unknown) => typeof value === 'string' && Boolean(value.trim()) && !/^[\d\s.,+-]+$/.test(value.trim());

/** Match category, subcategory and name; quantities and price are editable values. */
export type RabInputRow = { id: string; cells: (string | number | null | undefined)[] };
export function mergeRabRows(existing: RabInputRow[], incoming: RabInputRow[]) {
 // ponytail: scan bounded to 500 items; use an index if that limit grows.
 const key = (row: RabInputRow) => JSON.stringify(row.cells.slice(0, 3).map(value => text(value).normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('id')));
 const rows = existing.map(row => ({ ...row, cells: [...row.cells] }));
 const seen = new Set<string>();
 let added = 0, updated = 0;
 for (const row of incoming) {
  const identity = key(row);
  if (seen.has(identity)) throw Error(`Item "${row.cells[2]}" berulang dalam Excel. Bedakan nama atau kategorinya.`);
  seen.add(identity);
  const matches = rows.map((candidate, index) => key(candidate) === identity ? index : -1).filter(index => index >= 0);
  if (matches.length > 1) throw Error(`Item "${row.cells[2]}" memiliki duplikat di tabel. Hapus duplikat sebelum upload.`);
  if (matches.length) { rows[matches[0]].cells = [...row.cells]; updated++; }
  else { rows.push({ ...row, cells: [...row.cells] }); added++; }
 }
 if (rows.length > 500) throw Error('Gabungan data maksimal 500 item.');
 return { rows, added, updated };
}

/** Template datar: baca input, hitung ulang jumlah tanpa bergantung pada cache rumus Excel. */
export function parseRabTemplate(rows: unknown[][]): GridResult | null {
  const header = rows.findIndex((row, i) => i < 40 && RAB_TEMPLATE_HEADERS.every((name, c) => text(row[c]).toLowerCase() === name.toLowerCase()));
  if (header < 0) return null;
  const lines: LineInput[] = [], problems: GridResult['problems'] = [];
  const parents = new Map<string, string>();
  let items = 0;
  const base = (key: string, parentKey: string, title: string): LineInput => ({ key, parentKey, title, calculation: '', volume: 0, unit: '', unitPriceSen: 0, amountSen: 0, term1Sen: 0, term2Sen: 0 });
  for (let r = header + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row.slice(0, 8).some(value => text(value))) continue;
    if (!row.slice(0, 7).some(value => text(value)) && /^total keseluruhan$/i.test(text(row[7]))) continue;
    const [category, subcategory, name, qty, unit, multiplier, multiplierUnit, price] = row;
    if ([unit, multiplierUnit].some(value => typeof value === 'string' && value.trim() && !validRabUnit(value))) {
      problems.push({ row: r + 1, text: 'Satuan tidak boleh hanya angka. Gunakan unit, orang, atau hari.' }); continue;
    }
    const numeric = [qty, multiplier, price].every(value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0);
    const volume = Number(qty) * Number(multiplier), priceSen = Math.round(Number(price) * 100);
    const amountSen = Math.round(volume * priceSen);
    if (![category, subcategory, name].every(value => typeof value === 'string' && value.trim()) || !validRabUnit(unit) || !validRabUnit(multiplierUnit) || !numeric ||
        [category, subcategory, name].some(value => text(value).length > 500) ||
        volume > 1e9 || priceSen <= 0 || !Number.isSafeInteger(amountSen) || amountSen <= 0) {
      problems.push({ row: r + 1, text: 'Lengkapi kategori, sub kategori, nama, dan satuan. Qty, Volume, dan Harga Satuan wajib bilangan bulat positif tanpa desimal.' });
      continue;
    }
    const combinedUnit = Number(multiplier) === 1 ? text(unit) : `${text(unit)}-${text(multiplierUnit)}`;
    if (combinedUnit.length > 60) { problems.push({ row: r + 1, text: 'Gabungan satuan maksimal 60 karakter.' }); continue; }
    let parent = '';
    for (const title of [text(category), text(subcategory), 'Rincian']) {
      const path = JSON.stringify([parent, title]);
      if (!parents.has(path)) { const key = `g${parents.size}`; parents.set(path, key); lines.push(base(key, parent, title)); }
      parent = parents.get(path)!;
    }
    lines.push({ ...base(`i${items++}`, parent, text(name)), volume: Math.round(volume * 10000) / 10000, unit: combinedUnit, unitPriceSen: priceSen, amountSen,
      calculation: `${qty} ${text(unit)} × ${multiplier} ${text(multiplierUnit)}`, flags: { templateQuantity: { qty, unit: text(unit), volume: multiplier, volumeUnit: text(multiplierUnit) } } });
  }
  return { lines, items, problems };
}
