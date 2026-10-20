/**
 * The RAB in the campus template layout: the second download format next to the official Pertamina Foundation layout of
 * rab-excel.ts. The file is static/templat/Template_RAB_DEB.xlsx itself (Petunjuk, Contoh Pengisian, Ringkasan, charts,
 * colours and formulas untouched) with the identity row and the empty item rows of the input sheet filled in place. The XML is
 * edited directly because ExcelJS drops the template's charts. RAB 70% and RAB 30% rename the input sheet and every reference.
 */
import type PizZip from 'pizzip';
import { rabSubcategory, type TemplateQuantity } from './rab-template';

export type RabShare = 'penuh' | 'tahap1' | 'tahap2';
/** Kategori, Sub Kategori, Nama, Qty, Satuan, Volume, Satuan Volume, Harga Satuan in rupiah. */
export type TemplateRow = [string, string, string, number, string, number, string, number];
type Line = { id: string; parentId: string; level: number; title: string; unit: string; volume: number; unitPriceSen: number; amountSen: number; term1Sen: number; term2Sen?: number; flags?: Record<string, unknown> };

export const TEMPLATE_URL = '/templat/Template_RAB_DEB.xlsx';
const SHEET: Record<RabShare, string> = { penuh: 'RAB 100%', tahap1: 'RAB 70%', tahap2: 'RAB 30%' };
const INPUT_SHEET = 'xl/worksheets/sheet2.xml';
const FIRST_ROW = 8, LAST_ROW = 507;
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Items of one share as template rows. A share keeps the template quantity when its volume divides evenly; otherwise Qty is the allocated volume. */
export function linesToTemplateRows(lines: Line[], share: RabShare): TemplateRow[] {
  const byId = new Map(lines.map(line => [line.id, line]));
  const rows: TemplateRow[] = [];
  for (const line of lines) {
    if (line.level !== 4) continue;
    const sen = share === 'penuh' ? line.amountSen : share === 'tahap1' ? line.term1Sen : line.term2Sen || 0;
    if (share !== 'penuh' && !sen) continue;
    const section = byId.get(line.parentId), activity = section && byId.get(section.parentId), group = activity && byId.get(activity.parentId);
    const stored = line.flags?.templateQuantity as TemplateQuantity | undefined;
    const t = stored && Math.round(stored.qty * stored.volume * 10000) / 10000 === line.volume ? stored : undefined;
    const allocated = share === 'penuh' ? line.volume : line.flags?.[share === 'tahap1' ? 'term1Volume' : 'term2Volume'];
    const volume = typeof allocated === 'number' ? allocated : line.volume;
    const quantity = t && volume % t.volume === 0 ? { qty: volume / t.volume, unit: t.unit, volume: t.volume, volumeUnit: t.volumeUnit } : { qty: volume, unit: line.unit, volume: 1, volumeUnit: t?.volumeUnit ?? 'kali' };
    rows.push([group?.title || 'Lainnya', rabSubcategory(activity?.title || 'Kegiatan', section?.title), line.title, quantity.qty, quantity.unit, quantity.volume, quantity.volumeUnit, Math.round(line.unitPriceSen) / 100]);
  }
  return rows;
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Fills one empty template cell (`<c r="B4" s="18"/>`), keeping its style. */
function fill(xml: string, ref: string, value: string | number) {
  const empty = new RegExp(`<c r="${ref}"( s="\\d+")?/>`);
  if (!empty.test(xml)) throw Error(`Sel ${ref} pada template RAB tidak ditemukan.`);
  return xml.replace(empty, (_, style = '') => typeof value === 'number' ? `<c r="${ref}"${style}><v>${value}</v></c>` : `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`);
}

/**
 * The template bytes with the campus, program and rows filled; for RAB 70% and RAB 30% the input sheet is renamed everywhere.
 * PizZip is passed in so the preview can import the row helpers without loading it.
 */
export function fillTemplate(Zip: typeof PizZip, template: ArrayBuffer | Uint8Array, input: { university: string; program?: string; share: RabShare; rows: TemplateRow[] }): Uint8Array {
  if (input.rows.length > LAST_ROW - FIRST_ROW + 1) throw Error('Template RAB memuat maksimal 500 item.');
  const zip = new Zip(template);
  let sheet = zip.file(INPUT_SHEET)?.asText();
  if (!sheet) throw Error('Lembar isian template RAB tidak ditemukan.');
  sheet = fill(sheet, 'B4', input.university);
  if (input.program) sheet = fill(sheet, 'F4', input.program);
  input.rows.forEach((cells, n) => cells.forEach((value, i) => { if (value !== '') sheet = fill(sheet!, `${COLUMNS[i]}${FIRST_ROW + n}`, value); }));
  zip.file(INPUT_SHEET, sheet);
  if (input.share !== 'penuh') {
    const from = SHEET.penuh, to = SHEET[input.share];
    for (const name of Object.keys(zip.files)) if (/\.xml$/.test(name) && !zip.files[name].dir) {
      const xml = zip.file(name)!.asText();
      if (xml.includes(from)) zip.file(name, xml.split(from).join(to));
    }
  }
  return zip.generate({ type: 'uint8array', compression: 'DEFLATE' });
}

/** Browser: fetches the template, fills it and hands it to the download. */
export async function downloadTemplateWorkbook(fileName: string, input: { university: string; program?: string; share: RabShare; lines: Line[] }) {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw Error('Template belum dapat diunduh. Coba lagi.');
  const Zip = (await import('pizzip')).default;
  const bytes = fillTemplate(Zip, await response.arrayBuffer(), { ...input, rows: linesToTemplateRows(input.lines, input.share) });
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
