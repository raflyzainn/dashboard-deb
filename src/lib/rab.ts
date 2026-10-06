/**
 * Managed RAB shared vocabulary: a four level tree (kelompok, kegiatan, sub kegiatan, uraian), codes generated from position,
 * sums rolled up from the items, and the automatic checks. Pure TypeScript, used by the server and the browser.
 * Money is an integer in sen. Volume may be fractional.
 */
import { formatSen } from './pencairan';

export const MAX_LEVEL = 4;
export const LEVEL_LABEL = ['', 'Kelompok', 'Kegiatan', 'Sub kegiatan', 'Uraian'] as const;
export type RabStatus = 'draf' | 'menunggu' | 'disetujui';
export const RAB_STATUS_LABEL: Record<RabStatus, string> = { draf: 'Draf', menunggu: 'Menunggu persetujuan', disetujui: 'Disetujui' };
export const RAB_STATUS_TONE: Record<RabStatus, 'neutral' | 'blue' | 'green' | 'amber'> = { draf: 'neutral', menunggu: 'blue', disetujui: 'green' };
export type RabSource = 'manual' | 'import' | 'extraction';
export const RAB_SOURCE_LABEL: Record<RabSource, string> = { manual: 'Diketik di aplikasi', import: 'Impor Excel', extraction: 'Muat awal dari berkas kampus' };

/** One line as the browser sends it: the key links children to parents, the level follows from the tree. */
export interface LineInput {
  key: string; parentKey: string; title: string; calculation: string; volume: number; unit: string;
  unitPriceSen: number; amountSen: number; term1Sen: number; term2Sen?: number; flags?: Record<string, unknown>;
}
/** One stored line. */
export interface RabLine {
  id: string; parentId: string; level: number; order: number; code: string; title: string; calculation: string; volume: number; unit: string;
  unitPriceSen: number; amountSen: number; term1Sen: number; term2Sen: number; flags: Record<string, unknown>;
}
/** A line after arrangement: position, code and rolled up sums are known. */
export interface Arranged extends LineInput { level: number; order: number; code: string; hasChildren: boolean; sumSen: number; sumTerm1Sen: number; sumTerm2Sen: number }
export interface RabCheck { level: 'ok' | 'warn' | 'bad' | 'info'; text: string }
export interface RabVersionInfo {
  id: string; number: number; status: RabStatus; totalSen: number; term1Sen: number; term2Sen: number; source: RabSource; share: RabShare | 'gabungan' | ''; sourceFile: string; note: string;
  approvedByName: string; approvedAt: string; created: string; updated: string; active: boolean;
}
export interface RabOverview {
  itemDraft?: { rows: (string | number | null)[][]; lineIds: string[] } | null;
  itemDraftRevision?: number;
  campus: { id: string; name: string; code: string; programYear: string };
  summary: { skNumber: string; amountSen: number; limitSen: number };
  disbursement: { id: string; stage: number; requestedSen: number; rabVersionId: string; clauseChecked: boolean };
  versions: RabVersionInfo[];
  version: (RabVersionInfo & { lines: RabLine[] }) | null;
  checks: RabCheck[];
}

function letters(index: number, upper: boolean) {
  let n = index + 1, out = '';
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode((upper ? 65 : 97) + r) + out; n = Math.floor((n - 1) / 26); }
  return out;
}
/** A, A.1, A.1.a, A.1.a.3 from the level and the position among siblings (zero based). */
export function codeFor(level: number, index: number, parentCode: string) {
  const part = level === 1 ? letters(index, true) : level === 3 ? letters(index, false) : String(index + 1);
  return parentCode ? parentCode + '.' + part : part;
}
/** Removes a leading enumerator such as "A ", "1. " or "a. " from an imported title; the code is generated from position instead. */
export function stripEnumerator(title: string) {
  return title.trim().replace(/^(?:[A-Za-z]|\d{1,2})[.)]?\s+/, '').replace(/^[a-z][.)]\s*/, '').trim();
}
export const productSen = (volume: number, unitPriceSen: number) => Math.round(volume * unitPriceSen);
export function parseVolume(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const text = String(input).trim().replace(/\s/g, '');
  if (!/^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+(?:[.,]\d+)?$/.test(text)) return null;
  const normalised = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text) ? text.replace(/\./g, '').replace(',', '.') : text.replace(',', '.');
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}
export const formatVolume = (volume: number) => (Number.isInteger(volume) ? String(volume) : volume.toLocaleString('id-ID', { maximumFractionDigits: 4 }));

/**
 * Orders the lines depth first, assigns level, order and code, and rolls the item amounts up to the parents.
 * Throws an Error with an Indonesian message when the structure is not a tree of at most four levels.
 */
export function arrange(input: LineInput[]): Arranged[] {
  const keys = new Set<string>();
  const children = new Map<string, LineInput[]>();
  for (const line of input) {
    if (!line.key || keys.has(line.key)) throw new Error('Kunci baris kembar atau kosong.');
    keys.add(line.key);
  }
  for (const line of input) {
    const parent = line.parentKey || '';
    if (parent && !keys.has(parent)) throw new Error('Induk baris tidak ditemukan.');
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(line);
  }
  const out: Arranged[] = [];
  const visit = (parentKey: string, level: number, parentCode: string) => {
    const list = children.get(parentKey) || [];
    let sum = 0, sumTerm1 = 0, sumTerm2 = 0;
    list.forEach((line, i) => {
      if (level > MAX_LEVEL) throw new Error('Pohon RAB paling dalam empat tingkat.');
      const node: Arranged = { ...line, level, order: i + 1, code: codeFor(level, i, parentCode), hasChildren: (children.get(line.key) || []).length > 0, sumSen: 0, sumTerm1Sen: 0, sumTerm2Sen: 0 };
      out.push(node);
      const below = visit(line.key, level + 1, node.code);
      if (node.hasChildren) { node.sumSen = below.sum; node.sumTerm1Sen = below.term1; node.sumTerm2Sen = below.term2; }
      else if (level === MAX_LEVEL) { node.sumSen = line.amountSen; node.sumTerm1Sen = line.term1Sen; node.sumTerm2Sen = line.term2Sen || 0; }
      sum += node.sumSen; sumTerm1 += node.sumTerm1Sen; sumTerm2 += node.sumTerm2Sen;
    });
    return { sum, term1: sumTerm1, term2: sumTerm2 };
  };
  visit('', 1, '');
  if (out.length !== input.length) throw new Error('Struktur baris tidak valid.');
  return out;
}
export const totalsOf = (nodes: Arranged[]) => nodes.filter(n => n.level === 1).reduce((acc, n) => ({ totalSen: acc.totalSen + n.sumSen, term1Sen: acc.term1Sen + n.sumTerm1Sen, term2Sen: acc.term2Sen + n.sumTerm2Sen }), { totalSen: 0, term1Sen: 0, term2Sen: 0 });

/** The three pages of the RAB item: the full budget and its Tahap 1 and Tahap 2 parts. */
export type RabShare = 'penuh' | 'tahap1' | 'tahap2';
/** Which sheet a stored version came from; gabungan carries RAB 100% with its 70% (and 30%) parts on the same lines. */
export type RabVersionShare = RabShare | 'gabungan';
export const SHARE_LABEL: Record<RabShare, string> = { penuh: 'RAB 100%', tahap1: 'RAB 70%', tahap2: 'RAB 30%' };
/** Whether a version can serve a page: its own sheet, or the combined sheets when they carry that part. Versions without a share fall back to their totals. */
export const versionHolds = (v: { share: RabVersionShare | ''; totalSen: number; term1Sen: number; term2Sen?: number }, share: RabShare) => {
  if (v.share === 'gabungan') return share === 'penuh' ? v.totalSen > 0 : share === 'tahap1' ? v.term1Sen > 0 : (v.term2Sen || 0) > 0;
  if (v.share) return v.share === share;
  return share === 'penuh' ? v.totalSen > 0 && v.totalSen !== v.term1Sen : share === 'tahap1' ? v.term1Sen > 0 : (v.term2Sen || 0) > 0;
};
export const shareSen = (line: { amountSen: number; term1Sen: number; term2Sen?: number }, share: RabShare) => (share === 'penuh' ? line.amountSen : share === 'tahap1' ? line.term1Sen : line.term2Sen || 0);

const listCodes = (codes: string[]) => (codes.length > 6 ? codes.slice(0, 6).join(', ') + ` dan ${codes.length - 6} baris lain` : codes.join(', '));

/**
 * The automatic checks of one version. The machine computes, the admin decides.
 * The only blocking check is the RAB 70% total against Batas Tahap 1 (exact 70% of the SK). RAB 100% against the SK and RAB 70% plus RAB 30%
 * against RAB 100% are shown as findings, never as blocks.
 */
export function rabChecks(nodes: Arranged[], amountSen: number, limitSen: number, storedParents?: Map<string, number>): RabCheck[] {
  const out: RabCheck[] = [];
  if (!nodes.length) return [{ level: 'info', text: 'Belum ada baris. Tambah kelompok pertama atau impor dari Excel.' }];
  const { totalSen, term1Sen, term2Sen } = totalsOf(nodes);
  if (!term1Sen) out.push({ level: 'warn', text: 'RAB 70% belum diisi. Isi lembar RAB 70% pada baris yang diajukan di Tahap 1.' });
  else if (term1Sen > limitSen) out.push({ level: 'bad', text: `RAB 70% ${formatSen(term1Sen)} melebihi Batas Tahap 1 ${formatSen(limitSen)}. Kurangi ${formatSen(term1Sen - limitSen)}.` });
  else out.push({ level: 'ok', text: `RAB 70% ${formatSen(term1Sen)} tidak melebihi Batas Tahap 1 ${formatSen(limitSen)}.` });
  if (term1Sen && term1Sen < limitSen) out.push({ level: 'info', text: `Di bawah batas: selisih ${formatSen(limitSen - term1Sen)} menjadi sisa Tahap 2.` });
  // Only the RAB 70% sheet was filled (older files): the 100% and 30% pages are still empty, say so once instead of comparing.
  const onlyTerm1 = !term2Sen && totalSen === term1Sen;
  if (onlyTerm1) out.push({ level: 'info', text: 'Hanya RAB 70% yang terisi. RAB 100% dan RAB 30% belum diisi; unduh templat tiga lembar.' });
  else if (!totalSen) out.push({ level: 'warn', text: 'RAB 100% belum diisi.' });
  else if (totalSen === amountSen) out.push({ level: 'ok', text: `RAB 100% sama dengan Nilai SK ${formatSen(amountSen)}.` });
  else out.push({ level: 'warn', text: `RAB 100% ${formatSen(totalSen)} berbeda dari Nilai SK ${formatSen(amountSen)} (selisih ${formatSen(Math.abs(amountSen - totalSen))}).` });
  if (!onlyTerm1) {
    if (!term2Sen) out.push({ level: 'info', text: 'RAB 30% belum diisi.' });
    else if (term1Sen + term2Sen === totalSen) out.push({ level: 'ok', text: `RAB 70% + RAB 30% sama dengan RAB 100% ${formatSen(totalSen)}.` });
    else out.push({ level: 'warn', text: `RAB 70% + RAB 30% ${formatSen(term1Sen + term2Sen)} berbeda dari RAB 100% ${formatSen(totalSen)}.` });
  }
  const items = nodes.filter(n => n.level === MAX_LEVEL);
  const overTerm1 = items.filter(n => n.term1Sen > n.amountSen).map(n => n.code);
  if (overTerm1.length) out.push({ level: 'warn', text: `RAB 70% melebihi jumlah baris pada ${listCodes(overTerm1)}. Periksa barisnya.` });
  const split = items.filter(n => (n.term2Sen || 0) && n.term1Sen + (n.term2Sen || 0) !== n.amountSen).map(n => n.code);
  if (split.length) out.push({ level: 'warn', text: `RAB 70% + RAB 30% tidak sama dengan jumlah baris pada ${listCodes(split)}. Periksa barisnya.` });
  const product = items.filter(n => productSen(n.volume, n.unitPriceSen) !== n.amountSen).map(n => n.code);
  if (product.length) out.push({ level: 'warn', text: `Volume kali harga satuan tidak sama dengan jumlah pada ${listCodes(product)}. Periksa angkanya.` });
  else if (items.length) out.push({ level: 'ok', text: 'Volume kali harga satuan sama dengan jumlah pada semua baris.' });
  if (storedParents) {
    const mismatch = nodes.filter(n => n.hasChildren && storedParents.has(n.key) && storedParents.get(n.key) !== n.sumSen).map(n => n.code);
    if (mismatch.length) out.push({ level: 'warn', text: `Sub total tersimpan berbeda dari jumlah anaknya pada ${listCodes(mismatch)}. Simpan ulang versi ini.` });
  }
  const empty = nodes.filter(n => !n.hasChildren && n.level < MAX_LEVEL).map(n => n.code);
  if (empty.length) out.push({ level: 'warn', text: `Belum ada uraian di bawah ${listCodes(empty)}. Tambah baris atau hapus bagiannya.` });
  const untitled = nodes.filter(n => !n.title.trim() && n.level !== 3).map(n => n.code);
  if (untitled.length) out.push({ level: 'warn', text: `Nama belum diisi pada ${listCodes(untitled)}.` });
  const noted = nodes.filter(n => typeof n.flags?.catatan === 'string' && n.flags.catatan).map(n => n.code);
  if (noted.length) out.push({ level: 'info', text: `Catatan dari berkas asal pada ${listCodes(noted)}. Periksa barisnya, lalu hapus catatannya bila sudah benar.` });
  return out;
}
