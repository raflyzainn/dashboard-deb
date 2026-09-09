import type { Snapshot, Notification, DebSubmission } from '../../src/lib/types';
import { samplePdf } from './pdf';
import { CAMPUSES, CAMPUS_ROSTER_VERSION } from './campuses';
import { CAMPUS_LOCATIONS } from './locations';

export const DEMO_CAMPUS = 'campus-001';
const timestamp = '2026-09-08T02:00:00.000Z';
function demoSubmissions(data: Snapshot): DebSubmission[] {
  return data.campuses.slice(1, 7).map(c => ({ id: `demo-submission-${c.id}`, campusId: c.id, version: 1,
    status: 'pending', submittedAt: '2026-09-08T01:00:00.000Z', simulated: true,
    indicators: data.indicators.filter(i => i.campusId === c.id).map(i => ({ ...i })) }));
}
export const NOTIFICATION_SEED_VERSION = 1;
export function demoNotifications(): Notification[] {
  const samples: Omit<Notification, 'createdAt' | 'readAt' | 'simulated'>[] = [
    { id: 'demo-notice-campus-1', campusId: DEMO_CAMPUS, recipient: 'campus', title: 'Lengkapi catatan indikator', body: 'Admin PF meminta ringkasan periode evaluasi dan jumlah kelompok aktif. Buka indikator Tim pengelola aktif untuk meninjau feedback.', href: '/campus/indicators' },
    { id: 'demo-notice-campus-2', campusId: DEMO_CAMPUS, recipient: 'campus', title: 'Proposal versi 3 tersimpan', body: 'Proposal terbaru Universitas Indonesia sudah tersedia. Bandingkan dengan versi sebelumnya untuk meninjau perubahan teks.', href: '/campus/proposal' },
    { id: 'demo-notice-campus-3', campusId: DEMO_CAMPUS, recipient: 'campus', title: 'Jawaban forum tentang proposal', body: 'Admin PF telah membagikan panduan pembaruan proposal. Versi lama tetap dapat ditinjau setelah unggahan baru.', href: '/campus/questions/question-2' },
    { id: 'demo-notice-campus-4', campusId: DEMO_CAMPUS, recipient: 'campus', title: 'Panduan perhitungan indikator', body: 'Pelajari cara membaca baseline, target, dan progres simulasi pada jawaban forum bersama.', href: '/campus/questions/question-1' },
    { id: 'demo-notice-campus-5', campusId: DEMO_CAMPUS, recipient: 'campus', title: 'FAQ proposal tersedia', body: 'Panduan unggah dan revisi proposal telah tersedia di Pusat bantuan.', href: '/campus/faq' },
    { id: 'demo-notice-admin-1', campusId: DEMO_CAMPUS, recipient: 'admin', title: 'Proposal versi 3 siap ditinjau', body: 'Universitas Indonesia memiliki tiga versi proposal. Buka detail kampus lalu tab Proposal untuk membandingkan dokumen.', href: `/admin/campuses/${DEMO_CAMPUS}` },
    { id: 'demo-notice-admin-2', campusId: 'campus-002', recipient: 'admin', title: 'Pembaruan capaian kampus', body: 'Data simulasi Universitas Gadjah Mada tersedia untuk ditinjau. Periksa nilai aktual dan target di detail indikator.', href: '/admin/campuses/campus-002' },
    { id: 'demo-notice-admin-3', campusId: 'campus-005', recipient: 'admin', title: 'Feedback masih perlu tindak lanjut', body: 'Universitas Diponegoro memiliki permintaan revisi indikator yang belum diselesaikan.', href: '/admin/campuses/campus-005' },
    { id: 'demo-notice-admin-4', campusId: 'campus-005', recipient: 'admin', title: 'Diskusi kolaborasi antar desa', body: 'Tinjau pertanyaan dokumentasi kegiatan kolaborasi. Jawaban Anda dapat membantu seluruh kampus.', href: '/admin/questions/question-4' },
    { id: 'demo-notice-admin-5', campusId: 'campus-003', recipient: 'admin', title: 'Panduan proposal telah dibagikan', body: 'Jawaban tentang pembaruan proposal sudah tersedia di forum bersama dan dapat dikurasi melalui FAQ.', href: '/admin/questions/question-2' }
  ];
  return samples.map((n, i) => ({ ...n, createdAt: `2026-09-0${8 - i % 5}T0${3 - i % 3}:00:00.000Z`, readAt: i % 5 >= 3 ? timestamp : null, simulated: true }));
}
const categories = ['Tata kelola', 'Lingkungan', 'Pemberdayaan'];
const names = [
  'Pemetaan kebutuhan desa', 'Tim pengelola aktif', 'Rencana kerja tahunan', 'Pertemuan koordinasi', 'Kemitraan lokal',
  'Pelaporan kegiatan', 'Dokumentasi program', 'Pelatihan pengelola', 'Evaluasi berkala', 'Partisipasi mahasiswa',
  'Pengelolaan sampah', 'Pemilahan dari sumber', 'Pengolahan kompos', 'Penanaman pohon', 'Konservasi air',
  'Pemanfaatan energi bersih', 'Edukasi lingkungan', 'Bank sampah aktif', 'Pemantauan kualitas air', 'Kebun komunitas',
  'Pelatihan warga', 'Kelompok usaha binaan', 'Produk lokal dikembangkan', 'Pendampingan UMKM', 'Keterlibatan perempuan',
  'Relawan desa aktif', 'Literasi keuangan', 'Akses pasar', 'Kolaborasi komunitas', 'Diseminasi praktik baik'
];

export function createSeed(): { data: Snapshot; files: { id: string; blob: Blob }[] } {
  const data: Snapshot = { campuses: [], definitions: [], indicators: [], feedback: [], proposals: [], questions: [], answers: [], likes: [], faq: [], activities: [], notifications: [] };
  const files: { id: string; blob: Blob }[] = [];
  data.definitions = names.map((name, i) => ({ id: `def-${i + 1}`, name, category: categories[Math.floor(i / 10)], unit: i % 3 === 0 ? 'kegiatan' : i % 3 === 1 ? 'kelompok' : 'peserta', description: 'Indikator simulasi untuk mendemonstrasikan pemantauan DEB Putih. Nilai aktual diisi sesuai capaian kegiatan.' }));
  for (let c = 0; c < CAMPUSES.length; c++) {
    const campus = { ...CAMPUSES[c] };
    const id = campus.id;
    data.campuses.push(campus);
    data.definitions.forEach((def, i) => {
      const target = [10, 20, 50, 100, 25][i % 5];
      data.indicators.push({ id: `${id}-i${i + 1}`, campusId: id, definitionId: def.id, baseline: Math.floor(target * 0.2), target, current: Math.round(target * (c === 0 ? [1, 0.8, 1.1, 0.6, 0.4][i % 5] : ((c * 7 + i * 3) % 105 + 15) / 100)), note: '', updatedAt: timestamp });
    });
    if (c % 4 === 0) {
      data.feedback.push({ id: `feedback-${c}`, campusId: id, indicatorId: `${id}-i2`, text: 'Mohon perbarui jumlah kelompok aktif berdasarkan evaluasi terakhir dan tambahkan catatan pelaksanaan.', requiresRevision: true, state: 'open', createdAt: timestamp, updatedAt: timestamp });
    }
    if (c % 8 !== 7) {
      for (let v = 1; v <= (c === 0 ? 3 : c % 2 + 1); v++) {
        const proposalId = `${id}-v${v}`;
        const blob = samplePdf(campus.name, v);
        files.push({ id: proposalId, blob });
        data.proposals.push({ id: proposalId, campusId: id, version: v, filename: `Proposal-DEB-${c + 1}-v${v}.pdf`, size: blob.size, createdAt: `2026-09-0${v}T02:00:00.000Z`, changes: v === 1 ? 'Ditambahkan: rencana kerja, profil desa, dan target awal.' : v === 2 ? 'Diperbarui: anggaran pelatihan. Ditambahkan: jadwal pendampingan.' : 'Ditambahkan: target program lanjutan. Diperbarui: pembagian tugas tim.', simulated: true });
      }
    }
    data.activities.push({ id: `activity-${c}`, campusId: id, text: 'Data indikator awal DEB Putih telah diperbarui.', createdAt: timestamp });
  }
  const questions = [
    ['Bagaimana cara menghitung capaian indikator DEB Putih?', 'Apakah baseline ikut dikurangkan dari nilai aktual saat menghitung progres?'],
    ['Bolehkah memperbarui proposal yang sudah diajukan?', 'Kami ingin menambahkan jadwal pelatihan warga pada proposal terbaru.'],
    ['Apa yang perlu ditulis dalam catatan indikator?', 'Apakah cukup mencantumkan kegiatan atau perlu ringkasan hasil evaluasi juga?'],
    ['Bagaimana mendokumentasikan kegiatan kolaborasi antar desa?', 'Tim kami melaksanakan satu kegiatan yang melibatkan dua kelompok desa.'],
    ['Apakah nilai aktual boleh melebihi target?', 'Partisipasi warga dalam pelatihan sudah melampaui target awal.'],
    ['Kapan feedback indikator dinyatakan selesai?', 'Kami sudah memperbarui data setelah mendapat masukan dari Admin PF.']
  ];
  questions.forEach(([title, body], i) => {
    const id = `question-${i + 1}`;
    data.questions.push({ id, campusId: data.campuses[i + 1].id, title, body, categoryIds: [i === 1 ? 'proposal' : i === 3 ? 'sosial' : 'indikator'], createdAt: `2026-09-0${8 - i}T01:00:00.000Z` });
    if (i < 3) data.answers.push({ id: `answer-${i + 1}`, questionId: id, body: [
      'Pada prototype ini, capaian dihitung dari nilai aktual dibagi target, maksimal 100%. Progres kampus merupakan rata-rata seluruh indikator. Baseline ditampilkan sebagai konteks awal.',
      'Boleh. Unggah PDF melalui halaman Proposal dan isi catatan perubahan. Setiap unggahan tersimpan sebagai versi baru, sementara versi sebelumnya tetap dapat dilihat.',
      'Tuliskan ringkasan pelaksanaan, periode data, dan hasil yang mendukung nilai aktual. Catatan ini membantu Admin memahami perkembangan kegiatan.'
    ][i], updatedAt: timestamp });
    for (let j = 0; j < [24, 18, 12, 8, 5, 3][i]; j++) data.likes.push({ id: `${id}:campus-${j + 2}`, questionId: id, campusId: data.campuses[j + 1].id });
  });
  data.faq = data.questions.slice(0, 2).map((q, i) => ({ id: `faq-${i + 1}`, questionId: q.id, question: q.title, answer: data.answers[i].body, order: i }));
  data.notifications = data.feedback.map(f => ({ id: `notice-${f.id}`, campusId: f.campusId, recipient: 'campus', title: 'Permintaan revisi indikator', body: f.text, href: '/campus/indicators', createdAt: f.createdAt, readAt: null }));
  data.questions.filter(q => !data.answers.some(a => a.questionId === q.id)).forEach(q => data.notifications.push({ id: `notice-${q.id}`, campusId: q.campusId, recipient: 'admin', title: 'Pertanyaan baru dari kampus', body: q.title, href: `/admin/questions/${q.id}`, createdAt: q.createdAt, readAt: null }));
  data.notifications.forEach(n => { n.simulated = true; });
  data.notifications.push(...demoNotifications());
  data.notificationSeedVersion = NOTIFICATION_SEED_VERSION;
  data.submissions = demoSubmissions(data);
  data.campusRosterVersion = CAMPUS_ROSTER_VERSION;
  data.locations = CAMPUS_LOCATIONS.map(point => ({ campusId: point.campusId, province: point.province, island: point.island,
    longitude: 94.5 + (point.x - 3) / 94 * 47, latitude: 6.5 - (point.y - 7) / 90 * 18, approximate: true }));
  return { data, files };
}
