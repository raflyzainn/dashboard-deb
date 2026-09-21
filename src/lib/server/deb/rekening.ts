import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { namesMatch, normalizeName, splitNames, type Kind, type Status } from '../../pencairan';
import { PreviewError } from './preview-error';
import { writeAudit, type AuditActor } from './audit';
import { workspace, setFields, updateDisbursement, mask, context, TERM, type DocumentInfo, type VersionInfo } from './pencairan';
import { mimeFor, extensionOf, type Storage } from './r2';

/**
 * Step 5, Rekening dan surat kuasa: one bank_checks row per disbursement.
 * The typed values live in the document versions (one source of truth); the row keeps the comparison result,
 * the override reason and the bank check. The account number is only shown in full on this page.
 */
const opts = { requestKey: null } as const;
type Actor = AuditActor & { id: string };
const REKENING_STAGE = 5;
const EVIDENCE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const EVIDENCE_LIMIT = 10 * 1024 * 1024;

export interface RekeningValues { bankName: string; branch: string; accountNumber: string; holderNames: string[]; attorneyNames: string[] }
export interface SlotInfo {
  id: string; kind: Kind; status: Status; currentVersionId: string;
  current: { id: string; number: number; originalName: string; mime: string; fieldsByName: string; fieldsAt: string; fieldsCheckedByName: string; fieldsCheckedAt: string; fieldsSamePerson: boolean } | null;
  versions: { id: string; number: number; originalName: string; mime: string; created: string; uploadedByName: string }[];
}
export interface RekeningView {
  campus: { id: string; name: string; code: string; programYear: string };
  summary: { skNumber: string; amountSen: number; limitSen: number; requestedSen: number; programYear: string };
  stage: number;
  rekening: SlotInfo; suratKuasa: SlotInfo;
  fields: RekeningValues;
  numberCheck: { level: 'ok' | 'bad' | 'info'; text: string };
  comparison: { live: boolean | null; stored: boolean; holderNames: string[]; attorneyNames: string[]; stale: boolean; overrideReason: string };
  bank: { result: 'belum' | 'sesuai' | 'berbeda'; nameSeen: string; evidenceName: string; checkedByName: string; checkedAt: string };
  ready: boolean; blockers: string[];
}

const current = (doc: DocumentInfo): VersionInfo | null => doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[doc.versions.length - 1] || null;
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const digits = (value: string) => value.replace(/\D/g, '');
const sameNames = (a: string[], b: string[]) => a.length === b.length && a.every((name, i) => normalizeName(name) === normalizeName(b[i] || ''));

/** The typed values as they stand in the current versions of both documents. */
function valuesOf(rekening: VersionInfo | null, suratKuasa: VersionInfo | null): RekeningValues {
  const r = rekening?.fields || {};
  const s = suratKuasa?.fields || {};
  return { bankName: text(r.namaBank), branch: text(r.cabang), accountNumber: text(r.nomorRekening), holderNames: splitNames(r.namaPemilik as string[]), attorneyNames: splitNames(s.penerimaKuasa as string[]) };
}
const slotOf = (doc: DocumentInfo): SlotInfo => {
  const v = current(doc);
  return {
    id: doc.id, kind: doc.kind, status: doc.status, currentVersionId: doc.currentVersionId,
    current: v ? { id: v.id, number: v.number, originalName: v.originalName, mime: v.mime, fieldsByName: v.fieldsByName, fieldsAt: v.fieldsAt, fieldsCheckedByName: v.fieldsCheckedByName, fieldsCheckedAt: v.fieldsCheckedAt, fieldsSamePerson: v.fieldsSamePerson } : null,
    versions: doc.versions.map(x => ({ id: x.id, number: x.number, originalName: x.originalName, mime: x.mime, created: x.created, uploadedByName: x.uploadedByName }))
  };
};
const rowNames = (value: unknown) => (Array.isArray(value) ? value.map(x => String(x)) : []);

/** Creates the row on first use, prefilled from the typed fields. Nothing is audited for this system prefill. */
async function ensureRow(pb: PocketBase, disbursementId: string, prefill: RekeningValues): Promise<RecordModel> {
  const found = await pb.collection('bank_checks').getList(1, 1, { filter: pb.filter('disbursement = {:d}', { d: disbursementId }), ...opts });
  if (found.items[0]) return found.items[0];
  const match = prefill.holderNames.length && prefill.attorneyNames.length ? namesMatch(prefill.holderNames, prefill.attorneyNames) : false;
  return pb.collection('bank_checks').create({
    disbursement: disbursementId, bankName: prefill.bankName, branch: prefill.branch, accountNumber: prefill.accountNumber, holderNames: prefill.holderNames, attorneyNames: prefill.attorneyNames,
    namesMatch: match, overrideReason: '', bankResult: 'belum', bankNameSeen: '', evidenceKey: '', checkedBy: '', checkedAt: '', revision: 1
  }, opts);
}

async function base(pb: PocketBase, campusId: string) {
  const ws = await workspace(pb, campusId);
  const rekening = ws.documents.find(d => d.kind === 'rekening')!;
  const suratKuasa = ws.documents.find(d => d.kind === 'surat_kuasa')!;
  const invois = ws.documents.find(d => d.kind === 'invois')!;
  const values = valuesOf(current(rekening), current(suratKuasa));
  const row = await ensureRow(pb, ws.disbursement.id, values);
  return { ws, rekening, suratKuasa, invois, values, row };
}

/** Audit friendly snapshot of a row: the account number is masked, names are listed. */
function snapshot(row: RecordModel | Record<string, unknown>) {
  const r = row as Record<string, unknown>;
  return {
    namaBank: String(r.bankName || ''), cabang: String(r.branch || ''), nomorRekening: mask(String(r.accountNumber || '')),
    namaPemilik: rowNames(r.holderNames).join(', '), penerimaKuasa: rowNames(r.attorneyNames).join(', '),
    namaCocok: Boolean(r.namesMatch), alasanDilewati: String(r.overrideReason || ''), hasilCekBank: String(r.bankResult || 'belum'), namaDiBank: String(r.bankNameSeen || '')
  };
}

function readiness(row: RecordModel, values: RekeningValues) {
  const stale = !sameNames(rowNames(row.holderNames), values.holderNames) || !sameNames(rowNames(row.attorneyNames), values.attorneyNames);
  const namesOk = !stale && (Boolean(row.namesMatch) || Boolean(text(row.overrideReason)));
  const blockers: string[] = [];
  if (!values.holderNames.length || !values.attorneyNames.length) blockers.push('Isi nama pemilik rekening dan nama penerima kuasa.');
  else if (stale) blockers.push('Nama berubah sejak perbandingan terakhir. Bandingkan ulang.');
  else if (!namesOk) blockers.push('Nama pemilik rekening dan penerima kuasa belum cocok. Perbaiki dokumennya atau lewati dengan alasan.');
  if (row.bankResult !== 'sesuai') blockers.push(row.bankResult === 'berbeda' ? 'Nama di bank berbeda. Perbaiki rekening atau surat kuasa, lalu cek ulang ke bank.' : 'Rekening belum dicek ke bank.');
  return { stale, ready: blockers.length === 0, blockers };
}

/** Moves the disbursement to stage 5 once the names agree (or are overridden) and the bank confirmed the name. */
async function advance(pb: PocketBase, actor: Actor, campusId: string, stage: number, row: RecordModel, values: RekeningValues) {
  if (stage >= REKENING_STAGE) return;
  if (readiness(row, values).ready) await updateDisbursement(pb, actor, campusId, { stage: REKENING_STAGE });
}

async function userName(pb: PocketBase, id: string) {
  if (!id) return '';
  const user = await pb.collection('users').getOne(id, { fields: 'id,name,email', ...opts }).catch(() => null);
  return user ? String(user.name || user.email || '') : '';
}

export async function loadRekening(pb: PocketBase, campusId: string): Promise<RekeningView> {
  const { ws, rekening, suratKuasa, invois, values, row } = await base(pb, campusId);
  const invoiceAccount = digits(text(current(invois)?.fields.rekeningTujuan));
  const account = digits(values.accountNumber);
  const numberCheck: RekeningView['numberCheck'] = !account
    ? { level: 'info', text: 'Isi nomor rekening dari buku rekening untuk membandingkannya dengan invois.' }
    : !invoiceAccount ? { level: 'info', text: 'Isi rekening tujuan pada invois di halaman Dokumen untuk membandingkan nomornya.' }
    : account === invoiceAccount ? { level: 'ok', text: 'Nomor rekening pada invois dan buku rekening sama.' }
    : { level: 'bad', text: 'Nomor rekening pada invois berbeda dari buku rekening. Periksa isian invois di halaman Dokumen.' };
  const { stale, ready, blockers } = readiness(row, values);
  const evidenceKey = String(row.evidenceKey || '');
  return {
    campus: { id: ws.campus.id, name: ws.campus.name, code: ws.campus.code, programYear: ws.campus.programYear },
    summary: { skNumber: ws.summary.skNumber, amountSen: ws.summary.amountSen, limitSen: ws.summary.limitSen, requestedSen: ws.summary.requestedSen, programYear: ws.summary.programYear },
    stage: ws.disbursement.stage,
    rekening: slotOf(rekening), suratKuasa: slotOf(suratKuasa),
    fields: values,
    numberCheck,
    comparison: {
      live: values.holderNames.length && values.attorneyNames.length ? namesMatch(values.holderNames, values.attorneyNames) : null,
      stored: Boolean(row.namesMatch), holderNames: rowNames(row.holderNames), attorneyNames: rowNames(row.attorneyNames), stale, overrideReason: String(row.overrideReason || '')
    },
    bank: { result: (row.bankResult || 'belum') as RekeningView['bank']['result'], nameSeen: String(row.bankNameSeen || ''), evidenceName: evidenceKey ? evidenceKey.split('/').pop()!.replace(/^cek-bank_\d{8}T\d{6}Z_/, '') : '', checkedByName: await userName(pb, String(row.checkedBy || '')), checkedAt: String(row.checkedAt || '') },
    ready, blockers
  };
}

function validateValues(input: Record<string, unknown>): Partial<RekeningValues> {
  const out: Partial<RekeningValues> = {};
  const str = (key: string, label: string, max: number) => {
    if (input[key] === undefined) return;
    if (typeof input[key] !== 'string' || (input[key] as string).length > max) throw new PreviewError(400, `${label} terlalu panjang.`);
    return (input[key] as string).trim();
  };
  const list = (key: string, label: string) => {
    if (input[key] === undefined) return;
    const names = splitNames(input[key] as string | string[]).slice(0, 10);
    if (names.some(n => n.length > 120)) throw new PreviewError(400, `${label} terlalu panjang.`);
    return names;
  };
  const bankName = str('bankName', 'Nama bank', 120); if (bankName !== undefined) out.bankName = bankName;
  const branch = str('branch', 'Cabang', 120); if (branch !== undefined) out.branch = branch;
  const accountNumber = str('accountNumber', 'Nomor rekening', 40);
  if (accountNumber !== undefined) {
    if (accountNumber && !/^[0-9][0-9 .-]*$/.test(accountNumber)) throw new PreviewError(400, 'Nomor rekening hanya berisi angka.');
    if (accountNumber && digits(accountNumber).length < 5) throw new PreviewError(400, 'Nomor rekening terlalu pendek.');
    out.accountNumber = accountNumber;
  }
  const holderNames = list('holderNames', 'Nama pemilik rekening'); if (holderNames) out.holderNames = holderNames;
  const attorneyNames = list('attorneyNames', 'Nama penerima kuasa'); if (attorneyNames) out.attorneyNames = attorneyNames;
  return out;
}

/** Stores the row copy of the names and the comparison; clears an override once the names agree. */
async function storeComparison(pb: PocketBase, row: RecordModel, values: RekeningValues, extra: Record<string, unknown> = {}) {
  const match = values.holderNames.length && values.attorneyNames.length ? namesMatch(values.holderNames, values.attorneyNames) : false;
  const patch: Record<string, unknown> = {
    bankName: values.bankName, branch: values.branch, accountNumber: values.accountNumber, holderNames: values.holderNames, attorneyNames: values.attorneyNames,
    namesMatch: match, revision: Number(row.revision || 1) + 1, ...extra
  };
  if (match) patch.overrideReason = '';
  return pb.collection('bank_checks').update(row.id, patch, opts);
}

/** Saves edited values back into the document versions (through setFields) and refreshes the row copy. */
export async function saveRekening(pb: PocketBase, actor: Actor, campusId: string, input: Record<string, unknown>) {
  const values = validateValues(input);
  if (!Object.keys(values).length) throw new PreviewError(400, 'Tidak ada isian yang diubah.');
  const { rekening, suratKuasa, row, values: before } = await base(pb, campusId);
  const rekeningVersion = current(rekening), suratKuasaVersion = current(suratKuasa);
  const rekeningPatch: Record<string, unknown> = {};
  if (values.bankName !== undefined && values.bankName !== before.bankName) rekeningPatch.namaBank = values.bankName;
  if (values.branch !== undefined && values.branch !== before.branch) rekeningPatch.cabang = values.branch;
  if (values.accountNumber !== undefined && values.accountNumber !== before.accountNumber) rekeningPatch.nomorRekening = values.accountNumber;
  if (values.holderNames && !sameNames(values.holderNames, before.holderNames)) rekeningPatch.namaPemilik = values.holderNames;
  const suratKuasaPatch: Record<string, unknown> = {};
  if (values.attorneyNames && !sameNames(values.attorneyNames, before.attorneyNames)) suratKuasaPatch.penerimaKuasa = values.attorneyNames;
  if (Object.keys(rekeningPatch).length && !rekeningVersion) throw new PreviewError(400, 'Unggah buku rekening dulu di halaman Dokumen.');
  if (Object.keys(suratKuasaPatch).length && !suratKuasaVersion) throw new PreviewError(400, 'Unggah surat kuasa dulu di halaman Dokumen.');
  if (!Object.keys(rekeningPatch).length && !Object.keys(suratKuasaPatch).length) return row;
  if (Object.keys(rekeningPatch).length) await setFields(pb, actor, campusId, 'rekening', rekeningVersion!.id, rekeningPatch, false);
  if (Object.keys(suratKuasaPatch).length) await setFields(pb, actor, campusId, 'surat_kuasa', suratKuasaVersion!.id, suratKuasaPatch, false);
  const after: RekeningValues = { ...before, ...values };
  const updated = await storeComparison(pb, row, after);
  await writeAudit(pb, { actor, action: 'memperbarui data rekening', context: context(campusId), collection: 'bank_checks', record: row.id, campus: campusId, before: snapshot(row), after: snapshot(updated) });
  const { ws } = await base(pb, campusId);
  await advance(pb, actor, campusId, ws.disbursement.stage, updated, after);
  return updated;
}

/** Marks the typed values of one document as checked against the file by a second look. */
export async function checkRekeningFields(pb: PocketBase, actor: Actor, campusId: string, kind: 'rekening' | 'surat_kuasa') {
  const { rekening, suratKuasa } = await base(pb, campusId);
  const version = current(kind === 'rekening' ? rekening : suratKuasa);
  if (!version) throw new PreviewError(400, kind === 'rekening' ? 'Unggah buku rekening dulu di halaman Dokumen.' : 'Unggah surat kuasa dulu di halaman Dokumen.');
  return setFields(pb, actor, campusId, kind, version.id, null, true);
}

/** Compares the names again from the current typed values and stores the result. */
export async function compareNames(pb: PocketBase, actor: Actor, campusId: string) {
  const { ws, row, values } = await base(pb, campusId);
  if (!values.holderNames.length || !values.attorneyNames.length) throw new PreviewError(400, 'Isi nama pemilik rekening dan nama penerima kuasa dulu.');
  const updated = await storeComparison(pb, row, values);
  await writeAudit(pb, { actor, action: 'membandingkan nama pemilik rekening dan penerima kuasa', context: context(campusId), collection: 'bank_checks', record: row.id, campus: campusId, before: snapshot(row), after: snapshot(updated) });
  await advance(pb, actor, campusId, ws.disbursement.stage, updated, values);
  return updated;
}

/** Skips a name mismatch with a written reason; an empty reason removes the override. */
export async function overrideNames(pb: PocketBase, actor: Actor, campusId: string, reason: string) {
  const clean = reason.trim().slice(0, 1000);
  const { ws, row, values } = await base(pb, campusId);
  if (clean) {
    if (readiness(row, values).stale) throw new PreviewError(400, 'Bandingkan ulang nama sebelum melewati perbandingan.');
    if (row.namesMatch) throw new PreviewError(400, 'Kedua nama sudah cocok, tidak perlu dilewati.');
    if (clean.length < 10) throw new PreviewError(400, 'Tulis alasan yang jelas, minimal 10 huruf.');
  }
  const updated = await pb.collection('bank_checks').update(row.id, { overrideReason: clean, revision: Number(row.revision || 1) + 1 }, opts);
  await writeAudit(pb, { actor, action: clean ? 'melewati perbandingan nama dengan alasan' : 'membatalkan alasan melewati perbandingan nama', context: context(campusId), collection: 'bank_checks', record: row.id, campus: campusId, before: { alasanDilewati: String(row.overrideReason || '') }, after: { alasanDilewati: clean }, note: clean });
  await advance(pb, actor, campusId, ws.disbursement.stage, updated, values);
  return updated;
}

export interface EvidenceFile { name: string; bytes: ArrayBuffer | Uint8Array; mime?: string }
/** Records the human check with the bank: the name as shown there, an optional screenshot, and the result. */
export async function recordBankCheck(pb: PocketBase, store: Storage, actor: Actor, campusId: string, input: { result: string; nameSeen: string; evidence?: EvidenceFile | null }) {
  if (!['sesuai', 'berbeda'].includes(input.result)) throw new PreviewError(400, 'Pilih Nama sesuai atau Nama berbeda.');
  const nameSeen = input.nameSeen.trim().slice(0, 200);
  if (!nameSeen) throw new PreviewError(400, 'Ketik nama yang muncul di bank persis seperti tampil.');
  const { ws, row, values } = await base(pb, campusId);
  if (!values.accountNumber) throw new PreviewError(400, 'Isi nomor rekening dulu sebelum mencatat hasil cek ke bank.');
  let evidenceKey = String(row.evidenceKey || '');
  if (input.evidence) {
    const ext = extensionOf(input.evidence.name);
    if (!EVIDENCE_EXTENSIONS.includes(ext)) throw new PreviewError(400, 'Bukti berupa gambar PNG, JPG, atau WebP.');
    if (!input.evidence.bytes.byteLength) throw new PreviewError(400, 'Berkas bukti kosong.');
    if (input.evidence.bytes.byteLength > EVIDENCE_LIMIT) throw new PreviewError(413, 'Ukuran bukti maksimal 10 MB.');
    const safe = input.evidence.name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'bukti.' + ext;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    evidenceKey = `kampus/${ws.campus.code}/termin-${TERM}/rekening/cek-bank_${stamp}_${safe}`;
    await store.put(evidenceKey, input.evidence.bytes, input.evidence.mime || mimeFor(input.evidence.name));
  }
  const now = new Date().toISOString();
  const updated = await pb.collection('bank_checks').update(row.id, { bankResult: input.result, bankNameSeen: nameSeen, evidenceKey, checkedBy: actor.id, checkedAt: now, revision: Number(row.revision || 1) + 1 }, opts);
  await writeAudit(pb, {
    actor, action: `mencatat hasil cek ke bank: ${input.result === 'sesuai' ? 'Nama sesuai' : 'Nama berbeda'}`, context: context(campusId), collection: 'bank_checks', record: row.id, campus: campusId,
    before: { hasilCekBank: String(row.bankResult || 'belum'), namaDiBank: String(row.bankNameSeen || ''), bukti: Boolean(row.evidenceKey) },
    after: { hasilCekBank: input.result, namaDiBank: nameSeen, bukti: Boolean(evidenceKey) }
  });
  await advance(pb, actor, campusId, ws.disbursement.stage, updated, values);
  return updated;
}

/** Streams the evidence image of the bank check through the server. */
export async function evidenceResponse(pb: PocketBase, store: Storage, campusId: string) {
  const { row } = await base(pb, campusId);
  const key = String(row.evidenceKey || '');
  if (!key) throw new PreviewError(404, 'Belum ada bukti pengecekan.');
  const source = await store.get(key);
  const headers = new Headers();
  headers.set('Content-Type', mimeFor(key, 'image/jpeg'));
  headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(key.split('/').pop() || 'bukti')}`);
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(source.body, { status: 200, headers });
}
