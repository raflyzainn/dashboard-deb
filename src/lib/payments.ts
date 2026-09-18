import type { AppSession, Role } from './types';

export const DEMO_KPIS = [
  { id: 'energy', label: 'Energi terbarukan', unit: 'kWp', minimum: 1 },
  { id: 'people', label: 'Penerima manfaat', unit: 'orang', minimum: 20 },
  { id: 'income', label: 'Peningkatan pendapatan', unit: '%', minimum: 10 }
] as const;
export const DOCUMENT_TYPES = ['kuitansi', 'invoice', 'ba', 'nota'] as const;
export type DocumentKind = (typeof DOCUMENT_TYPES)[number];
export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  kuitansi: 'Kuitansi',
  invoice: 'Invoice',
  ba: 'Berita acara (BA)',
  nota: 'Nota'
};
export const STAGES = {
  kpi: 'Penilaian KPI',
  documents: 'Kelengkapan dokumen',
  pf: 'Approval PF',
  campus: 'Approval kampus',
  finance: 'Approval keuangan',
  ready: 'Siap dikirim',
  sent: 'Diproses keuangan',
  paid: 'Sudah dicairkan'
} as const;
export type PaymentStage = keyof typeof STAGES;
export interface KpiEvidence {
  id: string;
  target: number;
  page: number;
  evidence: string;
}
export interface PaymentDocument {
  kind: DocumentKind;
  fileId: string;
  filename: string;
  size: number;
  status: 'pending' | 'accepted' | 'revision';
  note: string;
  uploadedAt: string;
  reviewedBy?: string;
}
export interface Approval {
  role: Role;
  actorId: string;
  actorName: string;
  at: string;
  note: string;
}
export interface PaymentCase {
  id: string;
  campusId: string;
  proposalId: string;
  amount: number;
  revision: number;
  stage: PaymentStage;
  kpis: KpiEvidence[];
  documents: PaymentDocument[];
  approvals: Approval[];
  assessedAt?: string;
  assessedBy?: string;
  assessmentNote?: string;
  history: { id: string; at: string; actor: string; action: string; note: string }[];
  archives: { id: string; filename: string; createdAt: string; createdBy: string }[];
  paidAt?: string;
  paymentReference?: string;
}
export function newPayment(
  id: string,
  campusId: string,
  proposalId: string,
  amount: number
): PaymentCase {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e12)
    throw Error('Nominal harus bilangan rupiah positif maksimal 1 triliun.');
  return {
    id,
    campusId,
    proposalId,
    amount,
    revision: 0,
    stage: 'kpi',
    kpis: DEMO_KPIS.map((k) => ({ id: k.id, target: 0, page: 1, evidence: '' })),
    documents: [],
    approvals: [],
    history: [],
    archives: []
  };
}
export function evaluateKpi(rows: KpiEvidence[]) {
  const checks = DEMO_KPIS.map((k) => {
    const matches = rows.filter((r) => r.id === k.id),
      row = matches[0];
    return {
      ...k,
      met:
        matches.length === 1 &&
        Number.isFinite(row.target) &&
        row.target >= k.minimum &&
        Number.isInteger(row.page) &&
        row.page > 0 &&
        typeof row.evidence === 'string' &&
        row.evidence.trim().length >= 20 &&
        row.evidence.length <= 3000
    };
  });
  return { checks, passed: rows.length === DEMO_KPIS.length && checks.every((c) => c.met) };
}
export function requirePayment(p: PaymentCase, user: AppSession, revision: number) {
  if (user.role === 'campus' && user.campusId !== p.campusId)
    throw Error('Data kampus lain tidak dapat diakses.');
  if (p.revision !== revision) throw Error('Data sudah berubah. Muat ulang sebelum menyimpan.');
}
export function recordPayment(p: PaymentCase, user: AppSession, action: string, note: string) {
  p.history.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: user.name,
    action,
    note
  });
  p.revision++;
}
export type PaymentAction = 'assess' | 'submit-documents' | 'approve' | 'revise' | 'paid';
export function advancePayment(
  p: PaymentCase,
  user: AppSession,
  revision: number,
  action: PaymentAction,
  note: string
) {
  requirePayment(p, user, revision);
  if (typeof note !== 'string' || note.length > 3000)
    throw Error('Catatan maksimal 3000 karakter.');
  if (user.role !== 'admin') throw Error('Hanya Admin PF yang dapat mengubah pencairan.');
  const approvals: Partial<Record<PaymentStage, Role>> = {
    pf: 'admin',
    campus: 'campus',
    finance: 'finance'
  };
  if (action === 'assess' && p.stage === 'kpi') {
    if (!evaluateKpi(p.kpis).passed)
      throw Error('Target dan bukti KPI belum memenuhi kriteria simulasi.');
    if (!note.trim()) throw Error('Isi catatan pemeriksaan bukti KPI.');
    p.assessedAt = new Date().toISOString();
    p.assessedBy = user.name;
    p.assessmentNote = note;
    p.stage = 'documents';
  } else if (action === 'submit-documents' && p.stage === 'documents') {
    if (
      !DOCUMENT_TYPES.every((kind) =>
        p.documents.some((d) => d.kind === kind && d.status === 'accepted')
      )
    )
      throw Error('Semua dokumen harus lengkap dan valid.');
    p.stage = 'pf';
  } else if (action === 'approve' && approvals[p.stage]) {
    p.approvals.push({
      role: approvals[p.stage]!,
      actorId: user.id,
      actorName: user.name,
      at: new Date().toISOString(),
      note
    });
    p.stage = p.stage === 'pf' ? 'campus' : p.stage === 'campus' ? 'finance' : 'ready';
  } else if (action === 'revise' && ['documents', 'pf', 'campus', 'finance'].includes(p.stage)) {
    if (!note.trim()) throw Error('Alasan revisi wajib diisi.');
    p.stage = 'kpi';
    p.approvals = [];
    delete p.assessedAt;
    delete p.assessedBy;
    delete p.assessmentNote;
    p.documents.forEach((d) => {
      d.status = 'pending';
      d.note = '';
      delete d.reviewedBy;
    });
  } else if (action === 'paid' && p.stage === 'sent') {
    if (!note.trim()) throw Error('Referensi pencairan wajib diisi.');
    p.stage = 'paid';
    p.paidAt = new Date().toISOString();
    p.paymentReference = note.trim();
  } else throw Error('Tindakan tidak tersedia pada tahap ini.');
  const labels: Record<PaymentAction, string> = {
    assess: 'KPI dinyatakan sesuai',
    'submit-documents': 'Pemeriksaan berkas selesai',
    approve: 'Persetujuan pencairan',
    revise: 'Dikembalikan untuk revisi',
    paid: 'Pencairan dicatat'
  };
  recordPayment(p, user, labels[action], note.trim());
}
