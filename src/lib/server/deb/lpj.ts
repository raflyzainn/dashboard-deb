import type PocketBase from 'pocketbase';
import { PreviewError } from './preview-error';
import { type AuditActor } from './audit';
import { extensionOf, mimeFor, type Storage } from './r2';
import { campusWithAward, context } from './pencairan';
import { formatSen } from '../../pencairan';
import { reportingPaid, lpjEvidenceReady, lpjExceedsReceived } from '../../pelaporan';
import { checkedFileMime } from '../../upload-file';
import { atomic, StoreRecord, type RestStore } from './rest-store';
import { auditData } from './audit';

/** LPJ Termin 1: one invoice, one scanned proof, one entry. Items on the invoice are not retyped. Entries point at a node of the approved RAB tree. */
const opts = { requestKey: null } as const;
const SCAN_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

export interface LpjEntry { id: string; date: string; reference: string; payee: string; amountSen: number; memo: string; rabLineId: string; rabCode: string; rabTitle: string; originalName: string; status: string; created: string; createdByName: string; note: string; revision: number; history: { revision: number; originalName: string; note: string }[] }
export interface RabNode { id: string; code: string; title: string; level: number; amountSen: number }

export async function lpjSummary(pb: PocketBase, campusId: string) {
  const { campus, award } = await campusWithAward(pb, campusId);
  const payments = await pb.collection('disbursements').getFullList({ filter: pb.filter('campus = {:c} && term = 1', { c: campusId }), ...opts });
  const disbursement = payments[0] || { id: '', properties: {}, paidSen: 0, requestedSen: 0, paidAt: '' };
  const entries = await pb.collection('lpj_entries').getFullList({ filter: pb.filter('disbursement = {:d}', { d: disbursement.id }), sort: '-date,-created', ...opts });
  let nodes: RabNode[] = [];
  const approved = await pb.collection('rab_versions').getList(1, 1, { filter: pb.filter('campus = {:c} && status = "disetujui" && (disbursement = "" || disbursement = {:d})', { c: campusId, d: disbursement.id }), sort: '-number', ...opts }).catch(() => null);
  const version = approved?.items[0];
  if (version) {
    const lines = await pb.collection('rab_lines').getFullList({ filter: pb.filter('version = {:v}', { v: version.id }), sort: 'order', ...opts });
    nodes = lines.filter(l => Number(l.level) <= 3).map(l => ({ id: l.id, code: l.code || '', title: l.title || '', level: Number(l.level), amountSen: Number(l.amountSen || 0) }));
  }
  const byId = new Map(nodes.map(n => [n.id, n]));
  const creators = Array.from(new Set(entries.map(e => e.createdBy).filter(Boolean)));
  const names = creators.length ? new Map((await pb.collection('users').getFullList({ filter: creators.map(id => pb.filter('id = {:id}', { id })).join(' || '), fields: 'id,name,email', ...opts })).map(u => [u.id, u.name || u.email])) : new Map();
  const list: LpjEntry[] = entries.map(e => ({ id: e.id, date: e.date || '', reference: e.reference || '', payee: e.payee || '', amountSen: Number(e.amountSen || 0), memo: e.memo || '', rabLineId: e.rabLine || '', rabCode: byId.get(e.rabLine)?.code || '', rabTitle: byId.get(e.rabLine)?.title || '', originalName: e.originalName || '', status: e.status || 'menunggu_review', created: e.created, createdByName: names.get(e.createdBy) || 'Sistem', note: e.note || '', revision: e.revision || 1, history: (e.history || []).map((h: any) => ({ revision: h.revision, originalName: h.originalName, note: h.note })) }));
  const receivedSen = receivedOf(disbursement);
  const reportedSen = list.reduce((sum, e) => sum + e.amountSen, 0);
  const acceptedSen = list.filter(e => e.status === 'sesuai').reduce((sum, e) => sum + e.amountSen, 0);
  const completion = disbursement.properties?.lpjCompletion || null;
  return {
    campus, amountSen: Number(award.amountSen), receivedSen, reportedSen, acceptedSen, remainingSen: receivedSen - acceptedSen, paid: reportingPaid(disbursement),
    completion, canComplete: !completion && lpjEvidenceReady(disbursement, list), t2Ready: Boolean(completion) && lpjEvidenceReady(disbursement, list),
    entries: list, rabNodes: nodes, hasApprovedRab: Boolean(version)
  };
}

const receivedOf = (payment: Record<string, any>) => Number(payment.paidSen || 0) || Number(payment.requestedSen || 0);
const amountsOf = (entries: StoreRecord[], keep: (entry: StoreRecord) => boolean) => entries.filter(keep).map(e => Number(e.data.amountSen || 0));
const exceeded = (receivedSen: number) => new PreviewError(409, `Total bukti melebihi dana Tahap 1 yang diterima (${formatSen(receivedSen)}). Periksa jumlah pada bukti.`);

export interface NewEntry { operationId: string; date: string; reference: string; payee: string; amountSen: number; memo: string; rabLine: string }
function lpjReads(pb: PocketBase, campus: string) {
  return { disbursements: { filter: pb.filter('campus = {:c} && term = 1', { c: campus }) }, lpj_entries: { filter: pb.filter('disbursement.campus = {:c} && disbursement.term = 1', { c: campus }) },
    rab_versions: { filter: pb.filter('campus = {:c}', { c: campus }) }, rab_lines: { filter: pb.filter('version.campus = {:c}', { c: campus }) },
    users: { filter: pb.filter('active = true && (role = "admin" || role = "super_admin" || (role = "campus" && campus = {:c}))', { c: campus }) }, notifications: null, audit: null };
}
function openLpj(store: RestStore) {
  const payment = store.records.get('disbursements')?.[0];
  if (!payment || !reportingPaid(payment.data)) throw new PreviewError(409, 'Dana Tahap 1 belum dibayar.');
  if (payment.data.properties?.lpjCompletion) throw new PreviewError(409, 'LPJ sudah selesai. Admin perlu membuka kembali sebelum mengubah bukti.');
  return payment;
}
function logLpj(store: RestStore, actor: AuditActor, campus: string, record: string, action: string, note = '') {
  const entry = new StoreRecord('audit'); Object.assign(entry.data, auditData({ actor, campus, record, collection: 'lpj_entries', context: context(campus), action, note })); store.save(entry);
}
function notifyLpj(store: RestStore, campus: string, entry: StoreRecord, admins: boolean) {
  for (const user of store.records.get('users') || []) {
    if (admins !== ['admin', 'super_admin'].includes(user.getString('role'))) continue;
    const notification = new StoreRecord('notifications');
    Object.assign(notification.data, { recipientUser: user.id, campus, eventType: 'lpj', eventKey: `lpj:${entry.id}:${entry.getInt('revision')}:${user.id}`, sourceId: entry.id,
      title: admins ? 'Bukti LPJ menunggu pemeriksaan' : 'Bukti LPJ perlu diperbaiki', body: entry.getString('note') || `Periksa bukti ${entry.getString('reference')}.`,
      target: admins ? `/admin/pencairan/${campus}/pelaporan#lpj` : '/campus/pelaporan#lpj', simulated: false });
    store.save(notification);
  }
}
export async function addEntry(pb: PocketBase, storage: Storage, actor: AuditActor, campusId: string, input: NewEntry, file: { name: string; bytes: ArrayBuffer; mime?: string }, replacing?: { id: string; revision: number }) {
  if (!/^[a-zA-Z0-9-]{15,36}$/.test(input.operationId)) throw new PreviewError(400, 'Identitas penyimpanan bukti tidak valid.');
  const parsed = new Date(input.date + 'T00:00:00.000Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== input.date) throw new PreviewError(400, 'Tanggal bukti tidak valid.');
  if (!input.reference.trim() || input.reference.length > 120 || !input.payee.trim() || input.payee.length > 200 || input.memo.length > 1000) throw new PreviewError(400, 'Periksa nomor bukti, penerima dan memo.');
  if (!Number.isSafeInteger(input.amountSen) || input.amountSen <= 0) throw new PreviewError(400, 'Jumlah bukti harus positif.');
  if (!SCAN_EXTENSIONS.includes(extensionOf(file.name)) || file.name.length > 300 || file.bytes.byteLength > 20 * 1024 * 1024) throw new PreviewError(400, 'Pindaian harus PDF/gambar, maksimal 20 MB.');
  let mime: string;
  try { mime = checkedFileMime(file.name, file.bytes); } catch (e) { throw new PreviewError(400, e instanceof Error ? e.message : 'Berkas tidak valid.'); }
  const rows = await pb.collection('disbursements').getFullList({ filter: pb.filter('campus = {:c} && term = 1', { c: campusId }), ...opts });
  if (!reportingPaid(rows[0]) || rows[0]?.properties?.lpjCompletion) throw new PreviewError(409, 'LPJ belum dibuka atau sudah selesai.');
  const fileHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', file.bytes))).map(x => x.toString(16).padStart(2, '0')).join('');
  const content = JSON.stringify({ ...input, replacing, name: file.name, fileHash, actor: actor.id });
  const inputHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content)))).map(x => x.toString(16).padStart(2, '0')).join('');
  const key = `kampus/${campusId}/termin-1/lpj/${crypto.randomUUID()}.${extensionOf(file.name)}`;
  await storage.put(key, file.bytes, mime);
  return atomic(pb, store => {
    const previous = store.records.get('lpj_entries')!.flatMap(e => [e.data, ...(e.data.history || [])]).find(e => e.operationId === input.operationId);
    if (previous) { if (previous.inputHash !== inputHash) throw new PreviewError(409, 'Retry bukti berbeda dari permintaan awal.'); return previous; }
    const payment = openLpj(store);
    if (input.rabLine) {
      const line = store.records.get('rab_lines')!.find(r => r.id === input.rabLine);
      const version = store.records.get('rab_versions')!.find(r => r.id === line?.getString('version'));
      const approved = store.records.get('rab_versions')!.filter(r => r.getString('status') === 'disetujui' && (!r.getString('disbursement') || r.getString('disbursement') === payment.id)).sort((a,b) => b.getInt('number') - a.getInt('number'))[0];
      if (!version || version.id !== approved?.id || (line?.getInt('level') || 0) > 3) throw new PreviewError(400, 'Pilih bagian RAB terbaru yang disetujui untuk pencairan ini.');
    }
    const entry = replacing ? store.records.get('lpj_entries')!.find(r => r.id === replacing.id) : new StoreRecord('lpj_entries');
    if (!entry) throw new PreviewError(404, 'Bukti tidak ditemukan.');
    if (replacing) {
      if (entry.getString('status') !== 'perlu_revisi' || (entry.getInt('revision') || 1) !== replacing.revision) throw new PreviewError(409, 'Bukti sudah berubah atau tidak sedang direvisi.');
      const history = entry.data.history || [];
      if (history.length >= 100) throw new PreviewError(400, 'Batas riwayat bukti tercapai. Hubungi admin.');
      entry.set('history', [...history, { operationId: entry.data.operationId, inputHash: entry.data.inputHash, revision: entry.getInt('revision') || 1, date: entry.data.date, reference: entry.data.reference, payee: entry.data.payee, amountSen: entry.data.amountSen, memo: entry.data.memo, rabLine: entry.data.rabLine, r2Key: entry.data.r2Key, originalName: entry.data.originalName, note: entry.data.note, changedAt: new Date().toISOString() }]);
    }
    // Evidence still under revision does not count; it is replaced or corrected before it can be accepted.
    const active = amountsOf(store.records.get('lpj_entries')!, e => e.id !== entry.id && e.getString('status') !== 'perlu_revisi');
    if (lpjExceedsReceived(receivedOf(payment.data), [...active, input.amountSen])) throw exceeded(receivedOf(payment.data));
    Object.assign(entry.data, { operationId: input.operationId, inputHash, disbursement: payment.id, rabLine: input.rabLine, date: input.date + ' 00:00:00.000Z', reference: input.reference.trim(), payee: input.payee.trim(), amountSen: input.amountSen, memo: input.memo.trim(), r2Key: key, originalName: file.name, status: 'menunggu_review', note: '', createdBy: actor.id, revision: replacing ? (entry.getInt('revision') || 1) + 1 : 1 });
    store.save(entry); logLpj(store, actor, campusId, entry.id, replacing ? 'memperbaiki bukti LPJ' : 'menambah bukti LPJ'); notifyLpj(store, campusId, entry, true); return entry.data;
  }, lpjReads(pb, campusId));
}
export async function reviewEntry(pb: PocketBase, actor: AuditActor, campusId: string, entryId: string, status: 'sesuai' | 'perlu_revisi' | 'menunggu_review', note: string, expectedRevision: number) {
  if (note.length > 2000 || (status === 'perlu_revisi' && !note.trim())) throw new PreviewError(400, 'Catatan revisi wajib diisi, maksimal 2.000 karakter.');
  return atomic(pb, store => {
    const payment = openLpj(store), entries = store.records.get('lpj_entries')!;
    const entry = entries.find(r => r.id === entryId);
    if (!entry) throw new PreviewError(404, 'Bukti tidak ditemukan.');
    if ((entry.getInt('revision') || 1) !== expectedRevision) throw new PreviewError(409, 'Bukti sudah berubah. Muat ulang sebelum menilai.');
    if (status === 'sesuai' && lpjExceedsReceived(receivedOf(payment.data), amountsOf(entries, e => e.id === entryId || e.getString('status') === 'sesuai'))) throw exceeded(receivedOf(payment.data));
    entry.set('status', status); entry.set('note', note.trim()); entry.set('revision', expectedRevision + 1); store.save(entry);
    logLpj(store, actor, campusId, entryId, `menilai bukti LPJ ${status}`, note.trim());
    if (status === 'perlu_revisi') notifyLpj(store, campusId, entry, false);
  }, lpjReads(pb, campusId));
}
export async function finishLpj(pb: PocketBase, actor: AuditActor, campusId: string, reopen: boolean, reason: string) {
  if (reason.length > 2000 || (reopen && !reason.trim())) throw new PreviewError(400, 'Alasan membuka kembali wajib diisi, maksimal 2.000 karakter.');
  return atomic(pb, store => {
    const payment = store.records.get('disbursements')?.[0];
    if (!payment || !reportingPaid(payment.data)) throw new PreviewError(409, 'Dana Tahap 1 belum dibayar.');
    const entries = store.records.get('lpj_entries')!;
    if (!reopen && !lpjEvidenceReady(payment.data, entries.map(e => ({ status: e.getString('status') })))) throw new PreviewError(409, 'Semua bukti LPJ harus dinilai Sesuai terlebih dahulu.');
    if (!reopen && lpjExceedsReceived(receivedOf(payment.data), amountsOf(entries, e => e.getString('status') === 'sesuai'))) throw exceeded(receivedOf(payment.data));
    if (Boolean(payment.data.properties?.lpjCompletion) === !reopen) return;
    payment.set('properties', { ...payment.data.properties, lpjCompletion: reopen ? null : { completedAt: new Date().toISOString(), completedBy: actor.name, actorId: actor.id } }); store.save(payment);
    logLpj(store, actor, campusId, payment.id, reopen ? 'membuka kembali LPJ' : 'menyelesaikan LPJ', reason.trim());
  }, lpjReads(pb, campusId));
}

export async function entryFile(pb: PocketBase, store: Storage, campusId: string, entryId: string, revision?: number) {
  const entry = await pb.collection('lpj_entries').getOne(entryId, opts).catch(() => null);
  if (!entry) throw new PreviewError(404, 'Bukti tidak ditemukan.');
  const disbursement = await pb.collection('disbursements').getOne(entry.disbursement, opts);
  if (disbursement.campus !== campusId) throw new PreviewError(404, 'Bukti tidak ditemukan.');
  const selected = revision ? (entry.history || []).find((h: any) => h.revision === revision) : entry;
  if (!selected) throw new PreviewError(404, 'Versi bukti tidak ditemukan.');
  const source = await store.get(selected.r2Key);
  const headers = new Headers({ 'Content-Type': mimeFor(selected.originalName), 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(selected.originalName)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  return new Response(source.body, { status: 200, headers });
}

export const describeRemaining = (remainingSen: number) => remainingSen >= 0 ? `${formatSen(remainingSen)} belum dipertanggungjawabkan` : `${formatSen(-remainingSen)} melebihi dana yang diterima`;
