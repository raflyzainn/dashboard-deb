import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newPayment,
  evaluateKpi,
  advancePayment,
  DEMO_KPIS,
  DOCUMENT_TYPES
} from '../src/lib/payments';
import { initialState, upgradeAccounts } from '../src/lib/data/demo/store';
import { createPaymentService, seedPayments } from '../src/lib/data/demo/payments';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { wrapPdfText } from '../src/lib/payment-pdf';
import type { AppSession } from '../src/lib/types';

test('payment requires KPI evidence, every document, ordered approvals, scope and current revision', () => {
  const p = newPayment('payment', 'campus-001', 'proposal', 1000000);
  const pf = { id: 'admin-1', role: 'admin' as const, name: 'PF' };
  const campus = {
    id: 'campus-001-pic2',
    role: 'campus' as const,
    campusId: p.campusId,
    name: 'SoBI'
  };
  const finance = { id: 'finance-1', role: 'finance' as const, name: 'Keuangan' };
  assert.equal(evaluateKpi(p.kpis).passed, false);
  assert.throws(() => advancePayment(p, pf, 0, 'approve', ''), /tahap/i);
  p.kpis = DEMO_KPIS.map((k) => ({
    id: k.id,
    target: k.minimum,
    page: 1,
    evidence: 'Bukti kegiatan pada halaman proposal yang diperiksa.'
  }));
  assert.equal(evaluateKpi(p.kpis).passed, true);
  assert.equal(evaluateKpi([...p.kpis.slice(1), p.kpis[1]]).passed, false);
  assert.throws(() => advancePayment(p, campus, 0, 'assess', ''), /admin/i);
  advancePayment(p, pf, 0, 'assess', 'Bukti sudah diperiksa.');
  assert.equal(p.stage, 'documents');
  assert.throws(() => advancePayment(p, pf, p.revision, 'submit-documents', ''), /dokumen/i);
  p.documents = DOCUMENT_TYPES.map((kind) => ({
    kind,
    fileId: kind,
    filename: kind + '.pdf',
    size: 20,
    status: 'accepted' as const,
    note: 'Lengkap',
    uploadedAt: '2026-09-18',
    reviewedBy: pf.id
  }));
  advancePayment(p, pf, p.revision, 'submit-documents', 'Lengkap');
  assert.throws(() => advancePayment(p, finance, p.revision, 'approve', ''), /admin/i);
  advancePayment(p, pf, p.revision, 'approve', 'PF menyetujui');
  assert.throws(
    () => advancePayment(p, { ...campus, campusId: 'campus-002' }, p.revision, 'approve', ''),
    /kampus/i
  );
  assert.throws(() => advancePayment(p, campus, 0, 'approve', ''), /berubah/i);
  advancePayment(p, pf, p.revision, 'approve', 'Kampus menyetujui');
  advancePayment(p, pf, p.revision, 'approve', 'Keuangan menyetujui');
  assert.equal(p.stage, 'ready');
  assert.deepEqual(
    p.approvals.map((a) => a.role),
    ['admin', 'campus', 'finance']
  );
  assert.ok(p.approvals.every((a) => a.actorId === pf.id));
  assert.throws(() => advancePayment(p, pf, p.revision, 'paid', 'REF'), /tahap/i);
});

test('demo payment service protects files and archives the complete PDF once, without losing old browser work', async () => {
  const state = initialState();
  const p = state.data.payments!.find((p) => p.stage === 'ready')!;
  let user: AppSession = { id: 'admin-1', name: 'PF', role: 'admin' };
  // A real in-memory transaction boundary for testing this synchronous store service.
  const service = createPaymentService(async (action) => action(state, user));
  user = { id: 'outsider', name: 'Lain', role: 'campus', campusId: 'other' };
  await assert.rejects(service.paymentFile(p.id, p.proposalId), /kampus/);
  await assert.rejects(service.exportPayment(p.id, p.revision), /admin/i);
  user = { id: p.campusId, name: 'Mentor', role: 'campus', campusId: p.campusId };
  await assert.rejects(service.exportPayment(p.id, p.revision), /admin/i);
  await assert.rejects(service.paymentFile(p.id, 'not-a-file'), /Berkas/);
  user = { id: 'admin-1', name: 'PF', role: 'admin' };
  const revision = p.revision;
  const exported = await service.exportPayment(p.id, revision);
  const pdf = await PDFDocument.load(await exported.blob.arrayBuffer());
  assert.ok(pdf.getPageCount() >= 6, 'summary plus all five source PDFs');
  assert.equal(p.stage, 'sent');
  assert.equal(p.archives.length, 1);
  assert.equal((await service.paymentFile(p.id, p.archives[0].id)).size, exported.blob.size);
  await assert.rejects(service.exportPayment(p.id, revision), /berubah/);
  user = { id: 'admin-1', name: 'PF', role: 'admin' };
  await service.paymentAction(p.id, p.revision, 'paid', 'SIM-2026-0001');
  assert.equal(p.stage, 'paid');
  assert.equal(p.paymentReference, 'SIM-2026-0001');
  assert.equal(upgradeAccounts(state), false);
  assert.equal(p.archives.length, 1);
});

test('document upload rejects fake PDFs and cannot bypass KPI or edit accepted stages', async () => {
  const state = initialState();
  const p = state.data.payments![0];
  const service = createPaymentService(async (action) =>
    action(state, { id: 'admin-1', name: 'PF', role: 'admin' })
  );
  await assert.rejects(
    service.uploadPaymentDocument(
      p.id,
      p.revision,
      'invoice',
      new File(['not pdf'], 'invoice.pdf')
    ),
    /PDF/
  );
  const { samplePdf } = await import('../src/lib/data/demo/fixtures/pdf');
  await assert.rejects(
    service.uploadPaymentDocument(
      p.id,
      p.revision,
      'invoice',
      new File([samplePdf('Invoice', 1)], 'invoice.pdf')
    ),
    /tahap dokumen/
  );
  assert.equal(p.documents.length, 0);
  const old = state.data.proposals.find((v) => v.campusId === p.campusId && v.id !== p.proposalId)!;
  state.files[old.id] = new Blob(['%PDF-\nbroken'], { type: 'application/pdf' });
  await assert.rejects(service.createPayment(old.id, 10000), /PDF/);
});

test('archive wrapping measures long tokens and payment notifications identify the exact version case', async () => {
  const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const rows = wrapPdfText('W'.repeat(200) + ' kata berikutnya', font, 10);
  assert.ok(rows.every((row) => font.widthOfTextAtSize(row, 10) <= 500));
  assert.equal(rows.join('').replace(/ /g, ''), 'W'.repeat(200) + 'kataberikutnya');
  const state = initialState();
  for (const n of state.data.notifications.filter((n) => n.href.includes('/payments'))) {
    const url = new URL(n.href, 'https://demo.invalid');
    assert.ok(
      state.data.payments!.some(
        (p) =>
          p.id === url.searchParams.get('payment') && p.campusId === url.searchParams.get('campus')
      )
    );
  }
});

test('legacy uploaded proposals are preserved and never silently approved by dummy payment migration', () => {
  const state = initialState();
  delete state.data.payments;
  const original = state.data.proposals.find((p) => p.campusId === 'campus-006')!;
  const upload = {
    ...original,
    id: 'legacy-user-upload',
    version: 999,
    filename: 'old-encrypted.pdf'
  };
  state.data.proposals.push(upload);
  const file = new Blob(['%PDF-\nbroken']);
  state.files[upload.id] = file;
  seedPayments(state);
  const ready = state.data.payments!.find((p) => p.campusId === 'campus-006')!;
  assert.equal(ready.stage, 'ready');
  assert.notEqual(ready.proposalId, upload.id);
  assert.equal(state.files[upload.id], file);
  assert.equal(
    state.data.proposals.find((p) => p.id === upload.id),
    upload
  );
});

test('revision invalidates approvals and document validation while keeping the audit history', () => {
  const p = newPayment('p', 'c', 'v', 500);
  p.stage = 'finance';
  p.approvals.push({ role: 'admin', actorId: 'a', actorName: 'PF', at: '2026-09-18', note: '' });
  advancePayment(
    p,
    { id: 'admin-1', role: 'admin', name: 'PF' },
    0,
    'revise',
    'Invoice perlu diperbaiki'
  );
  assert.equal(p.stage, 'kpi');
  assert.equal(p.approvals.length, 0);
  assert.equal(p.assessedAt, undefined);
  assert.match(p.history.at(-1)!.note, /Invoice/);
  assert.throws(() => newPayment('p', 'c', 'v', -1), /nominal/i);
});

test('campus accounts cannot mutate payments', async () => {
  for (const user of [
    { id: 'campus-001', name: 'Mentor', role: 'campus', campusId: 'campus-001' },
    { id: 'campus-001-pic2', name: 'SoBI', role: 'campus', campusId: 'campus-001' }
  ] as AppSession[]) {
    const state = initialState();
    const p = state.data.payments![0];
    const service = createPaymentService(async (action) => action(state, user));
    const before = JSON.stringify(state.data);
    await assert.rejects(service.createPayment(p.proposalId, 1000), /admin/i);
    await assert.rejects(service.savePaymentKpi(p.id, p.revision, 1000, p.kpis), /admin/i);
    await assert.rejects(
      service.uploadPaymentDocument(p.id, p.revision, 'nota', new File([''], 'nota.pdf')),
      /admin/i
    );
    await assert.rejects(
      service.reviewPaymentDocument(p.id, p.revision, 'nota', true, ''),
      /admin/i
    );
    for (const action of ['assess', 'submit-documents', 'approve', 'revise', 'paid'] as const)
      await assert.rejects(service.paymentAction(p.id, p.revision, action, 'Catatan'), /admin/i);
    await assert.rejects(service.exportPayment(p.id, p.revision), /admin/i);
    assert.equal(JSON.stringify(state.data), before);
  }
});

test('finance can upload documents but cannot review or advance the payment', async () => {
  const state = initialState();
  const p = state.data.payments![1];
  const service = createPaymentService(async (action) =>
    action(state, { id: 'finance-1', name: 'Keuangan', role: 'finance' })
  );
  const { samplePdf } = await import('../src/lib/data/demo/fixtures/pdf');
  await service.uploadPaymentDocument(
    p.id,
    p.revision,
    'nota',
    new File([samplePdf('Nota', 1)], 'nota-keuangan.pdf', { type: 'application/pdf' })
  );
  assert.equal(p.documents.find((d) => d.kind === 'nota')?.filename, 'nota-keuangan.pdf');
  assert.equal(p.history.at(-1)?.actor, 'Keuangan');
  await assert.rejects(service.reviewPaymentDocument(p.id, p.revision, 'nota', true, ''), /PF/);
  await assert.rejects(service.paymentAction(p.id, p.revision, 'submit-documents', ''), /Admin/);
});
