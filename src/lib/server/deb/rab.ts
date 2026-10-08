import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import * as XLSX from 'xlsx';
import { limitSen, formatSen, parseSen } from '../../pencairan';
import { arrange, totalsOf, rabChecks, stripEnumerator, parseVolume, MAX_LEVEL, type Arranged, type LineInput, type RabLine, type RabStatus, type RabSource, type RabVersionShare, type RabVersionInfo, type RabOverview, type RabCheck } from '../../rab';
import { PreviewError } from './preview-error';
import { gridHeader, isGridSheet, parseGridSheet, mergeGridSheets, type GridResult } from './rab-grid';
import { auditData, type AuditActor, type AuditInput } from './audit';
import { atomic, StoreRecord, type RestStore } from './rest-store';
import { payoutReads, assertPayoutEditable, assertRevision } from './pencairan-store';
import { campusWithAward, ensureDisbursement, context } from './pencairan';

/**
 * Managed RAB: versions per campus, four level lines, checks against Batas Tahap 1, approval that turns the RAB 70% total into the nominal of Tahap 1.
 * Every function takes a superuser client; the caller has already checked the role. All rules live here.
 */
const opts = { requestKey: null } as const;
const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(15)), b => ID_CHARS[b % ID_CHARS.length]).join('');
const MAX_SEN = 1e15;
const MAX_LINES = 3000;

/** Codes used in the extraction workbook that differ from the campus code in the system. */
export const CODE_ALIASES: Record<string, string> = { SIAK: 'STAI SIAK' };
const normCode = (code: unknown) => String(code || '').trim().toUpperCase().replace(/\s+/g, ' ');
const sameCode = (a: unknown, b: unknown) => { const x = normCode(a), y = normCode(b); return x === y || (CODE_ALIASES[x] || x) === (CODE_ALIASES[y] || y); };

function mapVersion(v: RecordModel, active: string, nameOf: Map<string, string>): RabVersionInfo {
  return {
    id: v.id, number: Number(v.number), status: v.status as RabStatus, totalSen: Number(v.totalSen || 0), term1Sen: Number(v.term1Sen || 0), term2Sen: Number(v.term2Sen || 0), source: (v.source || 'manual') as RabSource, share: (v.share || '') as RabVersionShare | '',
    sourceFile: v.sourceFile || '', note: v.note || '', approvedByName: nameOf.get(v.approvedBy) || '', approvedAt: v.approvedAt || '', created: v.created, updated: v.updated, active: v.id === active
  };
}
const mapLine = (r: RecordModel): RabLine => ({
  id: r.id, parentId: r.parent || '', level: Number(r.level), order: Number(r.order || 0), code: r.code || '', title: r.title || '', calculation: r.calculation || '', volume: Number(r.volume || 0), unit: r.unit || '',
  unitPriceSen: Number(r.unitPriceSen || 0), amountSen: Number(r.amountSen || 0), term1Sen: Number(r.term1Sen || 0), term2Sen: Number(r.term2Sen || 0), flags: (r.flags && typeof r.flags === 'object' ? r.flags : {}) as Record<string, unknown>
});

export async function listVersions(pb: PocketBase, campusId: string, activeId = '') {
  const rows = await pb.collection('rab_versions').getFullList({ filter: pb.filter('campus = {:c}', { c: campusId }), sort: 'number', ...opts });
  const ids = Array.from(new Set(rows.map(r => r.approvedBy).filter(Boolean)));
  const nameOf = new Map<string, string>();
  if (ids.length) {
    const users = await pb.collection('users').getFullList({ filter: ids.map(id => pb.filter('id = {:id}', { id })).join(' || '), fields: 'id,name,email', ...opts });
    for (const u of users) nameOf.set(u.id, u.name || u.email);
  }
  return rows.map(r => mapVersion(r, activeId, nameOf));
}

/** The stored lines of one version in display order (depth first, siblings by order). */
export async function versionLines(pb: PocketBase, versionId: string): Promise<RabLine[]> {
  const rows = (await pb.collection('rab_lines').getFullList({ filter: pb.filter('version = {:v}', { v: versionId }), sort: 'level,order', ...opts })).map(mapLine);
  const children = new Map<string, RabLine[]>();
  for (const line of rows) { const p = line.parentId; if (!children.has(p)) children.set(p, []); children.get(p)!.push(line); }
  const out: RabLine[] = [];
  const visit = (parent: string) => { for (const line of (children.get(parent) || []).sort((a, b) => a.order - b.order)) { out.push(line); visit(line.id); } };
  visit('');
  for (const line of rows) if (!out.includes(line)) out.push(line);
  return out;
}
const toInput = (lines: RabLine[]): LineInput[] => lines.map(l => ({ key: l.id, parentKey: l.parentId, title: l.title, calculation: l.calculation, volume: l.volume, unit: l.unit, unitPriceSen: l.unitPriceSen, amountSen: l.amountSen, term1Sen: l.term1Sen, term2Sen: l.term2Sen, flags: l.flags }));

/** Checks of stored lines against Batas Tahap 1 and the SK. Parent sums are recomputed and compared with what is stored. */
export function checksFor(lines: RabLine[], amountSen: number): RabCheck[] {
  const nodes = arrange(toInput(lines));
  const stored = new Map(lines.filter(l => l.level < MAX_LEVEL).map(l => [l.id, l.amountSen]));
  return rabChecks(nodes, amountSen, limitSen(amountSen), stored);
}

export async function overview(pb: PocketBase, campusId: string, versionId = ''): Promise<RabOverview> {
  const { campus, award } = await campusWithAward(pb, campusId);
  const { disbursement } = await ensureDisbursement(pb, campusId);
  const versions = await listVersions(pb, campusId, disbursement.rabVersion || '');
  const chosen = versions.find(v => v.id === versionId) || versions[versions.length - 1] || null;
  const lines = chosen ? await versionLines(pb, chosen.id) : [];
  const amountSen = Number(award.amountSen);
  return {
    campus: { id: campus.id, name: campus.name, code: campus.code, programYear: award.programYear || campus.programYear },
    summary: { skNumber: award.skNumber, amountSen, limitSen: limitSen(amountSen) },
    disbursement: { id: disbursement.id, stage: Number(disbursement.stage || 1), requestedSen: Number(disbursement.requestedSen || 0), rabVersionId: disbursement.rabVersion || '', clauseChecked: Boolean(disbursement.clauseChecked), revision: Number(disbursement.revision || 1) },
    versions, version: chosen ? { ...chosen, lines } : null,
    checks: chosen ? checksFor(lines, amountSen) : []
  };
}

/** Validates what the browser or an import sends; money must be whole sen, volume finite. */
export function validateLines(input: unknown): LineInput[] {
  if (!Array.isArray(input)) throw new PreviewError(400, 'Daftar baris tidak valid.');
  if (input.length > MAX_LINES) throw new PreviewError(400, `Paling banyak ${MAX_LINES} baris dalam satu versi.`);
  const text = (value: unknown, max: number, label: string) => { if (value === null || value === undefined) return ''; if (typeof value !== 'string') throw new PreviewError(400, `${label} harus berupa teks.`); if (value.length > max) throw new PreviewError(400, `${label} paling panjang ${max} huruf.`); return value.trim(); };
  const sen = (value: unknown, label: string) => { if (value === null || value === undefined || value === '') return 0; if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_SEN) throw new PreviewError(400, `${label} harus berupa jumlah rupiah.`); return value; };
  return input.map((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new PreviewError(400, `Baris ${i + 1} tidak valid.`);
    const r = raw as Record<string, unknown>;
    const key = text(r.key, 64, 'Kunci baris'), parentKey = text(r.parentKey, 64, 'Induk baris');
    if (!key) throw new PreviewError(400, `Baris ${i + 1} tanpa kunci.`);
    const volume = r.volume === null || r.volume === undefined || r.volume === '' ? 0 : Number(r.volume);
    if (!Number.isFinite(volume) || volume < 0 || volume > 1e9) throw new PreviewError(400, `Volume baris ${i + 1} harus berupa angka.`);
    const flags: Record<string, unknown> = {};
    if (r.flags && typeof r.flags === 'object') { const note = (r.flags as Record<string, unknown>).catatan; if (typeof note === 'string' && note.trim()) flags.catatan = note.trim().slice(0, 500); }
    return { key, parentKey, title: text(r.title, 500, 'Uraian'), calculation: text(r.calculation, 200, 'Perhitungan'), volume, unit: text(r.unit, 60, 'Satuan'), unitPriceSen: sen(r.unitPriceSen, 'Harga satuan'), amountSen: sen(r.amountSen, 'Jumlah'), term1Sen: sen(r.term1Sen, 'RAB 70%'), term2Sen: sen(r.term2Sen, 'RAB 30%'), flags };
  });
}

function audit(tx: RestStore, input: AuditInput) {
  const row = new StoreRecord('audit'); Object.assign(row.data, auditData(input)); tx.save(row);
}
function versionRecord(tx: RestStore, campusId: string, id: string) {
  const row = tx.findRecordById('rab_versions', id);
  if (row.data.campus !== campusId) throw new PreviewError(404, 'Versi RAB tidak ditemukan.');
  return row;
}
function storedLines(tx: RestStore, id: string) {
  return tx.findRecordsByFilter('rab_lines', 'version = {:v}', 'level,order', 0, 0, {v:id}).map(r => mapLine(r.data as RecordModel));
}
function awardAmount(tx: RestStore, campusId: string) {
  tx.findRecordById('campuses', campusId);
  const award = tx.records.get('sk_awards')!.find(r => Number(r.data.wave) === 1);
  if (!award) throw new PreviewError(404, 'Kampus ini tidak termasuk penerima gelombang pertama.');
  return Number(award.data.amountSen);
}
async function mutateRab<T>(pb: PocketBase, campusId: string, expectedRevision: number | undefined, action: (tx: RestStore, payment: StoreRecord) => T) {
  const { disbursement } = await ensureDisbursement(pb, campusId);
  const revision = expectedRevision ?? Number(disbursement.revision || 1);
  return atomic(pb, tx => {
    const payment = assertPayoutEditable(tx); assertRevision(payment.data.revision, revision);
    const result = action(tx, payment);
    payment.set('revision', revision + 1); tx.save(payment);
    return result;
  }, payoutReads(pb, campusId));
}
function setAmount(payment: StoreRecord, amount: number) {
  if (Number(payment.data.requestedSen || 0) !== amount) Object.assign(payment.data, { clauseChecked: false, clauseCheckedBy: '', clauseCheckedAt: '' });
  payment.set('requestedSen', amount);
}

/** Replaces all lines of a version with the arranged input. Returns the totals. Internal: the callers write the audit row. */
function writeLines(tx: RestStore, versionId: string, input: LineInput[]) {
  let nodes: Arranged[];
  try { nodes = arrange(input); } catch (e) { throw new PreviewError(400, e instanceof Error ? e.message : 'Struktur baris tidak valid.'); }
  const ids = new Map(nodes.map(n => [n.key, newId()]));
  for (const row of tx.findRecordsByFilter('rab_lines', 'version = {:v}', 'id', 0, 0, {v:versionId})) tx.delete(row);
  for (const n of nodes) {
    const row = new StoreRecord('rab_lines'); Object.assign(row.data, {
      id: ids.get(n.key), version: versionId, parent: n.parentKey ? ids.get(n.parentKey) : '', level: n.level, order: n.order, code: n.code, title: n.title, calculation: n.calculation,
      volume: n.level === MAX_LEVEL ? n.volume : 0, unit: n.level === MAX_LEVEL ? n.unit : '', unitPriceSen: n.level === MAX_LEVEL ? n.unitPriceSen : 0,
      amountSen: n.sumSen, term1Sen: n.sumTerm1Sen, term2Sen: n.sumTerm2Sen, flags: n.flags && Object.keys(n.flags).length ? n.flags : null
    }); row.id = String(row.data.id); tx.save(row);
  }
  const totals = totalsOf(nodes);
  const version = tx.findRecordById('rab_versions', versionId); Object.assign(version.data, totals); tx.save(version);
  return { ...totals, count: nodes.length, items: nodes.filter(n => n.level === MAX_LEVEL).length };
}

/** All legacy changes, their audit and the payout revision commit in one fenced batch. */
export async function saveLines(pb: PocketBase, actor: AuditActor, campusId: string, versionId: string, input: LineInput[], expectedRevision?: number) {
  return mutateRab(pb, campusId, expectedRevision, tx => {
    const version = versionRecord(tx, campusId, versionId).data;
    if (version.status !== 'draf') throw new PreviewError(400, 'Versi ini sudah diajukan dan tidak bisa diubah. Buat versi baru untuk mengubahnya.');
    const before = {total:formatSen(Number(version.totalSen || 0)), termin1:formatSen(Number(version.term1Sen || 0))};
    const result = writeLines(tx, versionId, input);
    audit(tx, {actor, action:`menyimpan baris RAB versi ${version.number}`, context:context(campusId), collection:'rab_versions', record:versionId, campus:campusId, before, after:{total:formatSen(result.totalSen), termin1:formatSen(result.term1Sen), baris:result.items}});
    return result;
  });
}
export interface NewVersionOptions { fromVersionId?: string; lines?: LineInput[]; source?: RabSource; sourceFile?: string; note?: string; share?: RabVersionShare; expectedRevision?: number }
export async function createVersion(pb: PocketBase, actor: AuditActor, campusId: string, options: NewVersionOptions = {}) {
  return mutateRab(pb, campusId, options.expectedRevision, (tx, payment) => {
    awardAmount(tx, campusId);
    const last = tx.findRecordsByFilter('rab_versions', '', '-number', 1)[0];
    const number = Number(last?.data.number || 0) + 1;
    const from = options.fromVersionId ? versionRecord(tx, campusId, options.fromVersionId) : null;
    const lines = from ? toInput(storedLines(tx, from.id)) : options.lines || [];
    const version = new StoreRecord('rab_versions');
    Object.assign(version.data, {campus:campusId, disbursement:payment.id, number, status:'draf', totalSen:0, term1Sen:0, term2Sen:0, source:options.source || 'manual', share:options.share || from?.data.share || '', sourceFile:(options.sourceFile || '').slice(0,300), note:(options.note || (from ? `Salinan dari versi ${from.data.number}.` : '')).slice(0,2000)}); tx.save(version);
    const totals = lines.length ? writeLines(tx, version.id, lines) : {totalSen:0, term1Sen:0, term2Sen:0, count:0, items:0};
    audit(tx, {actor, action:`membuat RAB versi ${number}`, context:context(campusId), collection:'rab_versions', record:version.id, campus:campusId, after:{sumber:options.source || 'manual', dariVersi:from?.data.number ?? null, baris:totals.items, total:formatSen(totals.totalSen), termin1:formatSen(totals.term1Sen)}});
    return {id:version.id, number, ...totals};
  });
}
function submit(tx: RestStore, actor: AuditActor, campusId: string, row: StoreRecord) {
  if (row.data.status !== 'draf') throw new PreviewError(400, 'Hanya draf yang bisa diajukan.');
  if (!storedLines(tx,row.id).some(l => l.level === MAX_LEVEL)) throw new PreviewError(400, 'RAB masih kosong. Isi barisnya dulu sebelum diajukan.');
  row.set('status','menunggu'); tx.save(row);
  audit(tx,{actor, action:`mengajukan RAB versi ${row.data.number}`, context:context(campusId), collection:'rab_versions', record:row.id, campus:campusId, before:{status:'draf'}, after:{status:'menunggu'}});
}
export async function submitVersion(pb: PocketBase, actor: AuditActor, campusId: string, versionId: string, expectedRevision?: number) {
  return mutateRab(pb,campusId,expectedRevision,tx => submit(tx,actor,campusId,versionRecord(tx,campusId,versionId)));
}
function approve(tx: RestStore, actor: AuditActor & {id:string}, campusId: string, row: StoreRecord, payment: StoreRecord) {
  if (row.data.status !== 'menunggu') throw new PreviewError(400, 'Ajukan versi ini dulu sebelum disetujui.');
  const {totalSen,term1Sen,term2Sen} = totalsOf(arrange(toInput(storedLines(tx,row.id))));
  const limit = limitSen(awardAmount(tx,campusId));
  if (!term1Sen) throw new PreviewError(400, 'RAB 70% belum diisi. Isi lembar RAB 70% dulu.');
  if (term1Sen > limit) throw new PreviewError(400, `RAB 70% ${formatSen(term1Sen)} melebihi Batas Tahap 1 ${formatSen(limit)}. Kurangi ${formatSen(term1Sen-limit)}.`);
  Object.assign(row.data,{status:'disetujui',totalSen,term1Sen,term2Sen,approvedBy:actor.id,approvedAt:new Date().toISOString()}); tx.save(row);
  setAmount(payment,term1Sen); payment.set('stage',Math.max(4,Number(payment.data.stage || 1))); payment.set('rabVersion',row.id);
  const after: Record<string,unknown> = {status:'disetujui',nominalTahap1:formatSen(term1Sen),batasTahap1:formatSen(limit),rab100:formatSen(totalSen),rab30:formatSen(term2Sen)};
  if (term1Sen < limit) after.sisaTahap2 = formatSen(limit-term1Sen);
  audit(tx,{actor, action:`menyetujui RAB 70% versi ${row.data.number}`, context:context(campusId),collection:'rab_versions',record:row.id,campus:campusId,before:{status:'menunggu'},after});
}
export async function approveVersion(pb: PocketBase, actor: AuditActor & {id:string}, campusId: string, versionId: string, expectedRevision?: number) {
  return mutateRab(pb,campusId,expectedRevision,(tx,payment) => approve(tx,actor,campusId,versionRecord(tx,campusId,versionId),payment));
}
function revoke(tx: RestStore, actor: AuditActor, campusId: string, row: StoreRecord, payment: StoreRecord) {
  const was = row.data.status;
  if (was === 'draf') throw new PreviewError(400, 'Versi ini masih draf.');
  Object.assign(row.data,{status:'draf',approvedBy:'',approvedAt:''}); tx.save(row);
  if (was === 'disetujui' && payment.data.rabVersion === row.id) {
    payment.set('rabVersion','');
    if (Number(payment.data.requestedSen || 0) === Number(row.data.term1Sen || 0)) setAmount(payment,0);
    if (Number(payment.data.stage || 1) === 4) payment.set('stage',3);
  }
  audit(tx,{actor,action:was === 'disetujui' ? `mencabut persetujuan RAB versi ${row.data.number}` : `mengembalikan RAB versi ${row.data.number} ke draf`,context:context(campusId),collection:'rab_versions',record:row.id,campus:campusId,before:{status:was},after:{status:'draf'}});
}
export async function revokeVersion(pb: PocketBase, actor: AuditActor & {id:string}, campusId: string, versionId: string, expectedRevision?: number) {
  return mutateRab(pb,campusId,expectedRevision,(tx,payment) => revoke(tx,actor,campusId,versionRecord(tx,campusId,versionId),payment));
}
/** The managed version, typed amount and document decision are one operation. */
export async function decideVersion(pb: PocketBase, actor: AuditActor & {id:string}, campusId: string, decision: 'sesuai' | 'perlu_revisi' | 'batal', note: string, expectedRevision?: number) {
  return mutateRab(pb,campusId,expectedRevision,(tx,payment) => {
    const limit = limitSen(awardAmount(tx,campusId));
    const version = tx.findRecordsByFilter('rab_versions','','-number',1)[0];
    const doc = tx.records.get('documents')!.find(r => r.data.disbursement === payment.id && r.data.kind === 'rab');
    if (!doc) throw new PreviewError(404,'Dokumen RAB tidak ditemukan.');
    if (decision === 'perlu_revisi' && !note.trim()) throw new PreviewError(400,'Tulis catatan revisi.');
    if (decision !== 'sesuai') {
      if (version?.data.status === 'disetujui') revoke(tx,actor,campusId,version,payment);
      else if (decision === 'batal') setAmount(payment,0);
    } else {
      const file = tx.records.get('document_versions')!.find(r => r.id === doc.data.currentVersion);
      const typed = typeof file?.data.fields?.termin1Sen === 'number' ? file.data.fields.termin1Sen as number : null;
      const managed = version ? totalsOf(arrange(toInput(storedLines(tx,version.id)))).term1Sen : 0;
      if (managed) {
        if (typed !== null && typed !== managed) throw new PreviewError(400,`Total di berkas ${formatSen(typed)} berbeda dari RAB terkelola ${formatSen(managed)}. Samakan dulu.`);
        if (managed > limit) throw new PreviewError(400,`RAB Tahap 1 melebihi batas ${formatSen(limit)}. Sesuaikan barisnya dulu.`);
        if (version.data.status === 'draf') submit(tx,actor,campusId,version);
        if (version.data.status !== 'disetujui') approve(tx,actor,campusId,version,payment);
      } else {
        if (typed === null) throw new PreviewError(400,'Ketik total RAB Tahap 1 dari berkas, atau impor Excel dengan kolom RAB Tahap 1.');
        if (!typed) throw new PreviewError(400,'Total RAB Tahap 1 masih nol.');
        if (typed < 0 || !Number.isSafeInteger(typed) || typed > limit) throw new PreviewError(400,`Total di berkas tidak valid atau melebihi batas ${formatSen(limit)}.`);
        setAmount(payment,typed); payment.set('stage',4);
      }
    }
    const status = decision === 'batal' ? 'perlu_konfirmasi' : decision;
    const review = new StoreRecord('reviews'); Object.assign(review.data,{version:doc.data.currentVersion || '',document:doc.id,decision:status,note:decision === 'batal' ? '' : note,actor:actor.id,actorName:actor.name || 'Sistem',imported:false}); tx.save(review);
    audit(tx,{actor,action:`menandai RAB ${status === 'sesuai' ? 'Sesuai' : status === 'perlu_revisi' ? 'Perlu revisi' : 'Perlu konfirmasi'}`,context:context(campusId),collection:'documents',record:doc.id,campus:campusId,before:{status:doc.data.status},after:{status},note:review.data.note});
    doc.set('status',status); doc.set('revision',Number(doc.data.revision || 1)+1); tx.save(doc);
    payment.set('stage',Math.max(3,Number(payment.data.stage || 1)));
  });
}

/* Excel import and export */

export interface ImportProblem { row: number; text: string }
export interface ImportResult { lines: LineInput[]; rows: number; kind: 'total' | 'termin_1' | 'tiga_lembar'; share?: RabVersionShare; totalSen: number; term1Sen: number; term2Sen?: number; problems: ImportProblem[] }

/** Builds the tree from rows of the old extraction workbook (kelompok, kegiatan, sub_kegiatan, uraian, ...). Used by scripts/pencairan/load-rab.ts only. */
export function buildImportLegacy(rows: Record<string, unknown>[], campusCode: string): ImportResult {
  const problems: ImportProblem[] = [];
  const withCode = rows.filter(r => normCode(r.kode_kampus));
  let mine = rows.filter(r => !normCode(r.kode_kampus) || sameCode(r.kode_kampus, campusCode));
  if (!mine.length && withCode.length) throw new PreviewError(400, `Berkas ini berisi kode kampus lain. Isi kolom kode_kampus dengan ${campusCode}.`);
  mine = mine.filter(r => String(r.uraian ?? '').trim() || r.jumlah !== null && r.jumlah !== undefined && r.jumlah !== '');
  if (!mine.length) throw new PreviewError(400, 'Tidak ada baris RAB di berkas ini. Isi lembar RAB sesuai templat.');
  const kinds = new Set(mine.map(r => String(r.jenis_rab || 'total').trim().toLowerCase()));
  // The managed RAB is the Tahap 1 RAB: when a file carries both the full RAB and a Termin 1 set, the Termin 1 set is taken.
  const kind: 'total' | 'termin_1' = kinds.has('termin_1') ? 'termin_1' : 'total';
  const chosen = mine.filter(r => String(r.jenis_rab || 'total').trim().toLowerCase() === kind);
  const order = (r: Record<string, unknown>, i: number) => { const n = Number(r.no_urut); return Number.isFinite(n) && n > 0 ? n : 1e9 + i; };
  const sorted = chosen.map((r, i) => ({ r, i, n: order(r, i) })).sort((a, b) => a.n - b.n || a.i - b.i);
  const money = (value: unknown, label: string, row: number): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const sen = parseSen(typeof value === 'number' ? value : String(value));
    if (sen === null || sen < 0 || sen > MAX_SEN) { problems.push({ row, text: `${label} bukan angka rupiah.` }); return null; }
    return sen;
  };
  const groups = new Map<string, { title: string; kegiatan: Map<string, { title: string; sub: Map<string, { title: string; items: LineInput[] }> }> }>();
  const lines: LineInput[] = [];
  let seq = 0;
  for (const { r, n } of sorted) {
    const rowNo = n < 1e9 ? n : 0;
    const raw1 = String(r.kelompok ?? '').trim(), raw2 = String(r.kegiatan ?? '').trim(), raw3 = String(r.sub_kegiatan ?? '').trim();
    if (!raw1) problems.push({ row: rowNo, text: 'Kelompok kosong.' });
    if (!raw2) problems.push({ row: rowNo, text: 'Kegiatan kosong.' });
    const title = String(r.uraian ?? '').trim().slice(0, 500);
    if (!title) problems.push({ row: rowNo, text: 'Uraian kosong.' });
    const volume = parseVolume(r.volume as string | number | null);
    if (volume === null) problems.push({ row: rowNo, text: 'Volume bukan angka.' });
    const unitPriceSen = money(r.harga_satuan, 'Harga satuan', rowNo);
    const amountSen = money(r.jumlah, 'Jumlah', rowNo);
    const allocated = money(r.alokasi_termin_1, 'RAB 70%', rowNo);
    const term1Sen = kind === 'termin_1' ? (allocated ?? amountSen ?? 0) : (allocated ?? 0);
    const note = String(r.catatan_ekstraksi ?? '').trim();
    if (!groups.has(raw1)) groups.set(raw1, { title: stripEnumerator(raw1).slice(0, 500), kegiatan: new Map() });
    const g1 = groups.get(raw1)!;
    if (!g1.kegiatan.has(raw2)) g1.kegiatan.set(raw2, { title: stripEnumerator(raw2).slice(0, 500), sub: new Map() });
    const g2 = g1.kegiatan.get(raw2)!;
    if (!g2.sub.has(raw3)) g2.sub.set(raw3, { title: stripEnumerator(raw3).slice(0, 500), items: [] });
    g2.sub.get(raw3)!.items.push({ key: `i${++seq}`, parentKey: '', title, calculation: String(r.perhitungan ?? '').trim().slice(0, 200), volume: volume ?? 0, unit: String(r.satuan ?? '').trim().slice(0, 60), unitPriceSen: unitPriceSen ?? 0, amountSen: amountSen ?? 0, term1Sen, flags: note ? { catatan: note.slice(0, 500) } : {} });
  }
  let k1 = 0;
  for (const g1 of groups.values()) {
    const key1 = `k${++k1}`;
    lines.push({ key: key1, parentKey: '', title: g1.title, calculation: '', volume: 0, unit: '', unitPriceSen: 0, amountSen: 0, term1Sen: 0 });
    let k2 = 0;
    for (const g2 of g1.kegiatan.values()) {
      const key2 = `${key1}.${++k2}`;
      lines.push({ key: key2, parentKey: key1, title: g2.title, calculation: '', volume: 0, unit: '', unitPriceSen: 0, amountSen: 0, term1Sen: 0 });
      let k3 = 0;
      for (const g3 of g2.sub.values()) {
        const key3 = `${key2}.${++k3}`;
        lines.push({ key: key3, parentKey: key2, title: g3.title, calculation: '', volume: 0, unit: '', unitPriceSen: 0, amountSen: 0, term1Sen: 0 });
        for (const item of g3.items) lines.push({ ...item, parentKey: key3 });
      }
    }
  }
  const totals = totalsOf(arrange(lines));
  return { lines, rows: chosen.length, kind, ...totals, problems };
}

/**
 * The simple template: five columns anyone reads at a glance. No, Uraian, Satuan, Volume, Jumlah.
 * The numbering in No gives the tree (A, A.1, A.1.a, A.1.a.1); a row with a Jumlah is an item, a row without one is a heading.
 * Everything else (unit price, codes, totals) is computed. The file name carries the human metadata (campus, version).
 */
export const SIMPLE_COLUMNS = ['No', 'Uraian', 'Satuan', 'Volume', 'Jumlah'] as const;
const normHeader = (h: unknown) => String(h ?? '').toLowerCase().replace(/[^a-z]/g, '');
const HEADER_ALIASES: Record<string, string[]> = {
  no: ['no', 'kode', 'nomor', 'nourut', 'nomorurut'], uraian: ['uraian', 'nama', 'keterangan', 'item', 'namabarang', 'deskripsi', 'rincian'],
  satuan: ['satuan', 'unit'], volume: ['volume', 'vol', 'pcs', 'banyak', 'qty', 'kuantitas', 'jumlahunit', 'banyaknya'], jumlah: ['jumlah', 'total', 'nilai', 'totalrp', 'jumlahrp', 'harga', 'hargatotal']
};
function simpleColumns(headers: string[]): Record<string, string> | null {
  const map: Record<string, string> = {};
  for (const [field, names] of Object.entries(HEADER_ALIASES)) {
    const found = headers.find(h => names.includes(normHeader(h)));
    if (found) map[field] = found;
  }
  return map.uraian && map.jumlah ? map : null;
}
const cleanCode = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, '').replace(/\.+$/, '');

/** Builds the tree from rows of the simple template. Items land on the fourth level; missing headings are padded with empty ones. */
export function buildSimpleImport(rows: Record<string, unknown>[], columns: Record<string, string>, shares?: { term1: string; term2: string }): ImportResult {
  const problems: ImportProblem[] = [];
  const lines: LineInput[] = [];
  const groups = new Map<string, { key: string; level: number }>();
  let seq = 0;
  const money = (value: unknown, row: number): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const sen = parseSen(typeof value === 'number' ? value : String(value));
    if (sen === null || sen < 0 || sen > MAX_SEN) { problems.push({ row, text: 'Jumlah bukan angka rupiah.' }); return null; }
    return sen;
  };
  const heading = (key: string, parentKey: string, title: string) => lines.push({ key, parentKey, title: title.slice(0, 500), calculation: '', volume: 0, unit: '', unitPriceSen: 0, amountSen: 0, term1Sen: 0, term2Sen: 0 });
  /** The heading for a code, created (empty) when the file has no row for it. Never deeper than the third level. */
  const group = (code: string): { key: string; level: number } => {
    const found = groups.get(code);
    if (found) return found;
    const parts = code.split('.');
    const parent = parts.length > 1 ? group(parts.slice(0, -1).join('.')) : null;
    if (parent && parent.level >= MAX_LEVEL - 1) return parent;
    const made = { key: `g${++seq}`, level: parent ? parent.level + 1 : 1 };
    heading(made.key, parent?.key || '', '');
    groups.set(code, made);
    return made;
  };
  /** A heading of exactly the third level under the given one, padding empty levels when needed. */
  const deepen = (from: { key: string; level: number } | null, code: string) => {
    let node = from;
    let padCode = code;
    while (!node || node.level < MAX_LEVEL - 1) {
      padCode += '#';
      const made = { key: `g${++seq}`, level: node ? node.level + 1 : 1 };
      heading(made.key, node?.key || '', '');
      groups.set(padCode, made);
      node = made;
    }
    return node;
  };
  let lastHeading: { code: string; node: { key: string; level: number } } | null = null;
  let items = 0;
  rows.forEach((r, i) => {
    const rowNo = i + 2;
    const code = cleanCode(r[columns.no ?? '']);
    const title = String(r[columns.uraian] ?? '').trim();
    const amount = money(r[columns.jumlah], rowNo);
    const volumeRaw = columns.volume ? r[columns.volume] : null;
    const volume = volumeRaw === null || volumeRaw === undefined || volumeRaw === '' ? null : parseVolume(volumeRaw as string | number);
    const unit = String(columns.satuan ? r[columns.satuan] ?? '' : '').trim().slice(0, 60);
    const t1 = shares ? money(r[shares.term1], rowNo) : null;
    const t2 = shares ? money(r[shares.term2], rowNo) : null;
    if (!code && !title && amount === null && t1 === null && t2 === null) return;
    // A total line someone added by hand is not an item; the app sums the items itself.
    if (!code && /^(sub ?total|total|jumlah|grand total)\b/i.test(title)) return;
    if (!title) problems.push({ row: rowNo, text: 'Uraian kosong.' });
    const isItem = amount !== null || volume !== null || Boolean(unit) || t1 !== null || t2 !== null;
    if (!isItem) {
      const parts = code ? code.split('.') : [];
      const parent = parts.length > 1 ? group(parts.slice(0, -1).join('.')) : null;
      if (parent && parent.level >= MAX_LEVEL - 1) { problems.push({ row: rowNo, text: 'Judul terlalu dalam, dijadikan baris barang tanpa jumlah.' }); }
      else {
        const node = { key: `g${++seq}`, level: parent ? parent.level + 1 : 1 };
        heading(node.key, parent?.key || '', title);
        const own = code || `${lastHeading?.code || ''}~${seq}`;
        groups.set(own, node);
        lastHeading = { code: own, node };
        return;
      }
    }
    // An item: its parent is the heading its number points to, or the last heading read; padded down to the third level.
    const parts = code ? code.split('.') : [];
    const parentCode = parts.length > 1 ? parts.slice(0, -1).join('.') : (lastHeading?.code || '');
    const base = parentCode ? (groups.get(parentCode) || group(parentCode)) : null;
    const parent = deepen(base, parentCode || 'root');
    if (volume === null && volumeRaw !== null && volumeRaw !== undefined && volumeRaw !== '') problems.push({ row: rowNo, text: 'Volume bukan angka.' });
    const vol = volume ?? 1;
    // Three sheets: Jumlah is the RAB 100% of the line, the parts come from the RAB 70% and RAB 30% sheets. One sheet: the whole line is Tahap 1.
    const amountSen = amount ?? (shares ? (t1 ?? 0) + (t2 ?? 0) : 0);
    lines.push({ key: `i${++seq}`, parentKey: parent.key, title: title.slice(0, 500), calculation: '', volume: vol, unit, unitPriceSen: vol > 0 ? Math.round(amountSen / vol) : amountSen, amountSen, term1Sen: shares ? (t1 ?? 0) : amountSen, term2Sen: shares ? (t2 ?? 0) : 0, flags: code ? { no: code } : undefined });
    items++;
  });
  if (!items) throw new PreviewError(400, 'Tidak ada baris barang di berkas ini. Isi Uraian dan Jumlah pada tiap baris barang.');
  const totals = totalsOf(arrange(lines));
  return { lines, rows: items, kind: shares ? 'tiga_lembar' : 'termin_1', ...totals, problems };
}

const sheetRows = (sheet: XLSX.WorkSheet) => {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  const headers = rows.length ? Object.keys(rows[0]) : ((XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })[0] as unknown[]) || []).map(String);
  return { rows, headers };
};
const normTitle = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const isBlank = (value: unknown) => value === null || value === undefined || value === '';

/**
 * Reads an uploaded workbook. Sheets in the official Pertamina Foundation layout (No, URAIAN, PERHITUNGAN, VOLUME, HARGA SATUAN,
 * JUMLAH) are read by rab-grid.ts; the three sheets (RAB 100%, RAB 70%, RAB 30%) are laid over each other line by line on the
 * heading and item names. The older five column template (No, Uraian, Satuan, Volume, Jumlah) is still read, merged on its No
 * column. A single sheet counts as RAB 70% when its sheet or file name says so, as RAB 30% likewise, otherwise as RAB 100%.
 */
export function parseWorkbook(bytes: ArrayBuffer | Uint8Array, campusCode: string, fileName = ''): ImportResult {
  let book: XLSX.WorkBook;
  try { book = XLSX.read(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), { type: 'array', cellDates: false }); }
  catch { throw new PreviewError(400, 'Berkas tidak terbaca. Unggah berkas Excel (.xlsx) dari templat.'); }
  const names = book.SheetNames.filter(n => !/petunjuk|laporan/i.test(n));
  const find = (test: RegExp) => names.find(n => test.test(n.toLowerCase().replace(/\s+/g, ' ')));
  const nameT1 = find(/rab 70|70 ?%|tahap 1|termin 1|termin i\b/), nameT2 = find(/rab 30|30 ?%|tahap 2|termin 2|termin ii\b/);
  const nameFull = find(/rab 100|100 ?%|penuh|rab total/) || ((nameT1 || nameT2) ? names.find(n => n !== nameT1 && n !== nameT2 && gridHeader(XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[n], { header: 1, raw: true, defval: null })) !== null) : undefined);
  const arrays = (name: string) => XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, raw: true, defval: null });
  const shareOfSingle = (name: string): RabVersionShare => (/70|tahap ?1|termin ?1|termin i\b/i.test(name + ' ' + fileName) ? 'tahap1' : /30|tahap ?2|termin ?2|termin ii\b/i.test(name + ' ' + fileName) ? 'tahap2' : 'penuh');
  const finish = (grid: GridResult, kind: ImportResult['kind'], share: RabVersionShare): ImportResult => {
    if (!grid.items) throw new PreviewError(400, 'Tidak ada baris barang di berkas ini. Isi uraian, volume, harga satuan, dan jumlah pada tiap baris barang.');
    const totals = totalsOf(arrange(grid.lines));
    return { lines: grid.lines, rows: grid.items, kind, share, ...totals, problems: grid.problems.map(p => ({ row: p.row, text: p.text })) };
  };
  // Official layout on any of the sheets.
  const gridNames = [nameFull, nameT1, nameT2].filter((n): n is string => Boolean(n) && isGridSheet(arrays(n!)));
  if (gridNames.length) {
    const parsed = (name?: string) => (name && isGridSheet(arrays(name)) ? parseGridSheet(arrays(name)) : null);
    const full = parsed(nameFull), t1 = parsed(nameT1), t2 = parsed(nameT2);
    if (full) {
      const merged = mergeGridSheets(full, t1, t2);
      return finish(merged, 'tiga_lembar', t1 || t2 ? 'gabungan' : 'penuh');
    }
    const only = t1 || t2!;
    const share: RabVersionShare = t1 ? 'tahap1' : 'tahap2';
    for (const l of only.lines) { if (share === 'tahap1') l.term1Sen = l.amountSen; else l.term2Sen = l.amountSen; }
    if (t1 && t2) { const merged = mergeGridSheets(t1, null, t2); return finish(merged, 'tiga_lembar', 'gabungan'); }
    return finish(only, 'termin_1', share);
  }
  if (!nameFull && !nameT1 && !nameT2) {
    const legacyName = book.Sheets['RAB'] ? 'RAB' : names[0] || book.SheetNames[0];
    if (!legacyName) throw new PreviewError(400, 'Lembar RAB tidak ditemukan. Gunakan templat yang disediakan.');
    const rowsA = arrays(legacyName);
    if (isGridSheet(rowsA)) {
      const grid = parseGridSheet(rowsA);
      const share = shareOfSingle(legacyName);
      for (const l of grid.lines) { if (share === 'tahap1') l.term1Sen = l.amountSen; else if (share === 'tahap2') l.term2Sen = l.amountSen; }
      return finish(grid, share === 'penuh' ? 'total' : 'termin_1', share);
    }
    const { rows, headers } = sheetRows(book.Sheets[legacyName]);
    if (headers.includes('kelompok') && headers.includes('kegiatan')) return buildImportLegacy(rows, campusCode);
    const columns = simpleColumns(headers);
    if (!columns) throw new PreviewError(400, 'Kepala tabel RAB tidak dikenali. Unduh templat resmi dan isi sesuai contohnya.');
    return { ...buildSimpleImport(rows, columns), share: shareOfSingle(legacyName) };
  }
  // The older five column template, merged on its No column.
  const base = sheetRows(book.Sheets[(nameFull || nameT1)!]);
  const columns = simpleColumns(base.headers);
  if (!columns) throw new PreviewError(400, `Kepala tabel tidak dikenali di lembar ${nameFull || nameT1}. Unduh templat resmi dan isi sesuai contohnya.`);
  if (!nameFull && !nameT2) return { ...buildSimpleImport(base.rows, columns), share: 'tahap1' };
  const keyOf = (r: Record<string, unknown>, cols: Record<string, string>) => cleanCode(r[cols.no ?? '']) || normTitle(r[cols.uraian]);
  const lookup = (name: string | undefined, label: string) => {
    if (!name) return null;
    const { rows, headers } = sheetRows(book.Sheets[name]);
    const cols = simpleColumns(headers);
    if (!cols) throw new PreviewError(400, `Kolom Uraian dan Jumlah tidak ditemukan di lembar ${label}.`);
    const map = new Map<string, Record<string, unknown>>();
    for (const r of rows) { const k = keyOf(r, cols); if (k && !map.has(k)) map.set(k, r); }
    return { rows, cols, map };
  };
  const t1 = nameFull ? lookup(nameT1, 'RAB 70%') : null;
  const t2 = lookup(nameT2, 'RAB 30%');
  const T1 = '__rab70', T2 = '__rab30';
  const merged: Record<string, unknown>[] = base.rows.map(r => {
    const k = keyOf(r, columns);
    return { ...r, [T1]: nameFull ? (t1?.map.get(k)?.[t1.cols.jumlah] ?? null) : r[columns.jumlah], [T2]: t2?.map.get(k)?.[t2.cols.jumlah] ?? null };
  });
  const extra: ImportProblem[] = [];
  const seen = new Set(base.rows.map(r => keyOf(r, columns)));
  for (const [label, sheet] of [['RAB 70%', nameFull ? t1 : null], ['RAB 30%', t2]] as const) {
    if (!sheet) continue;
    sheet.rows.forEach((r, i) => {
      const k = keyOf(r, sheet.cols);
      if (!k || seen.has(k) || isBlank(r[sheet.cols.jumlah])) return;
      seen.add(k);
      const row: Record<string, unknown> = { [columns.no ?? 'No']: r[sheet.cols.no ?? ''] ?? null, [columns.uraian]: r[sheet.cols.uraian] ?? '', [columns.jumlah]: null, [T1]: null, [T2]: null };
      if (columns.satuan) row[columns.satuan] = sheet.cols.satuan ? r[sheet.cols.satuan] : null;
      if (columns.volume) row[columns.volume] = sheet.cols.volume ? r[sheet.cols.volume] : null;
      row[label === 'RAB 70%' ? T1 : T2] = r[sheet.cols.jumlah];
      merged.push(row);
      extra.push({ row: i + 2, text: `Baris ${k} ada di lembar ${label} tetapi tidak ada di lembar RAB 100%.` });
    });
  }
  const result = buildSimpleImport(merged, columns, { term1: T1, term2: T2 });
  return { ...result, share: nameFull && !nameT1 && !nameT2 ? 'penuh' : 'gabungan', problems: [...extra, ...result.problems] };
}

const SIMPLE_WIDTHS = [12, 52, 10, 10, 16];
function toBytes(book: XLSX.WorkBook): Uint8Array {
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer);
}
/* The template and every export are built by src/lib/rab-excel.ts (static/templat/RAB_DEB_Tahap_1.xlsx comes from scripts/templat/rab-template.ts). */

export const safeFileName = (text: string) => text.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
