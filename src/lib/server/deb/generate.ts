import { read } from '$app/server';
import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import pksUrl from '../../../../static/templat/pks-standar.docx?url';
import permohonanUrl from '../../../../static/templat/permohonan.docx?url';
import invoisUrl from '../../../../static/templat/invois.docx?url';
import kuitansiUrl from '../../../../static/templat/kuitansi.docx?url';
import { PreviewError } from './preview-error';
import { writeAudit, type AuditActor } from './audit';
import type { Storage } from './r2';
import { workspace, campusWithAward, addVersion, updateDisbursement, context, TERM, type DocumentInfo } from './pencairan';
import { formatSen, formatPercent } from '../../pencairan';
import { buildMergeData, templateTags, missingFor, renderDocx, templateOpens, generatedFileName, withVerificationFooter, MERGE_KINDS, MERGE_LABEL, TEMPLATE_FILE, DOCX_MIME, type MergeKind, type MergeData, type Missing } from '../../merge';
import { compareTemplates, type Differences } from '../../pks-compare';
import { qrPng, qrPngSide } from '../../qr';
import { mintCode, createVerification, verificationUrl, verificationLine, SAMPLE_CODE, ISSUER_LINE } from './verifikasi';

/**
 * Step 6, Buat dokumen: program settings, the campus specific PKS template, readiness, preview and saving of the four generated
 * documents. Every function takes a superuser client; the route has already checked the admin role.
 */
const opts = { requestKey: null } as const;
const TEMPLATE_URL: Record<MergeKind, string> = { pks: pksUrl, permohonan: permohonanUrl, invois: invoisUrl, kuitansi: kuitansiUrl };
export const SETTINGS_CONTEXT = 'pengaturan-program';
export const YEARS = ['kedua', 'ketiga'] as const;
export const YEAR_LABEL: Record<string, string> = { kedua: 'Kedua', ketiga: 'Ketiga' };

/** Bytes of a standard template: through the asset reader, or over HTTP from the app's own origin when the reader is unavailable. */
export async function standardTemplate(kind: MergeKind, origin: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await read(TEMPLATE_URL[kind]).arrayBuffer());
  } catch {
    const response = await fetch(`${origin}/templat/${TEMPLATE_FILE[kind]}`).catch(() => null);
    if (!response?.ok) throw new PreviewError(503, 'Templat dokumen belum tersedia. Coba lagi.');
    return new Uint8Array(await response.arrayBuffer());
  }
}

// ----- program settings (one row per program year) -----

export interface SettingsRow { id: string; programYear: string; pfSignatoryName: string; pfSignatoryTitle: string; agreementStart: string; agreementEnd: string; reportDeadline: string }
const SETTINGS_KEYS = ['pfSignatoryName', 'pfSignatoryTitle', 'agreementStart', 'agreementEnd', 'reportDeadline'] as const;
const SETTINGS_LABEL: Record<(typeof SETTINGS_KEYS)[number], string> = { pfSignatoryName: 'Penandatangan Pertamina Foundation', pfSignatoryTitle: 'Jabatan penandatangan', agreementStart: 'Masa perjanjian mulai', agreementEnd: 'Masa perjanjian selesai', reportDeadline: 'Batas waktu laporan' };
const day = (value: unknown) => (/^\d{4}-\d{2}-\d{2}/.test(String(value || '')) ? String(value).slice(0, 10) : String(value || ''));
const mapSettings = (r: RecordModel | null, programYear: string): SettingsRow => ({
  id: r?.id || '', programYear, pfSignatoryName: r?.pfSignatoryName || '', pfSignatoryTitle: r?.pfSignatoryTitle || '',
  agreementStart: day(r?.agreementStart), agreementEnd: day(r?.agreementEnd), reportDeadline: day(r?.reportDeadline)
});

export async function readSettings(pb: PocketBase): Promise<SettingsRow[]> {
  const rows = await pb.collection('program_settings').getFullList(opts);
  return YEARS.map(year => mapSettings(rows.find(r => r.programYear === year) || null, year));
}
export async function settingsFor(pb: PocketBase, programYear: string): Promise<SettingsRow | null> {
  if (!programYear) return null;
  const found = await pb.collection('program_settings').getList(1, 1, { filter: pb.filter('programYear = {:y}', { y: programYear }), ...opts });
  return found.items[0] ? mapSettings(found.items[0], programYear) : null;
}
export async function writeSettings(pb: PocketBase, actor: AuditActor, programYear: string, values: Record<string, unknown>) {
  if (!(YEARS as readonly string[]).includes(programYear)) throw new PreviewError(400, 'Tahun program tidak dikenal.');
  const found = await pb.collection('program_settings').getList(1, 1, { filter: pb.filter('programYear = {:y}', { y: programYear }), ...opts });
  const current = mapSettings(found.items[0] || null, programYear);
  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!(SETTINGS_KEYS as readonly string[]).includes(key)) throw new PreviewError(400, 'Pengaturan tidak dikenal.');
    if (typeof raw !== 'string' || raw.length > 200) throw new PreviewError(400, `${SETTINGS_LABEL[key as keyof typeof SETTINGS_LABEL]} tidak valid.`);
    const value = raw.trim();
    const isDate = key === 'agreementStart' || key === 'agreementEnd' || key === 'reportDeadline';
    if (isDate && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PreviewError(400, `${SETTINGS_LABEL[key as keyof typeof SETTINGS_LABEL]} harus berupa tanggal.`);
    if (current[key as keyof SettingsRow] === value) continue;
    before[key] = current[key as keyof SettingsRow]; after[key] = value;
    data[key] = isDate && key !== 'reportDeadline' ? (value ? `${value} 00:00:00.000Z` : '') : value;
  }
  if (!Object.keys(data).length) return current;
  const record = current.id ? await pb.collection('program_settings').update(current.id, data, opts) : await pb.collection('program_settings').create({ programYear, ...data }, opts);
  await writeAudit(pb, { actor, action: `mengubah pengaturan program Tahun ${YEAR_LABEL[programYear] || programYear}`, context: SETTINGS_CONTEXT, collection: 'program_settings', record: record.id, before, after });
  return mapSettings(record, programYear);
}

// ----- merge context of one campus -----

interface MergeContext {
  ws: Awaited<ReturnType<typeof workspace>>; campus: RecordModel; award: RecordModel; settings: SettingsRow | null; data: MergeData; activeTemplate: RecordModel | null;
}
const currentFields = (doc: DocumentInfo | undefined): Record<string, unknown> => {
  if (!doc) return {};
  const current = doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[doc.versions.length - 1];
  return current?.fields || {};
};
async function mergeContext(pb: PocketBase, campusId: string): Promise<MergeContext> {
  const ws = await workspace(pb, campusId);
  const [campus, { award }] = await Promise.all([pb.collection('campuses').getOne(campusId, opts), campusWithAward(pb, campusId)]);
  const settings = await settingsFor(pb, String(award.programYear || campus.programYear || ''));
  const activeTemplate = ws.disbursement.templateMode === 'custom'
    ? (await pb.collection('pks_templates').getList(1, 1, { filter: pb.filter('campus = {:c} && active = true', { c: campusId }), sort: '-version', ...opts })).items[0] || null
    : null;
  const data = buildMergeData({
    campus: { name: campus.name, code: campus.code, city: campus.city, programYear: campus.programYear, theme: campus.theme, program: campus.program && typeof campus.program === 'object' ? campus.program : null },
    award: { skNumber: award.skNumber, skDate: award.skDate, amountSen: Number(award.amountSen || 0), programTitle: award.programTitle, programYear: award.programYear },
    settings, disbursement: { requestedSen: ws.disbursement.requestedSen, properties: ws.disbursement.properties }, rekening: currentFields(ws.documents.find(d => d.kind === 'rekening'))
  });
  return { ws, campus, award, settings, data, activeTemplate };
}
const clauseRequired = (ctx: MergeContext) => ctx.ws.summary.requestedSen > 0 && ctx.ws.summary.requestedSen < ctx.ws.summary.limitSen;

interface TemplateBytes { bytes: Uint8Array; templateId: string; label: string }
async function templateFor(ctx: MergeContext, kind: MergeKind, store: Storage, origin: string): Promise<TemplateBytes> {
  if (kind === 'pks' && ctx.activeTemplate) {
    const response = await store.get(ctx.activeTemplate.r2Key);
    return { bytes: new Uint8Array(await response.arrayBuffer()), templateId: ctx.activeTemplate.id, label: `khusus versi ${ctx.activeTemplate.version}` };
  }
  return { bytes: await standardTemplate(kind, origin), templateId: 'standar', label: 'standar' };
}

export interface Readiness { key: 'rab' | 'rekening' | 'profil' | 'termin2'; level: 'ok' | 'warn' | 'info'; text: string; clause?: boolean }
function readiness(ctx: MergeContext, profilMissing: Missing[]): Readiness[] {
  const { summary } = ctx.ws;
  const bank = ctx.ws.bankCheck?.bankResult === 'sesuai';
  const out: Readiness[] = [
    summary.requestedSen ? { key: 'rab', level: 'ok', text: `RAB disetujui, Termin 1 ${formatSen(summary.requestedSen)}` } : { key: 'rab', level: 'warn', text: 'Termin 1 belum ditetapkan. Setujui RAB di langkah RAB.' },
    bank ? { key: 'rekening', level: 'ok', text: 'Rekening sudah dicek ke bank' } : { key: 'rekening', level: 'warn', text: 'Rekening belum dicek ke bank. Selesaikan di langkah Rekening.' },
    profilMissing.length ? { key: 'profil', level: 'warn', text: `Profil DEB: ${profilMissing.map(m => m.label.toLowerCase()).join(', ')} belum diisi` } : { key: 'profil', level: 'ok', text: 'Profil DEB lengkap' }
  ];
  if (!summary.requestedSen) out.push({ key: 'termin2', level: 'info', text: 'Kesesuaian Termin 2 dengan 30% di PKS diperiksa setelah Termin 1 ditetapkan' });
  else if (!clauseRequired(ctx)) out.push({ key: 'termin2', level: 'ok', text: 'Termin 1 tepat 70%, Termin 2 sesuai 30% di PKS' });
  else out.push({ key: 'termin2', level: ctx.ws.disbursement.clauseChecked ? 'ok' : 'warn', clause: true, text: `Termin 1 ${formatPercent(summary.term1Percent)}, Termin 2 menjadi ${formatPercent(summary.term2Percent)} dari Nilai Kegiatan, bukan 30% seperti tertulis di PKS.` });
  return out;
}

// ----- campus specific PKS templates -----

export interface TemplateInfo { id: string; version: number; originalName: string; reason: string; active: boolean; uploadedByName: string; created: string; differences: Differences }
const mapTemplate = (r: RecordModel): TemplateInfo => ({ id: r.id, version: Number(r.version), originalName: r.originalName || '', reason: r.reason || '', active: Boolean(r.active), uploadedByName: r.uploadedByName || '', created: r.created, differences: (r.differences && typeof r.differences === 'object' ? r.differences : { changed: 0, added: 0, pasal: [], missingTags: [] }) as Differences });

export async function listTemplates(pb: PocketBase, campusId: string, mode?: string) {
  const rows = await pb.collection('pks_templates').getFullList({ filter: pb.filter('campus = {:c}', { c: campusId }), sort: '-version', ...opts });
  const versions = rows.map(mapTemplate);
  const templateMode = mode ?? (await pb.collection('disbursements').getList(1, 1, { filter: pb.filter('campus = {:c} && term = 1', { c: campusId }), fields: 'templateMode', ...opts })).items[0]?.templateMode ?? 'standard';
  return { mode: templateMode === 'custom' ? 'custom' : 'standard', active: templateMode === 'custom' ? versions.find(v => v.active) || null : null, versions };
}
async function deactivateAll(pb: PocketBase, campusId: string) {
  const rows = await pb.collection('pks_templates').getFullList({ filter: pb.filter('campus = {:c} && active = true', { c: campusId }), fields: 'id', ...opts });
  for (const row of rows) await pb.collection('pks_templates').update(row.id, { active: false }, opts);
}

export async function uploadTemplate(pb: PocketBase, store: Storage, actor: AuditActor & { id: string }, campusId: string, file: { name: string; bytes: ArrayBuffer }, reason: string, origin: string) {
  if (!/\.docx$/i.test(file.name)) throw new PreviewError(400, 'Gunakan berkas Word (.docx).');
  if (!file.bytes.byteLength) throw new PreviewError(400, 'Berkas kosong.');
  if (file.bytes.byteLength > 10 * 1024 * 1024) throw new PreviewError(413, 'Ukuran templat maksimal 10 MB.');
  const note = reason.trim();
  if (!note) throw new PreviewError(400, 'Tulis alasan templat khusus, misalnya pasal yang diminta kampus.');
  const bytes = new Uint8Array(file.bytes);
  if (!templateOpens(bytes)) throw new PreviewError(400, 'Templat tidak dapat dibaca. Simpan ulang sebagai .docx lalu unggah lagi.');
  const differences = compareTemplates(await standardTemplate('pks', origin), bytes);
  const { campus } = await campusWithAward(pb, campusId);
  const last = await pb.collection('pks_templates').getList(1, 1, { filter: pb.filter('campus = {:c}', { c: campusId }), sort: '-version', fields: 'version', ...opts });
  const version = Number(last.items[0]?.version || 0) + 1;
  const safe = file.name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'templat.docx';
  const key = `templat/pks/${campus.code}/v${version}_${safe}`;
  await store.put(key, bytes, DOCX_MIME);
  await deactivateAll(pb, campusId);
  const record = await pb.collection('pks_templates').create({ campus: campusId, version, r2Key: key, originalName: file.name, differences, reason: note.slice(0, 2000), uploadedBy: actor.id, uploadedByName: actor.name || '', active: true, label: `Khusus versi ${version}` }, opts);
  await updateDisbursement(pb, actor, campusId, { templateMode: 'custom' });
  await writeAudit(pb, { actor, action: `mengunggah templat PKS khusus versi ${version}`, context: context(campusId), collection: 'pks_templates', record: record.id, campus: campusId,
    after: { berkas: file.name, pasalBerbeda: differences.pasal.map(p => p.name).join(', ') || 'tidak ada', alasan: note.slice(0, 300) } });
  return listTemplates(pb, campusId, 'custom');
}

export async function activateTemplate(pb: PocketBase, actor: AuditActor & { id: string }, campusId: string, templateId: string | null) {
  await deactivateAll(pb, campusId);
  if (!templateId) {
    await updateDisbursement(pb, actor, campusId, { templateMode: 'standard' });
    await writeAudit(pb, { actor, action: 'memakai templat PKS standar', context: context(campusId), collection: 'disbursements', campus: campusId, after: { templat: 'standar' } });
    return listTemplates(pb, campusId, 'standard');
  }
  const record = await pb.collection('pks_templates').getOne(templateId, opts).catch(() => null);
  if (!record || record.campus !== campusId) throw new PreviewError(404, 'Templat tidak ditemukan.');
  await pb.collection('pks_templates').update(record.id, { active: true }, opts);
  await updateDisbursement(pb, actor, campusId, { templateMode: 'custom' });
  await writeAudit(pb, { actor, action: `memakai templat PKS khusus versi ${record.version}`, context: context(campusId), collection: 'pks_templates', record: record.id, campus: campusId, after: { templat: `khusus versi ${record.version}` } });
  return listTemplates(pb, campusId, 'custom');
}

// ----- readiness, preview, save -----

/** Verification codes already issued for this campus, by document version. Empty when the collection is not provisioned yet. */
async function issuedCodes(pb: PocketBase, campusId: string) {
  try {
    const rows = await pb.collection('verifications').getFullList({ filter: pb.filter('campus = {:c} && term = {:t}', { c: campusId, t: TERM }), fields: 'code,documentVersion', ...opts });
    return new Map(rows.filter(r => r.documentVersion).map(r => [String(r.documentVersion), String(r.code)]));
  } catch { return new Map<string, string>(); }
}

export async function buatInfo(pb: PocketBase, store: Storage, campusId: string, origin: string) {
  const ctx = await mergeContext(pb, campusId);
  const tags = {} as Record<MergeKind, string[]>;
  const missing = {} as Record<MergeKind, Missing[]>;
  for (const kind of MERGE_KINDS) {
    const template = await templateFor(ctx, kind, store, origin);
    tags[kind] = templateTags(template.bytes);
    missing[kind] = missingFor(tags[kind], ctx.data);
  }
  const allTags = Array.from(new Set(MERGE_KINDS.flatMap(kind => tags[kind])));
  const profilMissing = missingFor(allTags, ctx.data).filter(m => m.source === 'Profil DEB');
  const [templates, codes] = await Promise.all([listTemplates(pb, campusId, ctx.ws.disbursement.templateMode), issuedCodes(pb, campusId)]);
  return {
    campus: ctx.ws.campus, summary: ctx.ws.summary, disbursement: ctx.ws.disbursement,
    readiness: readiness(ctx, profilMissing), clauseRequired: clauseRequired(ctx),
    data: ctx.data, missing, tags, templates,
    documents: ctx.ws.documents.filter(d => d.generated).map(d => ({ kind: d.kind as MergeKind, status: d.status, currentVersionId: d.currentVersionId, versions: d.versions.map(v => ({ id: v.id, number: v.number, originalName: v.originalName, mime: v.mime, origin: v.origin, created: v.created, uploadedByName: v.uploadedByName, signed: Boolean((v as { signed?: boolean }).signed), code: codes.get(v.id) || '' })) })),
    settingsYear: String(ctx.award.programYear || ctx.campus.programYear || ''), settingsReady: Boolean(ctx.settings?.pfSignatoryName && ctx.settings?.agreementStart)
  };
}

/** Settings with a public address to print: DEB_PUBLIC_URL, or the request origin while it is not configured. */
const publicSettings = (settings: Record<string, string>, origin: string) => (settings.DEB_PUBLIC_URL ? settings : { ...settings, DEB_PUBLIC_URL: origin });
/** Puts the verification footer on every page: the QR opens the verification page, the line beside it repeats the address in plain text. */
function stamp(bytes: Uint8Array, settings: Record<string, string>, code: string) {
  const url = verificationUrl(settings, code);
  const qr = { scale: 4, margin: 2 } as const;
  return withVerificationFooter(bytes, { png: qrPng(url, qr), pngSide: qrPngSide(url, qr), code, line: verificationLine(settings, code), issuer: ISSUER_LINE });
}

/** Merge context, template and missing fields of one document. A final document is refused while a field is missing or the Termin 2 clause is unchecked. */
async function prepareDocument(pb: PocketBase, store: Storage, campusId: string, kind: MergeKind, mode: 'preview' | 'final', origin: string) {
  const ctx = await mergeContext(pb, campusId);
  const template = await templateFor(ctx, kind, store, origin);
  const missing = missingFor(templateTags(template.bytes), ctx.data);
  if (mode === 'final') {
    if (missing.length) throw new PreviewError(400, `Lengkapi ${missing.length} isian dulu: ${missing.map(m => m.label).join(', ')}.`);
    if (kind === 'pks' && clauseRequired(ctx) && !ctx.ws.disbursement.clauseChecked) throw new PreviewError(400, 'Centang "Pasal Bantuan Dana sudah diperiksa" sebelum membuat PKS.');
  }
  return { ctx, template, missing, fileName: generatedFileName(kind, ctx.ws.campus.code) };
}

/** The merged document. A preview carries the sample code; a final document carries the code minted for the version being saved. */
export async function generateDocument(pb: PocketBase, store: Storage, campusId: string, kind: MergeKind, mode: 'preview' | 'final', origin: string, settings: Record<string, string>, code = SAMPLE_CODE) {
  const prepared = await prepareDocument(pb, store, campusId, kind, mode, origin);
  const verificationCode = mode === 'preview' ? SAMPLE_CODE : code;
  const bytes = stamp(renderDocx(prepared.template.bytes, prepared.ctx.data, { preview: mode === 'preview' }), publicSettings(settings, origin), verificationCode);
  return { ...prepared, bytes, code: verificationCode };
}

/** Typed fields a generated version inherits from the properties and checked data (Q1), so nothing is typed twice. */
function inheritedFields(kind: MergeKind, ctx: MergeContext): Record<string, unknown> {
  const props = ctx.ws.disbursement.properties as Record<string, string>;
  const { data } = ctx;
  const date = (value: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : null);
  const requested = ctx.ws.summary.requestedSen || null;
  switch (kind) {
    case 'pks': return { nomorPksPf: data.nomorPksPf || null, nomorPksKampus: data.nomorPksKampus || null, tanggalPerjanjian: date(props.tanggalPerjanjian), penandatangan: [data.namaPenandatangan, data.jabatanPenandatangan].filter(Boolean).join(', ') || null, nilaiBantuanSen: ctx.ws.summary.amountSen };
    case 'permohonan': return { nomorSurat: data.nomorSuratPermohonan || null, tanggalSurat: date(props.tanggalSuratPermohonan), nominalSen: requested, penandatangan: [data.namaMentor, data.namaKoordinator].filter(Boolean).join(' dan ') || null };
    case 'invois': return { nomorInvois: data.nomorInvois || null, tanggal: date(props.tanggalInvois), nominalSen: requested, rekeningTujuan: data.nomorRekening || null };
    case 'kuitansi': return { nomorKuitansi: data.nomorKuitansi || null, tanggal: date(props.tanggalKuitansi), nominalSen: requested, terbilang: data.termin1Terbilang || null, bermeterai: false };
  }
}

/**
 * Saves the final document as a new version of its slot and issues its verification code: the code is minted first so it is
 * printed inside the file, the version is stored, then the verification record points at that version and its SHA-256.
 */
export async function saveGenerated(pb: PocketBase, store: Storage, actor: AuditActor & { id: string }, campusId: string, kind: MergeKind, origin: string, settings: Record<string, string>) {
  const prepared = await prepareDocument(pb, store, campusId, kind, 'final', origin);
  const campus = prepared.ctx.ws.campus;
  const code = await mintCode(pb, campus.code, TERM, kind);
  const result = { ...prepared, bytes: stamp(renderDocx(prepared.template.bytes, prepared.ctx.data), publicSettings(settings, origin), code) };
  const now = new Date().toISOString();
  const { version } = await addVersion(pb, store, actor, campusId, kind, { name: result.fileName, bytes: result.bytes, mime: DOCX_MIME }, {
    origin: 'generated', keepStatus: true, note: `Dibuat dari data dengan templat ${result.template.label}. Kode verifikasi ${code}.`,
    generation: { kind, template: result.template.templateId, templateLabel: result.template.label, data: result.ctx.data, generatedAt: now, by: actor.name || '', code }
  });
  await pb.collection('document_versions').update(version.id, { fields: inheritedFields(kind, result.ctx), fieldsBy: actor.id, fieldsAt: now }, opts);
  await createVerification(pb, {
    code, campus: campusId, term: TERM, kind, documentVersion: version.id, sha256: String(version.sha256 || ''),
    amountSen: kind === 'pks' ? result.ctx.ws.summary.amountSen : result.ctx.ws.disbursement.requestedSen,
    label: `${MERGE_LABEL[kind]} Termin 1 ${campus.name}`, issuedBy: actor.id, issuedByName: actor.name || ''
  });
  await writeAudit(pb, { actor, action: `membuat ${MERGE_LABEL[kind]} final dari data (versi ${version.number})`, context: context(campusId), collection: 'document_versions', record: version.id, campus: campusId, after: { templat: result.template.label, berkas: result.fileName, kodeVerifikasi: code } });
  if (result.ctx.ws.disbursement.stage < 6) await updateDisbursement(pb, actor, campusId, { stage: 6 });
  return { version: { id: version.id, number: Number(version.number), originalName: String(version.originalName), sha256: String(version.sha256 || '') }, code, workspace: await workspace(pb, campusId) };
}
