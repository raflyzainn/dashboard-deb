/**
 * Laporan Eksisting (pra-coaching): filled once per campus. Stored in campuses.program.laporanEksisting,
 * files in monitoring_files with period FILE_PERIOD and the kinds below. No collection of its own.
 */
export const PILLARS = [
  { key: 'energi', label: 'Energi', hint: 'Kapasitas EBT terpasang (kWp)', placeholder: 'Instalasi EBT yang sudah berjalan, kapasitasnya, pemakaiannya, dan kendalanya.' },
  { key: 'ekonomi', label: 'Ekonomi', hint: 'Pendapatan per kapita dan usaha', placeholder: 'Usaha yang memakai energi DEB, pendapatan warga atau kelompok, dan pemasarannya.' },
  { key: 'sosial', label: 'Sosial', hint: 'Pemetaan sosial dan partisipasi', placeholder: 'Hasil pemetaan sosial dan bagaimana warga ikut serta dalam program.' },
  { key: 'kelembagaan', label: 'Kelembagaan', hint: 'Local Hero dan lembaga formal', placeholder: 'Local Hero penggerak program dan lembaga yang mengelola, misalnya BUMDes, koperasi, atau kelompok.' }
] as const;
export const PHOTOS = [
  { key: 'aset', label: 'Aset EBT' },
  { key: 'usaha', label: 'Kegiatan usaha' },
  { key: 'masyarakat', label: 'Kegiatan masyarakat' }
] as const;
export type PillarKey = (typeof PILLARS)[number]['key'];
export type PhotoKey = (typeof PHOTOS)[number]['key'];
/** Draft until sent; editing a sent report makes it a draft again until it is sent once more. No PF review. */
export type LaporanStatus = 'draft' | 'submitted';

export const FILE_PERIOD = 'laporan-eksisting';
export const TEXT_LIMIT = 2000;
export const PHOTO_LIMIT = 6;
export const PHOTO_MB = 2;
export const VIDEO_MB = 40;
export const photoKind = (key: PhotoKey) => `eksisting-${key}`;
export const VIDEO_KIND = 'eksisting-video';

export interface LaporanEksisting extends Record<PillarKey, string> {
  foto: Record<PhotoKey, string[]>;
  video: string;
  status: LaporanStatus;
  revision: number;
  submittedAt: string;
}
export interface LaporanFile { id: string; kind: string; originalName: string; mime: string; size: number }
export interface LaporanWorkspace { campusId: string; campusName: string; laporan: LaporanEksisting; files: LaporanFile[] }
/** Admin list row; 'kosong' when the campus has not started. */
export interface LaporanQueueItem { campusId: string; campusName: string; status: LaporanStatus | 'kosong'; submittedAt: string }

export const emptyLaporan = (): LaporanEksisting => ({
  energi: '', ekonomi: '', sosial: '', kelembagaan: '', foto: { aset: [], usaha: [], masyarakat: [] }, video: '',
  status: 'draft', revision: 0, submittedAt: ''
});

/** Reads whatever is stored (possibly nothing or an older shape) into a complete report. */
export function normalizeLaporan(value: unknown): LaporanEksisting {
  const base = emptyLaporan();
  if (!value || typeof value !== 'object') return base;
  const v = value as Record<string, any>;
  const str = (x: unknown) => (typeof x === 'string' ? x : '');
  const ids = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []);
  return {
    ...base,
    ...Object.fromEntries(PILLARS.map(p => [p.key, str(v[p.key])])),
    foto: Object.fromEntries(PHOTOS.map(p => [p.key, ids(v.foto?.[p.key])])) as Record<PhotoKey, string[]>,
    video: str(v.video),
    status: v.status === 'submitted' ? 'submitted' : 'draft',
    revision: Number.isSafeInteger(v.revision) ? v.revision : 0, submittedAt: str(v.submittedAt)
  };
}

/** What still blocks sending, in the order of the page. Empty means the report can be sent. */
export function laporanMissing(l: LaporanEksisting): string[] {
  return [
    ...PILLARS.filter(p => !l[p.key].trim()).map(p => `deskripsi ${p.label}`),
    ...PHOTOS.filter(p => !l.foto[p.key].length).map(p => `foto ${p.label}`),
    ...(l.video ? [] : ['video'])
  ];
}

export const laporanStatusLabel = (s: LaporanStatus | 'kosong') => ({ draft: 'Draf', submitted: 'Terkirim', kosong: 'Belum mengisi' })[s];
