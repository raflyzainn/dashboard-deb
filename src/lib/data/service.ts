import Dexie, { type Table } from 'dexie';
import type { DataService, DemoSession, Snapshot } from '../types';
import { createSeed, DEMO_CAMPUS, demoNotifications, NOTIFICATION_SEED_VERSION } from './seed';
import { validateCategories } from '../forum';
import { demoSubmissions, latestSubmission, changedSinceSubmission } from '../verification';

export const DB_NAME = 'deb-prototype-v1';
class DemoDatabase extends Dexie {
  state!: Table<{ id: string; data: Snapshot }, string>;
  files!: Table<{ id: string; blob: Blob }, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ state: 'id', files: 'id' });
  }
}
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
function requireRole(actor: DemoSession, role?: 'admin' | 'campus') {
  if (!actor || !['admin', 'campus'].includes(actor.role) || (role && actor.role !== role)) throw new Error('Anda tidak memiliki akses untuk tindakan ini.');
  if (actor.role === 'campus' && actor.campusId !== DEMO_CAMPUS) throw new Error('Akun kampus demo tidak valid.');
}
function requireCampus(actor: DemoSession, campusId: string) {
  requireRole(actor);
  if (actor.role === 'campus' && actor.campusId !== campusId) throw new Error('Data ini milik kampus lain.');
}
function content(value: string, label: string, max = 5000) {
  const text = value.trim();
  if (!text) throw new Error(`${label} wajib diisi.`);
  if (text.length > max) throw new Error(`${label} maksimal ${max} karakter.`);
  return text;
}
function activity(data: Snapshot, campusId: string, text: string) {
  data.activities.unshift({ id: uid(), campusId, text, createdAt: now() });
  data.activities = data.activities.slice(0, 200);
}
function notify(data: Snapshot, campusId: string, recipient: 'campus' | 'admin', title: string, body: string, href: string) {
  data.notifications.unshift({ id: uid(), campusId, recipient, title, body, href, createdAt: now(), readAt: null });
}
function ownsNotification(actor: DemoSession, notice: Snapshot['notifications'][number]) {
  return notice.recipient === actor.role && (actor.role === 'admin' || notice.campusId === actor.campusId);
}

export function createMockService(name = DB_NAME): DataService {
  let database: DemoDatabase | undefined;
  const db = () => database ??= new DemoDatabase(name);
  async function ensure() {
    const database = db();
    // The read and seed run in the same transaction, including across tabs.
    await database.transaction('rw', database.state, database.files, async () => {
      const existing = await database.state.get('main');
      if (existing) {
        if (!existing.data.submissions) {
          existing.data.submissions = demoSubmissions(existing.data);
          await database.state.put(existing);
        }
        // Upgrade existing browser data without resetting uploads or work history.
        if (!existing.data.notifications || existing.data.notificationSeedVersion !== NOTIFICATION_SEED_VERSION) {
          existing.data.notifications ??= [];
          const ids = new Set(existing.data.notifications.map(n => n.id));
          existing.data.notifications.push(...demoNotifications().filter(n => !ids.has(n.id)));
          existing.data.notificationSeedVersion = NOTIFICATION_SEED_VERSION;
          await database.state.put(existing);
        }
        return;
      }
      const seed = createSeed();
      await database.files.bulkPut(seed.files);
      await database.state.put({ id: 'main', data: seed.data });
    });
  }
  async function change<T>(actor: DemoSession, action: (data: Snapshot, database: DemoDatabase) => T | Promise<T>): Promise<T> {
    requireRole(actor);
    await ensure();
    const database = db();
    return database.transaction('rw', database.state, database.files, async () => {
      const record = await database.state.get('main');
      if (!record) throw new Error('Data demo tidak ditemukan. Silakan muat ulang.');
      const result = await action(record.data, database);
      await database.state.put(record);
      return result;
    });
  }
  return {
    async submitDeb(actor) {
      requireRole(actor, 'campus');
      await change(actor, data => {
        const previous = latestSubmission(data, actor.campusId!);
        if (previous?.status === 'pending') throw new Error('Data sedang menunggu verifikasi.');
        if (previous?.status === 'approved' && !changedSinceSubmission(data, previous)) throw new Error('Data ini sudah terverifikasi. Perbarui data sebelum mengirim kembali.');
        const indicators = data.indicators.filter(i => i.campusId === actor.campusId);
        if (!indicators.length || indicators.some(i => !Number.isFinite(i.current) || i.current < 0)) throw new Error('Lengkapi data indikator sebelum mengirim.');
        const id = uid();
        data.submissions ??= [];
        data.submissions.push({ id, campusId: actor.campusId!, version: (previous?.version ?? 0) + 1, status: 'pending', indicators: indicators.map(i => ({ ...i })), submittedAt: now() });
        activity(data, actor.campusId!, 'Data DEB dikirim untuk verifikasi Admin PF.');
        notify(data, actor.campusId!, 'admin', 'Pengajuan verifikasi DEB', 'Kampus mengirim data indikator untuk diperiksa.', `/admin/verifikasi?submission=${id}`);
      });
    },
    async reviewDeb(actor, submissionId, decision, note) {
      requireRole(actor, 'admin');
      if (decision !== 'approved' && decision !== 'revision') throw new Error('Keputusan tidak valid.');
      const clean = decision === 'revision' ? content(note, 'Catatan revisi') : note.trim();
      if (clean.length > 5000) throw new Error('Catatan maksimal 5000 karakter.');
      await change(actor, data => {
        const submission = data.submissions?.find(s => s.id === submissionId);
        if (!submission || submission.status !== 'pending') throw new Error('Pengajuan tidak ditemukan atau sudah diputuskan. Muat ulang data.');
        if (changedSinceSubmission(data, submission)) throw new Error('Data berubah sejak dikirim. Muat ulang dan periksa kembali.');
        if (decision === 'approved' && data.feedback.some(f => f.campusId === submission.campusId && f.requiresRevision && f.state !== 'closed')) throw new Error('Selesaikan feedback revisi per indikator sebelum menyetujui.');
        submission.status = decision;
        submission.decisionNote = clean;
        submission.reviewedAt = now(); submission.reviewedBy = actor.name;
        const title = decision === 'approved' ? 'Data DEB terverifikasi' : 'Revisi data DEB diminta';
        activity(data, submission.campusId, title);
        notify(data, submission.campusId, 'campus', title, clean || 'Admin PF telah menyetujui data indikator yang Anda kirim.', '/campus/indicators');
      });
    },
    async load(actor) {
      requireRole(actor);
      await ensure();
      const record = await db().state.get('main');
      if (!record) throw new Error('Data demo belum tersedia.');
      const data = record.data;
      data.notifications = data.notifications.filter(n => ownsNotification(actor, n));
      if (actor.role === 'campus') {
        data.submissions = data.submissions?.filter(s => s.campusId === actor.campusId);
        // Campus names are forum author references; work data is scoped separately.
        data.indicators = data.indicators.filter(i => i.campusId === actor.campusId);
        data.proposals = data.proposals.filter(p => p.campusId === actor.campusId);
        data.feedback = data.feedback.filter(f => f.campusId === actor.campusId);
        data.activities = data.activities.filter(a => a.campusId === actor.campusId);
      }
      return data;
    },
    async updateIndicator(actor, id, current, note) {
      requireRole(actor, 'campus');
      if (!Number.isFinite(current) || current < 0) throw new Error('Nilai aktual harus berupa angka hingga dan tidak negatif.');
      if (note.length > 5000) throw new Error('Catatan maksimal 5000 karakter.');
      await change(actor, data => {
        const item = data.indicators.find(i => i.id === id);
        if (!item) throw new Error('Indikator tidak ditemukan.');
        requireCampus(actor, item.campusId);
        if (latestSubmission(data, item.campusId)?.status === 'pending') throw new Error('Data sedang diverifikasi. Tunggu keputusan Admin sebelum mengubah indikator.');
        item.current = current; item.note = note.trim(); item.updatedAt = now();
        data.feedback.filter(f => f.indicatorId === id && f.requiresRevision && f.state === 'open').forEach(f => { f.state = 'responded'; f.updatedAt = now(); });
        activity(data, item.campusId, 'Nilai aktual dan catatan indikator diperbarui.');
        const label = data.definitions.find(d => d.id === item.definitionId)?.name || 'Indikator';
        notify(data, item.campusId, 'admin', 'Data indikator diperbarui', `${label}: ${current}. ${item.note}`, `/admin/campuses/${item.campusId}`);
      });
    },
    async addFeedback(actor, indicatorId, text, requiresRevision) {
      requireRole(actor, 'admin');
      const clean = content(text, 'Feedback');
      await change(actor, data => {
        const indicator = data.indicators.find(i => i.id === indicatorId);
        if (!indicator) throw new Error('Indikator tidak ditemukan.');
        data.feedback.push({ id: uid(), campusId: indicator.campusId, indicatorId, text: clean, requiresRevision, state: requiresRevision ? 'open' : 'closed', createdAt: now(), updatedAt: now() });
        activity(data, indicator.campusId, requiresRevision ? 'Admin PF meminta revisi data indikator.' : 'Admin PF menambahkan catatan indikator.');
        notify(data, indicator.campusId, 'campus', requiresRevision ? 'Permintaan revisi indikator' : 'Catatan baru dari Admin PF', clean, '/campus/indicators');
      });
    },
    async closeFeedback(actor, id) {
      requireRole(actor, 'admin');
      await change(actor, data => {
        const feedback = data.feedback.find(f => f.id === id);
        if (!feedback) throw new Error('Feedback tidak ditemukan.');
        if (feedback.state === 'closed') return;
        feedback.state = 'closed'; feedback.updatedAt = now();
        activity(data, feedback.campusId, 'Admin PF menandai feedback selesai.');
        notify(data, feedback.campusId, 'campus', 'Feedback telah diselesaikan', feedback.text, '/campus/indicators');
      });
    },
    async uploadProposal(actor, file, changes) {
      requireRole(actor, 'campus');
      const clean = content(changes, 'Catatan perubahan');
      if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) throw new Error('Pilih file dengan format PDF.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran PDF maksimal 10 MB.');
      if (await file.slice(0, 5).text() !== '%PDF-') throw new Error('File tidak memiliki signature PDF yang valid.');
      // Read/validate before the IndexedDB transaction to avoid auto-commit.
      await change(actor, async (data, database) => {
        const versions = data.proposals.filter(p => p.campusId === actor.campusId);
        const version = Math.max(0, ...versions.map(p => p.version)) + 1;
        const id = uid();
        await database.files.add({ id, blob: file });
        data.proposals.push({ id, campusId: actor.campusId!, version, filename: file.name, size: file.size, createdAt: now(), changes: clean, simulated: false });
        activity(data, actor.campusId!, `Proposal versi ${version} diajukan.`);
        notify(data, actor.campusId!, 'admin', `Proposal versi ${version} diajukan`, file.name, `/admin/campuses/${actor.campusId}`);
      });
    },
    async proposalFile(actor, id) {
      requireRole(actor);
      await ensure();
      const record = await db().state.get('main');
      const proposal = record?.data.proposals.find(p => p.id === id);
      if (!proposal) throw new Error('Proposal tidak ditemukan.');
      requireCampus(actor, proposal.campusId);
      const file = await db().files.get(id);
      if (!file) throw new Error('File PDF tidak tersedia.');
      return file.blob;
    },
    async ask(actor, title, body, categoryIds = ['umum']) {
      requireRole(actor, 'campus');
      const cleanTitle = content(title, 'Judul pertanyaan', 180);
      const cleanBody = content(body, 'Isi pertanyaan');
      const categories = validateCategories(categoryIds);
      return change(actor, data => {
        const id = uid();
        data.questions.push({ id, campusId: actor.campusId!, title: cleanTitle, body: cleanBody, categoryIds: categories, createdAt: now() });
        activity(data, actor.campusId!, 'Pertanyaan baru dibagikan di forum bersama.');
        notify(data, actor.campusId!, 'admin', 'Pertanyaan baru dari kampus', cleanTitle, `/admin/questions/${id}`);
        return id;
      });
    },
    async answer(actor, questionId, body) {
      requireRole(actor, 'admin');
      const clean = content(body, 'Jawaban');
      await change(actor, data => {
        const question = data.questions.find(q => q.id === questionId);
        if (!question) throw new Error('Pertanyaan tidak ditemukan.');
        const answer = data.answers.find(a => a.questionId === questionId);
        if (answer) { answer.body = clean; answer.updatedAt = now(); }
        else data.answers.push({ id: uid(), questionId, body: clean, updatedAt: now() });
        notify(data, question.campusId, 'campus', answer ? 'Jawaban Admin PF diperbarui' : 'Pertanyaan Anda telah dijawab', question.title, `/campus/questions/${questionId}`);
      });
    },
    async toggleLike(actor, questionId) {
      requireRole(actor, 'campus');
      await change(actor, data => {
        if (!data.questions.some(q => q.id === questionId)) throw new Error('Pertanyaan tidak ditemukan.');
        const existing = data.likes.find(l => l.questionId === questionId && l.campusId === actor.campusId);
        if (existing) data.likes = data.likes.filter(l => l !== existing);
        else data.likes.push({ id: `${questionId}:${actor.campusId}`, questionId, campusId: actor.campusId! });
      });
    },
    async promoteFaq(actor, questionId) {
      requireRole(actor, 'admin');
      await change(actor, data => {
        if (data.faq.some(f => f.questionId === questionId)) throw new Error('Pertanyaan ini sudah masuk FAQ.');
        const question = data.questions.find(q => q.id === questionId);
        const answer = data.answers.find(a => a.questionId === questionId);
        if (!question || !answer) throw new Error('Jawab pertanyaan sebelum menjadikannya FAQ.');
        data.faq.push({ id: uid(), questionId, question: question.title, answer: answer.body, order: Math.max(-1, ...data.faq.map(f => f.order)) + 1 });
      });
    },
    async saveFaq(actor, entry) {
      requireRole(actor, 'admin');
      const question = content(entry.question, 'Pertanyaan FAQ', 180);
      const answer = content(entry.answer, 'Jawaban FAQ');
      await change(actor, data => {
        if (entry.id) {
          const faq = data.faq.find(f => f.id === entry.id);
          if (!faq) throw new Error('FAQ tidak ditemukan.');
          faq.question = question; faq.answer = answer;
        } else data.faq.push({ id: uid(), question, answer, order: Math.max(-1, ...data.faq.map(f => f.order)) + 1 });
      });
    },
    async moveFaq(actor, id, direction) {
      requireRole(actor, 'admin');
      if (direction !== -1 && direction !== 1) throw new Error('Arah urutan tidak valid.');
      await change(actor, data => {
        const ordered = [...data.faq].sort((a, b) => a.order - b.order);
        const index = ordered.findIndex(f => f.id === id);
        if (index < 0) throw new Error('FAQ tidak ditemukan.');
        const other = index + direction;
        if (other < 0 || other >= ordered.length) return;
        [ordered[index], ordered[other]] = [ordered[other], ordered[index]];
        ordered.forEach((f, i) => { f.order = i; });
      });
    },
    async deleteFaq(actor, id) {
      requireRole(actor, 'admin');
      await change(actor, data => { data.faq = data.faq.filter(f => f.id !== id); });
    },
    async readNotifications(actor, ids) {
      await change(actor, data => {
        const owned = data.notifications.filter(n => ownsNotification(actor, n));
        if (ids && ids.some(id => !owned.some(n => n.id === id))) throw new Error('Notifikasi tidak ditemukan atau bukan milik Anda.');
        const timestamp = now();
        owned.filter(n => !ids || ids.includes(n.id)).forEach(n => { n.readAt ??= timestamp; });
      });
    },
    async reset() {
      const seed = createSeed();
      const database = db();
      await database.transaction('rw', database.state, database.files, async () => {
        await database.files.clear();
        await database.files.bulkPut(seed.files);
        await database.state.put({ id: 'main', data: seed.data });
      });
    }
  };
}
export const dataService = createMockService();
