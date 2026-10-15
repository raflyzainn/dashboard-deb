import type PocketBase from 'pocketbase';
import { atomic, StoreRecord, type RestStore } from './rest-store';
import { PreviewError } from './preview-error';
import { auditData, type AuditActor } from './audit';
import { PROGRAM_READINESS_FIELDS } from '../../program-readiness';
import { parseContacts, serializeContacts, contactError, normalizedPhone } from '../../contacts';
import { checkedFileMime, fileExtension } from '../../upload-file';
import type { Storage } from './r2';
import { DEFAULT_FORMULA, monitoringPeriods, EVIDENCE, emptyProgram, validateMonth, calculateMonitoring, type Hero, type MonthInput, type ProgramMonitoring, type MonitoringWorkspace, type MonitoringVersion } from '../../monitoring';

const opts = { requestKey: null };
const fail = (status: number, message: string): never => { throw new PreviewError(status, message); };
const list = (pb: PocketBase, name: string, filter = '') => pb.collection(name).getFullList({ ...opts, filter });
const scoped = (pb: PocketBase, campus: string, period: string) => pb.filter('campus = {:c} && period = {:p}', { c: campus, p: period });
function reads(pb: PocketBase, campus: string, period: string) {
  return {
    campuses: { filter: pb.filter('id = {:c}', { c: campus }) }, indicator_definitions: {},
    monitoring_programs: { filter: scoped(pb, campus, period) }, monitoring_months: { filter: scoped(pb, campus, period) },
    monitoring_versions: { filter: scoped(pb, campus, period) }, monitoring_files: { filter: pb.filter('campus = {:c} && (period = {:p} || kind = "hero")', { c: campus, p: period }) },
    monitoring_settings: { filter: pb.filter('period = {:p}', { p: period }) },
    users: { filter: pb.filter('active = true && (role = "admin" || role = "super_admin" || (role = "campus" && campus = {:c}))', { c: campus }) }, audit: null, notifications: null
  };
}
const rows = (store: RestStore, name: string) => store.records.get(name)!;
export function openMonitoringPeriod(store: RestStore, period: string) {
  const periods = monitoringPeriods(rows(store, 'indicator_definitions').map(r => r.data));
  if (!periods.some(p => p.id === period && p.state === 'active')) fail(409, 'Periode tidak aktif. Data arsip hanya dapat dibaca.');
}
export const monitoringRevision = (row: StoreRecord | undefined, expected: unknown) => {
  if (!Number.isSafeInteger(expected) || (row?.getInt('revision') || 0) !== expected) fail(409, 'Data berubah di tab lain. Input Anda tetap ada; muat data terbaru sebelum menyimpan ulang.');
};
function save(store: RestStore, name: string, row: StoreRecord | undefined, data: Record<string, unknown>) {
  const record = row || new StoreRecord(name); Object.assign(record.data, data); store.save(record); return record;
}
function audit(store: RestStore, actor: AuditActor, campus: string, id: string, action: string, note = '') {
  save(store, 'audit', undefined, auditData({ actor, campus, record: id, collection: 'monitoring_versions', context: `kampus:${campus}/monitoring`, action, note }));
}
function notify(store: RestStore, campus: string, version: StoreRecord, admins: boolean) {
  for (const user of rows(store, 'users')) {
    if (admins !== ['admin', 'super_admin'].includes(user.getString('role'))) continue;
    save(store, 'notifications', undefined, { recipientUser: user.id, campus, eventType: 'monitoring', eventKey: `monitoring:${version.id}:${version.getString('status')}:${user.id}`, sourceId: version.id,
      title: admins ? 'Monitoring bulanan menunggu pemeriksaan' : version.getString('status') === 'approved' ? 'Monitoring bulanan sesuai' : 'Monitoring perlu revisi',
      body: `${version.getString('month')}: ${version.getString('note') || 'Buka profil dan monitoring untuk melihat hasil.'}`,
      target: admins ? `/admin/verifikasi?tab=monitoring&campus=${campus}` : '/campus/profile#monitoring', simulated: false });
  }
}
function operation(value: unknown) { if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{15,36}$/.test(value)) fail(400, 'Identitas operasi tidak valid.'); return value; }
function periodValue(value: unknown) { if (typeof value !== 'string' || value.length > 120) fail(400, 'Periode tidak valid.'); return value; }
function heroesFor(program: Record<string, any>): Hero[] {
  return Array.isArray(program.localHeroes) ? program.localHeroes : parseContacts(program.localHero).map((h, i) => ({ ...h, id: `legacy-${i}`, story: '', photo: '' }));
}
export async function monitoringWorkspace(pb: PocketBase, campusId: string, period: string): Promise<MonitoringWorkspace> {
  periodValue(period);
  const [campus, definitions, programs, months, versions, files, settings] = await Promise.all([
    pb.collection('campuses').getOne(campusId, opts), list(pb, 'indicator_definitions'),
    list(pb, 'monitoring_programs', scoped(pb, campusId, period)), list(pb, 'monitoring_months', scoped(pb, campusId, period)), list(pb, 'monitoring_versions', scoped(pb, campusId, period)), list(pb, 'monitoring_files', pb.filter('campus = {:c} && (period = {:p} || kind = "hero")', { c: campusId, p: period })),
    list(pb, 'monitoring_settings', pb.filter('period = {:p}', { p: period }))
  ]);
  return { campusId, campusName: campus.name, period, periods: monitoringPeriods(definitions), program: programs[0]?.payload || emptyProgram(), programRevision: programs[0]?.revision || 0,
    campusRevision: campus.programRevision || 0, heroes: heroesFor(campus.program || {}), months: months as any, versions: versions as unknown as MonitoringVersion[],
    files: files.map(f => ({ id: f.id, kind: f.kind, originalName: f.originalName, mime: f.mime, size: f.size })), formula: settings[0]?.formula || { ...DEFAULT_FORMULA } };
}
export function validateMonitoringProgram(input: any, heroes: any, store: RestStore): { program: ProgramMonitoring; heroes: Hero[] } {
  if (!input || typeof input !== 'object' || !Array.isArray(heroes) || heroes.length > 50) fail(400, 'Data program tidak valid.');
  const program = emptyProgram();
  for (const key of ['beneficiaries', 'solarKwp', 'otherKw', 'digesterM3'] as const) {
    const n = input[key]; if (n !== null && (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1e9 || (key === 'beneficiaries' && !Number.isSafeInteger(n)))) fail(400, 'Kapasitas dan penerima manfaat harus berupa angka nonnegatif.');
    program[key] = n;
  }
  const file = (id: unknown, kind: string) => { if (typeof id !== 'string' || (id && !rows(store, 'monitoring_files').some(r => r.id === id && r.getString('kind') === kind))) fail(400, 'Bukti tidak sesuai jenis atau bukan milik kampus/periode ini.'); return id; };
  for (const [key] of EVIDENCE) {
    const evidence = input.evidence?.[key]; if (!evidence || typeof evidence.reason !== 'string' || evidence.reason.length > 2000) fail(400, 'Alasan bukti maksimal 2.000 karakter.');
    program.evidence[key] = { fileId: file(evidence.fileId, key), reason: evidence.reason.trim() };
  }
  const ids = new Set<string>();
  const result = heroes.map((h: any) => {
    if (!h || typeof h.id !== 'string' || !/^[a-zA-Z0-9-]{1,50}$/.test(h.id) || ids.has(h.id) || typeof h.name !== 'string' || typeof h.phone !== 'string' || typeof h.story !== 'string' || h.story.length > 5000) fail(400, 'Data Local Hero tidak valid.');
    ids.add(h.id); const error = contactError(h); if (error || !h.name.trim()) fail(400, error || 'Nama Local Hero wajib diisi.');
    return { id: h.id, name: h.name.trim(), phone: normalizedPhone(h.phone), story: h.story.trim(), photo: file(h.photo, 'hero') };
  });
  return { program, heroes: result };
}
export async function saveMonitoring(pb: PocketBase, actor: AuditActor, campusId: string, body: any) {
  const period = periodValue(body.period), operationId = operation(body.operationId);
  const input: MonthInput = body.month;
  if (!input) fail(400, 'Pilih bulan monitoring.');
  // Drafts may be incomplete; submission requires every monthly measurement.
  try { validateMonth({ ...input, incomeSen: input.incomeSen ?? 0, electricityKwh: input.electricityKwh ?? 0, biogasM3: input.biogasM3 ?? 0 }); } catch (e) { fail(400, (e as Error).message); }
  const payload: MonthInput = { month: input.month, incomeSen: input.incomeSen ?? null, electricityKwh: input.electricityKwh ?? null, biogasM3: input.biogasM3 ?? null, note: input.note };
  return atomic(pb, store => {
    openMonitoringPeriod(store, period);
    const month = rows(store, 'monitoring_months').find(r => r.getString('month') === input.month);
    const meta = rows(store, 'monitoring_programs')[0], campus = rows(store, 'campuses')[0];
    if (!campus) fail(404, 'Kampus tidak ditemukan.');
    const validated = validateMonitoringProgram(body.program, body.heroes, store);
    if (month?.getString('operationId') === operationId) {
      if (JSON.stringify(month.data.payload) !== JSON.stringify(payload) || JSON.stringify(meta?.data.payload) !== JSON.stringify(validated.program) || JSON.stringify(campus.data.program?.localHeroes) !== JSON.stringify(validated.heroes)) fail(409, 'Permintaan ulang memiliki isian berbeda.');
      return;
    }
    monitoringRevision(month, body.expectedMonthRevision); monitoringRevision(meta, body.expectedProgramRevision);
    if (campus.getInt('programRevision') !== body.expectedCampusRevision) fail(409, 'Profil berubah di tab lain. Muat ulang sebelum menyimpan.');
    if (month?.getString('status') === 'pending') fail(409, 'Bulan ini sedang diperiksa dan terkunci.');
    save(store, 'monitoring_programs', meta, { campus: campusId, period, revision: (meta?.getInt('revision') || 0) + 1, payload: validated.program });
    save(store, 'campuses', campus, { program: { ...campus.data.program, localHeroes: validated.heroes, localHero: serializeContacts(validated.heroes) }, programRevision: campus.getInt('programRevision') + 1 });
    const saved = save(store, 'monitoring_months', month, { campus: campusId, period, month: input.month, payload, revision: (month?.getInt('revision') || 0) + 1, status: 'draft', operationId });
    audit(store, actor, campusId, saved.id, 'menyimpan monitoring bulanan');
  }, reads(pb, campusId, period));
}
export async function submitMonitoring(pb: PocketBase, actor: AuditActor, campusId: string, body: any) {
  const period = periodValue(body.period), operationId = operation(body.operationId);
  return atomic(pb, store => {
    openMonitoringPeriod(store, period);
    const retry = rows(store, 'monitoring_versions').find(r => r.getString('operationId') === operationId);
    if (retry) { if (retry.getString('month') !== body.month || retry.getString('author') !== actor.id) fail(409, 'Identitas kiriman sudah digunakan.'); return; }
    const month = rows(store, 'monitoring_months').find(r => r.getString('month') === body.month), meta = rows(store, 'monitoring_programs')[0], campus = rows(store, 'campuses')[0];
    monitoringRevision(month, body.expectedMonthRevision); monitoringRevision(meta, body.expectedProgramRevision);
    if (!campus || campus.getInt('programRevision') !== body.expectedCampusRevision) fail(409, 'Profil berubah. Muat ulang terlebih dahulu.');
    if (!month || month.getString('status') !== 'draft' || !meta) fail(409, 'Simpan draf bulan ini sebelum mengirim.');
    let input; try { input = validateMonth(month.data.payload); } catch (e) { fail(400, (e as Error).message); }
    const { program, heroes } = validateMonitoringProgram(meta.data.payload, heroesFor(campus.data.program || {}), store);
    if (program.beneficiaries === null) fail(400, 'Isi jumlah penerima manfaat unik per periode.');
    for (const [key, label] of EVIDENCE) if (!program.evidence[key].fileId && !program.evidence[key].reason) fail(400, `${label}: unggah bukti atau isi alasan belum tersedia/tidak berlaku.`);
    if (heroes.some(h => !h.story || !h.photo)) fail(400, 'Lengkapi cerita dan foto setiap Local Hero sebelum mengirim.');
    if ((program.solarKwp || 0) > 0 && !program.evidence.solar.fileId) fail(400, 'Unggah foto panel untuk kapasitas PLTS yang dilaporkan.');
    if (((program.digesterM3 || 0) > 0 || input.biogasM3 > 0) && !program.evidence.reactor.fileId) fail(400, 'Unggah foto reaktor untuk instalasi atau produksi biogas yang dilaporkan.');
    const formula = rows(store, 'monitoring_settings')[0]?.data.formula || { ...DEFAULT_FORMULA };
    if (formula.revision !== body.expectedFormulaRevision) fail(409, 'Parameter rumus berubah. Muat ulang dan periksa hasil sebelum mengirim.');
    const all = rows(store, 'monitoring_versions');
    const version = Math.max(0, ...all.filter(r => r.getString('month') === body.month).map(r => r.getInt('version'))) + 1;
    const profileKeys = ['programTitle', 'theme', 'description', 'address', 'province', 'regency', 'district', 'village', 'coordinates', 'mentor', 'coordinator', 'currentClass', 'targetClass', ...PROGRAM_READINESS_FIELDS.map(([key]) => key)];
    const profile = Object.fromEntries(profileKeys.map(key => [key, campus.data.program?.[key] || '']));
    const record = save(store, 'monitoring_versions', undefined, { campus: campusId, period, month: body.month, version, status: 'pending', operationId, author: actor.id,
      snapshot: { program, heroes, profile, month: input, formula, result: calculateMonitoring([input], program.beneficiaries!, formula) } });
    save(store, 'monitoring_months', month, { status: 'pending', revision: month.getInt('revision') + 1 });
    audit(store, actor, campusId, record.id, 'mengirim monitoring bulanan'); notify(store, campusId, record, true);
  }, reads(pb, campusId, period));
}
export async function reviewMonitoring(pb: PocketBase, actor: AuditActor, campusId: string, body: any) {
  const period = periodValue(body.period);
  if (!['approved', 'revision'].includes(body.status) || typeof body.note !== 'string' || body.note.length > 2000 || (body.status === 'revision' && !body.note.trim())) fail(400, 'Pilih keputusan dan isi catatan revisi (maksimal 2.000 karakter).');
  return atomic(pb, store => {
    openMonitoringPeriod(store, period);
    const record = rows(store, 'monitoring_versions').find(r => r.id === body.id);
    if (!record) fail(404, 'Kiriman tidak ditemukan.');
    if (record.getString('status') === body.status && record.getString('note') === body.note.trim()) return;
    if (record.getString('status') !== 'pending') fail(409, 'Kiriman sudah diperiksa. Muat ulang.');
    const month = rows(store, 'monitoring_months').find(r => r.getString('month') === record.getString('month'))!;
    save(store, 'monitoring_versions', record, { status: body.status, note: body.note.trim(), reviewedAt: new Date().toISOString(), reviewerName: actor.name || '' });
    save(store, 'monitoring_months', month, { status: body.status, revision: month.getInt('revision') + 1 });
    audit(store, actor, campusId, record.id, `memeriksa monitoring: ${body.status}`, body.note.trim()); notify(store, campusId, record, false);
  }, reads(pb, campusId, period));
}
export async function monitoringSettings(pb: PocketBase, actor: AuditActor, body: any) {
  const period = periodValue(body.period), factor = body.biogasFactor;
  if (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0 || factor > 100 || typeof body.source !== 'string' || !body.source.trim() || body.source.length > 1000) fail(400, 'Isi faktor > 0 sampai 100 kWh/m³ dan sumber/alasan parameter.');
  return atomic(pb, store => {
    openMonitoringPeriod(store, period); const existing = rows(store, 'monitoring_settings')[0]; monitoringRevision(existing, body.expectedRevision);
    const next = (existing?.getInt('revision') || 0) + 1;
    const record = save(store, 'monitoring_settings', existing, { period, revision: next, formula: { ...DEFAULT_FORMULA, revision: next, biogasFactor: factor, source: body.source.trim() } });
    audit(store, actor, '', record.id, 'mengubah parameter monitoring', `${period}: ${factor} kWh/m3; ${body.source.trim()}`);
  }, { indicator_definitions: {}, monitoring_settings: { filter: pb.filter('period = {:p}', { p: period }) }, audit: null });
}
export async function uploadMonitoring(pb: PocketBase, storage: Storage, actor: AuditActor, campusId: string, period: string, kind: string, operationId: string, file: File) {
  periodValue(period); operation(operationId);
  if (![...EVIDENCE.map(([key]) => key), 'hero'].includes(kind as any)) fail(400, 'Jenis bukti tidak valid.');
  const photo = ['solar', 'reactor', 'hero'].includes(kind), ext = fileExtension(file.name);
  if (!(photo ? ['jpg', 'jpeg', 'png', 'webp'] : ['pdf', 'docx']).includes(ext) || !file.size || file.size > (photo ? 2 : 20) * 1024 * 1024 || file.name.length > 300) fail(400, photo ? 'Foto JPG/PNG/WebP maksimal 2 MB.' : 'Dokumen PDF/DOCX maksimal 20 MB.');
  const bytes = await file.arrayBuffer(); let mime: string; try { mime = checkedFileMime(file.name, bytes); } catch (e) { fail(400, (e as Error).message); }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('');
  const key = `kampus/${campusId}/monitoring/${operationId}-${hash}.${ext}`;
  // Deterministic object keys make retries reuse the same bytes; metadata is committed atomically.
  if (!monitoringPeriods(await list(pb, 'indicator_definitions')).some(p => p.id === period && p.state === 'active')) fail(409, 'Periode tidak aktif. Unggah tidak diizinkan.');
  await storage.put(key, bytes, mime!);
  return atomic(pb, store => {
    openMonitoringPeriod(store, period);
    const retry = rows(store, 'monitoring_files').find(r => r.getString('operationId') === operationId);
    if (retry) { if (retry.getString('hash') !== hash || retry.getString('kind') !== kind || retry.getString('originalName') !== file.name || retry.getString('author') !== actor.id) fail(409, 'Unggahan ulang berbeda.'); return retry.id; }
    const record = save(store, 'monitoring_files', undefined, { campus: campusId, period, kind, operationId, hash, r2Key: key, originalName: file.name, mime: mime!, size: file.size, author: actor.id });
    audit(store, actor, campusId, record.id, 'mengunggah bukti monitoring'); return record.id;
  }, reads(pb, campusId, period));
}
export async function monitoringFile(pb: PocketBase, storage: Storage, campus: string, id: string) {
  const row = await pb.collection('monitoring_files').getOne(id, opts);
  if (row.campus !== campus) fail(404, 'Bukti tidak ditemukan.');
  const file = await storage.get(row.r2Key);
  return new Response(file.body, { headers: { 'Content-Type': row.mime, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.originalName)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export async function monitoringQueue(pb: PocketBase) {
  const [versions, campuses, definitions] = await Promise.all([list(pb, 'monitoring_versions'), list(pb, 'campuses'), list(pb, 'indicator_definitions')]);
  return { versions, campuses: campuses.map(c => ({ id: c.id, name: c.name })), periods: monitoringPeriods(definitions) };
}
