/**
 * Collections of the Pencairan module (English names, matching the existing schema style).
 * All rules are null: only the app server, authenticated as superuser, reads or writes them.
 */
type Field = Record<string, unknown>;

export const ID_FIELD: Field = { autogeneratePattern: '[a-z0-9]{15}', hidden: false, id: 'text3208210256', max: 15, min: 15, name: 'id', pattern: '^[a-z0-9]+$', presentable: false, primaryKey: true, required: true, system: true, type: 'text' };
export const text = (name: string, max = 500, extra: Field = {}): Field => ({ name, type: 'text', max, min: 0, required: false, ...extra });
export const num = (name: string, extra: Field = {}): Field => ({ name, type: 'number', onlyInt: true, required: false, ...extra });
export const bool = (name: string): Field => ({ name, type: 'bool', required: false });
export const sel = (name: string, values: string[], extra: Field = {}): Field => ({ name, type: 'select', values, maxSelect: 1, required: false, ...extra });
export const rel = (name: string, collectionId: string, extra: Field = {}): Field => ({ name, type: 'relation', collectionId, cascadeDelete: false, maxSelect: 1, minSelect: 0, required: false, ...extra });
export const json = (name: string, maxSize = 200000): Field => ({ name, type: 'json', maxSize, required: false });
export const date = (name: string): Field => ({ name, type: 'date', required: false });
export const created = (): Field => ({ name: 'created', type: 'autodate', onCreate: true, onUpdate: false });
export const updated = (): Field => ({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true });

export const IDS = {
  users: '_pb_users_auth_',
  sk_awards: 'pbc_deb_skaward',
  program_settings: 'pbc_deb_setting',
  disbursements: 'pbc_deb_disburs',
  documents: 'pbc_deb_documen',
  document_versions: 'pbc_deb_docvers',
  reviews: 'pbc_deb_reviews',
  bank_checks: 'pbc_deb_bankchk',
  pks_templates: 'pbc_deb_pkstmpl',
  rab_versions: 'pbc_deb_rabvers',
  rab_lines: 'pbc_deb_rabline',
  attachments: 'pbc_deb_attachm',
  audit: 'pbc_deb_auditlg',
  lpj_entries: 'pbc_deb_lpjentr',
  verifications: 'pbc_deb_verific',
  notes: 'pbc_deb_notes00'
};

/** The eight check columns of the review sheet, in the sheet's order. */
/** Who may list and view the audit collection with their own token: active admins, for the live change feed in the browser (decision 46). */
export const AUDIT_READ_RULE = '@request.auth.id != "" && @request.auth.active = true && (@request.auth.role = "admin" || @request.auth.role = "super_admin" || @request.auth.superAdmin = true)';
export const DOCUMENT_KINDS = ['sk', 'pks', 'rab_penuh', 'rab', 'rab_tahap2', 'permohonan', 'kuitansi', 'invois', 'laporan', 'rekening', 'surat_kuasa'];
export const VERIFICATION_KINDS = ['pks', 'permohonan', 'invois', 'kuitansi', 'rab', 'lampiran'];
export const DOCUMENT_STATUS = ['belum_ada', 'menunggu_review', 'perlu_konfirmasi', 'perlu_revisi', 'sesuai', 'tidak_perlu'];

/** Fields added to the existing users and campuses collections. */
export const USER_EXTRA: Field[] = [date('lastLoginAt')];
export const USER_ROLES = ['baru', 'campus', 'admin', 'super_admin'];
export const CAMPUS_EXTRA: Field[] = [
  text('code', 20), num('fundedWave'), sel('fillMode', ['admin', 'campus']), sel('programYear', ['kedua', 'ketiga']), text('theme', 120),
  json('program', 500000), num('programRevision'), text('letterheadKey', 300)
];

export function debCollections(campusesId: string) {
  const base = (name: string, id: string, fields: Field[], indexes: string[] = [], rules: { listRule?: string | null; viewRule?: string | null } = {}) => ({
    id, name, type: 'base', system: false, listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null, ...rules,
    fields: [ID_FIELD, ...fields, created(), updated()], indexes
  });
  return [
    base('sk_awards', IDS.sk_awards, [
      rel('campus', campusesId, { required: true }), text('skNumber', 80, { required: true }), date('skDate'), num('wave'), num('amountSen', { required: true }),
      text('programTitle', 500), sel('programYear', ['kedua', 'ketiga']), bool('locked'), text('note', 1000),
      text('fileKey', 400), num('lampiranPage'), num('lampiranNo')
    ], ['CREATE UNIQUE INDEX idx_sk_awards_campus ON sk_awards (campus, skNumber)']),
    base('program_settings', IDS.program_settings, [
      sel('programYear', ['kedua', 'ketiga'], { required: true }), text('pfSignatoryName', 120), text('pfSignatoryTitle', 120), date('agreementStart'), date('agreementEnd'),
      text('reportDeadline', 200), rel('pksTemplate', IDS.pks_templates), text('programLabel', 120)
    ], ['CREATE UNIQUE INDEX idx_program_settings_year ON program_settings (programYear)']),
    base('disbursements', IDS.disbursements, [
      rel('campus', campusesId, { required: true }), num('term', { required: true }), num('stage'), num('requestedSen'), num('paidSen'), date('paidAt'),
      text('paidRef', 120), text('paidByName', 120), text('paidNote', 1000),
      json('properties', 20000), bool('clauseChecked'), rel('clauseCheckedBy', IDS.users), date('clauseCheckedAt'), sel('templateMode', ['standard', 'custom']),
      rel('rabVersion', IDS.rab_versions), num('revision'), text('note', 2000)
    ], ['CREATE UNIQUE INDEX idx_disbursements_campus_term ON disbursements (campus, term)']),
    base('documents', IDS.documents, [
      rel('disbursement', IDS.disbursements, { required: true }), sel('kind', DOCUMENT_KINDS, { required: true }), sel('status', DOCUMENT_STATUS, { required: true }),
      rel('currentVersion', IDS.document_versions), bool('signedReceived'), date('signedReceivedAt'), text('signedReceivedByName', 120), bool('originalReceived'), date('originalReceivedAt'), text('originalReceivedByName', 120), num('revision')
    ], ['CREATE UNIQUE INDEX idx_documents_slot ON documents (disbursement, kind)']),
    base('document_versions', IDS.document_versions, [
      rel('document', IDS.documents, { required: true }), num('number', { required: true }), text('r2Key', 400), text('originalName', 300), num('size'), text('mime', 120), text('sha256', 64),
      rel('uploadedBy', IDS.users), text('uploadedByName', 120), sel('origin', ['upload', 'generated', 'initial_load']), json('fields', 20000),
      rel('fieldsBy', IDS.users), date('fieldsAt'), rel('fieldsCheckedBy', IDS.users), date('fieldsCheckedAt'), bool('fieldsSamePerson'), json('generation', 50000), text('note', 2000),
      bool('signed'), json('scan', 20000)
    ], ['CREATE UNIQUE INDEX idx_document_versions_number ON document_versions (document, number)']),
    base('reviews', IDS.reviews, [
      rel('version', IDS.document_versions), rel('document', IDS.documents), sel('decision', ['sesuai', 'perlu_revisi', 'perlu_konfirmasi', 'catatan', 'tidak_perlu'], { required: true }), text('note', 4000),
      rel('actor', IDS.users), text('actorName', 120), bool('imported')
    ]),
    base('bank_checks', IDS.bank_checks, [
      rel('disbursement', IDS.disbursements, { required: true }), text('bankName', 120), text('branch', 120), text('accountNumber', 40), json('holderNames', 4000), json('attorneyNames', 4000),
      bool('namesMatch'), text('overrideReason', 1000), sel('bankResult', ['belum', 'sesuai', 'berbeda']), text('bankNameSeen', 200), text('evidenceKey', 400),
      rel('checkedBy', IDS.users), date('checkedAt'), num('revision')
    ], ['CREATE UNIQUE INDEX idx_bank_checks_disbursement ON bank_checks (disbursement)']),
    base('pks_templates', IDS.pks_templates, [
      rel('campus', campusesId), num('version', { required: true }), text('r2Key', 400), text('originalName', 300), json('differences', 50000), text('reason', 2000),
      rel('uploadedBy', IDS.users), text('uploadedByName', 120), bool('active'), text('label', 200)
    ]),
    base('rab_versions', IDS.rab_versions, [
      rel('campus', campusesId, { required: true }), rel('disbursement', IDS.disbursements), num('number', { required: true }), sel('status', ['draf', 'menunggu', 'disetujui'], { required: true }),
      num('totalSen'), num('term1Sen'), num('term2Sen'), rel('approvedBy', IDS.users), date('approvedAt'), sel('source', ['manual', 'import', 'extraction']), sel('share', ['penuh', 'tahap1', 'tahap2', 'gabungan']), text('note', 2000), text('sourceFile', 300)
    ], ['CREATE UNIQUE INDEX idx_rab_versions_number ON rab_versions (campus, number)']),
    base('rab_lines', IDS.rab_lines, [
      rel('version', IDS.rab_versions, { required: true }), rel('parent', IDS.rab_lines), num('level', { required: true }), num('order'), text('code', 40), text('title', 500),
      text('calculation', 200), num('volume', { onlyInt: false }), text('unit', 60), num('unitPriceSen'), num('amountSen'), num('term1Sen'), num('term2Sen'), json('flags', 4000)
    ]),
    base('attachments', IDS.attachments, [
      rel('disbursement', IDS.disbursements, { required: true }), num('number', { required: true }), text('r2Key', 400), num('size'), json('composition', 20000), rel('createdBy', IDS.users), text('createdByName', 120),
      text('sha256', 64), text('verification', 40), num('pages')
    ]),
    // The conversation on one item between Pertamina Foundation and the campus; internal notes never reach the campus.
    base('notes', IDS.notes, [
      rel('document', IDS.documents, { required: true }), rel('campus', campusesId, { required: true }), text('body', 4000, { required: true }), bool('internal'),
      rel('author', IDS.users), text('authorName', 120), sel('authorRole', ['admin', 'super_admin', 'campus'])
    ], ['CREATE INDEX idx_notes_document ON notes (document, created)']),
    base('verifications', IDS.verifications, [
      text('code', 40, { required: true }), rel('campus', campusesId, { required: true }), num('term', { required: true }), sel('kind', VERIFICATION_KINDS, { required: true }),
      rel('documentVersion', IDS.document_versions), rel('attachment', IDS.attachments), text('sha256', 64), num('amountSen'), text('label', 200),
      rel('issuedBy', IDS.users), text('issuedByName', 120)
    ], ['CREATE UNIQUE INDEX idx_verifications_code ON verifications (code)']),
    base('audit', IDS.audit, [
      rel('actor', IDS.users), text('actorName', 200), text('actorEmail', 254), text('action', 500, { required: true }), text('context', 160, { required: true }),
      text('collection', 80), text('record', 40), rel('campus', campusesId), json('before', 100000), json('after', 100000), text('note', 2000)
    ], ['CREATE INDEX idx_audit_context ON audit (context, created)', 'CREATE INDEX idx_audit_campus ON audit (campus, created)'], { listRule: AUDIT_READ_RULE, viewRule: AUDIT_READ_RULE }),
    base('lpj_entries', IDS.lpj_entries, [
      rel('disbursement', IDS.disbursements, { required: true }), rel('rabLine', IDS.rab_lines), date('date'), text('reference', 120), text('payee', 200), num('amountSen'),
      text('memo', 1000), text('r2Key', 400), text('originalName', 300), sel('status', ['menunggu_review', 'perlu_revisi', 'sesuai']), rel('createdBy', IDS.users)
    ])
  ];
}
