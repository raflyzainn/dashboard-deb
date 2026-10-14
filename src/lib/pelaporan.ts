export const REPORT_KINDS = ['laporan', 'infografis', 'video', 'artikel'] as const;
export type ReportKind = typeof REPORT_KINDS[number];
export type ReportStatus = 'draf' | 'menunggu_review' | 'perlu_revisi' | 'sesuai';
export const reportLabels: Record<ReportKind, string> = { laporan: 'Laporan pelaksanaan', infografis: 'Infografis', video: 'Video profil', artikel: 'Artikel' };
export const reportStatusLabels: Record<ReportStatus, string> = { draf: 'Draf', menunggu_review: 'Menunggu pemeriksaan', perlu_revisi: 'Perlu revisi', sesuai: 'Sesuai' };
export interface ReportVersion {
  id: string; kind: ReportKind; version: number; format: 'text' | 'file'; title: string; body: string;
  originalName: string; mime: string; size: number; hash: string; durationSeconds: number;
  status: ReportStatus; created: string; authorName: string; reviewedAt: string; reviewerName: string; note: string;
}
export interface ReportWorkspace {
  campusId: string; campusName: string; awardId: string; paid: boolean;
  latest: Partial<Record<ReportKind, ReportVersion>>; history: ReportVersion[]; annualComplete: boolean;
}
export function reportingPaid(payment: { paidAt?: unknown; paidSen?: unknown } | undefined) { return Boolean(payment?.paidAt) && Number(payment?.paidSen) > 0; }

export function lpjEvidenceReady(payment: { paidAt?: unknown; paidSen?: unknown } | undefined, entries: { status: string }[]) { return reportingPaid(payment) && entries.length > 0 && entries.every(e => e.status === 'sesuai'); }
