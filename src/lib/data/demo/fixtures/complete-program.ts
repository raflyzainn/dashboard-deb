import type { ProgramProfile } from '../../../types';

// Keep legacy labels available for migrating previously seeded browser data.
export function completeDemoProgram(source: ProgramProfile, acronym: string, legacy = false): ProgramProfile {
  const program = { ...source, simulatedFields: [] as string[] };
  const examples: Partial<ProgramProfile> = {
    mentor: `Mentor contoh ${acronym} — kontak simulasi, tidak untuk dihubungi`,
    coordinator: `Koordinator contoh ${acronym} — kontak simulasi, tidak untuk dihubungi`,
    localHero: `Penggerak desa contoh ${acronym} — kontak simulasi, tidak untuk dihubungi`,
    subholding: 'Mitra energi contoh', operatingUnit: 'Unit pendamping contoh',
    actionPlanTemplate: 'Contoh dokumen rencana aksi; tautan belum tersedia',
    replicationVillage: 'Desa percontohan untuk replikasi program', sourceStatus: 'Rencana pendampingan',
    currentClass: 'Putih', targetClass: 'Biru',
    existingEbt: 'PLTS contoh berkapasitas 3 kWp', socialMapping: 'Pemetaan sosial contoh dijadwalkan pada awal pendampingan',
    conflict: 'Contoh risiko: pembagian tugas dan pemeliharaan sarana perlu disepakati kelompok',
    ikm: 'Contoh survei kepuasan masyarakat dijadwalkan setelah kegiatan',
    institution: 'Kelompok pengelola contoh dengan pembagian tugas operasional',
    landPermit: 'Contoh persetujuan penggunaan lahan sedang disiapkan', siteSurvey: 'Contoh survei lokasi dijadwalkan sebelum pemasangan',
    description: `Contoh program ${acronym}: pemanfaatan energi terbarukan dan pendampingan usaha masyarakat`,
    intervention: 'Contoh kegiatan: pelatihan pengelola, pemeliharaan sarana energi, dan pendampingan pemasaran',
    interventionSummary: 'Pelatihan pengelola dan optimalisasi energi terbarukan',
    address: 'Kantor desa lokasi pendampingan', province: 'Jawa Tengah', coordinates: '-7.5666, 110.8167',
    mapUrl: 'https://www.google.com/maps?q=-7.5666,110.8167',
    income: 30000000, beneficiaries: 10, budget: 75000000
  };
  for (const [key, example] of Object.entries(examples)) {
    const value = source[key as keyof ProgramProfile];
    if (value == null || ['', '-'].includes(String(value).trim()) || String(value).startsWith('#')) {
      (program as Record<string, unknown>)[key] = typeof example === 'string' ? (legacy ? `[Simulasi] ${example}` : example.replace(/ ? kontak simulasi, tidak untuk dihubungi/g, '').replace(/contoh /gi, '').replace(/Contoh /g, '')) : example;
      program.simulatedFields.push(key);
    }
  }
  if (source.incomePerCapita == null || String(source.incomePerCapita).startsWith('#')) {
    const amount = (v: unknown, fallback: number) => {
      if (typeof v === 'number') return v;
      const match = String(v).trim().match(/^(?:Rp\s*)?([\d.,]+)(?:\s+(?:orang|kepala keluarga))?$/i);
      return match ? Number(match[1].replace(/[^\d]/g, '')) : fallback;
    };
    program.incomePerCapita = amount(program.income, 30000000) / (amount(program.beneficiaries, 10) || 1);
    program.simulatedFields.push('incomePerCapita');
  }
  return program;
}
