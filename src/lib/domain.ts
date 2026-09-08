import type { CampusIndicator, Snapshot } from './types';

export function progress(indicator: Pick<CampusIndicator, 'current' | 'target'>): number {
  if (!Number.isFinite(indicator.current) || !Number.isFinite(indicator.target) || indicator.target <= 0 || indicator.current < 0) return 0;
  return Math.min(indicator.current / indicator.target * 100, 100);
}
export function average(values: number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
export function campusStats(data: Snapshot, campusId: string) {
  const indicators = data.indicators.filter(i => i.campusId === campusId);
  const revisions = new Set(data.feedback.filter(f => f.campusId === campusId && f.requiresRevision && f.state !== 'closed').map(f => f.indicatorId)).size;
  const proposals = data.proposals.filter(p => p.campusId === campusId).sort((a, b) => b.version - a.version);
  return { progress: average(indicators.map(progress)), achieved: indicators.filter(i => i.current >= i.target).length, total: indicators.length, revisions, proposal: proposals[0], proposals };
}
export const percent = (n: number) => `${Math.round(n)}%`;
export const number = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n);
export const date = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(iso));
export const size = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export const feedbackLabel = { open: 'Perlu revisi', responded: 'Sudah ditanggapi', closed: 'Selesai' };
