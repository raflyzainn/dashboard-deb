import type PocketBase from 'pocketbase';
import { PreviewError } from './preview-error';
import { writeAudit, type AuditActor } from './audit';
import { extensionOf, mimeFor, type Storage } from './r2';
import { campusWithAward, ensureDisbursement, context } from './pencairan';
import { formatSen } from '../../pencairan';

/** LPJ Termin 1: one invoice, one scanned proof, one entry. Items on the invoice are not retyped. Entries point at a node of the approved RAB tree. */
const opts = { requestKey: null } as const;
const SCAN_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

export interface LpjEntry { id: string; date: string; reference: string; payee: string; amountSen: number; memo: string; rabLineId: string; rabCode: string; rabTitle: string; originalName: string; status: string; created: string; createdByName: string }
export interface RabNode { id: string; code: string; title: string; level: number; amountSen: number }

export async function lpjSummary(pb: PocketBase, campusId: string) {
  const { campus, award } = await campusWithAward(pb, campusId);
  const { disbursement } = await ensureDisbursement(pb, campusId);
  const entries = await pb.collection('lpj_entries').getFullList({ filter: pb.filter('disbursement = {:d}', { d: disbursement.id }), sort: '-date,-created', ...opts });
  let nodes: RabNode[] = [];
  const approved = await pb.collection('rab_versions').getList(1, 1, { filter: pb.filter('campus = {:c} && status = "disetujui"', { c: campusId }), sort: '-number', ...opts }).catch(() => null);
  const version = approved?.items[0];
  if (version) {
    const lines = await pb.collection('rab_lines').getFullList({ filter: pb.filter('version = {:v}', { v: version.id }), sort: 'order', ...opts });
    nodes = lines.filter(l => Number(l.level) <= 3).map(l => ({ id: l.id, code: l.code || '', title: l.title || '', level: Number(l.level), amountSen: Number(l.amountSen || 0) }));
  }
  const byId = new Map(nodes.map(n => [n.id, n]));
  const creators = Array.from(new Set(entries.map(e => e.createdBy).filter(Boolean)));
  const names = creators.length ? new Map((await pb.collection('users').getFullList({ filter: creators.map(id => pb.filter('id = {:id}', { id })).join(' || '), fields: 'id,name,email', ...opts })).map(u => [u.id, u.name || u.email])) : new Map();
  const list: LpjEntry[] = entries.map(e => ({ id: e.id, date: e.date || '', reference: e.reference || '', payee: e.payee || '', amountSen: Number(e.amountSen || 0), memo: e.memo || '', rabLineId: e.rabLine || '', rabCode: byId.get(e.rabLine)?.code || '', rabTitle: byId.get(e.rabLine)?.title || '', originalName: e.originalName || '', status: e.status || 'menunggu_review', created: e.created, createdByName: names.get(e.createdBy) || 'Sistem' }));
  const receivedSen = Number(disbursement.paidSen || 0) || Number(disbursement.requestedSen || 0);
  const reportedSen = list.filter(e => e.status !== 'perlu_revisi').reduce((sum, e) => sum + e.amountSen, 0);
  return {
    campus, amountSen: Number(award.amountSen), receivedSen, reportedSen, remainingSen: receivedSen - reportedSen, paid: Number(disbursement.paidSen || 0) > 0,
    entries: list, rabNodes: nodes, hasApprovedRab: Boolean(version)
  };
}

export interface NewEntry { date: string; reference: string; payee: string; amountSen: number; memo: string; rabLine: string }
export async function addEntry(pb: PocketBase, store: Storage, actor: AuditActor & { id?: string }, campusId: string, input: NewEntry, file: { name: string; bytes: ArrayBuffer; mime?: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new PreviewError(400, 'Isi tanggal pada bukti.');
  if (!input.reference.trim() || input.reference.length > 120) throw new PreviewError(400, 'Isi nomor bukti.');
  if (!input.payee.trim() || input.payee.length > 200) throw new PreviewError(400, 'Isi nama penerima atau toko.');
  if (!Number.isInteger(input.amountSen) || input.amountSen <= 0) throw new PreviewError(400, 'Isi jumlah pada bukti.');
  if (input.memo.length > 1000) throw new PreviewError(400, 'Memo terlalu panjang.');
  if (!SCAN_EXTENSIONS.includes(extensionOf(file.name))) throw new PreviewError(400, 'Unggah pindaian berupa PDF atau gambar.');
  if (file.bytes.byteLength > 20 * 1024 * 1024) throw new PreviewError(413, 'Ukuran pindaian maksimal 20 MB.');
  const { campus } = await campusWithAward(pb, campusId);
  const { disbursement } = await ensureDisbursement(pb, campusId);
  if(disbursement.submissionStatus&&!disbursement.paidAt)throw new PreviewError(400,'Dana Tahap 1 belum dibayar. LPJ tersedia setelah pembayaran tercatat.');
  if (input.rabLine) {
    const line = await pb.collection('rab_lines').getOne(input.rabLine, opts).catch(() => null);
    const version=line?await pb.collection('rab_versions').getOne(line.version,opts).catch(()=>null):null;
    if(!version||version.campus!==campusId||version.status!=='disetujui')throw new PreviewError(400,'Pilih bagian dari RAB kampus yang sudah disetujui.');
    if (!line) throw new PreviewError(400, 'Bagian RAB tidak ditemukan.');
  }
  const safe = file.name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'bukti';
  const key = `kampus/${campus.code}/termin-1/lpj/${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}_${safe}`;
  await store.put(key, file.bytes, file.mime || mimeFor(file.name));
  const entry = await pb.collection('lpj_entries').create({
    disbursement: disbursement.id, rabLine: input.rabLine || '', date: input.date + ' 00:00:00.000Z', reference: input.reference.trim(), payee: input.payee.trim(), amountSen: input.amountSen,
    memo: input.memo.trim(), r2Key: key, originalName: file.name, status: 'menunggu_review', createdBy: actor.id || ''
  }, opts);
  await writeAudit(pb, { actor, action: `menambah bukti LPJ ${input.reference.trim()}`, context: context(campusId), collection: 'lpj_entries', record: entry.id, campus: campusId, after: { nomorBukti: input.reference.trim(), penerima: input.payee.trim(), jumlahSen: input.amountSen } });
  return entry;
}

export async function reviewEntry(pb: PocketBase, actor: AuditActor, campusId: string, entryId: string, status: 'sesuai' | 'perlu_revisi' | 'menunggu_review', note: string) {
  const entry = await pb.collection('lpj_entries').getOne(entryId, opts).catch(() => null);
  if (!entry) throw new PreviewError(404, 'Bukti tidak ditemukan.');
  const disbursement = await pb.collection('disbursements').getOne(entry.disbursement, opts);
  if (disbursement.campus !== campusId) throw new PreviewError(404, 'Bukti tidak ditemukan.');
  if (status === 'perlu_revisi' && !note.trim()) throw new PreviewError(400, 'Tulis yang harus diperbaiki.');
  const updated = await pb.collection('lpj_entries').update(entryId, { status }, opts);
  await writeAudit(pb, { actor, action: `menandai bukti LPJ ${entry.reference} ${status === 'sesuai' ? 'Sesuai' : status === 'perlu_revisi' ? 'Perlu revisi' : 'Menunggu review'}`, context: context(campusId), collection: 'lpj_entries', record: entryId, campus: campusId, before: { status: entry.status }, after: { status }, note });
  return updated;
}

export async function entryFile(pb: PocketBase, store: Storage, campusId: string, entryId: string) {
  const entry = await pb.collection('lpj_entries').getOne(entryId, opts).catch(() => null);
  if (!entry) throw new PreviewError(404, 'Bukti tidak ditemukan.');
  const disbursement = await pb.collection('disbursements').getOne(entry.disbursement, opts);
  if (disbursement.campus !== campusId) throw new PreviewError(404, 'Bukti tidak ditemukan.');
  const source = await store.get(entry.r2Key);
  const headers = new Headers({ 'Content-Type': mimeFor(entry.originalName), 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(entry.originalName)}`, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' });
  return new Response(source.body, { status: 200, headers });
}

export const describeRemaining = (remainingSen: number) => remainingSen >= 0 ? `${formatSen(remainingSen)} belum dipertanggungjawabkan` : `${formatSen(-remainingSen)} melebihi dana yang diterima`;
