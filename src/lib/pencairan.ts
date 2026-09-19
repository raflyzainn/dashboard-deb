/** Shared vocabulary of the Pencairan module: kinds, statuses, stages, money in sen, terbilang. Pure TypeScript, used by server and browser. */

/** The SK first, then the eight check columns of the review sheet in the sheet's order. One checklist item each. */
export const KINDS = ['sk', 'pks', 'rab', 'permohonan', 'kuitansi', 'invois', 'laporan', 'rekening', 'surat_kuasa'] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = {
  sk: 'SK penetapan penerima', pks: 'Draft PKS', rab: 'RAB dan rencana realisasi 70%', permohonan: 'Permohonan pencairan dana', kuitansi: 'Kuitansi penerimaan dana', invois: 'Invoice penerimaan dana',
  laporan: 'Format laporan DEB Termin 1', rekening: 'Buku rekening', surat_kuasa: 'Surat kuasa'
};
export const KIND_SHORT: Record<Kind, string> = { sk: 'SK', pks: 'PKS', rab: 'RAB 70%', permohonan: 'Permohonan', kuitansi: 'Kuitansi', invois: 'Invois', laporan: 'Format laporan', rekening: 'Rekening', surat_kuasa: 'Surat kuasa' };
/** What file each item expects, shown in the item panel. */
export const KIND_FILE: Record<Kind, string> = {
  sk: 'Satu SK untuk semua kampus', pks: 'Berkas Word', rab: 'RAB terkelola; berkas Excel asli tetap bisa dilihat', permohonan: 'Word atau PDF', kuitansi: 'Word atau PDF', invois: 'Word atau PDF',
  laporan: 'Berkas laporan', rekening: 'Pindaian halaman depan buku rekening (PDF atau gambar)', surat_kuasa: 'Pindaian atau Word'
};
/** The two buttons of each item: the green one is the right answer, the grey one the wrong one (asks for a note). */
export const DECISION_LABEL: Record<Kind, { ok: string; bad: string; none?: string }> = {
  sk: { ok: 'Nilai sesuai dengan SK', bad: 'Nilai berbeda' }, pks: { ok: 'Sesuai', bad: 'Perlu revisi' }, rab: { ok: 'Sesuai: jadikan nominal Tahap 1', bad: 'Perlu revisi' },
  permohonan: { ok: 'Sesuai', bad: 'Perlu revisi' }, kuitansi: { ok: 'Sesuai', bad: 'Perlu revisi' }, invois: { ok: 'Sesuai', bad: 'Perlu revisi' }, laporan: { ok: 'Sesuai', bad: 'Perlu revisi' },
  rekening: { ok: 'Nama sesuai di bank', bad: 'Nama berbeda di bank' }, surat_kuasa: { ok: 'Nama cocok', bad: 'Nama berbeda', none: 'Tanpa surat kuasa' }
};
/** Reminders per item, written from the reviewers' own notes in the review sheet. For the checker's eye; the decision is the two buttons. */
export const LOOK_AT: Record<Kind, string[]> = {
  sk: ['Baris kampus ini di Lampiran I: nama, tahun program, nilai bantuan', 'Nilai yang dimuat sama dengan yang tercetak di SK'],
  pks: ['Nama kampus, tahun program, pihak kedua dan jabatannya', 'Nilai bantuan dan terbilang pada pasal Bantuan Dana sama dengan SK', 'Pasal Termin 1 dan Termin 2 masih standar, atau perubahan kampus diterima', 'Semua halaman terbaca, tidak ada sorotan kuning, logo dan kop ada', 'Penandatangan pihak kedua satu orang'],
  rab: ['Ada lembar RAB Termin 1 (70%), bukan hanya RAB penuh', 'Baris kegiatan masuk akal dan mengikuti format DEB', 'Nama koordinator dan mentor di kolom tanda tangan', 'RAB penuh, bila ada, hanya pembanding'],
  permohonan: ['Kop surat kampus, nomor dan tanggal surat', 'Ditujukan ke Pertamina Foundation, menyebut program dan tahun', 'Nominal dan terbilang Termin 1 saja, tidak ada halaman Termin 2', 'Penandatangan adalah pihak kedua PKS, tanpa tanda tangan tambahan'],
  kuitansi: ['Kop, nomor dan tanggal kuitansi', '"Telah terima dari" Pertamina Foundation, keterangan Termin 1 program DEB', 'Jumlah uang dan terbilang sama', 'Tempat meterai dan tanda tangan pihak kedua ada, tanpa sorotan kuning'],
  invois: ['Kop, nomor dan tanggal invois', 'Nominal Termin 1 saja', 'Nama bank, nomor rekening dan nama pemilik tertulis dan sama dengan buku rekening', 'Penandatangan pihak kedua'],
  laporan: ['Berkas ada dan mengikuti templat laporan DEB'],
  rekening: ['Halaman depan buku tabungan atau rekening koran, bukan surat identitas kampus', 'Nama bank, nomor rekening, nama pemilik terbaca jelas', 'Rekening atas nama lembaga, atau atas nama orang bila disertai surat kuasa', 'Nama dicek di bank dan hasilnya dicatat di sini'],
  surat_kuasa: ['Pemberi kuasa adalah penandatangan PKS', 'Penerima kuasa sama dengan nama pemilik rekening', 'Bertanda tangan, bermeterai, bertanggal', 'Menyebut penerimaan dana program DEB']
};
/** Who usually checks the item. Shown, never enforced. */
export const USUAL_CHECKER: Record<Kind, string> = { sk: 'Tim program', pks: 'Tim program', rab: 'Tim program', permohonan: 'Tim program', kuitansi: 'Tim program', invois: 'Tim program', laporan: 'Tim program', rekening: 'Keuangan', surat_kuasa: 'Keuangan' };
/** Documents the system generates for wet signature; the others are uploads only. */
export const GENERATED: Kind[] = ['pks', 'permohonan', 'invois', 'kuitansi'];
/** Letters that must carry Termin 1 only: a Termin 2 page left inside is a finding. */
export const LETTERS: Kind[] = ['permohonan', 'invois', 'kuitansi'];

/** tidak_perlu is stored only for the surat kuasa: a person decided the campus goes without one. */
export const STATUSES = ['belum_ada', 'menunggu_review', 'perlu_konfirmasi', 'perlu_revisi', 'sesuai', 'tidak_perlu'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = { belum_ada: 'Belum ada', menunggu_review: 'Menunggu pemeriksaan', perlu_konfirmasi: 'Perlu konfirmasi', perlu_revisi: 'Perlu revisi', sesuai: 'Sesuai', tidak_perlu: 'Tanpa surat kuasa' };
export const STATUS_TONE: Record<Status, 'neutral' | 'blue' | 'amber' | 'green'> = { belum_ada: 'neutral', menunggu_review: 'blue', perlu_konfirmasi: 'blue', perlu_revisi: 'amber', sesuai: 'green', tidak_perlu: 'green' };
/** What an item counts as on the screen: its status, or "tidak perlu" computed for a surat kuasa that the rekening does not require. */
export type ItemState = Status;
export const ITEM_STATE_LABEL: Record<ItemState, string> = { ...STATUS_LABEL, tidak_perlu: 'Tanpa surat kuasa' };
export const isDone = (state: ItemState) => state === 'sesuai' || state === 'tidak_perlu';
/** Short names used inside phrases: "Masih 2 yang perlu dilengkapi: surat kuasa dan buku rekening." */
export const ITEM_NAME: Record<Kind, string> = { sk: 'nilai SK', pks: 'draft PKS', rab: 'RAB 70%', permohonan: 'surat permohonan', kuitansi: 'kuitansi', invois: 'invois', laporan: 'format laporan Termin 1', rekening: 'buku rekening', surat_kuasa: 'surat kuasa' };
/** Rail word per state: short, for the list on the left. */
export const RAIL_WORD: Record<ItemState, string> = { sesuai: 'Sesuai', tidak_perlu: 'Tanpa', perlu_konfirmasi: 'Periksa', menunggu_review: 'Periksa', perlu_revisi: 'Revisi', belum_ada: 'Belum' };

/** One campus on the dashboard: where it stands in Tahap 1. */
export const CAMPUS_STATES = ['belum_ada', 'menunggu_kampus', 'menunggu_admin', 'lengkap', 'siap_dibayar', 'dibayar'] as const;
export type CampusState = (typeof CAMPUS_STATES)[number];
export const CAMPUS_STATE_LABEL: Record<CampusState, string> = { belum_ada: 'Belum ada dokumen', menunggu_kampus: 'Menunggu kampus', menunggu_admin: 'Menunggu admin', lengkap: 'Lengkap', siap_dibayar: 'Siap dibayar', dibayar: 'Dibayar' };
export const CAMPUS_STATE_TONE: Record<CampusState, 'neutral' | 'amber' | 'blue' | 'green'> = { belum_ada: 'neutral', menunggu_kampus: 'amber', menunggu_admin: 'blue', lengkap: 'green', siap_dibayar: 'green', dibayar: 'green' };
export interface Assessment {
  items: Record<Kind, ItemState>; done: number; total: number; lengkap: boolean; hampirLengkap: boolean; missing: Kind[];
  adminWait: number; campusWait: number; revisi: number; belum: number; suratKuasaRequired: boolean | null; redChecks: number;
  state: CampusState; waiting: string; phrase: string;
}
/** Joins names the Indonesian way: "a, b, dan c". */
export const joinNames = (names: string[]) => names.length <= 1 ? names.join('') : names.length === 2 ? `${names[0]} dan ${names[1]}` : `${names.slice(0, -1).join(', ')}, dan ${names[names.length - 1]}`;
/** The same reading of a campus everywhere: dashboard rows, the card, the campus view. Pure, so the browser can recompute it after an edit. */
export function assess(statuses: Record<Kind, Status>, input: { suratKuasaRequired: boolean | null; redChecks: number; paidAt: string; originalsAll: boolean; lampiranCount: number }): Assessment {
  const items = Object.fromEntries(KINDS.map(k => [k, statuses[k] || (k === 'sk' ? 'perlu_konfirmasi' : 'belum_ada')])) as Record<Kind, ItemState>;
  if (input.suratKuasaRequired === false && items.surat_kuasa !== 'sesuai') items.surat_kuasa = 'tidak_perlu';
  const active = KINDS.filter(k => items[k] !== 'tidak_perlu');
  const done = KINDS.filter(k => isDone(items[k])).length;
  const missing = KINDS.filter(k => !isDone(items[k]));
  const adminWait = active.filter(k => items[k] === 'menunggu_review' || items[k] === 'perlu_konfirmasi').length;
  const revisi = active.filter(k => items[k] === 'perlu_revisi').length;
  const belum = active.filter(k => items[k] === 'belum_ada').length;
  const campusWait = revisi + belum;
  const allDone = missing.length === 0;
  const lengkap = allDone && input.redChecks === 0;
  let state: CampusState;
  if (input.paidAt) state = 'dibayar';
  else if (lengkap && input.originalsAll && input.lampiranCount > 0) state = 'siap_dibayar';
  else if (lengkap) state = 'lengkap';
  else if (belum === active.length) state = 'belum_ada';
  else if (adminWait || allDone) state = 'menunggu_admin';
  else state = 'menunggu_kampus';
  const waiting = state === 'dibayar' ? 'Selesai' : state === 'siap_dibayar' ? 'Pembayaran' : state === 'lengkap' ? 'Tanda tangan dan lampiran'
    : allDone ? 'Admin, pemeriksaan otomatis' : adminWait ? `Admin, ${adminWait === 1 ? ITEM_NAME[active.find(k => items[k] === 'menunggu_review' || items[k] === 'perlu_konfirmasi')!] : adminWait + ' butir'}`
    : belum === active.length ? 'Kampus, belum kirim' : revisi && belum ? `Kampus, ${revisi} revisi, ${belum} belum kirim` : revisi ? `Kampus, ${revisi} revisi` : `Kampus, ${belum} belum kirim`;
  let phrase: string;
  if (state === 'dibayar') phrase = `Dana Tahap 1 sudah ditransfer pada ${input.paidAt.slice(0, 10)}.`;
  else if (state === 'siap_dibayar') phrase = 'Semua beres, tinggal dibayar.';
  else if (state === 'lengkap') phrase = 'Semua butir sesuai. Tinggal tanda tangan basah, lampiran, dan pembayaran.';
  else if (allDone) phrase = 'Semua butir sesuai, tetapi pemeriksaan otomatis masih merah. Periksa ulang butir yang ditandai.';
  else if (state === 'belum_ada') phrase = 'Belum ada dokumen dari kampus ini.';
  else {
    phrase = missing.length <= 3 ? `Masih ${missing.length} yang perlu dilengkapi: ${joinNames(missing.map(k => ITEM_NAME[k]))}.` : `Masih ${missing.length} yang perlu dilengkapi.`;
    if (adminWait) phrase += ` ${adminWait} menunggu pemeriksaan admin.`;
    if (revisi) phrase += ` Menunggu kampus memperbaiki ${revisi} dokumen.`;
  }
  return { items, done, total: KINDS.length, lengkap, hampirLengkap: !lengkap && missing.length > 0 && missing.length <= 2, missing, adminWait, campusWait, revisi, belum, suratKuasaRequired: input.suratKuasaRequired, redChecks: input.redChecks, state, waiting, phrase };
}

export const STAGES = ['Dasar', 'Berkas masuk', 'Periksa berkas', 'RAB', 'Rekening', 'Buat dokumen', 'Ekspor lampiran'] as const;

/** Fields typed beside each uploaded file. Keys are stable identifiers, labels are what the admin sees. */
export const FIELDS: Record<Kind, { key: string; label: string; type: 'text' | 'date' | 'money' | 'names' | 'bool' }[]> = {
  sk: [],
  pks: [
    { key: 'nomorPksPf', label: 'Nomor PKS Pertamina Foundation', type: 'text' }, { key: 'nomorPksKampus', label: 'Nomor PKS kampus', type: 'text' },
    { key: 'tanggalPerjanjian', label: 'Tanggal perjanjian', type: 'date' }, { key: 'penandatangan', label: 'Pejabat penandatangan dan jabatan', type: 'text' }, { key: 'nilaiBantuanSen', label: 'Nilai bantuan', type: 'money' }
  ],
  rab: [{ key: 'termin1Sen', label: 'Total RAB Tahap 1 di berkas', type: 'money' }],
  permohonan: [{ key: 'nomorSurat', label: 'Nomor surat', type: 'text' }, { key: 'tanggalSurat', label: 'Tanggal surat', type: 'date' }, { key: 'nominalSen', label: 'Nominal Termin 1', type: 'money' }, { key: 'penandatangan', label: 'Penandatangan', type: 'text' }],
  invois: [{ key: 'nomorInvois', label: 'Nomor invois', type: 'text' }, { key: 'tanggal', label: 'Tanggal', type: 'date' }, { key: 'nominalSen', label: 'Nominal', type: 'money' }, { key: 'namaBank', label: 'Nama bank di invois', type: 'text' }, { key: 'rekeningTujuan', label: 'Nomor rekening di invois', type: 'text' }, { key: 'namaPemilik', label: 'Nama pemilik rekening di invois', type: 'names' }],
  kuitansi: [{ key: 'nomorKuitansi', label: 'Nomor kuitansi', type: 'text' }, { key: 'tanggal', label: 'Tanggal', type: 'date' }, { key: 'nominalSen', label: 'Nominal', type: 'money' }, { key: 'terbilang', label: 'Terbilang', type: 'text' }, { key: 'bermeterai', label: 'Bermeterai', type: 'bool' }],
  laporan: [],
  rekening: [{ key: 'namaBank', label: 'Nama bank', type: 'text' }, { key: 'cabang', label: 'Cabang', type: 'text' }, { key: 'namaPemilik', label: 'Nama pemilik rekening', type: 'names' }, { key: 'nomorRekening', label: 'Nomor rekening', type: 'text' }],
  surat_kuasa: [{ key: 'nomorSurat', label: 'Nomor surat', type: 'text' }, { key: 'tanggalSurat', label: 'Tanggal surat', type: 'date' }, { key: 'pemberiKuasa', label: 'Pemberi kuasa dan jabatan', type: 'text' }, { key: 'penerimaKuasa', label: 'Nama penerima kuasa', type: 'names' }]
};

/** Exact 70% of an amount in sen. amountSen is rupiah times 100, so the result is always a whole number of sen. */
export const limitSen = (amountSen: number) => Math.round(amountSen * 7 / 10);
export const remainderSen = (amountSen: number, term1Sen: number) => amountSen - term1Sen;

export function formatSen(sen: number | null | undefined, withSymbol = true): string {
  if (sen === null || sen === undefined || Number.isNaN(sen)) return '';
  const negative = sen < 0;
  const abs = Math.abs(Math.round(sen));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const text = whole.toLocaleString('id-ID') + (frac ? ',' + String(frac).padStart(2, '0') : '');
  return (negative ? '-' : '') + (withSymbol ? 'Rp' : '') + text;
}
/** Parses "52.499.300", "52499300", "52.292.405,90" into sen. Returns null when unreadable. */
export function parseSen(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null;
  const text = String(input).trim().replace(/^rp\.?\s*/i, '').replace(/\s/g, '');
  if (!text) return null;
  const match = /^(-)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const whole = Number(match[2].replace(/\./g, ''));
  const frac = match[3] ? Number(match[3].padEnd(2, '0')) : 0;
  const sen = whole * 100 + frac;
  return match[1] ? -sen : sen;
}
export const percentOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 10000) / 100 : 0);
export const formatPercent = (value: number) => value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';

const SMALL = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
function words(n: number): string {
  if (n < 12) return SMALL[n];
  if (n < 20) return words(n - 10) + ' Belas';
  if (n < 100) return words(Math.floor(n / 10)) + ' Puluh ' + words(n % 10);
  if (n < 200) return 'Seratus ' + words(n - 100);
  if (n < 1000) return words(Math.floor(n / 100)) + ' Ratus ' + words(n % 100);
  if (n < 2000) return 'Seribu ' + words(n - 1000);
  if (n < 1e6) return words(Math.floor(n / 1e3)) + ' Ribu ' + words(n % 1e3);
  if (n < 1e9) return words(Math.floor(n / 1e6)) + ' Juta ' + words(n % 1e6);
  return words(Math.floor(n / 1e9)) + ' Miliar ' + words(n % 1e9);
}
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
/** Indonesian words for an amount in sen, e.g. "Lima Puluh Dua Juta ... Rupiah Sembilan Puluh Sen". */
export function terbilang(sen: number): string {
  const abs = Math.abs(Math.round(sen));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return (clean(words(whole)) || 'Nol') + ' Rupiah' + (frac ? ' ' + clean(words(frac)) + ' Sen' : '');
}

/** Name comparison for the surat kuasa check: titles, punctuation, case and spacing are ignored. */
export function normalizeName(name: string) {
  return name.toLowerCase()
    .replace(/\b(dr|drs|dra|ir|prof|h|hj|s\.?t|s\.?e|s\.?h|s\.?si|s\.?pd|s\.?kom|m\.?t|m\.?si|m\.?m|m\.?sc|m\.?eng|ph\.?d|se|st|mt|msc|dkk)\b\.?/g, ' ')
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function namesMatch(a: string[], b: string[]) {
  const left = a.map(normalizeName).filter(Boolean);
  const right = b.map(normalizeName).filter(Boolean);
  if (!left.length || !right.length) return false;
  const found = (name: string, list: string[]) => list.some(other => other === name || other.includes(name) || name.includes(other));
  return left.every(name => found(name, right));
}
export const splitNames = (value: string | string[] | null | undefined): string[] => (Array.isArray(value) ? value : String(value || '').split(/[;\n]|\s+dan\s+|,/)).map(s => s.trim()).filter(Boolean);
