import type { Snapshot, Notification, DebSubmission } from '../../../types';
import { samplePdf } from './pdf';
import { CAMPUSES, CAMPUS_ROSTER_VERSION } from './campuses';
import { CAMPUS_LOCATIONS } from './locations';

export const DEMO_CAMPUS = 'campus-001';
export const SHARED_DEMO_TARGETS: Record<string, number> = {
  'def-income': 60000000,
  'def-beneficiaries': 30,
  'def-income-per-capita': 2000000
};
const timestamp = '2026-09-08T02:00:00.000Z';
function demoSubmissions(data: Snapshot): DebSubmission[] {
  return data.campuses.slice(1, 7).map((c) => ({
    id: `demo-submission-${c.id}`,
    campusId: c.id,
    version: 1,
    status: 'pending',
    submittedAt: '2026-09-08T01:00:00.000Z',
    simulated: true,
    indicators: data.indicators
      .filter((i) => i.campusId === c.id)
      .map((i) => ({ ...data.definitions.find((d) => d.id === i.definitionId)!, ...i }))
  }));
}
export const NOTIFICATION_SEED_VERSION = 2;
export function demoNotifications(): Notification[] {
  return CAMPUSES.flatMap((campus) => (['campus', 'admin'] as const).map((recipient) => ({
    id: `demo-source-${campus.id}-${recipient}`, campusId: campus.id, recipient,
    title: `Rencana aksi ${campus.name}`,
    body: `Data rencana aksi ${campus.name} tersedia sesuai Excel. Lengkapi atau perbarui data program dan kontak pendamping melalui halaman kampus. Notifikasi ini dibuat otomatis untuk demo.`,
    href: recipient === 'admin' ? `/admin/campuses/${campus.id}` : '/campus/dashboard',
    createdAt: timestamp, readAt: null, simulated: true
  })));
}
const indicators = [
  { id: 'def-income', name: 'Pendapatan total', category: 'Ekonomi', unit: 'Rp/tahun', field: 'income', description: 'Pendapatan total program pada rencana aksi.' },
  { id: 'def-beneficiaries', name: 'Penerima manfaat', category: 'Dampak', unit: 'orang', field: 'beneficiaries', description: 'Jumlah penerima manfaat pada rencana aksi.' },
  { id: 'def-income-per-capita', name: 'Pendapatan per kapita', category: 'Ekonomi', unit: 'Rp/tahun/orang', field: 'incomePerCapita', description: 'Pendapatan per kapita pada rencana aksi.' }
] as const;
function metric(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value || value.startsWith('#')) return null;
  const matched = value.trim().match(/^(?:Rp\s*)?([\d.,]+)(?:\s+(?:orang|kepala keluarga))?$/i);
  if (!matched) return null;
  const digits = matched[1].replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

export function createSeed(): { data: Snapshot; files: { id: string; blob: Blob }[] } {
  const data: Snapshot = {
    campuses: [],
    definitions: [],
    indicators: [],
    feedback: [],
    proposals: [],
    questions: [],
    answers: [],
    likes: [],
    faq: [],
    activities: [],
    notifications: []
  };
  const files: { id: string; blob: Blob }[] = [];
  data.definitions = indicators.map(({ id, name, category, unit, description }) => ({ id, name, category, unit, description }));
  for (let c = 0; c < CAMPUSES.length; c++) {
    const campus = structuredClone(CAMPUSES[c]);
    const id = campus.id;
    data.campuses.push(campus);
    indicators.forEach((def) => {
      const parsed = metric(campus.program?.[def.field]);
      const value = parsed ?? (def.field === 'beneficiaries' ? 10 : def.field === 'income' ? 30000000 : 3000000);
      data.indicators.push({
        id: `${id}-${def.id}`,
        campusId: id,
        definitionId: def.id, baseline: value || 0, target: SHARED_DEMO_TARGETS[def.id], current: value || 0, targetSimulated: true,
        unfilled: false, note: parsed === null || campus.program?.simulatedFields?.includes(def.field) ? 'Data awal program, dapat diperbarui.' : 'Data dari rencana aksi Excel.',
        updatedAt: timestamp
      });
    });
    if (c % 4 === 0) {
      data.feedback.push({
        id: `feedback-${c}`,
        campusId: id,
        indicatorId: `${id}-def-beneficiaries`,
        text: 'Mohon perbarui jumlah kelompok aktif berdasarkan evaluasi terakhir dan tambahkan catatan pelaksanaan.',
        requiresRevision: true,
        state: 'open',
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    if (c % 8 !== 7) {
      for (let v = 1; v <= (c === 0 ? 3 : (c % 2) + 1); v++) {
        const proposalId = `${id}-v${v}`;
        const blob = samplePdf(campus.name, v);
        files.push({ id: proposalId, blob });
        data.proposals.push({
          id: proposalId,
          campusId: id,
          version: v,
          filename: `Proposal-DEB-${c + 1}-v${v}.pdf`,
          size: blob.size,
          createdAt: `2026-09-0${v}T02:00:00.000Z`,
          changes:
            v === 1
              ? 'Ditambahkan: rencana kerja, profil desa, dan target awal.'
              : v === 2
                ? 'Diperbarui: anggaran pelatihan. Ditambahkan: jadwal pendampingan.'
                : 'Ditambahkan: target program lanjutan. Diperbarui: pembagian tugas tim.',
          simulated: true
        });
      }
    }
    data.activities.push({
      id: `activity-${c}`,
      campusId: id,
      text: 'Data indikator awal DEB Putih telah diperbarui.',
      createdAt: timestamp
    });
  }
  const questions = [
    [
      'Bagaimana cara menghitung capaian indikator DEB Putih?',
      'Apakah baseline ikut dikurangkan dari nilai aktual saat menghitung progres?'
    ],
    [
      'Bolehkah memperbarui proposal yang sudah diajukan?',
      'Kami ingin menambahkan jadwal pelatihan warga pada proposal terbaru.'
    ],
    [
      'Apa yang perlu ditulis dalam catatan indikator?',
      'Apakah cukup mencantumkan kegiatan atau perlu ringkasan hasil evaluasi juga?'
    ],
    [
      'Bagaimana mendokumentasikan kegiatan kolaborasi antar desa?',
      'Tim kami melaksanakan satu kegiatan yang melibatkan dua kelompok desa.'
    ],
    [
      'Apakah nilai aktual boleh melebihi target?',
      'Partisipasi warga dalam pelatihan sudah melampaui target awal.'
    ],
    [
      'Kapan feedback indikator dinyatakan selesai?',
      'Kami sudah memperbarui data setelah mendapat masukan dari Admin PF.'
    ]
  ];
  questions.forEach(([title, body], i) => {
    const id = `question-${i + 1}`;
    data.questions.push({
      id,
      campusId: data.campuses[i + 1].id,
      title,
      body,
      categoryIds: [i === 1 ? 'proposal' : i === 3 ? 'sosial' : 'indikator'],
      createdAt: `2026-09-0${8 - i}T01:00:00.000Z`
    });
    if (i < 3)
      data.answers.push({
        id: `answer-${i + 1}`,
        questionId: id,
        body: [
          'Pada prototype ini, capaian dihitung dari nilai aktual dibagi target, maksimal 100%. Progres kampus merupakan rata-rata seluruh indikator. Baseline ditampilkan sebagai konteks awal.',
          'Boleh. Unggah PDF melalui halaman Proposal dan isi catatan perubahan. Setiap unggahan tersimpan sebagai versi baru, sementara versi sebelumnya tetap dapat dilihat.',
          'Tuliskan ringkasan pelaksanaan, periode data, dan hasil yang mendukung nilai aktual. Catatan ini membantu Admin memahami perkembangan kegiatan.'
        ][i],
        updatedAt: timestamp
      });
    for (let j = 0; j < [24, 18, 12, 8, 5, 3][i]; j++)
      data.likes.push({
        id: `${id}:campus-${j + 2}`,
        questionId: id,
        campusId: data.campuses[j + 1].id
      });
  });
  data.faq = data.questions.slice(0, 2).map((q, i) => ({
    id: `faq-${i + 1}`,
    questionId: q.id,
    question: q.title,
    answer: data.answers[i].body,
    order: i
  }));
  data.notifications = data.feedback.map((f) => ({
    id: `notice-${f.id}`,
    campusId: f.campusId,
    recipient: 'campus',
    title: 'Permintaan revisi indikator',
    body: f.text,
    href: '/campus/indicators',
    createdAt: f.createdAt,
    readAt: null
  }));
  data.questions
    .filter((q) => !data.answers.some((a) => a.questionId === q.id))
    .forEach((q) =>
      data.notifications.push({
        id: `notice-${q.id}`,
        campusId: q.campusId,
        recipient: 'admin',
        title: 'Pertanyaan baru dari kampus',
        body: q.title,
        href: `/admin/questions/${q.id}`,
        createdAt: q.createdAt,
        readAt: null
      })
    );
  data.notifications.forEach((n) => {
    n.simulated = true;
  });
  data.notifications.push(...demoNotifications());
  data.notificationSeedVersion = NOTIFICATION_SEED_VERSION;
  data.submissions = demoSubmissions(data);
  data.campusRosterVersion = CAMPUS_ROSTER_VERSION;
  data.locations = CAMPUS_LOCATIONS.map((point) => ({
    campusId: point.campusId,
    province: point.province,
    island: point.island,
    longitude: 94.5 + ((point.x - 3) / 94) * 47,
    latitude: 6.5 - ((point.y - 7) / 90) * 18,
    approximate: true
  }));
  return { data, files };
}
