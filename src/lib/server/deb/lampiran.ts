import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { PDFDocument, StandardFonts, rgb, degrees, PageSizes, type PDFFont, type PDFPage } from 'pdf-lib';
import { KIND_SHORT, formatSen, formatPercent, percentOf, type Kind, type Status } from '../../pencairan';
import { MAX_LEVEL, formatVolume, type RabLine } from '../../rab';
import { qrMatrix, type QrMatrix } from '../../qr';
import { PreviewError } from './preview-error';
import { writeAudit, type AuditActor } from './audit';
import { workspace, updateDisbursement, context, TERM, type DocumentInfo } from './pencairan';
import { listVersions, versionLines } from './rab';
import { extensionOf, type Storage } from './r2';
import { mintCode, createVerification, verificationUrl, verificationLine, SAMPLE_CODE, ISSUER_LINE } from './verifikasi';

/**
 * Lampiran pencairan Tahap 1: one PDF per campus in the order of the review sheet (lembar 2). Sources are the signed scans of the
 * four letters, the approved managed RAB printed by the server, and the bank scans. Every page carries the verification QR in its
 * bottom margin and a summary page closes the file. Preview streams the same file with a sample code and a watermark; Simpan stores it,
 * hashes it and issues the verification code. Saved files are never deleted; every Simpan is a new number.
 */
const opts = { requestKey: null } as const;
type Actor = AuditActor & { id: string };
const LAMPIRAN_STAGE = 7;

export type SourceKind = Exclude<Kind, 'sk' | 'rab_penuh' | 'rab_tahap2'>;
export const ORDER: SourceKind[] = ['permohonan', 'invois', 'kuitansi', 'rab', 'rekening', 'surat_kuasa', 'pks'];
/** Entry number on the sheet's list of six attachments. Surat kuasa and PKS share entry 6. */
export const ENTRY_OF: Record<SourceKind, number> = { permohonan: 1, invois: 2, kuitansi: 3, rab: 4, rekening: 5, surat_kuasa: 6, pks: 6 };
export const ENTRY_TITLE = [
  'Surat Permohonan Pencairan Dana Implementasi Termin 1 (asli)', 'Invois Bantuan Dana Termin 1 (asli)', 'Kuitansi Penerimaan Bantuan Dana Termin 1 (asli)',
  'RAB dan Rencana Realisasi Program 70%', 'Copy Buku Rekening Tabungan', 'Copy Surat Kuasa dan Perjanjian bertanda tangan'
];
export const ITEM_LABEL: Record<SourceKind, string> = {
  permohonan: 'Surat permohonan pencairan dana Termin 1', invois: 'Invois bantuan dana Termin 1', kuitansi: 'Kuitansi penerimaan bantuan dana Termin 1',
  rab: 'RAB dan Rencana Realisasi Program 70%', rekening: 'Salinan buku rekening tabungan', surat_kuasa: 'Salinan surat kuasa', pks: 'Perjanjian kerja sama bertanda tangan'
};
/** Letters that enter the file as their signed scan. */
const SIGNED: SourceKind[] = ['permohonan', 'invois', 'kuitansi', 'pks'];

export type PartType = 'pdf' | 'jpg' | 'png';
export function partType(name: string, mime = ''): PartType | null {
  const ext = extensionOf(name);
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === 'jpg' || ext === 'jpeg' || mime === 'image/jpeg') return 'jpg';
  if (ext === 'png' || mime === 'image/png') return 'png';
  return null;
}

export interface ItemVersion { id: string; number: number; originalName: string; mime: string; created: string; signed: boolean }
export interface LampiranItem {
  entry: number; kind: SourceKind; label: string; status: Status; version: ItemVersion | null; skipped: boolean; ready: boolean;
  /** Short state shown when ready, e.g. "Versi 3, pindaian bertanda tangan". */
  state: string; blocker: string; checkedByName: string; checkedAt: string; checkedVersion: number;
}
export interface LampiranEntry { entry: number; title: string; items: LampiranItem[] }
export interface Composition { kind: SourceKind; versionId: string; number: number; originalName: string; note?: string }
export interface AttachmentInfo { id: string; number: number; size: number; pages: number; sha256: string; verification: string; created: string; createdByName: string; composition: Composition[] }
export interface Readiness { lengkap: boolean; missing: string[]; suratKuasaRequired: boolean | null; suratKuasaSkipped: boolean; phrase: string }
export interface Payment { requestedSen: number; paidSen: number; paidAt: string; paidRef: string; paidByName: string; paidNote: string }
export interface LampiranView {
  campus: { id: string; name: string; code: string; programYear: string };
  summary: { skNumber: string; amountSen: number; limitSen: number; requestedSen: number; term2Sen: number; programYear: string };
  stage: number; entries: LampiranEntry[]; readiness: Readiness; blockers: string[]; ready: boolean; reason: string; attachments: AttachmentInfo[]; payment: Payment;
}

type Workspace = Awaited<ReturnType<typeof workspace>>;
interface ApprovedRab { id: string; number: number; totalSen: number; term1Sen: number; approvedByName: string; approvedAt: string; created: string }
interface Plan { ws: Workspace; view: LampiranView; rows: Map<string, RecordModel>; rab: ApprovedRab | null }

/** The checklist readiness from the workspace when the payload carries it; otherwise every item must be Sesuai and the surat kuasa is required. */
function readinessOf(ws: Workspace): Readiness {
  const given = (ws as { readiness?: Partial<Readiness> & { items?: Record<string, string> } }).readiness;
  const label = (value: unknown) => KIND_SHORT[String(value) as Kind] || String(value);
  if (given && typeof given.lengkap === 'boolean') {
    return { lengkap: given.lengkap, missing: Array.isArray(given.missing) ? given.missing.map(label) : [], suratKuasaRequired: typeof given.suratKuasaRequired === 'boolean' ? given.suratKuasaRequired : null, suratKuasaSkipped: given.suratKuasaRequired === false || (given.items as Record<string, string> | undefined)?.surat_kuasa === 'tidak_perlu', phrase: String(given.phrase || '') };
  }
  const missing = ws.documents.filter(d => d.status !== 'sesuai').map(d => KIND_SHORT[d.kind]);
  return { lengkap: !missing.length, missing, suratKuasaRequired: null, suratKuasaSkipped: false, phrase: missing.length ? `${missing.length} butir belum sesuai.` : 'Semua butir sesuai.' };
}
/** Who marked the item Sesuai and when: the review on the version used, else the latest Sesuai review on an earlier version. */
function sesuaiMark(doc: DocumentInfo, versionId: string) {
  const own = doc.versions.find(v => v.id === versionId)?.reviews.find(r => r.decision === 'sesuai');
  if (own) return { name: own.actorName, at: own.created, version: 0 };
  for (const v of [...doc.versions].reverse()) {
    const review = v.reviews.find(r => r.decision === 'sesuai');
    if (review) return { name: review.actorName, at: review.created, version: v.number };
  }
  return { name: '', at: '', version: 0 };
}
const toVersion = (r: RecordModel): ItemVersion => ({ id: r.id, number: Number(r.number), originalName: r.originalName || '', mime: r.mime || '', created: r.created, signed: Boolean(r.signed) });

async function attachmentsOf(pb: PocketBase, disbursementId: string): Promise<AttachmentInfo[]> {
  const rows = await pb.collection('attachments').getFullList({ filter: pb.filter('disbursement = {:d}', { d: disbursementId }), sort: '-number', ...opts });
  return rows.map(r => ({
    id: r.id, number: Number(r.number), size: Number(r.size || 0), pages: Number(r.pages || 0), sha256: r.sha256 || '', verification: r.verification || '', created: r.created, createdByName: r.createdByName || '',
    composition: (Array.isArray(r.composition) ? r.composition : []) as Composition[]
  }));
}

async function inspect(pb: PocketBase, campusId: string): Promise<Plan> {
  const ws = await workspace(pb, campusId);
  const rd = readinessOf(ws);
  const docs = ORDER.map(kind => ws.documents.find(d => d.kind === kind)!);
  const rowList = await pb.collection('document_versions').getFullList({ filter: docs.map(d => pb.filter('document = {:id}', { id: d.id })).join(' || '), fields: 'id,document,number,originalName,mime,r2Key,signed,created', sort: 'number', ...opts });
  const rows = new Map(rowList.map(r => [r.id, r]));
  const rabVersions = await listVersions(pb, campusId, ws.rab?.id || '');
  const approved = rabVersions.find(v => v.id === ws.rab?.id && v.status === 'disetujui') || null;
  const rab: ApprovedRab | null = approved ? { id: approved.id, number: approved.number, totalSen: approved.totalSen, term1Sen: approved.term1Sen, approvedByName: approved.approvedByName, approvedAt: approved.approvedAt, created: approved.created } : null;

  const items: LampiranItem[] = ORDER.map(kind => {
    const doc = docs.find(d => d.kind === kind)!;
    const base: LampiranItem = { entry: ENTRY_OF[kind], kind, label: ITEM_LABEL[kind], status: doc.status, version: null, skipped: false, ready: false, state: '', blocker: '', checkedByName: '', checkedAt: '', checkedVersion: 0 };
    if (kind === 'rab') {
      if (!rab) return { ...base, blocker: 'RAB 70% belum disetujui' };
      return { ...base, ready: true, state: `RAB terkelola versi ${rab.number}, disetujui`, checkedByName: rab.approvedByName, checkedAt: rab.approvedAt, version: { id: rab.id, number: rab.number, originalName: `RAB terkelola versi ${rab.number}`, mime: 'application/pdf', created: rab.approvedAt || rab.created, signed: false } };
    }
    const mine = rowList.filter(r => r.document === doc.id);
    if (SIGNED.includes(kind)) {
      const signed = [...mine].reverse().find(r => r.signed);
      if (!signed) return { ...base, blocker: 'Pindaian bertanda tangan belum diunggah di halaman Tanda tangan basah' };
      if (!partType(signed.originalName || '', signed.mime || '')) return { ...base, version: toVersion(signed), blocker: 'Unggah pindaian bertanda tangan dalam PDF atau gambar' };
      const mark = sesuaiMark(doc, signed.id);
      return { ...base, ready: true, version: toVersion(signed), state: `Versi ${signed.number}, pindaian bertanda tangan`, checkedByName: mark.name, checkedAt: mark.at, checkedVersion: mark.version };
    }
    if (kind === 'surat_kuasa' && rd.suratKuasaSkipped) return { ...base, skipped: true, ready: true, state: 'Tanpa surat kuasa' };
    const noun = kind === 'rekening' ? 'buku rekening' : 'surat kuasa';
    if (doc.status !== 'sesuai') return { ...base, blocker: 'Belum ditandai Sesuai di kartu pemeriksaan' };
    const scan = [...mine].reverse().find(r => partType(r.originalName || '', r.mime || ''));
    if (!scan) return { ...base, blocker: `Unggah pindaian ${noun} dalam PDF atau gambar` };
    const mark = sesuaiMark(doc, scan.id);
    return { ...base, ready: true, version: toVersion(scan), state: `Versi ${scan.number}, pindaian`, checkedByName: mark.name, checkedAt: mark.at, checkedVersion: mark.version };
  });
  const entries: LampiranEntry[] = ENTRY_TITLE.map((title, i) => ({ entry: i + 1, title, items: items.filter(it => it.entry === i + 1) }));
  const blockers = items.filter(i => i.blocker).map(i => `${i.label}: ${i.blocker}.`);
  if (!rd.lengkap) blockers.push(`Butir belum sesuai: ${rd.missing.join(', ') || 'lihat kartu pemeriksaan'}. Tandai Sesuai di kartu pemeriksaan.`);
  const ready = blockers.length === 0;
  const reason = ready ? '' : blockers.length === 1 ? 'Satu syarat belum terpenuhi. Lihat daftar di atas.' : `${blockers.length} syarat belum terpenuhi. Lihat daftar di atas.`;
  const paid = await pb.collection('disbursements').getOne(ws.disbursement.id, { fields: 'paidSen,paidAt,paidRef,paidByName,paidNote', ...opts });
  const view: LampiranView = {
    campus: { id: ws.campus.id, name: ws.campus.name, code: ws.campus.code, programYear: ws.campus.programYear },
    summary: { skNumber: ws.summary.skNumber, amountSen: ws.summary.amountSen, limitSen: ws.summary.limitSen, requestedSen: ws.summary.requestedSen, term2Sen: ws.summary.term2Sen, programYear: ws.summary.programYear },
    stage: ws.disbursement.stage, entries, readiness: rd, blockers, ready, reason, attachments: await attachmentsOf(pb, ws.disbursement.id),
    payment: { requestedSen: ws.summary.requestedSen, paidSen: Number(paid.paidSen || 0), paidAt: paid.paidAt ? String(paid.paidAt).slice(0, 10) : '', paidRef: paid.paidRef || '', paidByName: paid.paidByName || '', paidNote: paid.paidNote || '' }
  };
  return { ws, view, rows, rab };
}

export async function readiness(pb: PocketBase, campusId: string): Promise<LampiranView> {
  return (await inspect(pb, campusId)).view;
}

/* ---------- PDF composition (pure: bytes in, bytes out) ---------- */

export interface RabPrint { number: number; lines: RabLine[]; totalSen: number; term1Sen: number; approvedByName: string; approvedAt: string }
export interface ComposePart { kind: SourceKind; label: string; number: number; originalName: string; type: PartType | 'rab'; bytes?: Uint8Array; rab?: RabPrint; checkedByName: string; checkedAt: string; checkedVersion: number }
export interface ComposeInput {
  campusName: string; code: string; skNumber: string; programYear: string; amountSen: number; limitSen: number; requestedSen: number; term2Sen: number;
  createdByName: string; createdAt: Date; parts: ComposePart[]; skipped: { label: string; note: string }[];
  verification: { code: string; url: string; line: string };
  /** Text stamped diagonally on every page of a preview; empty for the saved file. */
  watermark: string;
}
interface Fonts { regular: PDFFont; bold: PDFFont; oblique: PDFFont }
const [A4_W, A4_H] = PageSizes.A4;
const MARGIN = 56;
const INK = rgb(0.06, 0.14, 0.30);
const MUTED = rgb(0.28, 0.33, 0.41);
const GREY = rgb(0.45, 0.45, 0.45);
const BRAND = rgb(0, 0.4, 0.698);
const RULE = rgb(0.85, 0.89, 0.94);
const QR_SIDE = 39.7;
const FOOTER_GUTTER = 28;
const FOOTER_BOTTOM = 12;

/** Keeps only characters the built in fonts can encode. Accents are reduced to their base letter. */
export const safeText = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').replace(/\s+/g, ' ').trim();
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of safeText(text).split(' ')) {
    let piece = word;
    while (font.widthOfTextAtSize(piece, size) > maxWidth) {
      let cut = piece.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(piece.slice(0, cut), size) > maxWidth) cut--;
      if (line) { lines.push(line); line = ''; }
      lines.push(piece.slice(0, cut)); piece = piece.slice(cut);
    }
    const candidate = line ? line + ' ' + piece : piece;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) { lines.push(line); line = piece; } else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
const yearLabel = (year: string) => (year === 'kedua' ? 'Tahun Kedua' : year === 'ketiga' ? 'Tahun Ketiga' : year || '');
const dateLong = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
const dateShort = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const when = (iso: string, long = false) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : (long ? dateLong : dateShort).format(d); };

/**
 * Visual frame of a page: copied scans may carry a /Rotate, so the bottom margin the reader sees is not always the page's own bottom.
 * map() turns visual coordinates (origin bottom left as displayed) into page coordinates; drawings then rotate by the same angle.
 */
function frame(page: PDFPage) {
  const { width: W, height: H } = page.getSize();
  const angle = ((Math.round(page.getRotation().angle / 90) * 90) % 360 + 360) % 360;
  const sideways = angle === 90 || angle === 270;
  const map = (vx: number, vy: number) => angle === 90 ? { x: W - vy, y: vx } : angle === 180 ? { x: W - vx, y: H - vy } : angle === 270 ? { x: vy, y: H - vx } : { x: vx, y: vy };
  return { vw: sideways ? H : W, vh: sideways ? W : H, angle, map };
}
type Frame = ReturnType<typeof frame>;
function text(page: PDFPage, f: Frame, value: string, vx: number, vy: number, size: number, font: PDFFont, color = INK, extra: { opacity?: number; tilt?: number } = {}) {
  const p = f.map(vx, vy);
  page.drawText(safeText(value), { x: p.x, y: p.y, size, font, color, rotate: degrees(f.angle + (extra.tilt || 0)), opacity: extra.opacity });
}
function rect(page: PDFPage, f: Frame, vx: number, vy: number, width: number, height: number, color: ReturnType<typeof rgb>) {
  const p = f.map(vx, vy);
  page.drawRectangle({ x: p.x, y: p.y, width, height, color, rotate: degrees(f.angle) });
}

/** Bottom margin of every page: the QR, the issuer and verification lines, and the page number. */
function drawFooter(page: PDFPage, n: number, total: number, fonts: Fonts, qr: QrMatrix, line: string) {
  const f = frame(page);
  const cell = QR_SIDE / qr.size;
  const quiet = 2 * cell;
  rect(page, f, FOOTER_GUTTER - quiet, FOOTER_BOTTOM - quiet, QR_SIDE + 2 * quiet, QR_SIDE + 2 * quiet, rgb(1, 1, 1));
  for (let row = 0; row < qr.size; row++) for (let col = 0; col < qr.size; col++) {
    if (qr.dark(row, col)) rect(page, f, FOOTER_GUTTER + col * cell, FOOTER_BOTTOM + QR_SIDE - (row + 1) * cell, cell + 0.15, cell + 0.15, rgb(0, 0, 0));
  }
  const tx = FOOTER_GUTTER + QR_SIDE + 8;
  text(page, f, ISSUER_LINE, tx, FOOTER_BOTTOM + QR_SIDE - 9, 7, fonts.regular, GREY);
  text(page, f, line, tx, FOOTER_BOTTOM + QR_SIDE - 20, 7, fonts.regular, GREY);
  const pageText = `Halaman ${n} dari ${total}`;
  text(page, f, pageText, f.vw - FOOTER_GUTTER - fonts.regular.widthOfTextAtSize(pageText, 7), FOOTER_BOTTOM + QR_SIDE - 20, 7, fonts.regular, GREY);
}
/** Light grey diagonal stamp across the page centre. */
function drawWatermark(page: PDFPage, value: string, font: PDFFont) {
  const f = frame(page);
  const size = Math.min(96, f.vw / 6);
  const w = font.widthOfTextAtSize(value, size), h = size * 0.7;
  const th = Math.PI / 4;
  const ox = f.vw / 2 - (w / 2) * Math.cos(th) + (h / 2) * Math.sin(th);
  const oy = f.vh / 2 - (w / 2) * Math.sin(th) - (h / 2) * Math.cos(th);
  text(page, f, value, ox, oy, size, font, rgb(0.55, 0.6, 0.68), { opacity: 0.16, tilt: 45 });
}

export async function composeLampiran(input: ComposeInput): Promise<{ bytes: Uint8Array; pages: number }> {
  const doc = await PDFDocument.create();
  doc.setTitle(safeText(`Lampiran Pencairan Tahap 1 ${input.code}`));
  doc.setAuthor('Dashboard DEB');
  const fonts: Fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold), oblique: await doc.embedFont(StandardFonts.HelveticaOblique) };
  const ranges: { part: ComposePart; from: number; to: number }[] = [];
  for (const part of input.parts) {
    const from = doc.getPageCount() + 1;
    try {
      if (part.type === 'rab') drawRab(doc, input, part.rab!, fonts);
      else if (part.type === 'pdf') {
        const source = await PDFDocument.load(part.bytes!, { ignoreEncryption: true });
        const pages = await doc.copyPages(source, source.getPageIndices());
        for (const page of pages) doc.addPage(page);
      } else {
        const image = part.type === 'jpg' ? await doc.embedJpg(part.bytes!) : await doc.embedPng(part.bytes!);
        const page = doc.addPage(PageSizes.A4);
        const scale = Math.min((A4_W - 2 * 36) / image.width, (A4_H - 36 - 64) / image.height);
        const width = image.width * scale, height = image.height * scale;
        page.drawImage(image, { x: (A4_W - width) / 2, y: 64 + (A4_H - 36 - 64 - height) / 2, width, height });
      }
    } catch (error) {
      if (error instanceof PreviewError) throw error;
      throw new PreviewError(400, `Berkas ${part.label} tidak dapat dibaca. Unggah ulang pindaian PDF.`);
    }
    ranges.push({ part, from, to: doc.getPageCount() });
  }
  drawSummary(doc, input, ranges, fonts);
  const total = doc.getPageCount();
  const qr = qrMatrix(input.verification.url);
  doc.getPages().forEach((page, i) => {
    drawFooter(page, i + 1, total, fonts, qr, input.verification.line);
    if (input.watermark) drawWatermark(page, input.watermark, fonts.bold);
  });
  return { bytes: await doc.save(), pages: total };
}

/* RAB print: landscape pages, the tree indented by level, sums on the parents, totals at the end. */
const L_W = A4_H, L_H = A4_W;
const RAB_X = 40, RAB_TOP = 48, RAB_BOTTOM = 70;
const RAB_COLS: { title: string; w: number; right?: boolean }[] = [
  { title: 'Kode', w: 52 }, { title: 'Uraian', w: 300 }, { title: 'Volume', w: 50, right: true }, { title: 'Satuan', w: 52 },
  { title: 'Harga satuan (Rp)', w: 100, right: true }, { title: 'Jumlah (Rp)', w: 104, right: true }, { title: 'Alokasi Termin 1 (Rp)', w: 104, right: true }
];
const RAB_WIDTH = RAB_COLS.reduce((n, c) => n + c.w, 0);
function drawRab(doc: PDFDocument, input: ComposeInput, rab: RabPrint, fonts: Fonts) {
  let page = doc.addPage([L_W, L_H]);
  let y = L_H - RAB_TOP;
  const draw = (value: string, x: number, yy: number, size: number, font: PDFFont, color = INK) => page.drawText(safeText(value), { x, y: yy, size, font, color });
  const cellText = (value: string, col: number, yy: number, size: number, font: PDFFont, color = INK, indent = 0) => {
    const x = RAB_X + RAB_COLS.slice(0, col).reduce((n, c) => n + c.w, 0);
    const s = safeText(value);
    if (RAB_COLS[col].right) draw(s, x + RAB_COLS[col].w - 4 - font.widthOfTextAtSize(s, size), yy, size, font, color);
    else draw(s, x + 4 + indent, yy, size, font, color);
  };
  const header = () => {
    page.drawRectangle({ x: RAB_X, y: y - 18, width: RAB_WIDTH, height: 18, color: BRAND });
    RAB_COLS.forEach((c, i) => cellText(c.title, i, y - 12.5, 8, fonts.bold, rgb(1, 1, 1)));
    y -= 18;
  };
  draw('RAB dan Rencana Realisasi Program 70%', RAB_X, y - 14, 14, fonts.bold);
  y -= 22;
  draw(input.campusName, RAB_X, y - 11, 11, fonts.regular);
  y -= 17;
  draw(`Nilai SK ${formatSen(input.amountSen)}    Batas Tahap 1 (70%) ${formatSen(input.limitSen)}    Alokasi Termin 1 ${formatSen(rab.term1Sen)} (${formatPercent(percentOf(rab.term1Sen, input.amountSen))} dari Nilai SK)`, RAB_X, y - 9.5, 9.5, fonts.regular, MUTED);
  y -= 20;
  header();
  const money = (sen: number) => (sen ? formatSen(sen, false) : '');
  for (const line of rab.lines) {
    const level = Math.min(Math.max(Number(line.level) || 1, 1), MAX_LEVEL);
    const font = level === 1 || level === 2 ? fonts.bold : level === 3 ? fonts.oblique : fonts.regular;
    const indent = (level - 1) * 10;
    const title = wrap(line.title || '', font, 8, RAB_COLS[1].w - 8 - indent);
    const h = title.length * 9.5 + 5;
    if (y - h < RAB_BOTTOM) { page = doc.addPage([L_W, L_H]); y = L_H - RAB_TOP; header(); }
    if (level === 1) page.drawRectangle({ x: RAB_X, y: y - h, width: RAB_WIDTH, height: h, color: rgb(0.93, 0.96, 1) });
    page.drawLine({ start: { x: RAB_X, y: y - h }, end: { x: RAB_X + RAB_WIDTH, y: y - h }, thickness: 0.4, color: RULE });
    const base = y - 11;
    cellText(line.code || '', 0, base, 8, font);
    title.forEach((t, i) => cellText(t, 1, base - i * 9.5, 8, font, INK, indent));
    if (level === MAX_LEVEL) {
      cellText(line.volume ? formatVolume(line.volume) : '', 2, base, 8, font);
      cellText(line.unit || '', 3, base, 8, font);
      cellText(money(line.unitPriceSen), 4, base, 8, font);
    }
    cellText(money(line.amountSen), 5, base, 8, font);
    cellText(money(line.term1Sen), 6, base, 8, font);
    y -= h;
  }
  if (y - 40 < RAB_BOTTOM) { page = doc.addPage([L_W, L_H]); y = L_H - RAB_TOP; }
  page.drawRectangle({ x: RAB_X, y: y - 20, width: RAB_WIDTH, height: 20, color: rgb(0.89, 0.93, 0.98) });
  cellText('Total', 1, y - 13.5, 9, fonts.bold);
  cellText(formatSen(rab.totalSen, false), 5, y - 13.5, 9, fonts.bold);
  cellText(formatSen(rab.term1Sen, false), 6, y - 13.5, 9, fonts.bold);
  y -= 30;
  const approved = rab.approvedByName ? `RAB terkelola versi ${rab.number}, disetujui oleh ${rab.approvedByName}${rab.approvedAt ? ` pada ${when(rab.approvedAt)}` : ''}.` : `RAB terkelola versi ${rab.number}.`;
  draw(approved, RAB_X, y, 8.5, fonts.regular, MUTED);
  y -= 12;
  const total = rab.totalSen === input.amountSen ? 'Total RAB sama dengan Nilai SK.' : `Total RAB ${formatSen(rab.totalSen)}, Nilai SK ${formatSen(input.amountSen)}.`;
  const within = rab.term1Sen <= input.limitSen ? 'tidak melebihi' : 'melebihi';
  draw(`${total} Alokasi Termin 1 ${formatSen(rab.term1Sen)} ${within} batas ${formatSen(input.limitSen)}. Sisa ${formatSen(input.amountSen - rab.term1Sen)} untuk Tahap 2.`, RAB_X, y, 8.5, fonts.regular, MUTED);
}

/* Summary page at the end: contents with page ranges, the amounts, who marked each source Sesuai and when. */
function drawSummary(doc: PDFDocument, input: ComposeInput, ranges: { part: ComposePart; from: number; to: number }[], fonts: Fonts) {
  const from = doc.getPageCount() + 1;
  let page = doc.addPage(PageSizes.A4);
  let y = A4_H - MARGIN;
  const width = A4_W - 2 * MARGIN;
  const ensure = (h: number) => { if (y - h < 80) { page = doc.addPage(PageSizes.A4); y = A4_H - MARGIN; } };
  const line = (value: string, font: PDFFont, size: number, color = INK, gap = 4, indent = 0) => {
    for (const l of wrap(value, font, size, width - indent)) { ensure(size + gap); y -= size; page.drawText(l, { x: MARGIN + indent, y, size, font, color }); y -= gap; }
  };
  page.drawRectangle({ x: 0, y: A4_H - 28, width: A4_W, height: 28, color: BRAND });
  page.drawText('DASHBOARD DEB', { x: MARGIN, y: A4_H - 19, size: 10, font: fonts.bold, color: rgb(1, 1, 1) });
  page.drawText('Pertamina Foundation', { x: A4_W - MARGIN - fonts.bold.widthOfTextAtSize('Pertamina Foundation', 10), y: A4_H - 19, size: 10, font: fonts.bold, color: rgb(1, 1, 1) });
  y -= 20;
  line('LEMBAR RINGKASAN LAMPIRAN PENCAIRAN TAHAP 1', fonts.bold, 16, INK, 6);
  line('Program Desa Energi Berdikari (DEB), Pertamina Foundation', fonts.regular, 11, MUTED, 14);
  const rows: [string, string][] = [
    ['Perguruan tinggi', input.campusName], ['Kode kampus', input.code], ['Tahun program', yearLabel(input.programYear)], ['Nomor SK', input.skNumber],
    ['Nilai SK', formatSen(input.amountSen)], ['Batas Tahap 1 (70%)', formatSen(input.limitSen)], ['Diajukan (Tahap 1)', formatSen(input.requestedSen)], ['Sisa untuk Tahap 2', formatSen(input.term2Sen)]
  ];
  const labelWidth = 150;
  for (const [label, value] of rows) {
    const lines = wrap(value, fonts.bold, 11, width - labelWidth);
    ensure(lines.length * 16 + 3);
    page.drawText(safeText(label), { x: MARGIN, y: y - 11, size: 10.5, font: fonts.regular, color: MUTED });
    for (const l of lines) { y -= 11; page.drawText(l, { x: MARGIN + labelWidth, y, size: 11, font: fonts.bold, color: INK }); y -= 5; }
    y -= 3;
  }
  y -= 8;
  ensure(30);
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4_W - MARGIN, y }, thickness: 0.8, color: RULE });
  y -= 18;
  const total = ranges.length ? ranges[ranges.length - 1].to : 0;
  line(`Daftar isi (${total + 1} halaman)`, fonts.bold, 13, INK, 8);
  let n = 0;
  for (const r of ranges) {
    n++;
    const pages = r.from === r.to ? `halaman ${r.from}` : `halaman ${r.from} sampai ${r.to}`;
    line(`${n}. ${r.part.label} (${pages})`, fonts.regular, 10.5, INK, 1);
    const source = r.part.type === 'rab' ? `RAB terkelola versi ${r.part.number}` : `Versi ${r.part.number}, berkas ${r.part.originalName}`;
    const mark = r.part.checkedByName
      ? (r.part.type === 'rab' ? `Disetujui oleh ${r.part.checkedByName}` : `Ditandai Sesuai oleh ${r.part.checkedByName}`) + (r.part.checkedAt ? ` pada ${when(r.part.checkedAt, true)} WIB` : '') + (r.part.checkedVersion ? ` (versi ${r.part.checkedVersion})` : '')
      : 'Catatan Sesuai belum tercatat';
    line(`${source}. ${mark}.`, fonts.regular, 9, MUTED, 5, 14);
  }
  for (const s of input.skipped) { n++; line(`${n}. ${s.label}: ${s.note}`, fonts.regular, 10.5, INK, 6); }
  line(`${n + 1}. Lembar ringkasan (halaman ${from})`, fonts.regular, 10.5, INK, 12);
  line(`Dibuat oleh ${input.createdByName} pada ${dateLong.format(input.createdAt)} WIB.`, fonts.regular, 9, MUTED, 3);
  line(`Kode verifikasi ${input.verification.code}. SHA-256 berkas ini tercantum di halaman verifikasi.`, fonts.regular, 9, MUTED, 3);
  line('Setiap dokumen di dalam lampiran ini adalah salinan berkas yang tersimpan di Dashboard DEB.', fonts.regular, 9, MUTED, 3);
}

/* ---------- Build, preview, store ---------- */

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/** Loads the sources of one campus and builds the PDF with the given verification code. */
async function assemble(pb: PocketBase, store: Storage, settings: Record<string, string>, plan: Plan, createdByName: string, verification: { code: string; watermark: string }) {
  const { view, rows, rab } = plan;
  if (!view.ready) throw new PreviewError(400, view.reason);
  const parts: ComposePart[] = [];
  const skipped: { label: string; note: string }[] = [];
  const composition: Composition[] = [];
  for (const kind of ORDER) {
    const item = view.entries.flatMap(e => e.items).find(i => i.kind === kind)!;
    if (item.skipped) { skipped.push({ label: item.label, note: item.state }); composition.push({ kind, versionId: '', number: 0, originalName: '', note: item.state }); continue; }
    if (kind === 'rab') {
      const lines = await versionLines(pb, rab!.id);
      if (!lines.length) throw new PreviewError(400, 'RAB 70% belum berisi baris.');
      parts.push({ kind, label: item.label, number: rab!.number, originalName: item.version!.originalName, type: 'rab', rab: { number: rab!.number, lines, totalSen: rab!.totalSen, term1Sen: rab!.term1Sen, approvedByName: rab!.approvedByName, approvedAt: rab!.approvedAt }, checkedByName: item.checkedByName, checkedAt: item.checkedAt, checkedVersion: 0 });
      composition.push({ kind, versionId: rab!.id, number: rab!.number, originalName: item.version!.originalName });
      continue;
    }
    const row = rows.get(item.version!.id);
    if (!row?.r2Key) throw new PreviewError(404, `Berkas ${item.label} tidak ditemukan.`);
    const bytes = new Uint8Array(await (await store.get(row.r2Key)).arrayBuffer());
    parts.push({ kind, label: item.label, number: item.version!.number, originalName: item.version!.originalName, type: partType(item.version!.originalName, item.version!.mime)!, bytes, checkedByName: item.checkedByName, checkedAt: item.checkedAt, checkedVersion: item.checkedVersion });
    composition.push({ kind, versionId: item.version!.id, number: item.version!.number, originalName: item.version!.originalName });
  }
  const createdAt = new Date();
  const built = await composeLampiran({
    campusName: view.campus.name, code: view.campus.code, skNumber: view.summary.skNumber, programYear: view.summary.programYear,
    amountSen: view.summary.amountSen, limitSen: view.summary.limitSen, requestedSen: view.summary.requestedSen, term2Sen: view.summary.term2Sen,
    createdByName, createdAt, parts, skipped,
    verification: { code: verification.code, url: verificationUrl(settings, verification.code), line: verificationLine(settings, verification.code) }, watermark: verification.watermark
  });
  return { ...built, composition, createdAt };
}

/** The merged file with the sample code and the PRATINJAU stamp; nothing is stored. */
export async function previewAttachment(pb: PocketBase, store: Storage, settings: Record<string, string>, campusId: string, createdByName: string) {
  const plan = await inspect(pb, campusId);
  const { bytes, pages } = await assemble(pb, store, settings, plan, createdByName, { code: SAMPLE_CODE, watermark: 'PRATINJAU' });
  return { bytes, pages };
}

/** Builds, stores and records the next attachment number with its hash and verification code. */
export async function saveAttachment(pb: PocketBase, store: Storage, settings: Record<string, string>, actor: Actor, campusId: string) {
  const plan = await inspect(pb, campusId);
  const { view, ws } = plan;
  const createdByName = actor.name || actor.email || 'Sistem';
  const code = await mintCode(pb, view.campus.code, TERM, 'lampiran');
  const { bytes, pages, composition, createdAt } = await assemble(pb, store, settings, plan, createdByName, { code, watermark: '' });
  const last = await pb.collection('attachments').getList(1, 1, { filter: pb.filter('disbursement = {:d}', { d: ws.disbursement.id }), sort: '-number', fields: 'number', ...opts });
  const number = (last.items[0]?.number || 0) + 1;
  const stamp = createdAt.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const key = `kampus/${view.campus.code}/termin-${TERM}/lampiran/v${number}_${stamp}.pdf`;
  await store.put(key, bytes, 'application/pdf');
  const sha256 = await sha256Hex(bytes);
  const record = await pb.collection('attachments').create({ disbursement: ws.disbursement.id, number, r2Key: key, size: bytes.byteLength, composition, createdBy: actor.id, createdByName, sha256, verification: code, pages }, opts);
  await createVerification(pb, { code, campus: campusId, term: TERM, kind: 'lampiran', attachment: record.id, sha256, amountSen: view.summary.requestedSen, label: `Lampiran pencairan Termin 1 ${view.campus.name}`, issuedBy: actor.id, issuedByName: createdByName });
  await writeAudit(pb, {
    actor, action: `menyimpan lampiran Tahap 1 nomor ${number}`, context: context(campusId), collection: 'attachments', record: record.id, campus: campusId,
    after: { nomor: number, halaman: pages, ukuran: `${Math.round(bytes.byteLength / 1024)} KB`, kode: code, sha256, sumber: composition.map(c => c.note ? `${KIND_SHORT[c.kind]} ${c.note.toLowerCase()}` : `${KIND_SHORT[c.kind]} v${c.number}`).join(', ') }
  });
  if (ws.disbursement.stage < LAMPIRAN_STAGE) await updateDisbursement(pb, actor, campusId, { stage: LAMPIRAN_STAGE });
  return record;
}

export function previewResponse(bytes: Uint8Array) {
  return new Response(new Uint8Array(bytes).buffer, { status: 200, headers: {
    'Content-Type': 'application/pdf', 'Content-Length': String(bytes.byteLength), 'Content-Disposition': 'inline; filename="Pratinjau-Lampiran-Tahap-1.pdf"',
    'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff'
  } });
}

/** Streams one saved attachment as a download. */
export async function attachmentResponse(pb: PocketBase, store: Storage, campusId: string, number: number) {
  const found = await pb.collection('disbursements').getList(1, 1, { filter: pb.filter('campus = {:c} && term = {:t}', { c: campusId, t: TERM }), ...opts });
  const disbursement = found.items[0];
  if (!disbursement) throw new PreviewError(404, 'Lampiran tidak ditemukan.');
  const rows = await pb.collection('attachments').getList(1, 1, { filter: pb.filter('disbursement = {:d} && number = {:n}', { d: disbursement.id, n: number }), ...opts });
  const attachment = rows.items[0];
  if (!attachment?.r2Key) throw new PreviewError(404, 'Lampiran tidak ditemukan.');
  const campus = await pb.collection('campuses').getOne(campusId, { fields: 'id,code,acronym,initials', ...opts });
  const code = String(campus.code || campus.acronym || campus.initials || 'kampus');
  const source = await store.get(attachment.r2Key);
  const headers = new Headers();
  headers.set('Content-Type', 'application/pdf');
  if (attachment.size) headers.set('Content-Length', String(attachment.size));
  headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`Lampiran-Tahap-1_${code}_${number}.pdf`)}`);
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(source.body, { status: 200, headers });
}
