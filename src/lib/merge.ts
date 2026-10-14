/**
 * Mail merge of the four documents the system generates in step 6: PKS, Surat permohonan, Invois and Kuitansi.
 * Pure TypeScript, the same code runs in the browser and on the server. The templates in static/templat are produced by
 * scripts/templat/convert.py from the official Word formats; every placeholder below is a docxtemplater tag in one of them.
 *
 * Placeholder            Source               Meaning
 * namaPerguruanTinggi    SK                   campus name as written in the SK (also ...Kapital, in capitals)
 * judulProgram           SK or Profil DEB     program title (also ...Kapital)
 * tahunProgram           SK                   "Kedua" or "Ketiga" (also ...Kapital "KEDUA", ...Kecil "kedua")
 * nomorSk, tanggalSk     SK                   SK number, SK date in words
 * nilaiBantuan           SK                   Nilai Kegiatan, e.g. Rp74.999.000 (also ...Terbilang, in words)
 * alamatPerguruanTinggi  Profil DEB           street address and region on one line
 * lokasiProgram          Profil DEB           village, district and regency of the program
 * namaPenandatangan      Properti dokumen     campus signatory and title, falling back to Profil DEB (also jabatan..., ...Kapital)
 * namaMentor             Profil DEB           first mentor name; namaKoordinator: first coordinator name
 * nomorPksPf             Properti dokumen     PKS number of Pertamina Foundation; nomorPksKampus: the campus number
 * hariPerjanjian         Properti dokumen     agreement date split for the PKS: day name, day in words, month, year in words, dd-mm-yyyy
 * nomorSuratPermohonan   Properti dokumen     letter number; tanggalSuratPermohonan: its date in words; tempatSurat: the city
 * nomorInvois            Properti dokumen     invoice number; tanggalInvois: its date in words
 * nomorKuitansi          Properti dokumen     receipt number; tanggalKuitansi: its date in words
 * termin1                RAB                  Termin 1 requested, e.g. Rp52.499.300 (also ...Terbilang, in words)
 * namaBank               Rekening             bank name; nomorRekening: account number; namaPemilikRekening: holder names
 * pfSignatoryName        Pengaturan program   Pertamina Foundation signatory and title (also ...Kapital)
 * masaPerjanjianMulai    Pengaturan program   agreement period start and masaPerjanjianSelesai end, in words
 * batasLaporan           Pengaturan program   report deadline in words
 */
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { formatSen, terbilang } from './pencairan';
import { parseContacts } from './contacts';

export const MERGE_KINDS = ['pks', 'permohonan', 'invois', 'kuitansi'] as const;
export type MergeKind = (typeof MERGE_KINDS)[number];
export const isMergeKind = (value: string): value is MergeKind => (MERGE_KINDS as readonly string[]).includes(value);
export const MERGE_LABEL: Record<MergeKind, string> = { pks: 'PKS', permohonan: 'Surat permohonan', invois: 'Invois', kuitansi: 'Kuitansi' };
/** File names under static/templat. */
export const TEMPLATE_FILE: Record<MergeKind, string> = { pks: 'pks-standar.docx', permohonan: 'permohonan.docx', invois: 'invois.docx', kuitansi: 'kuitansi.docx' };
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type Source = 'SK' | 'Profil DEB' | 'Properti dokumen' | 'RAB' | 'Rekening' | 'Pengaturan program';
export interface PlaceholderInfo { label: string; source: Source }
export const PLACEHOLDERS: Record<string, PlaceholderInfo> = {
  namaPerguruanTinggi: { label: 'Nama perguruan tinggi', source: 'SK' }, namaPerguruanTinggiKapital: { label: 'Nama perguruan tinggi', source: 'SK' },
  judulProgram: { label: 'Judul program', source: 'Profil DEB' }, judulProgramKapital: { label: 'Judul program', source: 'Profil DEB' },
  tahunProgram: { label: 'Tahun program', source: 'SK' }, tahunProgramKapital: { label: 'Tahun program', source: 'SK' }, tahunProgramKecil: { label: 'Tahun program', source: 'SK' },
  nomorSk: { label: 'Nomor SK', source: 'SK' }, tanggalSk: { label: 'Tanggal SK', source: 'SK' },
  nilaiBantuan: { label: 'Nilai Kegiatan', source: 'SK' }, nilaiBantuanTerbilang: { label: 'Nilai Kegiatan terbilang', source: 'SK' },
  alamatPerguruanTinggi: { label: 'Alamat kampus', source: 'Profil DEB' }, lokasiProgram: { label: 'Lokasi program', source: 'Profil DEB' },
  namaPenandatangan: { label: 'Pejabat penandatangan kampus', source: 'Properti dokumen' }, namaPenandatanganKapital: { label: 'Pejabat penandatangan kampus', source: 'Properti dokumen' },
  jabatanPenandatangan: { label: 'Jabatan pejabat penandatangan', source: 'Properti dokumen' }, jabatanPenandatanganKapital: { label: 'Jabatan pejabat penandatangan', source: 'Properti dokumen' },
  namaMentor: { label: 'Nama mentor', source: 'Profil DEB' }, namaKoordinator: { label: 'Nama koordinator', source: 'Profil DEB' },
  nomorPksPf: { label: 'Nomor PKS Pertamina Foundation', source: 'Properti dokumen' }, nomorPksKampus: { label: 'Nomor PKS kampus', source: 'Properti dokumen' },
  hariPerjanjian: { label: 'Tanggal perjanjian', source: 'Properti dokumen' }, tanggalPerjanjianHuruf: { label: 'Tanggal perjanjian', source: 'Properti dokumen' },
  bulanPerjanjian: { label: 'Tanggal perjanjian', source: 'Properti dokumen' }, tahunPerjanjianHuruf: { label: 'Tanggal perjanjian', source: 'Properti dokumen' }, tanggalPerjanjianAngka: { label: 'Tanggal perjanjian', source: 'Properti dokumen' },
  nomorSuratPermohonan: { label: 'Nomor surat permohonan', source: 'Properti dokumen' }, tanggalSuratPermohonan: { label: 'Tanggal surat permohonan', source: 'Properti dokumen' }, tempatSurat: { label: 'Tempat surat dibuat', source: 'Properti dokumen' },
  nomorInvois: { label: 'Nomor invois', source: 'Properti dokumen' }, tanggalInvois: { label: 'Tanggal invois', source: 'Properti dokumen' },
  nomorKuitansi: { label: 'Nomor kuitansi', source: 'Properti dokumen' }, tanggalKuitansi: { label: 'Tanggal kuitansi', source: 'Properti dokumen' },
  termin1: { label: 'Nominal Termin 1', source: 'RAB' }, termin1Terbilang: { label: 'Nominal Termin 1 terbilang', source: 'RAB' },
  namaBank: { label: 'Nama bank', source: 'Rekening' }, nomorRekening: { label: 'Nomor rekening', source: 'Rekening' }, namaPemilikRekening: { label: 'Nama pemilik rekening', source: 'Rekening' },
  pfSignatoryName: { label: 'Penandatangan Pertamina Foundation', source: 'Pengaturan program' }, pfSignatoryNameKapital: { label: 'Penandatangan Pertamina Foundation', source: 'Pengaturan program' },
  pfSignatoryTitle: { label: 'Jabatan penandatangan Pertamina Foundation', source: 'Pengaturan program' }, pfSignatoryTitleKapital: { label: 'Jabatan penandatangan Pertamina Foundation', source: 'Pengaturan program' },
  masaPerjanjianMulai: { label: 'Masa perjanjian mulai', source: 'Pengaturan program' }, masaPerjanjianSelesai: { label: 'Masa perjanjian selesai', source: 'Pengaturan program' },
  batasLaporan: { label: 'Batas waktu laporan', source: 'Pengaturan program' }
};

/** Disbursement properties typed once in Buat dokumen (Q1). Keys match updateDisbursement in the server module. */
export const PROPERTY_FIELDS: { key: string; label: string; type: 'text' | 'date'; hint?: string }[] = [
  { key: 'nomorPksPf', label: 'Nomor PKS Pertamina Foundation', type: 'text' },
  { key: 'nomorPksKampus', label: 'Nomor PKS kampus', type: 'text' },
  { key: 'tanggalPerjanjian', label: 'Tanggal perjanjian', type: 'date' },
  { key: 'nomorSuratPermohonan', label: 'Nomor surat permohonan', type: 'text' },
  { key: 'tanggalSuratPermohonan', label: 'Tanggal surat permohonan', type: 'date' },
  { key: 'nomorInvois', label: 'Nomor invois', type: 'text' },
  { key: 'tanggalInvois', label: 'Tanggal invois', type: 'date' },
  { key: 'nomorKuitansi', label: 'Nomor kuitansi', type: 'text' },
  { key: 'tanggalKuitansi', label: 'Tanggal kuitansi', type: 'date' },
  { key: 'tempatTandaTangan', label: 'Tempat surat dibuat', type: 'text', hint: 'Kota tempat surat permohonan dibuat.' },
  { key: 'penandatanganNama', label: 'Pejabat penandatangan kampus', type: 'text', hint: 'Nama pejabat yang menandatangani PKS mewakili kampus.' },
  { key: 'penandatanganJabatan', label: 'Jabatan pejabat penandatangan', type: 'text' }
];

export interface MergeInput {
  campus: { name: string; code?: string; city?: string; programYear?: string; theme?: string; program?: Record<string, unknown> | null };
  award: { skNumber?: string; skDate?: string; amountSen: number; programTitle?: string; programYear?: string };
  settings?: { pfSignatoryName?: string; pfSignatoryTitle?: string; agreementStart?: string; agreementEnd?: string; reportDeadline?: string } | null;
  disbursement: { requestedSen: number; properties: Record<string, unknown> };
  /** Typed fields of the current Buku rekening version. */
  rekening?: Record<string, unknown> | null;
}
export type MergeData = Record<string, string>;
export interface Missing { key: string; label: string; source: Source | '' }

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const SMALL = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

/** Indonesian words for a whole number, e.g. 2026 becomes "Dua Ribu Dua Puluh Enam". */
export function numberWords(n: number): string {
  const words = (v: number): string => {
    if (v < 12) return SMALL[v];
    if (v < 20) return words(v - 10) + ' Belas';
    if (v < 100) return words(Math.floor(v / 10)) + ' Puluh ' + words(v % 10);
    if (v < 200) return 'Seratus ' + words(v - 100);
    if (v < 1000) return words(Math.floor(v / 100)) + ' Ratus ' + words(v % 100);
    if (v < 2000) return 'Seribu ' + words(v - 1000);
    if (v < 1e6) return words(Math.floor(v / 1e3)) + ' Ribu ' + words(v % 1e3);
    return words(Math.floor(v / 1e6)) + ' Juta ' + words(v % 1e6);
  };
  const abs = Math.abs(Math.round(n));
  return abs ? words(abs).replace(/\s+/g, ' ').trim() : 'Nol';
}

/** Year, month and day of a stored date ("2026-09-19", "2026-06-02 00:00:00.000Z" or an ISO string). Null when unreadable. */
export function dateParts(value: unknown): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? '').trim());
  if (!match) return null;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}
/** "19 September 2026" for a stored date; free text is returned as typed; empty when there is nothing. */
export function dateWords(value: unknown): string {
  const parts = dateParts(value);
  if (!parts) return String(value ?? '').trim();
  return `${parts.d} ${MONTHS[parts.m - 1]} ${parts.y}`;
}
const dayName = ({ y, m, d }: { y: number; m: number; d: number }) => DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
const two = (n: number) => String(n).padStart(2, '0');
const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());
const upper = (value: string) => value.toLocaleUpperCase('id-ID');
const firstName = (value: unknown) => parseContacts(text(value))[0]?.name || '';

/** Values for every placeholder. Empty strings mark what is still missing. */
export function buildMergeData(input: MergeInput): MergeData {
  const program = (input.campus.program || {}) as Record<string, unknown>;
  const props = input.disbursement.properties || {};
  const settings = input.settings || {};
  const rekening = input.rekening || {};
  const year = text(input.award.programYear || input.campus.programYear).toLowerCase();
  const tahun = year === 'kedua' ? 'Kedua' : year === 'ketiga' ? 'Ketiga' : '';
  const judul = text(input.award.programTitle) || text(program.programTitle);
  const region = [text(program.village), text(program.district) && `Kec. ${text(program.district)}`, text(program.regency), text(program.province), text(program.postalCode)].filter(Boolean).join(', ');
  // Application drafts collect campus address and program location separately.
  const alamat = Object.hasOwn(props, 'alamat') ? text(props.alamat) : [text(program.address), region].filter(Boolean).join(', ');
  const lokasi = text(props.lokasiAlamatLengkap) || [text(program.village) && `Desa ${text(program.village)}`, text(program.district) && `Kecamatan ${text(program.district)}`, text(program.regency), text(program.province)].filter(Boolean).join(', ');
  const namaPejabat = text(props.penandatanganNama) || text(program.signatoryName);
  const jabatanPejabat = text(props.penandatanganJabatan) || text(program.signatoryTitle);
  const perjanjian = dateParts(props.tanggalPerjanjian);
  const requested = Number(input.disbursement.requestedSen || 0);
  const holders = rekening.namaPemilik;
  const pemilik = Array.isArray(holders) ? holders.map(text).filter(Boolean).join(' dan ') : text(holders);
  const tempat = text(props.tempatTandaTangan) || text(input.campus.city) || text(program.regency).replace(/^(Kota|Kabupaten|Kab\.)\s+/i, '');
  const pfName = text(settings.pfSignatoryName), pfTitle = text(settings.pfSignatoryTitle);
  return {
    namaPerguruanTinggi: text(input.campus.name), namaPerguruanTinggiKapital: upper(text(input.campus.name)),
    judulProgram: judul, judulProgramKapital: upper(judul),
    tahunProgram: tahun, tahunProgramKapital: upper(tahun), tahunProgramKecil: tahun.toLowerCase(),
    nomorSk: text(input.award.skNumber), tanggalSk: dateWords(input.award.skDate),
    nilaiBantuan: input.award.amountSen ? formatSen(input.award.amountSen) : '', nilaiBantuanTerbilang: input.award.amountSen ? terbilang(input.award.amountSen) : '',
    alamatPerguruanTinggi: alamat, lokasiProgram: lokasi,
    namaPenandatangan: namaPejabat, namaPenandatanganKapital: upper(namaPejabat), jabatanPenandatangan: jabatanPejabat, jabatanPenandatanganKapital: upper(jabatanPejabat),
    namaMentor: firstName(program.mentor), namaKoordinator: firstName(program.coordinator),
    nomorPksPf: text(props.nomorPksPf), nomorPksKampus: text(props.nomorPksKampus),
    hariPerjanjian: perjanjian ? dayName(perjanjian) : '', tanggalPerjanjianHuruf: perjanjian ? numberWords(perjanjian.d) : '', bulanPerjanjian: perjanjian ? MONTHS[perjanjian.m - 1] : '',
    tahunPerjanjianHuruf: perjanjian ? numberWords(perjanjian.y) : '', tanggalPerjanjianAngka: perjanjian ? `${two(perjanjian.d)}-${two(perjanjian.m)}-${perjanjian.y}` : '',
    nomorSuratPermohonan: text(props.nomorSuratPermohonan), tanggalSuratPermohonan: dateWords(props.tanggalSuratPermohonan), tempatSurat: tempat,
    nomorInvois: text(props.nomorInvois), tanggalInvois: dateWords(props.tanggalInvois),
    nomorKuitansi: text(props.nomorKuitansi), tanggalKuitansi: dateWords(props.tanggalKuitansi),
    termin1: requested ? formatSen(requested) : '', termin1Terbilang: requested ? terbilang(requested) : '',
    namaBank: text(rekening.namaBank), nomorRekening: text(rekening.nomorRekening), namaPemilikRekening: pemilik,
    pfSignatoryName: pfName, pfSignatoryNameKapital: upper(pfName), pfSignatoryTitle: pfTitle, pfSignatoryTitleKapital: upper(pfTitle),
    masaPerjanjianMulai: dateWords(settings.agreementStart), masaPerjanjianSelesai: dateWords(settings.agreementEnd), batasLaporan: dateWords(settings.reportDeadline)
  };
}

const PART = /^word\/(document|header\d*|footer\d*)\.xml$/;
const toZip = (template: ArrayBuffer | Uint8Array | PizZip) => (template instanceof PizZip ? template : new PizZip(template));
/** Placeholders a template uses, read from the body, headers and footers with the XML removed, so a tag split over runs still counts. */
export function templateTags(template: ArrayBuffer | Uint8Array | PizZip): string[] {
  const zip = toZip(template);
  const found = new Set<string>();
  for (const name of Object.keys(zip.files)) {
    if (!PART.test(name)) continue;
    const plain = zip.files[name].asText().replace(/<[^>]+>/g, '');
    for (const match of plain.matchAll(/\{([A-Za-z0-9]+)\}/g)) found.add(match[1]);
  }
  return Array.from(found).sort();
}

export function missingFor(tags: string[], data: MergeData): Missing[] {
  const seen = new Set<string>();
  const out: Missing[] = [];
  for (const key of tags) {
    if (text(data[key])) continue;
    const info = PLACEHOLDERS[key];
    const label = info?.label || key;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ key, label, source: info?.source || '' });
  }
  return out;
}

/** Private use characters that wrap merged values in preview mode; the viewer turns them into coloured marks. */
export const PREVIEW_MARK = { fillStart: '', fillEnd: '', missStart: '', missEnd: '' };

/** Fills a template. In preview mode merged values are wrapped in marks and missing values show their label. */
export function renderDocx(template: ArrayBuffer | Uint8Array, data: MergeData, options: { preview?: boolean } = {}): Uint8Array {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  let values: MergeData = data;
  if (options.preview) {
    values = {};
    for (const key of templateTags(zip)) {
      const value = text(data[key]);
      values[key] = value ? PREVIEW_MARK.fillStart + value + PREVIEW_MARK.fillEnd : PREVIEW_MARK.missStart + (PLACEHOLDERS[key]?.label || key) + ' belum diisi' + PREVIEW_MARK.missEnd;
    }
  }
  doc.render(values);
  return doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' }) as Uint8Array;
}

/** True when the bytes open as a template without errors. */
export function templateOpens(template: ArrayBuffer | Uint8Array): boolean {
  try { new Docxtemplater(new PizZip(template), { paragraphLoop: true, linebreaks: true, nullGetter: () => '' }); return true; }
  catch { return false; }
}

export const generatedFileName = (kind: MergeKind, code: string) => `${code || 'kampus'}_${MERGE_LABEL[kind].replace(/\s+/g, '-')}_Termin-1.docx`;

// ----- verification footer: a QR code and two grey lines on every page of a generated document -----

const FOOTER_PART = 'word/footerMonev.xml';
const QR_PART = 'word/media/qr-monev.png';
const FOOTER_REL_ID = 'rIdMonevFtr';
const QR_REL_ID = 'rIdMonevQr';
const REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', a: 'http://schemas.openxmlformats.org/drawingml/2006/main', pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture'
};
const EMPTY_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
/** 1.5 cm in EMU (914400 per inch, 360000 per cm). */
const QR_EMU = 540000;
/** Footer distance from the paper edge is raised to at least 0.5 cm so the QR stays inside the printable area. */
const MIN_FOOTER_TWIPS = 284;
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attribute = (element: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(element)?.[1] || '';

/** One paragraph: the QR as an inline picture, then the issuer line and the verification line in 8 pt grey. Namespaces are declared inline so the paragraph is valid inside any footer part. */
function verificationParagraph(imageRelId: string, drawingId: number, issuer: string, line: string) {
  const grey = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="6B7280"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>';
  const picture =
    `<w:r><w:drawing><wp:inline xmlns:wp="${NS.wp}" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${QR_EMU}" cy="${QR_EMU}"/><wp:docPr id="${drawingId}" name="QR verifikasi MonevDEB" descr="${escapeXml(line)}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS.a}" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="${NS.a}"><a:graphicData uri="${NS.pic}"><pic:pic xmlns:pic="${NS.pic}"><pic:nvPicPr><pic:cNvPr id="0" name="qr-monev.png"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip xmlns:r="${NS.r}" r:embed="${imageRelId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${QR_EMU}" cy="${QR_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  return `<w:p><w:pPr><w:spacing w:before="80" w:after="0"/><w:jc w:val="left"/>${grey}</w:pPr>${picture}` +
    `<w:r>${grey}<w:t xml:space="preserve">  ${escapeXml(issuer)}  ·  </w:t></w:r>` +
    `<w:r>${grey}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
}

function addRelationship(rels: string, id: string, type: string, target: string) {
  if (new RegExp(`\\sId="${id}"`).test(rels)) return rels;
  return rels.replace('</Relationships>', `<Relationship Id="${id}" Type="${type}" Target="${target}"/></Relationships>`);
}
/** Target of one relationship in a rels part, resolved to a package path under word/. */
function relationshipTarget(rels: string, id: string) {
  const element = rels.match(/<Relationship\b[^>]*\/>/g)?.find(e => attribute(e, 'Id') === id);
  const target = element ? attribute(element, 'Target') : '';
  if (!target) return '';
  return target.startsWith('/') ? target.slice(1) : 'word/' + target.replace(/^\.\//, '');
}

/**
 * Installs the verification footer into a rendered document so every page shows the QR, the issuer line and host/verifikasi/CODE.
 * Footer parts the template already has (page numbers, paraf boxes of the PKS) are kept and the paragraph is appended to them;
 * every section gets default, first and even footer references, so title pages and even pages show it too.
 */
export function withVerificationFooter(docx: Uint8Array, options: { png: Uint8Array; pngSide: number; code: string; line: string; issuer: string }): Uint8Array {
  const zip = new PizZip(docx);
  const readText = (path: string) => zip.file(path)?.asText() ?? '';
  zip.file(QR_PART, options.png);

  let contentTypes = readText('[Content_Types].xml');
  if (!/<Default\b[^>]*Extension="png"/i.test(contentTypes)) contentTypes = contentTypes.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');

  let documentRels = readText('word/_rels/document.xml.rels') || EMPTY_RELS;
  let document = readText('word/document.xml');
  let drawingId = 7001;
  let ownFooterNeeded = false;
  const patchedParts = new Set<string>();

  /** Appends the paragraph to an existing footer part and gives that part its own image relationship. */
  const appendToPart = (part: string) => {
    if (patchedParts.has(part)) return true;
    let xml = readText(part);
    if (!xml.includes('</w:ftr>')) return false;
    // Re-stamping updates the printed link as well as the image, without duplicating the footer.
    xml=xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g,p=>p.includes('name="QR verifikasi MonevDEB"')?'':p);
    const relsPath = part.replace(/^word\//, 'word/_rels/') + '.rels';
    zip.file(relsPath, addRelationship(readText(relsPath) || EMPTY_RELS, QR_REL_ID, REL_TYPE + 'image', 'media/qr-monev.png'));
    zip.file(part, xml.replace('</w:ftr>', verificationParagraph(QR_REL_ID, drawingId++, options.issuer, options.line) + '</w:ftr>'));
    patchedParts.add(part);
    return true;
  };

  document = document.replace(/<w:sectPr\b([^>]*?)(?:\/>|>([\s\S]*?)<\/w:sectPr>)/g, (_match, attrs: string, inner: string = '') => {
    const references = inner.match(/<w:footerReference\b[^>]*\/>/g) || [];
    const added: string[] = [];
    for (const type of ['default', 'first', 'even']) {
      const existing = references.find(e => attribute(e, 'w:type') === type);
      const part = existing ? relationshipTarget(documentRels, attribute(existing, 'r:id')) : '';
      if (part && appendToPart(part)) continue;
      ownFooterNeeded = true;
      if (existing) inner = inner.replace(existing, '');
      added.push(`<w:footerReference w:type="${type}" r:id="${FOOTER_REL_ID}"/>`);
    }
    inner = inner.replace(/(<w:pgMar\b[^>]*?\sw:footer=")(\d+)(")/, (_m: string, before: string, value: string, after: string) => before + String(Math.max(Number(value), MIN_FOOTER_TWIPS)) + after);
    return `<w:sectPr${attrs}>${added.join('')}${inner}</w:sectPr>`;
  });

  if (ownFooterNeeded) {
    documentRels = addRelationship(documentRels, FOOTER_REL_ID, REL_TYPE + 'footer', 'footerMonev.xml');
    if (!contentTypes.includes(`PartName="/${FOOTER_PART}"`)) contentTypes = contentTypes.replace('</Types>', `<Override PartName="/${FOOTER_PART}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
    zip.file(FOOTER_PART, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr xmlns:w="${NS.w}" xmlns:r="${NS.r}">${verificationParagraph(QR_REL_ID, drawingId++, options.issuer, options.line)}</w:ftr>`);
    zip.file('word/_rels/footerMonev.xml.rels', addRelationship(EMPTY_RELS, QR_REL_ID, REL_TYPE + 'image', 'media/qr-monev.png'));
  }
  zip.file('word/document.xml', document);
  zip.file('word/_rels/document.xml.rels', documentRels);
  zip.file('[Content_Types].xml', contentTypes);
  return zip.generate({ type: 'uint8array', compression: 'DEFLATE' }) as Uint8Array;
}
