import type PocketBase from 'pocketbase';
import { REPORT_KINDS, reportingPaid, type ReportKind, type ReportVersion, type ReportWorkspace } from '../../pelaporan';
import { atomic, StoreRecord, type RestStore } from './rest-store';
import { PreviewError } from './preview-error';
import { auditData, type AuditActor } from './audit';
import type { Storage } from './r2';
import { checkedReportFile } from './report-file';

const opts = { requestKey: null };
const fail = (code: number, message: string): never => { throw new PreviewError(code, message); };
const now = () => new Date().toISOString();
function reads(pb: PocketBase, campus: string) {
  return {
    campuses: { filter: pb.filter('id = {:c}', { c: campus }) },
    disbursements: { filter: pb.filter('campus = {:c} && term = 1', { c: campus }) },
    sk_awards: { filter: pb.filter('campus = {:c} && wave = 1', { c: campus }) },
    document_versions: { filter: pb.filter('document.disbursement.campus = {:c} && document.disbursement.term = 1', { c: campus }), sort: '-created' },
    report_versions: { filter: pb.filter('campus = {:c}', { c: campus }) },
    users: { filter: pb.filter('active = true && (role = "admin" || role = "super_admin" || (role = "campus" && campus = {:c}))', { c: campus }) },
    notifications: null, audit: null
  };
}
export function resolveReportAward(payment: Record<string, any> | undefined, awards: Record<string, any>[], versions: Record<string, any>[]) {
  const bound = payment?.properties?.reportingAward;
  const snapshot = [...versions].sort((a, b) => String(b.created).localeCompare(String(a.created))).find(v => v.generation?.award)?.generation.award;
  const match = bound ? awards.filter(a => a.id === bound) : snapshot ? awards.filter(a => a.id === snapshot.id || (!snapshot.id && a.skNumber === snapshot.skNumber)) : awards;
  if (match.length !== 1) fail(409, 'SK untuk pelaporan belum dapat dipastikan. Admin perlu memeriksa SK pengajuan ini.');
  return match[0].id as string;
}
const publicVersion = (r: Record<string, any>): ReportVersion => ({
  id: r.id, kind: r.kind, version: r.version, format: r.format, title: r.title || '', body: r.body || '', originalName: r.originalName || '',
  mime: r.mime || '', size: r.size || 0, hash: r.hash || '', durationSeconds: r.durationSeconds || 0, status: r.status, created: r.created || '',
  authorName: r.authorName || '', reviewedAt: r.reviewedAt || '', reviewerName: r.reviewerName || '', note: r.note || ''
});
export async function reportWorkspace(pb: PocketBase, campusId: string): Promise<ReportWorkspace> {
  const [campus, payments] = await Promise.all([pb.collection('campuses').getOne(campusId, opts), pb.collection('disbursements').getFullList({ filter: pb.filter('campus = {:c} && term = 1', { c: campusId }), ...opts })]);
  const payment = payments[0], paid = reportingPaid(payment);
  if (!paid) return { campusId, campusName: campus.name, awardId: '', paid, latest: {}, history: [], annualComplete: false };
  const [awards, snapshots, versions] = await Promise.all([
    pb.collection('sk_awards').getFullList({ filter: pb.filter('campus = {:c} && wave = 1', { c: campusId }), ...opts }),
    pb.collection('document_versions').getFullList({ filter: pb.filter('document.disbursement = {:d}', { d: payment.id }), ...opts }),
    pb.collection('report_versions').getFullList({ filter: pb.filter('campus = {:c}', { c: campusId }), sort: '-version', ...opts })
  ]);
  const awardId = resolveReportAward(payment, awards, snapshots), history = versions.filter(v => v.award === awardId).map(publicVersion);
  const latest = Object.fromEntries(REPORT_KINDS.map(k => [k, history.find(v => v.kind === k)]));
  return { campusId, campusName: campus.name, awardId, paid, latest, history, annualComplete: REPORT_KINDS.every(k => latest[k]?.status === 'sesuai') };
}
function selected(store: RestStore) {
  const payment = store.records.get('disbursements')?.[0];
  if (!payment || !reportingPaid(payment.data)) fail(409, 'Pelaporan tersedia setelah pembayaran Tahap 1 tercatat.');
  const award = resolveReportAward(payment.data, store.records.get('sk_awards')!.map(r => r.data), store.records.get('document_versions')!.map(r => r.data));
  return { payment, award };
}
function audit(store: RestStore, actor: AuditActor, campus: string, id: string, action: string, note = '') {
  const entry = new StoreRecord('audit'); Object.assign(entry.data, auditData({ actor, campus, record: id, collection: 'report_versions', context: `kampus:${campus}/pelaporan`, action, note })); store.save(entry);
}
function notify(store: RestStore, campus: string, record: StoreRecord, admins: boolean) {
  for (const user of store.records.get('users') || []) {
    const isAdmin = ['admin', 'super_admin'].includes(user.getString('role'));
    if (admins !== isAdmin) continue;
    const notification = new StoreRecord('notifications'); Object.assign(notification.data, {
      recipientUser: user.id, campus, eventType: 'pelaporan', eventKey: `pelaporan:${record.id}:${record.getString('status')}:${user.id}`,
      sourceId: record.id, title: admins ? 'Pelaporan kampus menunggu pemeriksaan' : 'Pelaporan perlu diperbaiki', body: record.getString('note') || 'Buka Pelaporan untuk memeriksa kiriman.',
      target: admins ? `/admin/pencairan/${campus}/pelaporan` : '/campus/pelaporan', simulated: false
    }); store.save(notification);
  }
}
export interface ReportInput { kind: ReportKind; format: 'text' | 'file'; title: string; body: string; operationId: string; expectedVersion: number }
export async function saveReport(pb: PocketBase, storage: Storage, actor: AuditActor, campusId: string, input: ReportInput, file?: { name: string; bytes: ArrayBuffer }) {
  if (!REPORT_KINDS.includes(input.kind) || !['text', 'file'].includes(input.format)) fail(400, 'Pilih jenis dan format keluaran.');
  if (!/^[a-zA-Z0-9-]{15,36}$/.test(input.operationId) || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) fail(400, 'Identitas penyimpanan tidak valid.');
  const title = input.title.trim(), body = input.body.trim();
  if (title.length > 200 || body.length > 50000) fail(400, 'Judul maksimal 200 dan isi maksimal 50.000 karakter.');
  if (input.format === 'text' && (input.kind !== 'artikel' || !title || !body || file)) fail(400, 'Artikel teks harus memiliki judul dan isi.');
  if (input.format === 'file' && (!file || file.name.length > 300 || body)) fail(400, 'Unggah berkas sesuai jenis keluaran.');
  const ws = await reportWorkspace(pb, campusId); if (!ws.paid) fail(409, 'Dana Tahap 1 belum dibayar.');
  const metadata = file ? checkedReportFile(input.kind, file.name, file.bytes) : { mime: '', durationSeconds: 0 };
  const bytes = file?.bytes || new TextEncoder().encode(body).buffer;
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('');
  const sameInput = (r: StoreRecord) => r.getString('kind') === input.kind && r.getString('format') === input.format && r.getString('hash') === hash && r.getString('title') === title && r.getString('body') === body && r.getString('originalName') === (file?.name || '') && r.getString('author') === actor.id;
  const key = file ? `kampus/${campusId}/pelaporan/${crypto.randomUUID()}.${file.name.split('.').pop()!.toLowerCase()}` : '';
  if (file) await storage.put(key, file.bytes, metadata.mime);
  return atomic(pb, store => {
    const { payment, award } = selected(store);
    const all = store.records.get('report_versions')!;
    const retry = all.find(r => r.getString('operationId') === input.operationId);
    if (retry) { if (!sameInput(retry) || retry.getString('award') !== award) fail(409, 'Penyimpanan ulang berbeda dari permintaan awal.'); return publicVersion(retry.data); }
    const latest = all.filter(r => r.getString('award') === award && r.getString('kind') === input.kind).sort((a, b) => b.getInt('version') - a.getInt('version'))[0];
    if ((latest?.getInt('version') || 0) !== input.expectedVersion || latest?.getString('status') === 'menunggu_review') fail(409, 'Versi berubah atau sedang diperiksa. Muat ulang pelaporan.');
    const record = new StoreRecord('report_versions', undefined);
    Object.assign(record.data, { campus: campusId, award, disbursement: payment.id, kind: input.kind, version: input.expectedVersion + 1, format: input.format, title, body, operationId: input.operationId, r2Key: key, originalName: file?.name || '', size: bytes.byteLength, hash, ...metadata, status: 'draf', author: actor.id, authorName: actor.name || '', created: now() });
    store.save(record);
    payment.set('properties', { ...payment.data.properties, reportingAward: award }); store.save(payment);
    audit(store, actor, campusId, record.id, 'menyimpan draf pelaporan'); return publicVersion(record.data);
  }, reads(pb, campusId));
}
export async function changeReport(pb: PocketBase, actor: AuditActor, campusId: string, versionId: string, action: 'submit' | 'sesuai' | 'perlu_revisi', note = '') {
  if (note.length > 2000 || (action === 'perlu_revisi' && !note.trim())) fail(400, 'Catatan revisi wajib diisi, maksimal 2.000 karakter.');
  return atomic(pb, store => {
    const { award } = selected(store), rows = store.records.get('report_versions')!;
    const record = rows.find(r => r.id === versionId && r.getString('award') === award);
    if (!record) fail(404, 'Versi pelaporan tidak ditemukan.');
    if (rows.some(r => r.getString('award') === award && r.getString('kind') === record.getString('kind') && r.getInt('version') > record.getInt('version'))) fail(409, 'Gunakan versi pelaporan terbaru.');
    const target = action === 'submit' ? 'menunggu_review' : action;
    if (record.getString('status') === target && (action === 'submit' || record.getString('note') === note.trim())) return;
    if (record.getString('status') !== (action === 'submit' ? 'draf' : 'menunggu_review')) fail(409, 'Status pelaporan sudah berubah. Muat ulang halaman.');
    record.set('status', target);
    if (action !== 'submit') { record.set('reviewer', actor.id); record.set('reviewerName', actor.name); record.set('reviewedAt', now()); record.set('note', note.trim()); }
    store.save(record); audit(store, actor, campusId, record.id, action === 'submit' ? 'mengirim pelaporan' : `menilai pelaporan ${target}`, note.trim());
    if (action !== 'sesuai') notify(store, campusId, record, action === 'submit');
  }, reads(pb, campusId));
}
export async function reportFile(pb: PocketBase, storage: Storage, campusId: string, versionId: string) {
  const record = await pb.collection('report_versions').getOne(versionId, opts);
  if (record.campus !== campusId || !record.r2Key) fail(404, 'Berkas tidak ditemukan.');
  const file = await storage.get(record.r2Key);
  return new Response(file.body, { headers: { 'Content-Type': record.mime, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(record.originalName)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
