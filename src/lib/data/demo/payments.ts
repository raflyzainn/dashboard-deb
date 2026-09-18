import type { AppSession } from '../../types';
import type { DemoState } from './store';
import { samplePdf } from './fixtures/pdf';
import {
  advancePayment,
  newPayment,
  recordPayment,
  requirePayment,
  DEMO_KPIS,
  DOCUMENT_TYPES,
  DOCUMENT_LABELS,
  STAGES,
  type KpiEvidence,
  type DocumentKind,
  type PaymentAction,
  type PaymentStage
} from '../../payments';

type Run = <T>(action: (state: DemoState, user: AppSession) => T, write?: boolean) => Promise<T>;
export function seedPayments(s: DemoState) {
  if (s.data.payments) return false;
  s.data.payments = [];
  s.data.proposalComments ??= [];
  const at = '2026-09-18T02:00:00.000Z';
  for (const [i, campus] of s.data.campuses.entries()) {
    let proposal = s.data.proposals
      // Uploaded versions use UUIDs. Advanced dummy cases must reference only our immutable generated fixtures.
      .filter(
        (p) => p.campusId === campus.id && p.id === `${campus.id}-v${p.version}` && s.files[p.id]
      )
      .sort((a, b) => b.version - a.version)[0];
    if (!proposal) {
      const version =
        Math.max(
          0,
          ...s.data.proposals.filter((p) => p.campusId === campus.id).map((p) => p.version)
        ) + 1;
      const file = samplePdf(campus.name, version);
      proposal = {
        id: `demo-payment-proposal-${campus.id}`,
        campusId: campus.id,
        version,
        filename: 'proposal-contoh.pdf',
        size: file.size,
        createdAt: at,
        changes: 'Proposal dummy untuk mencoba alur pencairan.',
        simulated: true
      };
      s.data.proposals.push(proposal);
      s.files[proposal.id] = file;
    }
    const p = newPayment(`payment-${campus.id}`, campus.id, proposal.id, 50000000 + i * 1000000);
    p.kpis = DEMO_KPIS.map((k) => ({
      id: k.id,
      target: k.minimum * 2,
      page: 1,
      evidence: `Contoh rencana ${k.label.toLowerCase()} untuk masyarakat desa. Bukti simulasi; gunakan proposal contoh untuk latihan.`
    }));
    const stage = (['kpi', 'documents', 'pf', 'campus', 'finance', 'ready'] as PaymentStage[])[
      i % 6
    ];
    p.stage = stage;
    if (stage !== 'kpi') {
      p.assessedAt = at;
      p.assessedBy = 'Admin PF Demo';
      p.assessmentNote = 'Bukti dummy sudah diperiksa untuk simulasi.';
      for (const kind of DOCUMENT_TYPES) {
        if (stage === 'documents' && kind === 'nota') continue;
        const fileId = `${p.id}-${kind}`;
        const file = samplePdf(`${DOCUMENT_LABELS[kind]} - ${campus.name}`, 1);
        s.files[fileId] = file;
        p.documents.push({
          kind,
          fileId,
          filename: `${kind}-contoh.pdf`,
          size: file.size,
          uploadedAt: at,
          status: stage === 'documents' ? 'pending' : 'accepted',
          note: stage === 'documents' ? '' : 'Berkas dummy valid.',
          reviewedBy: stage === 'documents' ? undefined : 'Admin PF Demo'
        });
      }
    }
    if (['campus', 'finance', 'ready'].includes(stage))
      p.approvals.push({
        role: 'admin',
        actorId: 'admin-1',
        actorName: 'Admin PF Demo',
        at,
        note: 'Persetujuan PF simulasi'
      });
    if (['finance', 'ready'].includes(stage))
      p.approvals.push({
        role: 'campus',
        actorId: campus.id,
        actorName: 'Mentor Demo',
        at,
        note: 'Persetujuan kampus simulasi'
      });
    if (stage === 'ready')
      p.approvals.push({
        role: 'finance',
        actorId: 'finance-1',
        actorName: 'Keuangan Demo',
        at,
        note: 'Persetujuan keuangan simulasi'
      });
    p.history.push({
      id: `seed-${p.id}`,
      at,
      actor: 'Data dummy',
      action: 'Data contoh',
      note: `Skenario simulasi: ${STAGES[stage]}`
    });
    s.data.payments.push(p);
    paymentNotifications(
      s,
      campus.id,
      p.id,
      `Pengajuan contoh: ${STAGES[stage]}. Periksa berkas dan lanjutkan proses.`
    );
    s.data.proposalComments.push({
      id: `comment-${p.id}`,
      proposalId: proposal.id,
      campusId: campus.id,
      actorId: 'admin-1',
      authorName: 'Admin PF Demo',
      body: 'Contoh komentar: mohon cocokkan target KPI dan kelengkapan berkas pencairan.',
      createdAt: at
    });
  }
  return true;
}

export function paymentNotifications(
  s: DemoState,
  campusId: string,
  paymentId: string,
  title: string
) {
  for (const role of ['admin', 'campus', 'finance'] as const)
    s.data.notifications.unshift({
      id: crypto.randomUUID(),
      campusId,
      recipient: role,
      title,
      body: title,
      href: `/${role}/payments?campus=${encodeURIComponent(campusId)}&payment=${encodeURIComponent(paymentId)}`,
      createdAt: new Date().toISOString(),
      readAt: null,
      simulated: true
    });
}
export function createPaymentService(transact: Run) {
  const admin = (user: AppSession) => {
    if (user.role !== 'admin') throw Error('Hanya Admin PF yang dapat mengubah pencairan.');
  };
  const run: Run = (action, write) => transact(action, write);
  const get = (s: DemoState, id: string) => {
    const p = s.data.payments?.find((p) => p.id === id);
    if (!p) throw Error('Pengajuan pencairan tidak ditemukan.');
    return p;
  };
  return {
    createPayment: async (proposalId: string, amount: number) => {
      const input = await run((s, user) => {
        admin(user);
        const proposal = s.data.proposals.find((p) => p.id === proposalId);
        if (user.role !== 'admin' || !proposal || !s.files[proposalId])
          throw Error('Proposal kampus tidak ditemukan.');
        return { file: s.files[proposalId], actorId: user.id };
      });
      const { validatePdf } = await import('../../payment-pdf');
      await validatePdf(input.file);
      return run((s, user) => {
        admin(user);
        const proposal = s.data.proposals.find((p) => p.id === proposalId);
        if (user.id !== input.actorId || user.role !== 'admin' || !proposal)
          throw Error('Proposal kampus tidak ditemukan atau sesi berubah.');
        if (s.data.payments?.some((p) => p.proposalId === proposalId))
          throw Error('Versi proposal ini sudah memiliki pengajuan.');
        const p = newPayment(crypto.randomUUID(), proposal.campusId, proposalId, amount);
        recordPayment(p, user, 'Pengajuan dibuat', '');
        (s.data.payments ??= []).push(p);
        paymentNotifications(s, p.campusId, p.id, 'Pengajuan pencairan baru.');
      }, true);
    },
    savePaymentKpi: (id: string, revision: number, amount: number, rows: KpiEvidence[]) =>
      run((s, user) => {
        const p = get(s, id);
        requirePayment(p, user, revision);
        if (user.role !== 'admin' || p.stage !== 'kpi')
          throw Error('Isian KPI hanya dapat diubah Admin PF pada tahap penilaian.');
        newPayment('', '', '', amount);
        if (
          rows.length !== DEMO_KPIS.length ||
          !DEMO_KPIS.every((k) => rows.filter((r) => r.id === k.id).length === 1) ||
          rows.some(
            (r) =>
              !Number.isFinite(r.target) ||
              r.target < 0 ||
              r.target > 1e12 ||
              !Number.isInteger(r.page) ||
              r.page < 1 ||
              r.page > 10000 ||
              typeof r.evidence !== 'string' ||
              r.evidence.length > 3000
          )
        )
          throw Error('Isian KPI tidak valid.');
        p.amount = amount;
        p.kpis = rows.map((r) => ({
          id: r.id,
          target: r.target,
          page: r.page,
          evidence: r.evidence
        }));
        recordPayment(p, user, 'Bukti KPI diperbarui', '');
        paymentNotifications(s, p.campusId, p.id, 'Bukti KPI siap diperiksa PF.');
      }, true),
    paymentAction: (id: string, revision: number, action: PaymentAction, note: string) =>
      run((s, user) => {
        const p = get(s, id);
        advancePayment(p, user, revision, action, note);
        paymentNotifications(s, p.campusId, p.id, `Pencairan: ${STAGES[p.stage]}. ${note}`);
      }, true),
    uploadPaymentDocument: async (id: string, revision: number, kind: DocumentKind, file: File) => {
      // Parse before opening IndexedDB's synchronous transaction.
      const actorId = await run((_s, user) => {
        if (!['admin', 'finance'].includes(user.role))
          throw Error('Unggah dokumen hanya tersedia untuk Admin PF dan Keuangan.');
        return user.id;
      });
      if (
        !DOCUMENT_TYPES.includes(kind) ||
        !file.size ||
        file.size > 10485760 ||
        !file.name.toLowerCase().endsWith('.pdf')
      )
        throw Error('Pilih PDF maksimal 10 MiB.');
      const { validatePdf } = await import('../../payment-pdf');
      await validatePdf(file);
      return run((s, user) => {
        const p = get(s, id);
        requirePayment(p, user, revision);
        if (
          user.id !== actorId ||
          !['admin', 'finance'].includes(user.role) ||
          p.stage !== 'documents'
        )
          throw Error('Unggah hanya tersedia untuk Admin PF dan Keuangan pada tahap dokumen.');
        const old = p.documents.find((d) => d.kind === kind);
        const fileId = crypto.randomUUID();
        if (old) delete s.files[old.fileId];
        p.documents = p.documents.filter((d) => d.kind !== kind);
        p.documents.push({
          kind,
          fileId,
          filename: file.name,
          size: file.size,
          status: 'pending',
          note: '',
          uploadedAt: new Date().toISOString()
        });
        s.files[fileId] = file;
        recordPayment(p, user, 'Dokumen diunggah', DOCUMENT_LABELS[kind]);
        paymentNotifications(s, p.campusId, p.id, `${DOCUMENT_LABELS[kind]} menunggu pemeriksaan.`);
      }, true);
    },
    reviewPaymentDocument: (
      id: string,
      revision: number,
      kind: DocumentKind,
      accepted: boolean,
      note: string
    ) =>
      run((s, user) => {
        const p = get(s, id);
        requirePayment(p, user, revision);
        if (user.role !== 'admin' || p.stage !== 'documents')
          throw Error('Pemeriksaan berkas hanya untuk PF pada tahap dokumen.');
        const d = p.documents.find((d) => d.kind === kind);
        if (!d || typeof note !== 'string' || note.length > 3000 || (!accepted && !note.trim()))
          throw Error('Pilih dokumen dan isi alasan revisi.');
        d.status = accepted ? 'accepted' : 'revision';
        d.note = note.trim();
        d.reviewedBy = user.name;
        recordPayment(
          p,
          user,
          accepted ? 'Berkas valid' : 'Revisi berkas',
          `${DOCUMENT_LABELS[kind]}: ${note}`
        );
        paymentNotifications(
          s,
          p.campusId,
          p.id,
          `${DOCUMENT_LABELS[kind]}: ${accepted ? 'valid' : 'perlu revisi'}.`
        );
      }, true),
    paymentFile: (id: string, fileId: string) =>
      run((s, user) => {
        const p = get(s, id);
        requirePayment(p, user, p.revision);
        if (
          ![
            p.proposalId,
            ...p.documents.map((d) => d.fileId),
            ...p.archives.map((a) => a.id)
          ].includes(fileId) ||
          !s.files[fileId]
        )
          throw Error('Berkas tidak ditemukan.');
        return s.files[fileId];
      }),
    exportPayment: async (id: string, revision: number) => {
      const input = await run((s, user) => {
        admin(user);
        const p = get(s, id);
        requirePayment(p, user, revision);
        if (
          user.role !== 'admin' ||
          p.stage !== 'ready' ||
          !['admin', 'campus', 'finance'].every((r) => p.approvals.some((a) => a.role === r)) ||
          !p.assessedAt ||
          !DOCUMENT_TYPES.every((k) =>
            p.documents.some((d) => d.kind === k && d.status === 'accepted')
          )
        )
          throw Error('Paket hanya dapat dibuat setelah tiga persetujuan lengkap.');
        const proposal = s.data.proposals.find((v) => v.id === p.proposalId)!;
        return {
          payment: structuredClone(p),
          campus: s.data.campuses.find((c) => c.id === p.campusId)!.name,
          proposal: structuredClone(proposal),
          files: [
            s.files[p.proposalId],
            ...DOCUMENT_TYPES.map((k) => s.files[p.documents.find((d) => d.kind === k)!.fileId])
          ],
          userId: user.id,
          name: user.name
        };
      });
      const { buildPaymentPdf } = await import('../../payment-pdf');
      const blob = await buildPaymentPdf(input);
      return run((s, user) => {
        const p = get(s, id);
        requirePayment(p, user, revision);
        if (user.id !== input.userId || p.stage !== 'ready')
          throw Error('Sesi atau tahap berubah.');
        const archive = {
          id: crypto.randomUUID(),
          filename: `pencairan-${p.campusId}-${p.id}.pdf`,
          createdAt: new Date().toISOString(),
          createdBy: user.name
        };
        p.archives.push(archive);
        s.files[archive.id] = blob;
        p.stage = 'sent';
        recordPayment(
          p,
          user,
          'Paket dikirim ke keuangan',
          'PDF gabungan tersimpan dalam arsip demo.'
        );
        paymentNotifications(s, p.campusId, p.id, 'Paket pencairan tersedia di arsip keuangan.');
        return { blob, filename: archive.filename };
      }, true);
    }
  };
}
