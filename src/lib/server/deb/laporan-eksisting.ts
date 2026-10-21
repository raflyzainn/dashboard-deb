import type PocketBase from 'pocketbase';
import { atomic, StoreRecord, type RestStore } from './rest-store';
import { PreviewError } from './preview-error';
import { auditData, type AuditActor } from './audit';
import { checkedFileMime, fileExtension } from '../../upload-file';
import { checkedReportFile } from './report-file';
import type { Storage } from './r2';
import { FILE_PERIOD, PILLARS, PHOTOS, TEXT_LIMIT, PHOTO_LIMIT, PHOTO_MB, VIDEO_MB, VIDEO_KIND, photoKind, normalizeLaporan, laporanMissing, type LaporanEksisting, type LaporanWorkspace, type LaporanQueueItem } from '../../laporan-eksisting';

const opts = { requestKey: null };
const fail = (status: number, message: string): never => { throw new PreviewError(status, message); };
const rows = (store: RestStore, name: string) => store.records.get(name)!;
const KINDS = [...PHOTOS.map(p => photoKind(p.key)), VIDEO_KIND];
function reads(pb: PocketBase, campus: string) {
  return {
    campuses: { filter: pb.filter('id = {:c}', { c: campus }) },
    monitoring_files: { filter: pb.filter('campus = {:c} && period = {:p}', { c: campus, p: FILE_PERIOD }) },
    users: { filter: 'active = true && (role = "admin" || role = "super_admin")' }, audit: null, notifications: null
  };
}
function save(store: RestStore, name: string, row: StoreRecord | undefined, data: Record<string, unknown>) {
  const record = row || new StoreRecord(name); Object.assign(record.data, data); store.save(record); return record;
}
function audit(store: RestStore, actor: AuditActor, campus: string, action: string) {
  save(store, 'audit', undefined, auditData({ actor, campus, record: campus, collection: 'campuses', context: `kampus:${campus}/laporan-eksisting`, action }));
}
/** Admins only learn that a report arrived; there is no review step. */
function notifyAdmins(store: RestStore, campus: string, laporan: LaporanEksisting) {
  for (const user of rows(store, 'users')) {
    save(store, 'notifications', undefined, { recipientUser: user.id, campus, eventType: 'laporan-eksisting', eventKey: `laporan-eksisting:${campus}:${laporan.revision}:${user.id}`, sourceId: campus,
      title: 'Laporan Eksisting dikirim', body: 'Kampus mengirim Laporan Eksisting pra-coaching.', target: `/admin/verifikasi?tab=laporan-eksisting&campus=${campus}`, simulated: false });
  }
}
function campusRow(store: RestStore) { const campus = rows(store, 'campuses')[0]; if (!campus) fail(404, 'Kampus tidak ditemukan.'); return campus!; }
const current = (campus: StoreRecord) => normalizeLaporan(campus.data.program?.laporanEksisting);
function revision(laporan: LaporanEksisting, expected: unknown) {
  if (laporan.revision !== expected) fail(409, 'Laporan berubah di tab lain. Isian Anda tetap ada; muat ulang sebelum menyimpan lagi.');
}
function store(campus: StoreRecord, laporan: LaporanEksisting) {
  campus.data.program = { ...(campus.data.program || {}), laporanEksisting: laporan };
}

export async function laporanWorkspace(pb: PocketBase, campusId: string): Promise<LaporanWorkspace> {
  const [campus, files] = await Promise.all([
    pb.collection('campuses').getOne(campusId, opts),
    pb.collection('monitoring_files').getFullList({ ...opts, filter: pb.filter('campus = {:c} && period = {:p}', { c: campusId, p: FILE_PERIOD }) })
  ]);
  return { campusId, campusName: campus.name, laporan: normalizeLaporan(campus.program?.laporanEksisting),
    files: files.map(f => ({ id: f.id, kind: f.kind, originalName: f.originalName, mime: f.mime, size: f.size })) };
}

export async function saveLaporan(pb: PocketBase, actor: AuditActor, campusId: string, body: any) {
  const input = body.laporan;
  if (!input || typeof input !== 'object') fail(400, 'Isian laporan tidak valid.');
  return atomic(pb, s => {
    const campus = campusRow(s), laporan = current(campus);
    revision(laporan, body.expectedRevision);
    const files = rows(s, 'monitoring_files');
    const owned = (id: unknown, kind: string) => typeof id === 'string' && files.some(f => f.id === id && f.getString('kind') === kind);
    // A change after sending stays a draft until it is sent again.
    const next: LaporanEksisting = { ...laporan, status: 'draft', revision: laporan.revision + 1 };
    for (const p of PILLARS) {
      const text = input[p.key];
      if (typeof text !== 'string' || text.length > TEXT_LIMIT) fail(400, `Deskripsi ${p.label} maksimal ${TEXT_LIMIT.toLocaleString('id-ID')} karakter.`);
      next[p.key] = text.trim();
    }
    for (const p of PHOTOS) {
      const ids = input.foto?.[p.key];
      if (!Array.isArray(ids) || ids.length > PHOTO_LIMIT || new Set(ids).size !== ids.length || !ids.every(id => owned(id, photoKind(p.key)))) fail(400, `Foto ${p.label} tidak valid (maksimal ${PHOTO_LIMIT}).`);
      next.foto[p.key] = ids;
    }
    if (input.video !== '' && !owned(input.video, VIDEO_KIND)) fail(400, 'Video tidak valid.');
    next.video = input.video;
    store(campus, next); s.save(campus);
    audit(s, actor, campusId, 'menyimpan Laporan Eksisting');
  }, reads(pb, campusId));
}

export async function submitLaporan(pb: PocketBase, actor: AuditActor, campusId: string, body: any) {
  return atomic(pb, s => {
    const campus = campusRow(s), laporan = current(campus);
    revision(laporan, body.expectedRevision);
    if (laporan.status === 'submitted') fail(409, 'Laporan ini sudah terkirim. Ubah isian terlebih dahulu bila ingin mengirim pembaruan.');
    const missing = laporanMissing(laporan);
    if (missing.length) fail(400, `Lengkapi ${missing.join(', ')} sebelum mengirim.`);
    const next: LaporanEksisting = { ...laporan, status: 'submitted', revision: laporan.revision + 1, submittedAt: new Date().toISOString() };
    store(campus, next); s.save(campus);
    audit(s, actor, campusId, 'mengirim Laporan Eksisting'); notifyAdmins(s, campusId, next);
  }, reads(pb, campusId));
}

export async function uploadLaporan(pb: PocketBase, storage: Storage, actor: AuditActor, campusId: string, kind: string, operationId: string, file: File) {
  if (typeof operationId !== 'string' || !/^[a-zA-Z0-9-]{15,36}$/.test(operationId)) fail(400, 'Identitas operasi tidak valid.');
  if (!KINDS.includes(kind)) fail(400, 'Jenis berkas tidak valid.');
  const ext = fileExtension(file.name), bytes = await file.arrayBuffer();
  if (!file.size || file.name.length > 300) fail(400, 'Berkas kosong atau namanya terlalu panjang.');
  let mime = '';
  if (kind === VIDEO_KIND) {
    if (file.size > VIDEO_MB * 1024 * 1024) fail(400, `Video maksimal ${VIDEO_MB} MB.`);
    const video = checkedReportFile('video', file.name, bytes);
    if (!video.width || !video.height || video.width <= video.height) fail(400, 'Video harus landscape (mendatar). Rekam ulang dengan ponsel dimiringkan, lalu unggah lagi.');
    mime = video.mime;
  } else {
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext) || file.size > PHOTO_MB * 1024 * 1024) fail(400, `Foto JPG, PNG, atau WebP maksimal ${PHOTO_MB} MB.`);
    try { mime = checkedFileMime(file.name, bytes); } catch (e) { fail(400, (e as Error).message); }
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('');
  const key = `kampus/${campusId}/laporan-eksisting/${operationId}-${hash}.${ext}`;
  // Deterministic object keys make retries reuse the same bytes; metadata is committed atomically.
  await storage.put(key, bytes, mime);
  return atomic(pb, s => {
    const retry = rows(s, 'monitoring_files').find(r => r.getString('operationId') === operationId);
    if (retry) { if (retry.getString('hash') !== hash || retry.getString('kind') !== kind || retry.getString('author') !== actor.id) fail(409, 'Unggahan ulang berbeda.'); return retry.id; }
    const record = save(s, 'monitoring_files', undefined, { campus: campusId, period: FILE_PERIOD, kind, operationId, hash, r2Key: key, originalName: file.name, mime, size: file.size, author: actor.id });
    audit(s, actor, campusId, kind === VIDEO_KIND ? 'mengunggah video Laporan Eksisting' : 'mengunggah foto Laporan Eksisting'); return record.id;
  }, reads(pb, campusId));
}

export async function laporanFile(pb: PocketBase, storage: Storage, campus: string, id: string) {
  const row = await pb.collection('monitoring_files').getOne(id, opts);
  if (row.campus !== campus || row.period !== FILE_PERIOD) fail(404, 'Berkas tidak ditemukan.');
  const file = await storage.get(row.r2Key);
  return new Response(file.body, { headers: { 'Content-Type': row.mime, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.originalName)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

/** Every campus with its report status, for the admin list. */
export async function laporanQueue(pb: PocketBase): Promise<LaporanQueueItem[]> {
  const campuses = await pb.collection('campuses').getFullList({ ...opts, fields: 'id,name,program', sort: 'name' });
  return campuses.map(c => {
    const stored = c.program?.laporanEksisting, l = normalizeLaporan(stored);
    return { campusId: c.id, campusName: c.name, status: stored ? l.status : 'kosong', submittedAt: l.submittedAt };
  });
}
