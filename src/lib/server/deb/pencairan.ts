import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { KINDS, KIND_LABEL, FIELDS, GENERATED, LETTERS, limitSen, remainderSen, formatSen, percentOf, formatPercent, splitNames, namesMatch, terbilang, assess, type Assessment, type Kind, type Status } from '../../pencairan';
import { PreviewError } from './preview-error';
import { writeAudit, type AuditActor } from './audit';
import { versionKey, mimeFor, extensionOf, ALLOWED_EXTENSIONS, type Storage } from './r2';
import { scanDocx, type DocScan } from './docscan';

/**
 * Pencairan Termin 1: one disbursement per campus and term, seven document slots, versions in storage, reviews and typed fields.
 * Every function takes a superuser client; the caller has already checked the role.
 */
const opts = { requestKey: null } as const;
export const TERM = 1;
export const context = (campusId: string, term = TERM) => `kampus:${campusId}/pencairan/t${term}`;

export interface CampusInfo { id: string; name: string; code: string; initials: string; programYear: string; fillMode: string; region: string; signatoryName: string; signatoryTitle: string }
const mapCampus = (r: RecordModel): CampusInfo => {
  const program = (r.program && typeof r.program === 'object' ? r.program : {}) as Record<string, unknown>;
  return { id: r.id, name: r.name, code: r.code || r.acronym || r.initials, initials: r.initials, programYear: r.programYear || '', fillMode: r.fillMode || 'admin', region: r.region || '', signatoryName: typeof program.signatoryName === 'string' ? program.signatoryName : '', signatoryTitle: typeof program.signatoryTitle === 'string' ? program.signatoryTitle : '' };
};

export async function fundedCampuses(pb: PocketBase) {
  const [campuses, awards] = await Promise.all([
    pb.collection('campuses').getFullList({ filter: 'fundedWave = 1', sort: 'name', ...opts }),
    pb.collection('sk_awards').getFullList({ filter: 'wave = 1', ...opts })
  ]);
  return campuses.map(c => ({ campus: mapCampus(c), award: awards.find(a => a.campus === c.id) || null })).filter(x => x.award);
}

export async function campusWithAward(pb: PocketBase, campusId: string) {
  const campus = await pb.collection('campuses').getOne(campusId, opts).catch(() => null);
  if (!campus) throw new PreviewError(404, 'Kampus tidak ditemukan.');
  const awards = await pb.collection('sk_awards').getList(1, 1, { filter: pb.filter('campus = {:id} && wave = 1', { id: campusId }), ...opts });
  const award = awards.items[0] || null;
  if (!award) throw new PreviewError(404, 'Kampus ini tidak termasuk penerima gelombang pertama.');
  return { campus: mapCampus(campus), award };
}

/** Creates the disbursement and its seven slots on first use. */
export async function ensureDisbursement(pb: PocketBase, campusId: string, term = TERM) {
  const found = await pb.collection('disbursements').getList(1, 1, { filter: pb.filter('campus = {:id} && term = {:term}', { id: campusId, term }), ...opts });
  let disbursement = found.items[0];
  if (!disbursement) disbursement = await pb.collection('disbursements').create({ campus: campusId, term, stage: 1, requestedSen: 0, paidSen: 0, properties: {}, templateMode: 'standard', revision: 1 }, opts);
  const documents = await pb.collection('documents').getFullList({ filter: pb.filter('disbursement = {:d}', { d: disbursement.id }), ...opts });
  for (const kind of KINDS) {
    // The SK row has no upload: it starts as "periksa" and is confirmed once per campus.
    if (!documents.some(d => d.kind === kind)) documents.push(await pb.collection('documents').create({ disbursement: disbursement.id, kind, status: kind === 'sk' ? 'perlu_konfirmasi' : 'belum_ada', revision: 1 }, opts));
  }
  return { disbursement, documents };
}

export interface DirectoryRow {
  campus: CampusInfo; amountSen: number; limitSen: number; stage: number; requestedSen: number; paidSen: number; paidAt: string; lampiranCount: number;
  statuses: Record<Kind, Status>; assessment: Assessment; checkedAt: string;
}
/**
 * The dashboard: every funded campus with its eight items and the same reading the card gives (assess).
 * Reads current versions, bank checks and attachments once for all campuses; 23 campuses stay one screen.
 */
export async function directory(pb: PocketBase): Promise<DirectoryRow[]> {
  const funded = await fundedCampuses(pb);
  const [disbursements, documents, bankChecks, attachments, rabVersions] = await Promise.all([
    pb.collection('disbursements').getFullList({ filter: `term = ${TERM}`, ...opts }),
    pb.collection('documents').getFullList({ ...opts }),
    pb.collection('bank_checks').getFullList({ fields: 'id,disbursement,bankResult', ...opts }),
    pb.collection('attachments').getFullList({ fields: 'id,disbursement,created', ...opts }),
    pb.collection('rab_versions').getFullList({ filter: 'status = "disetujui"', fields: 'id,campus,number,status,totalSen,term1Sen', ...opts })
  ]);
  const currentIds = documents.map(d => d.currentVersion).filter(Boolean);
  const versions = currentIds.length ? await pb.collection('document_versions').getFullList({ filter: currentIds.map(id => pb.filter('id = {:id}', { id })).join(' || '), fields: 'id,document,number,originalName,mime,origin,signed,scan,fields,created,uploadedByName', ...opts }) : [];
  return funded.map(({ campus, award }) => {
    const disbursement = disbursements.find(d => d.campus === campus.id);
    const own = disbursement ? documents.filter(x => x.disbursement === disbursement.id) : [];
    const statuses = Object.fromEntries(KINDS.map(k => [k, k === 'sk' ? 'perlu_konfirmasi' : 'belum_ada'])) as Record<Kind, Status>;
    for (const d of own) if (KINDS.includes(d.kind)) statuses[d.kind as Kind] = d.status as Status;
    const docs: DocumentInfo[] = KINDS.map(kind => {
      const d = own.find(x => x.kind === kind);
      const v = d ? versions.find(x => x.id === d.currentVersion) : null;
      return { id: d?.id || '', kind, status: statuses[kind], signedReceived: Boolean(d?.signedReceived), signedReceivedAt: '', signedReceivedByName: '', originalReceived: Boolean(d?.originalReceived), originalReceivedAt: '', originalReceivedByName: '', currentVersionId: d?.currentVersion || '', generated: GENERATED.includes(kind), decidedByName: '', decidedAt: '', versions: v ? [lightVersion(v)] : [], notes: [] };
    });
    const amountSen = Number(award!.amountSen);
    const requestedSen = Number(disbursement?.requestedSen || 0);
    const summary = { amountSen, limitSen: limitSen(amountSen), requestedSen, term2Percent: requestedSen ? percentOf(remainderSen(amountSen, requestedSen), amountSen) : 30 };
    const bank = disbursement ? bankChecks.find(b => b.disbursement === disbursement.id) : null;
    const rabVersion = disbursement?.rabVersion ? rabVersions.find(r => r.id === disbursement.rabVersion) : null;
    const rab = rabVersion ? { id: rabVersion.id, number: Number(rabVersion.number), status: rabVersion.status, totalSen: Number(rabVersion.totalSen || 0), term1Sen: Number(rabVersion.term1Sen || 0) } : null;
    const lampiranCount = disbursement ? attachments.filter(a => a.disbursement === disbursement.id).length : 0;
    const { checks: list, suratKuasaRequired } = checks(docs, summary, { campus, bankResult: String(bank?.bankResult || 'belum'), rab });
    const assessment = assess(statuses, { suratKuasaRequired, redChecks: list.filter(c => c.level === 'bad').length, paidAt: String(disbursement?.paidAt || ''), originalsAll: docs.filter(d => d.generated).every(d => d.originalReceived), lampiranCount });
    const checkedAt = own.map(d => String(d.updated || '')).sort().pop() || '';
    return { campus, amountSen, limitSen: limitSen(amountSen), stage: Number(disbursement?.stage || 1), requestedSen, paidSen: Number(disbursement?.paidSen || 0), paidAt: String(disbursement?.paidAt || ''), lampiranCount, statuses, assessment, checkedAt };
  });
}
const lightVersion = (v: RecordModel): VersionInfo => ({
  id: v.id, number: v.number, originalName: v.originalName || '', size: Number(v.size || 0), mime: v.mime || '', origin: v.origin || 'upload', uploadedByName: v.uploadedByName || '', created: v.created, note: '', signed: Boolean(v.signed), scan: (v.scan && typeof v.scan === 'object' ? v.scan : null) as VersionInfo['scan'],
  fields: (v.fields && typeof v.fields === 'object' ? v.fields : {}) as Record<string, unknown>, fieldsByName: '', fieldsAt: '', fieldsCheckedByName: '', fieldsCheckedAt: '', fieldsSamePerson: false, reviews: []
});

export interface VersionInfo {
  id: string; number: number; originalName: string; size: number; mime: string; origin: string; uploadedByName: string; created: string; note: string; signed: boolean; scan: DocScan | null;
  fields: Record<string, unknown>; fieldsByName: string; fieldsAt: string; fieldsCheckedByName: string; fieldsCheckedAt: string; fieldsSamePerson: boolean;
  reviews: { id: string; decision: string; note: string; actorName: string; created: string; imported: boolean }[];
}
export interface NoteInfo { id: string; body: string; internal: boolean; authorName: string; authorRole: string; created: string }
export interface DocumentInfo { id: string; kind: Kind; status: Status; signedReceived: boolean; signedReceivedAt: string; signedReceivedByName: string; originalReceived: boolean; originalReceivedAt: string; originalReceivedByName: string; currentVersionId: string; versions: VersionInfo[]; generated: boolean; decidedByName: string; decidedAt: string; notes: NoteInfo[] }
export interface Check { kind: Kind | 'umum'; level: 'ok' | 'warn' | 'bad' | 'info'; text: string }

async function names(pb: PocketBase, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map<string, string>();
  const users = await pb.collection('users').getFullList({ filter: unique.map(id => pb.filter('id = {:id}', { id })).join(' || '), fields: 'id,name,email', ...opts });
  return new Map(users.map(u => [u.id, u.name || u.email]));
}

export async function workspace(pb: PocketBase, campusId: string) {
  const { campus, award } = await campusWithAward(pb, campusId);
  const { disbursement, documents } = await ensureDisbursement(pb, campusId);
  const versions = await pb.collection('document_versions').getFullList({ filter: documents.map(d => pb.filter('document = {:id}', { id: d.id })).join(' || '), sort: 'document,number', ...opts });
  const reviews = versions.length ? await pb.collection('reviews').getFullList({ filter: versions.map(v => pb.filter('version = {:id}', { id: v.id })).join(' || '), sort: '-created', ...opts }) : [];
  const notes = await pb.collection('notes').getFullList({ filter: pb.filter('campus = {:c}', { c: campusId }), sort: 'created', ...opts });
  const nameOf = await names(pb, versions.flatMap(v => [v.fieldsBy, v.fieldsCheckedBy]));
  const bank = await pb.collection('bank_checks').getList(1, 1, { filter: pb.filter('disbursement = {:d}', { d: disbursement.id }), ...opts });
  const attachments = await pb.collection('attachments').getFullList({ filter: pb.filter('disbursement = {:d}', { d: disbursement.id }), fields: 'id', ...opts });
  // The managed RAB is the source of the Tahap 1 amount once its 70% total is approved; the uploaded RAB file stays the campus evidence.
  const rabVersion = disbursement.rabVersion ? await pb.collection('rab_versions').getOne(disbursement.rabVersion, opts).catch(() => null) : null;
  const rab = rabVersion ? { id: rabVersion.id, number: Number(rabVersion.number), status: rabVersion.status, totalSen: Number(rabVersion.totalSen || 0), term1Sen: Number(rabVersion.term1Sen || 0) } : null;
  const docs: DocumentInfo[] = KINDS.map(kind => {
    const d = documents.find(x => x.kind === kind)!;
    const currentReviews = reviews.filter(r => r.version === d.currentVersion);
    const decided = currentReviews.find(r => r.decision !== 'catatan');
    return {
      id: d.id, kind, status: d.status as Status, signedReceived: Boolean(d.signedReceived), signedReceivedAt: d.signedReceivedAt || '', signedReceivedByName: d.signedReceivedByName || '', originalReceived: Boolean(d.originalReceived), originalReceivedAt: d.originalReceivedAt || '', originalReceivedByName: d.originalReceivedByName || '', currentVersionId: d.currentVersion || '', generated: GENERATED.includes(kind),
      decidedByName: decided ? (decided.imported ? 'Lembar review' : decided.actorName || '') : '', decidedAt: decided?.created || '',
      notes: notes.filter(n => n.document === d.id).map(n => ({ id: n.id, body: n.body || '', internal: Boolean(n.internal), authorName: n.authorName || '', authorRole: n.authorRole || '', created: n.created })),
      versions: versions.filter(v => v.document === d.id).map(v => ({
        id: v.id, number: v.number, originalName: v.originalName, size: v.size, mime: v.mime, origin: v.origin, uploadedByName: v.uploadedByName || '', created: v.created, note: v.note || '', signed: Boolean(v.signed), scan: (v.scan && typeof v.scan === 'object' ? v.scan : null) as DocScan | null,
        fields: (v.fields && typeof v.fields === 'object' ? v.fields : {}) as Record<string, unknown>, fieldsByName: nameOf.get(v.fieldsBy) || '', fieldsAt: v.fieldsAt || '',
        fieldsCheckedByName: nameOf.get(v.fieldsCheckedBy) || '', fieldsCheckedAt: v.fieldsCheckedAt || '', fieldsSamePerson: Boolean(v.fieldsSamePerson),
        reviews: reviews.filter(r => r.version === v.id).map(r => ({ id: r.id, decision: r.decision, note: r.note || '', actorName: r.actorName || '', created: r.created, imported: Boolean(r.imported) }))
      }))
    };
  });
  const amountSen = Number(award.amountSen);
  const limit = limitSen(amountSen);
  const requestedSen = Number(disbursement.requestedSen || 0);
  const summary = {
    skNumber: award.skNumber, skDate: award.skDate, amountSen, limitSen: limit, term2MinSen: amountSen - limit, requestedSen,
    term2Sen: requestedSen ? remainderSen(amountSen, requestedSen) : amountSen - limit,
    term1Percent: requestedSen ? percentOf(requestedSen, amountSen) : 70, term2Percent: requestedSen ? percentOf(remainderSen(amountSen, requestedSen), amountSen) : 30,
    programTitle: award.programTitle || '', programYear: award.programYear || campus.programYear,
    skFile: Boolean(award.fileKey), skLampiranPage: Number(award.lampiranPage || 0), skLampiranNo: Number(award.lampiranNo || 0)
  };
  const bankRow = bank.items[0] || null;
  const { checks: list, suratKuasaRequired } = checks(docs, summary, { campus, bankResult: String(bankRow?.bankResult || 'belum'), rab });
  const statuses = Object.fromEntries(docs.map(d => [d.kind, d.status])) as Record<Kind, Status>;
  const readiness = assess(statuses, { suratKuasaRequired, redChecks: list.filter(c => c.level === 'bad').length, paidAt: String(disbursement.paidAt || ''), originalsAll: docs.filter(d => d.generated).every(d => d.originalReceived), lampiranCount: attachments.length });
  return {
    campus, summary,
    disbursement: { id: disbursement.id, stage: Number(disbursement.stage || 1), requestedSen, paidSen: Number(disbursement.paidSen || 0), paidAt: String(disbursement.paidAt || ''), paidRef: disbursement.paidRef || '', paidByName: disbursement.paidByName || '', properties: (disbursement.properties || {}) as Record<string, unknown>, clauseChecked: Boolean(disbursement.clauseChecked), templateMode: disbursement.templateMode || 'standard', revision: Number(disbursement.revision || 1) },
    documents: docs,
    bankCheck: bankRow ? { id: bankRow.id, bankName: bankRow.bankName || '', branch: bankRow.branch || '', accountMasked: mask(bankRow.accountNumber || ''), holderNames: bankRow.holderNames || [], attorneyNames: bankRow.attorneyNames || [], namesMatch: Boolean(bankRow.namesMatch), overrideReason: bankRow.overrideReason || '', bankResult: bankRow.bankResult || 'belum', bankNameSeen: bankRow.bankNameSeen || '', checkedAt: bankRow.checkedAt || '', evidence: Boolean(bankRow.evidenceKey) } : null,
    rab,
    lampiranCount: attachments.length,
    checks: list,
    readiness
  };
}

export const mask = (number: string) => (number.length > 3 ? '•••• •••• ' + number.slice(-3) : number ? '•••' : '');

function currentVersion(doc: DocumentInfo): VersionInfo | null {
  return doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[doc.versions.length - 1] || null;
}
function currentFields(doc: DocumentInfo): Record<string, unknown> {
  return currentVersion(doc)?.fields || {};
}
const lettersOnly = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');
/** The name before the first comma: "Nama, Jabatan" typed from the PKS becomes "Nama". */
const nameOnly = (text: string) => text.split(/[,;]/)[0].trim();

export interface CheckContext { campus: CampusInfo; bankResult: string; rab: { term1Sen: number; totalSen: number; number: number; status?: string } | null }
/**
 * Automatic checks: the machine counts, the person decides. Every check names the item it belongs to so the card and the panel can show it in place.
 * Also answers whether a surat kuasa is required (account holder differs from the PKS signatory), or null when the names are not typed yet.
 */
export function checks(docs: DocumentInfo[], summary: { amountSen: number; limitSen: number; requestedSen: number; term2Percent: number }, ctx: CheckContext): { checks: Check[]; suratKuasaRequired: boolean | null } {
  const out: Check[] = [];
  const by = (kind: Kind) => docs.find(d => d.kind === kind)!;
  const money = (kind: Kind, key: string) => { const v = currentFields(by(kind))[key]; return typeof v === 'number' ? v : null; };
  const text = (kind: Kind, key: string) => { const v = currentFields(by(kind))[key]; return typeof v === 'string' ? v.trim() : ''; };
  const requested = summary.requestedSen;

  out.push({ kind: 'umum', level: 'ok', text: `Batas Tahap 1 ${formatSen(summary.limitSen)}, tepat 70% dari Nilai SK ${formatSen(summary.amountSen)}.` });
  // RAB 70%: the approved managed RAB sets the Tahap 1 amount.
  if (ctx.rab && requested) {
    out.push(requested <= summary.limitSen ? { kind: 'rab', level: 'ok', text: `RAB 70% ${formatSen(requested)} tidak melebihi batas. Ini nominal Tahap 1.` } : { kind: 'rab', level: 'bad', text: `RAB 70% ${formatSen(requested)} melebihi batas ${formatSen(summary.limitSen)}.` });
    if (requested < summary.limitSen) out.push({ kind: 'rab', level: 'warn', text: `Di bawah batas: selisih ${formatSen(summary.limitSen - requested)} menjadi sisa Tahap 2, sehingga Tahap 2 ${formatPercent(summary.term2Percent)} dari Nilai SK, bukan 30% seperti di PKS. Periksa pasal Bantuan Dana.` });
  } else {
    out.push({ kind: 'rab', level: 'info', text: 'RAB 70% belum disetujui di RAB terkelola. Nominal Tahap 1 ditetapkan saat disetujui.' });
  }
  // The Tahap 1 total typed from the campus file: the reviewer's own reading. It must agree with the managed RAB, and it stands in when the managed RAB has no Tahap 1 column yet.
  const fileTerm1 = money('rab', 'termin1Sen');
  const managedTerm1 = ctx.rab?.term1Sen || 0;
  if (fileTerm1 !== null) {
    if (fileTerm1 > summary.limitSen) out.push({ kind: 'rab', level: 'bad', text: `Total di berkas ${formatSen(fileTerm1)} melebihi batas ${formatSen(summary.limitSen)}.` });
    else if (managedTerm1 && fileTerm1 !== managedTerm1) out.push({ kind: 'rab', level: 'bad', text: `Total di berkas ${formatSen(fileTerm1)} berbeda dari RAB terkelola ${formatSen(managedTerm1)}.` });
    else if (managedTerm1) out.push({ kind: 'rab', level: 'ok', text: `Total di berkas sama dengan RAB terkelola, ${formatSen(fileTerm1)}.` });
    else out.push({ kind: 'rab', level: 'info', text: `Total di berkas ${formatSen(fileTerm1)} dipakai sebagai nominal Tahap 1 sampai kolom RAB Tahap 1 diimpor.` });
  }
  // Nominal of the three letters equals what was requested, to the sen.
  for (const kind of LETTERS) {
    const nominal = money(kind, 'nominalSen');
    if (nominal === null) continue;
    if (requested) out.push(nominal === requested ? { kind, level: 'ok', text: `Nominal ${formatSen(nominal)} sama dengan yang diajukan.` } : { kind, level: 'bad', text: `Nominal ${formatSen(nominal)} berbeda dari yang diajukan ${formatSen(requested)}.` });
    else out.push(nominal > summary.limitSen ? { kind, level: 'bad', text: `Nominal ${formatSen(nominal)} melebihi batas Tahap 1 ${formatSen(summary.limitSen)}.` } : { kind, level: 'info', text: `Nominal ${formatSen(nominal)} tidak melebihi batas; dibandingkan lagi setelah RAB 70% disetujui.` });
  }
  // Terbilang on the kuitansi is generated from the figure and compared word by word.
  const kuitansiNominal = money('kuitansi', 'nominalSen');
  const typedWords = text('kuitansi', 'terbilang');
  if (kuitansiNominal !== null && typedWords) {
    const expected = terbilang(kuitansiNominal);
    const same = lettersOnly(typedWords) === lettersOnly(expected) || lettersOnly(typedWords) + 'rupiah' === lettersOnly(expected);
    out.push(same ? { kind: 'kuitansi', level: 'ok', text: 'Terbilang cocok dengan nominal.' } : { kind: 'kuitansi', level: 'bad', text: `Terbilang tidak cocok dengan nominal. Seharusnya: ${expected}.` });
  }
  // PKS carries the SK value.
  const pksAmount = money('pks', 'nilaiBantuanSen');
  if (pksAmount !== null) out.push(pksAmount === summary.amountSen ? { kind: 'pks', level: 'ok', text: 'Nilai bantuan sama dengan SK.' } : { kind: 'pks', level: 'bad', text: `Nilai bantuan ${formatSen(pksAmount)} berbeda dari SK ${formatSen(summary.amountSen)}.` });
  // Invoice account equals the rekening.
  const account = text('rekening', 'nomorRekening').replace(/\D/g, '');
  const invoiceAccount = text('invois', 'rekeningTujuan').replace(/\D/g, '');
  if (account && invoiceAccount) out.push(account === invoiceAccount ? { kind: 'invois', level: 'ok', text: 'Nomor rekening pada invois sama dengan buku rekening.' } : { kind: 'invois', level: 'bad', text: 'Nomor rekening pada invois berbeda dari buku rekening.' });
  const holders = splitNames(currentFields(by('rekening')).namaPemilik as string[]);
  const invoiceHolders = splitNames(currentFields(by('invois')).namaPemilik as string[]);
  if (holders.length && invoiceHolders.length) out.push(namesMatch(invoiceHolders, holders) ? { kind: 'invois', level: 'ok', text: 'Nama pemilik rekening pada invois sama dengan buku rekening.' } : { kind: 'invois', level: 'bad', text: 'Nama pemilik rekening pada invois berbeda dari buku rekening.' });
  // Rekening holder against the PKS signatory decides whether a surat kuasa is required.
  const signatory = nameOnly(text('pks', 'penandatangan')) || ctx.campus.signatoryName;
  let suratKuasaRequired: boolean | null = null;
  if (!holders.length) out.push({ kind: 'rekening', level: 'info', text: 'Ketik nama pemilik rekening dari buku rekening; dari situ sistem menentukan perlunya surat kuasa.' });
  else if (!signatory) out.push({ kind: 'surat_kuasa', level: 'info', text: 'Penandatangan PKS belum diketahui. Isi Profil DEB atau isian PKS.' });
  else {
    suratKuasaRequired = !namesMatch(holders, [signatory]);
    if (!suratKuasaRequired) out.push({ kind: 'surat_kuasa', level: 'ok', text: 'Pemilik rekening adalah penandatangan PKS: surat kuasa tidak diperlukan.' });
    else {
      out.push({ kind: 'surat_kuasa', level: 'warn', text: 'Pemilik rekening bukan penandatangan PKS: surat kuasa wajib.' });
      const attorneys = splitNames(currentFields(by('surat_kuasa')).penerimaKuasa as string[]);
      const grantor = nameOnly(text('surat_kuasa', 'pemberiKuasa'));
      if (attorneys.length) out.push(namesMatch(holders, attorneys) ? { kind: 'surat_kuasa', level: 'ok', text: 'Penerima kuasa sama dengan pemilik rekening (gelar dan huruf besar diabaikan).' } : { kind: 'surat_kuasa', level: 'bad', text: 'Penerima kuasa berbeda dari pemilik rekening.' });
      if (grantor) out.push(namesMatch([grantor], [signatory]) ? { kind: 'surat_kuasa', level: 'ok', text: 'Pemberi kuasa adalah penandatangan PKS.' } : { kind: 'surat_kuasa', level: 'bad', text: 'Pemberi kuasa bukan penandatangan PKS.' });
    }
  }
  // The bank check, recorded by finance.
  if (holders.length) out.push(ctx.bankResult === 'sesuai' ? { kind: 'rekening', level: 'ok', text: 'Nama sesuai di bank.' } : ctx.bankResult === 'berbeda' ? { kind: 'rekening', level: 'bad', text: 'Nama di bank berbeda. Perbaiki rekening atau surat kuasa, lalu cek ulang.' } : { kind: 'rekening', level: 'info', text: 'Nama belum dicek ke bank.' });
  // What the Word files themselves say: a Termin 2 page left in a letter, highlight left anywhere.
  for (const doc of docs) {
    const scan = currentVersion(doc)?.scan;
    if (!scan) continue;
    if (LETTERS.includes(doc.kind) && scan.termin2Hits?.length) out.push({ kind: doc.kind, level: 'bad', text: `Halaman Termin 2 masih ada di berkas: "${scan.termin2Hits[0]}". Kirim halaman Termin 1 saja.` });
    if (scan.highlight > 0) out.push({ kind: doc.kind, level: 'warn', text: `${scan.highlight} sorotan kuning tersisa di berkas Word.` });
  }
  return { checks: out, suratKuasaRequired };
}

export interface NewFile { name: string; bytes: ArrayBuffer | Uint8Array; mime?: string }
export async function addVersion(pb: PocketBase, store: Storage, actor: AuditActor | null, campusId: string, kind: Kind, file: NewFile, options: { origin?: 'upload' | 'generated' | 'initial_load'; note?: string; uploadedByName?: string; keepStatus?: boolean; generation?: unknown; byCampus?: boolean; signed?: boolean } = {}) {
  if (!KINDS.includes(kind)) throw new PreviewError(400, 'Jenis dokumen tidak dikenal.');
  if (kind === 'sk') throw new PreviewError(400, 'SK dimuat satu kali untuk semua kampus dan tidak diunggah per kampus.');
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new PreviewError(400, 'Jenis berkas tidak didukung. Gunakan PDF, gambar, Word, atau Excel.');
  const size = file.bytes.byteLength;
  if (!size) throw new PreviewError(400, 'Berkas kosong.');
  if (size > 40 * 1024 * 1024) throw new PreviewError(413, 'Ukuran berkas maksimal 40 MB.');
  const { campus } = await campusWithAward(pb, campusId);
  const { disbursement, documents } = await ensureDisbursement(pb, campusId);
  const doc = documents.find(d => d.kind === kind)!;
  const last = await pb.collection('document_versions').getList(1, 1, { filter: pb.filter('document = {:id}', { id: doc.id }), sort: '-number', fields: 'number', ...opts });
  const number = (last.items[0]?.number || 0) + 1;
  const key = versionKey(campus.code, TERM, kind, number, file.name);
  const mime = file.mime || mimeFor(file.name);
  await store.put(key, file.bytes, mime);
  const digest = await crypto.subtle.digest('SHA-256', file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes));
  const sha256 = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Word files are read for a leftover Termin 2 page and leftover highlight; the result is an automatic check, never a decision.
  const scan = ext === 'docx' ? await scanDocx(file.bytes).catch(() => null) : null;
  const version = await pb.collection('document_versions').create({
    document: doc.id, number, r2Key: key, originalName: file.name, size, mime, sha256, uploadedBy: actor?.id || '', uploadedByName: options.uploadedByName || actor?.name || 'Sistem',
    origin: options.origin || 'upload', fields: {}, note: options.note || '', generation: options.generation ?? null, signed: Boolean(options.signed), scan
  }, opts);
  const patch: Record<string, unknown> = { currentVersion: version.id, revision: Number(doc.revision || 1) + 1 };
  // A signed scan or a generated letter does not reopen the check; the item keeps its decision.
  if (!options.keepStatus && !options.signed) patch.status = 'menunggu_review';
  await pb.collection('documents').update(doc.id, patch, opts);
  if (Number(disbursement.stage || 1) < 2) await pb.collection('disbursements').update(disbursement.id, { stage: 2 }, opts);
  await writeAudit(pb, { actor, action: `mengunggah ${labelOf(kind)} versi ${number}`, context: context(campusId), collection: 'document_versions', record: version.id, campus: campusId, after: { berkas: file.name, versi: number } });
  if (options.byCampus) await notifyAdmins(pb, campusId, 'pencairan_upload', `${campus.name} mengunggah ${labelOf(kind)}`, `${labelOf(kind)} versi ${number} menunggu pemeriksaan.`, `/admin/pencairan/${campusId}`);
  return { version, document: doc };
}

/** In app notifications: campus accounts of one campus, or every active admin. Failures are logged, never block the change. */
export async function notifyCampus(pb: PocketBase, campusId: string, eventType: string, title: string, body: string, target: string) {
  try {
    const users = await pb.collection('users').getFullList({ filter: pb.filter('active = true && role = "campus" && campus = {:c}', { c: campusId }), fields: 'id', ...opts });
    for (const u of users) await pb.collection('notifications').create({ recipientUser: u.id, campus: campusId, eventType, eventKey: `${eventType}:${campusId}:${Date.now()}`, sourceId: campusId, title, body, target, simulated: false }, opts);
  } catch (error) { console.warn('Campus notification failed', error); }
}
export async function notifyAdmins(pb: PocketBase, campusId: string, eventType: string, title: string, body: string, target: string) {
  try {
    const users = await pb.collection('users').getFullList({ filter: 'active = true && (role = "admin" || role = "super_admin")', fields: 'id', ...opts });
    for (const u of users) await pb.collection('notifications').create({ recipientUser: u.id, campus: campusId, eventType, eventKey: `${eventType}:${campusId}:${Date.now()}`, sourceId: campusId, title, body, target, simulated: false }, opts);
  } catch (error) { console.warn('Admin notification failed', error); }
}

export const labelOf = (kind: Kind) => KIND_LABEL[kind];

/**
 * Records the Tahap 1 transfer. The amount must equal what was requested (the RAB 70% total); the date and reference are what finance typed.
 * Called once per term; calling again with the same values is a no-op, changed values are audited.
 */
export async function recordPayment(pb: PocketBase, actor: AuditActor & { id: string }, campusId: string, input: { paidAt: string; paidSen: number; paidRef: string; paidNote?: string }, term = TERM) {
  const { campus } = await campusWithAward(pb, campusId);
  const { disbursement } = await ensureDisbursement(pb, campusId, term);
  const requested = Number(disbursement.requestedSen || 0);
  if (!requested) throw new PreviewError(400, 'Nominal Tahap 1 belum ditetapkan. Setujui RAB 70% dulu.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidAt)) throw new PreviewError(400, 'Tanggal pembayaran harus diisi.');
  if (!Number.isInteger(input.paidSen) || input.paidSen !== requested) throw new PreviewError(400, `Jumlah yang dibayar harus sama dengan yang diajukan, ${formatSen(requested)}.`);
  const ref = String(input.paidRef || '').trim().slice(0, 120);
  if (!ref) throw new PreviewError(400, 'Nomor referensi transfer harus diisi.');
  const before = { tanggalBayar: disbursement.paidAt || '', jumlah: formatSen(Number(disbursement.paidSen || 0)), referensi: disbursement.paidRef || '' };
  const after = { tanggalBayar: input.paidAt, jumlah: formatSen(input.paidSen), referensi: ref };
  if (before.tanggalBayar.slice(0, 10) === after.tanggalBayar && before.jumlah === after.jumlah && before.referensi === after.referensi) return disbursement;
  const updated = await pb.collection('disbursements').update(disbursement.id, { paidAt: input.paidAt, paidSen: input.paidSen, paidRef: ref, paidByName: actor.name || 'Sistem', paidNote: String(input.paidNote || '').slice(0, 1000), stage: 7, revision: Number(disbursement.revision || 1) + 1 }, opts);
  await writeAudit(pb, { actor, action: `mencatat pembayaran Tahap ${term}`, context: context(campusId, term), collection: 'disbursements', record: disbursement.id, campus: campusId, before, after });
  await notifyCampus(pb, campusId, 'pencairan_bayar', `Dana Tahap ${term} sudah ditransfer`, `${formatSen(input.paidSen)} untuk ${campus.name} ditransfer pada ${input.paidAt}.`, '/campus/pencairan');
  return updated;
}

export async function reviewDocument(pb: PocketBase, actor: AuditActor, campusId: string, kind: Kind, decision: 'sesuai' | 'perlu_revisi' | 'perlu_konfirmasi' | 'tidak_perlu', note: string, options: { imported?: boolean } = {}) {
  const { disbursement, documents, } = await ensureDisbursement(pb, campusId);
  const doc = documents.find(d => d.kind === kind)!;
  // "Tanpa surat kuasa" is a decision only the surat kuasa item can take: the campus goes without one.
  if (decision === 'tidak_perlu' && kind !== 'surat_kuasa') throw new PreviewError(400, 'Hanya surat kuasa yang bisa ditandai tanpa berkas.');
  // The SK has no upload and the RAB's document is the managed RAB; every other item needs a file before it can be Sesuai.
  if (kind !== 'sk' && kind !== 'rab' && !doc.currentVersion && decision === 'sesuai') throw new PreviewError(400, 'Unggah berkas dulu sebelum menandai Sesuai.');
  if (decision === 'perlu_revisi' && !note.trim()) throw new PreviewError(400, kind === 'sk' ? 'Tulis nilai yang tercetak di SK agar super admin bisa memperbaikinya.' : 'Tulis catatan revisi agar kampus tahu yang harus diperbaiki.');
  if (doc.currentVersion) await pb.collection('reviews').create({ version: doc.currentVersion, decision, note, actor: actor.id || '', actorName: actor.name || 'Sistem', imported: Boolean(options.imported) }, opts);
  const before = doc.status;
  await pb.collection('documents').update(doc.id, { status: decision, revision: Number(doc.revision || 1) + 1 }, opts);
  if (Number(disbursement.stage || 1) < 3) await pb.collection('disbursements').update(disbursement.id, { stage: 3 }, opts);
  await writeAudit(pb, { actor, action: `menandai ${labelOf(kind)} ${statusLabel(decision)}`, context: context(campusId), collection: 'documents', record: doc.id, campus: campusId, before: { status: before }, after: { status: decision }, note });
  if (kind === 'sk') {
    // The SK is Pertamina Foundation's own document: a doubt goes to the admins, never to the campus.
    if (decision === 'perlu_revisi') await notifyAdmins(pb, campusId, 'pencairan_sk', 'Nilai SK diragukan', note, `/admin/pencairan/${campusId}?butir=sk`);
  } else if (!options.imported && decision !== 'perlu_konfirmasi') {
    await notifyCampus(pb, campusId, 'pencairan_review', decision === 'sesuai' ? `${labelOf(kind)} sudah sesuai` : `${labelOf(kind)} perlu revisi`, decision === 'sesuai' ? `${labelOf(kind)} Termin 1 sudah sesuai.` : `${labelOf(kind)} perlu diperbaiki: ${note}`, '/campus/pencairan');
  }
  return decision;
}

/**
 * One message in the conversation on an item. Staff may mark it internal (never sent to the campus, never shown there);
 * a campus message goes to the admins, a staff message to the campus. Notes are never edited or deleted.
 */
export async function addNote(pb: PocketBase, actor: AuditActor & { id: string; role: string }, campusId: string, kind: Kind, body: string, internal: boolean) {
  const text = body.trim();
  if (!text) throw new PreviewError(400, 'Tulis catatannya dulu.');
  if (text.length > 4000) throw new PreviewError(400, 'Catatan paling panjang 4000 huruf.');
  const staff = actor.role === 'admin' || actor.role === 'super_admin';
  const { campus } = await campusWithAward(pb, campusId);
  const { documents } = await ensureDisbursement(pb, campusId);
  const doc = documents.find(d => d.kind === kind)!;
  const note = await pb.collection('notes').create({ document: doc.id, campus: campusId, body: text, internal: staff && internal, author: actor.id, authorName: actor.name || 'Sistem', authorRole: staff ? actor.role : 'campus' }, opts);
  if (staff && !internal) await notifyCampus(pb, campusId, 'pencairan_catatan', `Catatan baru pada ${labelOf(kind)}`, text.slice(0, 200), '/campus/pencairan?butir=' + kind);
  if (!staff) await notifyAdmins(pb, campusId, 'pencairan_catatan', `${campus.name} menulis pada ${labelOf(kind)}`, text.slice(0, 200), `/admin/pencairan/${campusId}?butir=${kind}`);
  return note;
}
/** The campus never receives internal notes, nor the review entries that were only for staff. */
export function forCampus<T extends { documents: DocumentInfo[] }>(ws: T): T {
  return { ...ws, documents: ws.documents.map(d => ({ ...d, notes: d.notes.filter(n => !n.internal), versions: d.versions.map(v => ({ ...v, reviews: v.reviews.filter(r => r.decision === 'sesuai' || r.decision === 'perlu_revisi' || r.decision === 'tidak_perlu') })) })) };
}

/** Streams the one SK file for all campuses, stored once in R2 by scripts/pencairan/load-sk.ts. */
export async function skFileResponse(pb: PocketBase, store: Storage) {
  const award = await pb.collection('sk_awards').getList(1, 1, { filter: 'fileKey != ""', fields: 'fileKey,skNumber', ...opts });
  const key = award.items[0]?.fileKey;
  if (!key) throw new PreviewError(404, 'Berkas SK belum dimuat.');
  const source = await store.get(key);
  const headers = new Headers({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent('SK ' + award.items[0].skNumber + '.pdf')}`, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
  return new Response(source.body, { status: 200, headers });
}
const statusLabel = (s: string) => ({ sesuai: 'Sesuai', perlu_revisi: 'Perlu revisi', perlu_konfirmasi: 'Perlu konfirmasi', belum_ada: 'Belum ada', menunggu_review: 'Menunggu review', tidak_perlu: 'Tanpa surat kuasa' } as Record<string, string>)[s] || s;

export function validateFields(kind: Kind, input: Record<string, unknown>) {
  const spec = FIELDS[kind];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const field = spec.find(f => f.key === key);
    if (!field) throw new PreviewError(400, 'Isian tidak dikenal untuk dokumen ini.');
    if (value === null || value === undefined || value === '') { out[key] = null; continue; }
    switch (field.type) {
      case 'money': if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1e15) throw new PreviewError(400, `${field.label} harus berupa jumlah rupiah.`); out[key] = value; break;
      case 'bool': out[key] = Boolean(value); break;
      case 'names': out[key] = splitNames(value as string | string[]).slice(0, 10); break;
      case 'date': if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PreviewError(400, `${field.label} harus berupa tanggal.`); out[key] = value; break;
      default: if (typeof value !== 'string' || value.length > 500) throw new PreviewError(400, `${field.label} terlalu panjang.`); out[key] = value.trim();
    }
  }
  return out;
}

export async function setFields(pb: PocketBase, actor: AuditActor & { id: string }, campusId: string, kind: Kind, versionId: string, input: Record<string, unknown> | null, check: boolean) {
  const version = await pb.collection('document_versions').getOne(versionId, opts).catch(() => null);
  if (!version) throw new PreviewError(404, 'Versi berkas tidak ditemukan.');
  const doc = await pb.collection('documents').getOne(version.document, opts);
  if (doc.kind !== kind) throw new PreviewError(400, 'Versi berkas tidak sesuai dengan dokumen.');
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  let action = '';
  if (input) {
    const values = validateFields(kind, input);
    patch.fields = { ...(version.fields || {}), ...values };
    patch.fieldsBy = actor.id; patch.fieldsAt = now; patch.fieldsCheckedBy = ''; patch.fieldsCheckedAt = ''; patch.fieldsSamePerson = false;
    action = `mengisi isian ${labelOf(kind)} versi ${version.number}`;
  }
  if (check) {
    if (!version.fieldsBy && !input) throw new PreviewError(400, 'Isi dulu isian dokumen sebelum dicek ulang.');
    patch.fieldsCheckedBy = actor.id; patch.fieldsCheckedAt = now; patch.fieldsSamePerson = (patch.fieldsBy || version.fieldsBy) === actor.id;
    action = action ? action + ' dan mengecek ulang' : `mengecek ulang isian ${labelOf(kind)} versi ${version.number}`;
  }
  if (!action) return version;
  const updated = await pb.collection('document_versions').update(versionId, patch, opts);
  // Account numbers never appear in audit rows in full.
  const masked = (fields: unknown) => { const f = { ...(fields as Record<string, unknown> || {}) }; if (typeof f.nomorRekening === 'string') f.nomorRekening = mask(f.nomorRekening); if (typeof f.rekeningTujuan === 'string') f.rekeningTujuan = mask(f.rekeningTujuan); return f; };
  await writeAudit(pb, { actor, action, context: context(campusId), collection: 'document_versions', record: versionId, campus: campusId, before: input ? masked(version.fields) : null, after: input ? masked(patch.fields) : { dicekUlang: true, orangYangSama: patch.fieldsSamePerson } });
  return updated;
}

export async function setDocumentFlags(pb: PocketBase, actor: AuditActor, campusId: string, kind: Kind, flags: { signedReceived?: boolean; originalReceived?: boolean }) {
  const { documents } = await ensureDisbursement(pb, campusId);
  const doc = documents.find(d => d.kind === kind)!;
  const patch: Record<string, unknown> = {};
  const now = new Date().toISOString();
  const who = actor?.name || 'Sistem';
  if (typeof flags.signedReceived === 'boolean') { patch.signedReceived = flags.signedReceived; patch.signedReceivedAt = flags.signedReceived ? now : ''; patch.signedReceivedByName = flags.signedReceived ? who : ''; }
  if (typeof flags.originalReceived === 'boolean') { patch.originalReceived = flags.originalReceived; patch.originalReceivedAt = flags.originalReceived ? now : ''; patch.originalReceivedByName = flags.originalReceived ? who : ''; }
  if (!Object.keys(patch).length) return doc;
  const updated = await pb.collection('documents').update(doc.id, patch, opts);
  await writeAudit(pb, { actor, action: `memperbarui penanda ${labelOf(kind)}`, context: context(campusId), collection: 'documents', record: doc.id, campus: campusId, before: { pindaianBertandaTangan: Boolean(doc.signedReceived), asliDiterima: Boolean(doc.originalReceived) }, after: { pindaianBertandaTangan: Boolean(updated.signedReceived), asliDiterima: Boolean(updated.originalReceived) } });
  return updated;
}

export async function updateDisbursement(pb: PocketBase, actor: AuditActor & { id: string }, campusId: string, patch: { stage?: number; requestedSen?: number; properties?: Record<string, unknown>; clauseChecked?: boolean; templateMode?: string }) {
  const { award } = await campusWithAward(pb, campusId);
  const { disbursement } = await ensureDisbursement(pb, campusId);
  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
  if (patch.stage !== undefined) { if (!Number.isInteger(patch.stage) || patch.stage < 1 || patch.stage > 7) throw new PreviewError(400, 'Tahap tidak valid.'); data.stage = patch.stage; before.tahap = disbursement.stage; after.tahap = patch.stage; }
  if (patch.requestedSen !== undefined) {
    const limit = limitSen(Number(award.amountSen));
    if (!Number.isInteger(patch.requestedSen) || patch.requestedSen < 0) throw new PreviewError(400, 'Nominal Tahap 1 harus berupa jumlah rupiah.');
    if (patch.requestedSen > limit) throw new PreviewError(400, `Nominal Tahap 1 melebihi batas ${formatSen(limit)}.`);
    data.requestedSen = patch.requestedSen; before.nominalTahap1 = formatSen(Number(disbursement.requestedSen || 0)); after.nominalTahap1 = formatSen(patch.requestedSen);
    if (patch.requestedSen !== Number(disbursement.requestedSen || 0)) { data.clauseChecked = false; data.clauseCheckedBy = ''; data.clauseCheckedAt = ''; }
  }
  if (patch.properties) {
    const allowed = ['nomorPksPf', 'nomorPksKampus', 'tanggalPerjanjian', 'nomorSuratPermohonan', 'tanggalSuratPermohonan', 'nomorInvois', 'tanggalInvois', 'nomorKuitansi', 'tanggalKuitansi', 'penandatanganNama', 'penandatanganJabatan', 'tempatTandaTangan'];
    const current = (disbursement.properties || {}) as Record<string, unknown>;
    const next = { ...current };
    for (const [key, value] of Object.entries(patch.properties)) {
      if (!allowed.includes(key)) throw new PreviewError(400, 'Properti dokumen tidak dikenal.');
      if (typeof value !== 'string' || value.length > 300) throw new PreviewError(400, 'Properti dokumen tidak valid.');
      if ((current[key] || '') !== value) { before[key] = current[key] || ''; after[key] = value; }
      next[key] = value;
    }
    data.properties = next;
  }
  if (patch.clauseChecked !== undefined) { data.clauseChecked = patch.clauseChecked; data.clauseCheckedBy = patch.clauseChecked ? actor.id : ''; data.clauseCheckedAt = patch.clauseChecked ? new Date().toISOString() : ''; before.pasalBantuanDanaDiperiksa = Boolean(disbursement.clauseChecked); after.pasalBantuanDanaDiperiksa = patch.clauseChecked; }
  if (patch.templateMode !== undefined) { if (!['standard', 'custom'].includes(patch.templateMode)) throw new PreviewError(400, 'Mode templat tidak valid.'); data.templateMode = patch.templateMode; before.templat = disbursement.templateMode; after.templat = patch.templateMode; }
  if (!Object.keys(data).length) return disbursement;
  data.revision = Number(disbursement.revision || 1) + 1;
  const updated = await pb.collection('disbursements').update(disbursement.id, data, opts);
  await writeAudit(pb, { actor, action: 'mengubah data pencairan', context: context(campusId), collection: 'disbursements', record: disbursement.id, campus: campusId, before, after });
  return updated;
}

/** Streams one stored version through the server, so storage stays private and access follows the app roles. */
export async function fileResponse(pb: PocketBase, store: Storage, campusId: string, versionId: string, download = false) {
  const version = await pb.collection('document_versions').getOne(versionId, opts).catch(() => null);
  if (!version) throw new PreviewError(404, 'Berkas tidak ditemukan.');
  const doc = await pb.collection('documents').getOne(version.document, opts);
  const disbursement = await pb.collection('disbursements').getOne(doc.disbursement, opts);
  if (disbursement.campus !== campusId) throw new PreviewError(404, 'Berkas tidak ditemukan.');
  const source = await store.get(version.r2Key);
  const headers = new Headers();
  headers.set('Content-Type', version.mime || 'application/octet-stream');
  if (version.size) headers.set('Content-Length', String(version.size));
  headers.set('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(version.originalName)}`);
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(source.body, { status: 200, headers });
}
