import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { average, campusStats, progress } from '../src/lib/domain';
import { createSeed, DEMO_CAMPUS } from '../src/lib/data/seed';
import { createMockService } from '../src/lib/data/service';
import { samplePdf } from '../src/lib/data/pdf';
import type { DemoSession } from '../src/lib/types';

const admin: DemoSession = { role: 'admin', name: 'Admin PF' };
const campus: DemoSession = { role: 'campus', name: 'Universitas Contoh', campusId: DEMO_CAMPUS };
const service = () => createMockService(`deb-test-${crypto.randomUUID()}`);
const pdf = (name = 'contoh.pdf') => new File([samplePdf('Universitas Contoh', 1)], name, { type: 'application/pdf' });

test('seed has exactly 40 fictional campuses and 30 valid indicators per campus', () => {
  const { data, files } = createSeed();
  assert.equal(data.campuses.length, 40);
  assert.equal(data.definitions.length, 30);
  assert.equal(data.indicators.length, 1200);
  for (const c of data.campuses) {
    assert.equal(data.indicators.filter(i => i.campusId === c.id).length, 30);
    assert.ok(c.name.includes('Simulasi') || c.name === 'Universitas Contoh');
  }
  for (const i of data.indicators) { assert.ok(i.target > 0); assert.ok(data.definitions.some(d => d.id === i.definitionId)); }
  assert.equal(data.proposals.length, files.length);
  assert.equal(new Set(data.likes.map(l => `${l.questionId}:${l.campusId}`)).size, data.likes.length);
  for (const l of data.likes) assert.ok(data.campuses.some(c => c.id === l.campusId));
  assert.deepEqual(data, createSeed().data);
});
test('progress uses current/target and averages capped values', () => {
  assert.equal(progress({ current: 40, target: 50 }), 80);
  assert.equal(progress({ current: 150, target: 100 }), 100);
  assert.equal(progress({ current: 0, target: 100 }), 0);
  assert.equal(progress({ current: Infinity, target: 100 }), 0);
  assert.equal(progress({ current: 10, target: 0 }), 0);
  assert.equal(average([80, 100, 40]), 220 / 3);
  const { data } = createSeed();
  assert.equal(campusStats(data, DEMO_CAMPUS).progress, 76);
  assert.equal(campusStats(data, DEMO_CAMPUS).achieved, 12);
});
test('work data is campus-scoped while forum authors and questions are shared', async () => {
  const api = service();
  const own = await api.load(campus);
  const full = await api.load(admin);
  assert.equal(own.indicators.length, 30);
  assert.equal(full.indicators.length, 1200);
  assert.deepEqual(own.questions, full.questions);
  assert.ok(own.questions.some(q => q.campusId !== DEMO_CAMPUS));
  assert.equal(own.campuses.length, 40);
  await assert.rejects(api.updateIndicator(campus, 'campus-002-i1', 1, ''), /milik kampus lain/);
  await assert.rejects(api.proposalFile(campus, 'campus-002-v1'), /milik kampus lain/);
  await assert.rejects(api.load({ ...campus, campusId: 'campus-002' }), /tidak valid/);
});
test('feedback flows from admin revision to campus response to closure without altering progress', async () => {
  const api = service();
  await api.addFeedback(admin, 'campus-001-i1', 'Perbarui periode data.', true);
  let data = await api.load(admin);
  const f = data.feedback.find(f => f.text === 'Perbarui periode data.')!;
  const before = campusStats(data, DEMO_CAMPUS).progress;
  assert.equal(f.state, 'open');
  await api.updateIndicator(campus, 'campus-001-i1', 10, 'Sudah diperiksa.');
  data = await api.load(admin);
  assert.equal(data.feedback.find(x => x.id === f.id)?.state, 'responded');
  assert.equal(campusStats(data, DEMO_CAMPUS).progress, before);
  await api.closeFeedback(admin, f.id);
  assert.equal((await api.load(campus)).feedback.find(x => x.id === f.id)?.state, 'closed');
});
test('invalid numeric inputs and disallowed mutations fail without writes', async () => {
  const api = service();
  const original = await api.load(campus);
  for (const n of [-1, NaN, Infinity]) await assert.rejects(api.updateIndicator(campus, 'campus-001-i1', n, ''), /angka/);
  await assert.rejects(api.updateIndicator(admin, 'campus-001-i1', 20, ''), /akses/);
  await assert.rejects(api.addFeedback(campus, 'campus-001-i1', 'test', true), /akses/);
  await assert.rejects(api.answer(campus, 'question-1', 'test'), /akses/);
  assert.deepEqual((await api.load(campus)).indicators, original.indicators);
});
test('PDF versions are atomic and sequential, even for concurrent uploads', async () => {
  const api = service();
  await api.load(campus);
  await Promise.all([api.uploadProposal(campus, pdf('satu.pdf'), 'Perubahan satu'), api.uploadProposal(campus, pdf('dua.pdf'), 'Perubahan dua')]);
  const data = await api.load(campus);
  assert.deepEqual(data.proposals.map(p => p.version).sort(), [1, 2, 3, 4, 5]);
  for (const p of data.proposals) {
    const blob = await api.proposalFile(campus, p.id);
    assert.equal(await blob.slice(0,5).text(), '%PDF-');
    assert.equal(blob.size, p.size);
    assert.match(await blob.text(), /%%EOF$/);
  }
});
test('invalid PDF extension, MIME, signature, size and missing change note create no version', async () => {
  const api = service();
  const before = await api.load(campus);
  const invalid = [pdf('file.txt'), new File(['%PDF-1.4'], 'file.pdf', { type: 'text/plain' }), new File(['not pdf'], 'file.pdf', { type: 'application/pdf' }), new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' })];
  for (const file of invalid) await assert.rejects(api.uploadProposal(campus, file, 'test'));
  await assert.rejects(api.uploadProposal(campus, pdf(), '   '), /wajib/);
  assert.deepEqual((await api.load(campus)).proposals, before.proposals);
});
test('forum likes toggle uniquely and answer updates do not overwrite curated FAQ', async () => {
  const api = service();
  const id = await api.ask(campus, 'Pertanyaan uji bersama', 'Konteks pertanyaan lengkap.');
  await api.toggleLike(campus, id);
  assert.equal((await api.load(admin)).likes.filter(l => l.questionId === id).length, 1);
  await api.toggleLike(campus, id);
  assert.equal((await api.load(admin)).likes.filter(l => l.questionId === id).length, 0);
  await Promise.all([api.toggleLike(campus, id), api.toggleLike(campus, id)]);
  assert.equal((await api.load(admin)).likes.filter(l => l.questionId === id).length, 0);
  await assert.rejects(api.promoteFaq(admin, id), /Jawab/);
  await api.answer(admin, id, 'Jawaban awal');
  await api.promoteFaq(admin, id);
  await assert.rejects(api.promoteFaq(admin, id), /sudah/);
  await api.answer(admin, id, 'Jawaban diperbarui');
  const data = await api.load(campus);
  assert.equal(data.faq.find(f => f.questionId === id)?.answer, 'Jawaban awal');
  assert.equal(data.answers.filter(a => a.questionId === id).length, 1);
  assert.equal(data.answers.find(a => a.questionId === id)?.body, 'Jawaban diperbarui');
});
test('FAQ edits, ordering and deletion preserve the source forum', async () => {
  const api = service();
  await api.saveFaq(admin, { question: 'Manual', answer: 'Panduan manual' });
  let data = await api.load(admin);
  const manual = data.faq.find(f => f.question === 'Manual')!;
  await api.moveFaq(admin, manual.id, -1);
  await api.saveFaq(admin, { id: manual.id, question: 'Manual baru', answer: 'Jawaban baru' });
  data = await api.load(admin);
  assert.equal(data.faq.find(f => f.id === manual.id)?.order, 1);
  const source = data.faq.find(f => f.questionId)!;
  await api.deleteFaq(admin, source.id);
  data = await api.load(campus);
  assert.ok(data.questions.some(q => q.id === source.questionId));
  assert.ok(data.answers.some(a => a.questionId === source.questionId));
});
test('state persists across service instances and resetting one database does not affect another', async () => {
  const name = `deb-test-${crypto.randomUUID()}`;
  const one = createMockService(name);
  const two = createMockService(name);
  const unrelated = service();
  const otherQuestion = await unrelated.ask(campus, 'Tetap ada', 'Data database lain');
  const id = await one.ask(campus, 'Tersimpan', 'Tetap ada setelah reload');
  assert.ok((await two.load(admin)).questions.some(q => q.id === id));
  await two.reset();
  assert.equal((await one.load(admin)).questions.length, 6);
  assert.ok((await unrelated.load(admin)).questions.some(q => q.id === otherQuestion));
});
