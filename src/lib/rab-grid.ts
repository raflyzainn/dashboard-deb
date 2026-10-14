/**
 * Reads a RAB sheet in the official Pertamina Foundation layout ("Format RAB dan Penggunaan Dana DEB SoBI"): a header row with
 * No, URAIAN, PERHITUNGAN, VOLUME, HARGA SATUAN, JUMLAH; headings whose depth is the column they start in (kelompok, kegiatan,
 * sub kegiatan); item rows with the calculation spread over cells; Sub total, Jumlah and Total rows that are skipped.
 * Files with more than three heading levels fold the shallowest levels into the kelompok name, the way the first extraction did.
 * Pure: takes the sheet as rows of cells, returns the line tree the managed RAB stores.
 */
import { stripEnumerator, parseVolume, MAX_LEVEL, type LineInput } from './rab';
import { parseSen } from './pencairan';

export interface GridProblem { row: number; text: string }
export interface GridResult { lines: LineInput[]; items: number; problems: GridProblem[] }

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const numberOf = (v: unknown): number | null => (isNum(v) ? (v as number) : typeof v === 'string' && v.trim() ? (parseVolume(v) ?? null) : null);
const rupiahOf = (v: unknown): number | null => (isNum(v) ? Math.round((v as number) * 100) : typeof v === 'string' && v.trim() ? parseSen(v) : null);
const TOTAL = /^(?:sub ?total\b|(?:jumlah|total|grand total)(?:\s+(?:keseluruhan|anggaran|biaya|rab))?\s*:?[\s]*$)/i;
/** The grand total closes the table; the signature block and any repeated copy below it are not read. */
const GRAND = /^(total|grand total)(?:\s+(?:keseluruhan|anggaran|biaya|rab))?\s*:?[\s]*$/i;
const HEADER_TEXT = /uraian kegiatan|^perhitungan$|^volume$|^jumlah$|^harga satuan$/i;
const RECAP = /rekapitulasi|^rekap\b/i;
const ENUM = /^(?:[A-Z]{1,2}|[a-z]{1,2}|\d{1,2}|[ivxIVX]{1,4})[.)]?$/;
const ENUM_PREFIX = /^((?:[A-Z]{1,2}|[a-z]{1,2}|\d{1,2}|[ivxIVX]{1,4})[.)])\s+(.+)$/;

/** Finds the header row and the column of every field it names. */
export function gridHeader(rows: unknown[][]): { row: number; no: number; uraian: number; calc: number | null; volume: number; price: number | null; amount: number } | null {
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const cells = rows[r] || [];
    const find = (test: RegExp) => cells.findIndex(c => test.test(text(c)));
    const no = find(/^no\.?$/i), uraian = find(/uraian/i), amount = find(/^jumlah$/i), volume = find(/^volume$/i);
    if (no < 0 || uraian < 0 || amount < 0 || volume < 0) continue;
    const calc = find(/perhitungan/i);
    const price = find(/harga/i);
    return { row: r, no, uraian, calc: calc >= 0 ? calc : null, volume, price: price >= 0 ? price : null, amount };
  }
  return null;
}

/** True when the sheet follows the official layout (a header row with No, URAIAN, VOLUME and JUMLAH below the title lines). */
export const isGridSheet = (rows: unknown[][]) => gridHeader(rows) !== null;

export function parseGridSheet(rows: unknown[][]): GridResult {
  const h = gridHeader(rows);
  if (!h) throw new Error('Kepala tabel RAB (No, URAIAN, VOLUME, JUMLAH) tidak ditemukan.');
  const problems: GridProblem[] = [];
  const labelEnd = h.calc ?? h.volume; // label cells sit left of the calculation (or the volume)
  type Raw = { row: number; kind: 'heading' | 'item'; depth: number; name: string; calc: string; volume: number | null; unit: string; price: number | null; amount: number | null };
  const raws: Raw[] = [];
  for (let r = h.row + 1; r < rows.length; r++) {
    const cells = rows[r] || [];
    const labels: { col: number; value: string }[] = [];
    for (let c = h.no; c < labelEnd; c++) { const v = text(cells[c]); if (v) labels.push({ col: c, value: v }); }
    const amount = rupiahOf(cells[h.amount]);
    const price = h.price !== null ? rupiahOf(cells[h.price]) : null;
    const volume = numberOf(cells[h.volume]);
    if (!labels.length && amount === null && price === null && volume === null) continue;
    if (!labels.length) continue;
    const first = labels[0];
    if (labels.some(l => HEADER_TEXT.test(l.value))) continue;
    const summaryRow = volume === null && price === null;
    if (summaryRow && labels.some(l => GRAND.test(l.value))) break;
    if (labels.some(l => RECAP.test(l.value))) break;
    if (summaryRow && TOTAL.test(first.value)) continue;
    if (summaryRow && labels.some(l => TOTAL.test(l.value)) && labels.length === 1) continue;
    // A heading: an enumerator in one cell and the name beside it, or an enumerator glued to the name, or a bare name without money.
    const m = first.value.match(ENUM_PREFIX);
    const enumOnly = ENUM.test(first.value) && labels.length > 1;
    const hasMoney = amount !== null || price !== null || volume !== null;
    if (m && !hasMoney) { raws.push({ row: r + 1, kind: 'heading', depth: first.col - h.no, name: m[2], calc: '', volume: null, unit: '', price: null, amount: null }); continue; }
    if (enumOnly && !hasMoney) { raws.push({ row: r + 1, kind: 'heading', depth: first.col - h.no, name: labels[1].value, calc: '', volume: null, unit: '', price: null, amount: null }); continue; }
    if (!hasMoney && labels.length === 1 && first.col < h.uraian + 3 && !ENUM.test(first.value)) { raws.push({ row: r + 1, kind: 'heading', depth: first.col - h.no, name: first.value, calc: '', volume: null, unit: '', price: null, amount: null }); continue; }
    // An item: its name is the last label cell (an enumerator before it is dropped), the calculation the cells up to the volume.
    const nameCell = labels.filter(l => !ENUM.test(l.value)).pop() || labels[labels.length - 1];
    const name = (nameCell.value.match(ENUM_PREFIX)?.[2] || nameCell.value).trim();
    const calcCells: string[] = [];
    if (h.calc !== null) for (let c = h.calc; c < h.volume; c++) { const v = text(cells[c]); if (v) calcCells.push(v); }
    const unitCol = h.volume + 1;
    const unit = unitCol < (h.price ?? h.amount) ? text(cells[unitCol]) : '';
    // A caption at item depth without any figure is not a line: skipped, unless it carries a calculation or a unit and so looks like an item missing its numbers.
    if (!hasMoney) { if (calcCells.length || unit) problems.push({ row: r + 1, text: `${name}: tanpa volume, harga, atau jumlah; dianggap baris barang kosong.` }); else continue; }
    raws.push({ row: r + 1, kind: 'item', depth: first.col - h.no, name, calc: calcCells.join(' '), volume, unit: unit.slice(0, 60), price, amount });
  }
  // Heading depths seen, shallowest first; anything beyond three levels folds into the kelompok name.
  const depths = [...new Set(raws.filter(x => x.kind === 'heading').map(x => x.depth))].sort((a, b) => a - b);
  const extra = Math.max(0, depths.length - (MAX_LEVEL - 1));
  const levelOf = (depth: number) => { const i = depths.indexOf(depth); return i < 0 ? 1 : i <= extra ? 1 : i - extra + 1; };
  const lines: LineInput[] = [];
  let seq = 0;
  const open: (LineInput | null)[] = [null, null, null]; // current heading per level 1..3
  let topName = '';
  const heading = (level: number, name: string) => {
    const parentKey = level > 1 ? (open[level - 2] || heading(level - 1, '')).key : '';
    const line: LineInput = { key: `g${++seq}`, parentKey, title: stripEnumerator(name).slice(0, 500), calculation: '', volume: 0, unit: '', unitPriceSen: 0, amountSen: 0, term1Sen: 0, term2Sen: 0 };
    lines.push(line);
    open[level - 1] = line;
    for (let l = level; l < 3; l++) open[l] = null;
    return line;
  };
  let items = 0;
  for (const x of raws) {
    if (x.kind === 'heading') {
      const level = levelOf(x.depth);
      const i = depths.indexOf(x.depth);
      // With extra levels, the top heading only names the groups below it and gets no line of its own.
      if (level === 1 && i === 0 && extra > 0) { topName = stripEnumerator(x.name); continue; }
      if (level === 1 && i === 0) topName = stripEnumerator(x.name);
      if (level === 1 && i > 0 && i <= extra) { heading(1, topName ? `${topName} / ${stripEnumerator(x.name)}` : x.name); continue; }
      heading(level, x.name);
      continue;
    }
    const parent = open[2] || heading(3, '');
    const volume = x.volume ?? 1;
    const price = x.price ?? (x.amount !== null && volume > 0 ? Math.round(x.amount / volume) : 0);
    const amount = x.amount ?? Math.round(volume * price);
    if (x.amount !== null && x.price !== null && x.volume !== null && Math.round(x.volume * x.price) !== x.amount) problems.push({ row: x.row, text: `${x.name}: volume x harga satuan tidak sama dengan jumlah.` });
    lines.push({ key: `i${++seq}`, parentKey: parent.key, title: x.name.slice(0, 500), calculation: x.calc.slice(0, 200), volume, unit: x.unit, unitPriceSen: price, amountSen: amount, term1Sen: 0, term2Sen: 0 });
    items++;
  }
  return { lines, items, problems };
}

const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** The path of a line: the titles of its ancestors and its own, for matching the same line across sheets. */
export function pathKeys(lines: LineInput[]): Map<string, string> {
  const byKey = new Map(lines.map(l => [l.key, l]));
  const out = new Map<string, string>();
  for (const l of lines) {
    const parts: string[] = [];
    let cur: LineInput | undefined = l;
    while (cur) { parts.unshift(normKey(cur.title)); cur = cur.parentKey ? byKey.get(cur.parentKey) : undefined; }
    out.set(l.key, parts.join(' > '));
  }
  return out;
}

/**
 * Lays the 70% and 30% sheets over the 100% sheet: an item with the same path gets its part; an item missing from the 100%
 * sheet is added under the matching headings (created when absent) and reported.
 */
export function mergeGridSheets(base: GridResult, tahap1: GridResult | null, tahap2: GridResult | null): GridResult {
  const lines = base.lines.map(l => ({ ...l }));
  const problems = [...base.problems];
  const isItem = (l: LineInput) => /^i/.test(l.key);
  let seq = 0;
  const overlay = (part: GridResult | null, field: 'term1Sen' | 'term2Sen', label: string) => {
    if (!part) return;
    const baseKeys = pathKeys(lines);
    const byPath = new Map<string, LineInput>();
    for (const l of lines) if (isItem(l)) { const p = baseKeys.get(l.key)!; if (!byPath.has(p)) byPath.set(p, l); }
    const partKeys = pathKeys(part.lines);
    const partByKey = new Map(part.lines.map(l => [l.key, l]));
    const ensureHeading = (partHeading: LineInput): string => {
      const path = partKeys.get(partHeading.key)!;
      const existing = lines.find(l => !/^i/.test(l.key) && baseKeys.get(l.key) === path);
      if (existing) return existing.key;
      const parentKey = partHeading.parentKey ? ensureHeading(partByKey.get(partHeading.parentKey)!) : '';
      const made: LineInput = { ...partHeading, key: `m${++seq}`, parentKey, term1Sen: 0, term2Sen: 0, amountSen: 0 };
      lines.push(made);
      baseKeys.set(made.key, path);
      return made.key;
    };
    for (const l of part.lines) {
      if (!/^i/.test(l.key)) continue;
      const path = partKeys.get(l.key)!;
      const target = byPath.get(path);
      if (target) { target[field] = l.amountSen; continue; }
      const parentKey = l.parentKey ? ensureHeading(partByKey.get(l.parentKey)!) : '';
      const added: LineInput = { ...l, key: `i${++seq}x`, parentKey, amountSen: 0, term1Sen: 0, term2Sen: 0 };
      added[field] = l.amountSen;
      lines.push(added);
      byPath.set(path, added);
      problems.push({ row: 0, text: `${l.title} ada di lembar ${label} tetapi tidak ada di lembar RAB 100%.` });
    }
    problems.push(...part.problems.map(p => ({ ...p, text: `${label}: ${p.text}` })));
  };
  overlay(tahap1, 'term1Sen', 'RAB 70%');
  overlay(tahap2, 'term2Sen', 'RAB 30%');
  return { lines, items: lines.filter(l => /^i/.test(l.key)).length, problems };
}
