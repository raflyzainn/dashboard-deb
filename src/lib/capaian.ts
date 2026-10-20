/**
 * Campus achievement dashboard (Capaian Program): monthly Monitoring and the Tahap 1 LPJ turned into what the page draws.
 * Pure TypeScript; the page fetches /api/monitoring/{campus} and /api/pencairan/{campus}/lpj and passes the results here.
 * A month counts when its latest kiriman is approved (Sesuai) or pending (Menunggu); revisions and drafts are shown, never summed.
 */
import { calculateMonitoring, EVIDENCE, type MonitoringWorkspace, type CompleteMonth } from './monitoring';

export type MonthStatus = 'sesuai' | 'menunggu' | 'revisi' | 'draf' | 'kosong';
export interface CapaianMonth { month: string; label: string; status: MonthStatus; counted: boolean; incomeSen: number | null; electricityKwh: number | null; biogasM3: number | null }

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const monthLabel = (month: string) => MONTH_LABELS[Number(month.slice(5, 7)) - 1] || month;
export const monthName = (month: string) => `${MONTH_NAMES[Number(month.slice(5, 7)) - 1] || month} ${month.slice(0, 4)}`;

/** The n months ending at `current` (YYYY-MM), oldest first. */
export function monthsWindow(current: string, n = 12): string[] {
  const [year, month] = current.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const index = year * 12 + month - 1 - (n - 1 - i);
    return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
  });
}

/** Every month of the workspace with its latest kiriman, plus drafts that were saved but not sent. */
export function capaianMonths(ws: Pick<MonitoringWorkspace, 'months' | 'versions'>): Map<string, CapaianMonth> {
  const latest = new Map<string, MonitoringWorkspace['versions'][number]>();
  for (const version of ws.versions) if (!latest.has(version.month) || latest.get(version.month)!.version < version.version) latest.set(version.month, version);
  const out = new Map<string, CapaianMonth>();
  for (const [month, version] of latest) {
    const status: MonthStatus = version.status === 'approved' ? 'sesuai' : version.status === 'pending' ? 'menunggu' : 'revisi';
    const values = version.snapshot?.month;
    out.set(month, { month, label: monthLabel(month), status, counted: status !== 'revisi', incomeSen: values?.incomeSen ?? null, electricityKwh: values?.electricityKwh ?? null, biogasM3: values?.biogasM3 ?? null });
  }
  for (const row of ws.months) if (!out.has(row.month)) out.set(row.month, { month: row.month, label: monthLabel(row.month), status: 'draf', counted: false, incomeSen: null, electricityKwh: null, biogasM3: null });
  return out;
}

export interface Capaian {
  hasData: boolean; window: CapaianMonth[]; counted: CapaianMonth[]; pending: number; revision: CapaianMonth[]; missing: CapaianMonth[];
  totals: ReturnType<typeof calculateMonitoring>; annualElectricityKwh: number | null; annualEquivalentKwh: number | null; beneficiaries: number | null;
  evidenceReady: number; evidenceTotal: number;
}

/** The dashboard model: the 12 month window ending at `current`, and totals over every counted month of the period. */
export function capaian(ws: MonitoringWorkspace, current: string): Capaian {
  const all = capaianMonths(ws);
  const window = monthsWindow(current).map(month => all.get(month) || { month, label: monthLabel(month), status: 'kosong' as const, counted: false, incomeSen: null, electricityKwh: null, biogasM3: null });
  const counted = [...all.values()].filter(m => m.counted).sort((a, b) => a.month.localeCompare(b.month));
  const beneficiaries = ws.program.beneficiaries;
  const totals = calculateMonitoring(counted as unknown as CompleteMonth[], beneficiaries || 0, ws.formula);
  const perMonth = (value: number) => counted.length ? value / counted.length * 12 : null;
  // Months before the first kiriman are not "missing": the campus may have started later.
  const first = counted[0]?.month || [...all.keys()].sort()[0] || current;
  return {
    hasData: all.size > 0, window, counted,
    pending: counted.filter(m => m.status === 'menunggu').length,
    revision: window.filter(m => m.status === 'revisi'),
    missing: window.filter(m => m.status === 'kosong' && m.month >= first && m.month < current),
    totals, annualElectricityKwh: perMonth(totals.electricityKwh), annualEquivalentKwh: perMonth(totals.equivalentKwh), beneficiaries,
    evidenceReady: EVIDENCE.filter(([key]) => ws.program.evidence[key]?.fileId).length, evidenceTotal: EVIDENCE.length
  };
}

/** A round axis maximum: 1, 2, 2.5 or 5 times a power of ten at or above the largest value. */
export function niceMax(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return ([1, 2, 2.5, 5, 10].find(step => step * power >= value) || 10) * power;
}

export interface LpjInput { paid: boolean; receivedSen: number; reportedSen: number; hasApprovedRab: boolean; entries: { amountSen: number; rabCode: string }[]; rabNodes: { code: string; title: string; level: number; amountSen: number; term1Sen?: number }[] }
export interface RabCategory { code: string; title: string; planSen: number; realSen: number }

/** RAB 70% per kelompok (level 1) against the LPJ entries recorded under it; entries without a RAB line form their own row. */
export function rabRealisasi(lpj: LpjInput): RabCategory[] {
  const groups = lpj.rabNodes.filter(n => n.level === 1).map(n => ({ code: n.code, title: n.title, planSen: n.term1Sen ?? 0, realSen: 0 }));
  let other = 0;
  for (const entry of lpj.entries) {
    const group = groups.find(g => entry.rabCode === g.code || entry.rabCode.startsWith(g.code + '.'));
    if (group) group.realSen += entry.amountSen; else other += entry.amountSen;
  }
  return other ? [...groups, { code: '', title: 'Tanpa butir RAB', planSen: 0, realSen: other }] : groups;
}
