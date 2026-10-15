import { periodsFrom, type Period } from './periods';
export function monitoringPeriods(definitions: { period?: string; periodState?: string }[]): Period[] {
  const periods = periodsFrom(definitions);
  // Monitoring must work before the legacy indicator master has been configured.
  if (!periods.some(p => p.id === '')) periods.unshift({ id: '', name: 'Periode awal', state: periods.length ? 'archived' : 'active' });
  return periods;
}
export const FORMULA_SOURCE = 'https://www.giz.de/sites/default/files/media/pkb-document/2025-07/giz2022-en-compendium-sanitation.pdf';
export const DEFAULT_FORMULA = { version: 'monitoring-v1', revision: 0, biogasFactor: 6, source: FORMULA_SOURCE };
export type Formula = typeof DEFAULT_FORMULA;
export const EVIDENCE = [
  ['solar', 'Foto panel PLTS', 'Foto panel dan instalasi yang terlihat jelas.'],
  ['reactor', 'Foto reaktor biogas', 'Foto reaktor/digester, bukan hanya kompor.'],
  ['institution', 'SK kelembagaan', 'SK minimal kepala desa, beserta AD/ART bila tersedia.'],
  ['land', 'Izin penggunaan lahan', 'Unggah bukti izin atau persetujuan penggunaan lahan.'],
  ['social', 'Pemetaan sosial', 'Dokumen hasil pemetaan sosial.'],
  ['impact', 'Bukti IKM atau SROI', 'Salah satu bukti yang tersedia; tidak harus keduanya.']
] as const;
export type EvidenceKey = typeof EVIDENCE[number][0];
export interface Evidence { fileId: string; reason: string }
export interface Hero { id: string; name: string; phone: string; story: string; photo: string }
export interface ProgramMonitoring { beneficiaries: number | null; solarKwp: number | null; otherKw: number | null; digesterM3: number | null; evidence: Record<EvidenceKey, Evidence> }
export interface MonthInput { month: string; incomeSen: number | null; electricityKwh: number | null; biogasM3: number | null; note: string }
export type CompleteMonth = MonthInput & { incomeSen: number; electricityKwh: number; biogasM3: number };
export interface MonitoringFile { id: string; kind: string; originalName: string; mime: string; size: number }
export interface Snapshot { program: ProgramMonitoring; heroes: Hero[]; profile: Record<string, unknown>; month: CompleteMonth; formula: Formula; result: ReturnType<typeof calculateMonitoring> }
export interface MonitoringVersion { id: string; campus: string; period: string; month: string; version: number; status: 'pending' | 'approved' | 'revision'; snapshot: Snapshot; note: string; created: string; reviewedAt: string; reviewerName: string }
export interface MonitoringMonth { id: string; month: string; revision: number; payload: MonthInput; status: string }
export interface MonitoringWorkspace { campusId: string; campusName: string; period: string; periods: Period[]; program: ProgramMonitoring; programRevision: number; campusRevision: number; heroes: Hero[]; months: MonitoringMonth[]; versions: MonitoringVersion[]; files: MonitoringFile[]; formula: Formula }
export function emptyProgram(): ProgramMonitoring { return { beneficiaries: null, solarKwp: null, otherKw: null, digesterM3: null, evidence: Object.fromEntries(EVIDENCE.map(([key]) => [key, { fileId: '', reason: '' }])) as ProgramMonitoring['evidence'] }; }
export function currentMonth() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date()); }
export function validateMonth(input: MonthInput, maxMonth = currentMonth()): CompleteMonth {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month) || input.month < '2000-01' || input.month > maxMonth) throw Error('Pilih bulan yang valid, paling lambat bulan berjalan (WIB).');
  for (const key of ['incomeSen', 'electricityKwh', 'biogasM3'] as const) {
    const n = input[key]; if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1e13 || (key === 'incomeSen' && !Number.isSafeInteger(n))) throw Error('Isi pendapatan dan produksi dengan angka nonnegatif; isi 0 bila tidak ada produksi/pendapatan.');
  }
  if (typeof input.note !== 'string' || input.note.length > 5000) throw Error('Catatan maksimal 5.000 karakter.');
  return input as CompleteMonth;
}
export function calculateMonitoring(rows: Pick<CompleteMonth, 'incomeSen' | 'electricityKwh' | 'biogasM3'>[], beneficiaries: number, formula: Formula) {
  const incomeSen = rows.reduce((sum, r) => sum + r.incomeSen, 0);
  const electricityKwh = rows.reduce((sum, r) => sum + r.electricityKwh, 0), biogasM3 = rows.reduce((sum, r) => sum + r.biogasM3, 0);
  const averageIncomeSen = rows.length ? incomeSen / rows.length : null;
  const annualIncomeSen = averageIncomeSen === null ? null : averageIncomeSen * 12;
  const gasEquivalentKwh = biogasM3 * formula.biogasFactor;
  return { months: rows.length, incomeSen, averageIncomeSen, annualIncomeSen, perCapitaSen: annualIncomeSen !== null && beneficiaries > 0 ? annualIncomeSen / beneficiaries : null, electricityKwh, biogasM3, gasEquivalentKwh, equivalentKwh: electricityKwh + gasEquivalentKwh };
}
export function latestApproved<T extends { month: string; version: number; status: string }>(rows: T[]): T[] {
  const months = new Map<string, T>();
  for (const row of rows) if (row.status === 'approved' && (!months.has(row.month) || months.get(row.month)!.version < row.version)) months.set(row.month, row);
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
export const statusLabel = (status: string) => ({ pending: 'Menunggu pemeriksaan', approved: 'Sesuai', revision: 'Perlu revisi', draft: 'Draf' }[status] || 'Draf');
