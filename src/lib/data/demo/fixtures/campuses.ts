import type { Campus } from '../../../types';
import { PROGRAM_PROFILES } from './programs';

export const CAMPUS_ROSTER_VERSION = 1;
export const CAMPUS_REGIONS = [
  'Jawa',
  'Sumatra',
  'Kalimantan & Sulawesi',
  'Bali, Nusa Tenggara & Indonesia Timur'
] as const;
const roster: [string, string, number, string?][] = [
  ['Universitas Sebelas Maret', 'UNS', 0], ['Universitas Islam Riau', 'UIR', 1],
  ['Universitas Sunan Bonang', 'USB', 0], ['Universitas Diponegoro', 'UNDIP', 0],
  ['Universitas Brawijaya', 'UB', 0], ['Universitas Negeri Yogyakarta', 'UNY', 0],
  ['IPB University', 'IPB', 0], ['Institut Teknologi Sepuluh Nopember', 'ITS', 0],
  ['STAI TUNTAS', 'STAI TUNTAS', 1], ['STT MIGAS', 'STT MIGAS', 2],
  ['Politeknik Negeri Kupang', 'PNK', 3], ['Universitas Syiah Kuala', 'USK', 1],
  ['Universitas Gadjah Mada', 'UGM', 0], ['Universitas Airlangga', 'UNAIR', 0],
  ['Institut Teknologi Bandung', 'ITB', 0], ['Universitas Hasanuddin', 'UNHAS', 2],
  ['Institut Teknologi Sumatera', 'ITERA', 1], ['Universitas Riau', 'UNRI', 1],
  ['Universitas Pattimura', 'UNPATTI', 3], ['Universitas Papua', 'UNIPA', 3],
  ['Universitas Mulawarman', 'UNMUL', 2], ['Universitas Ivet', 'UNISVET', 0],
  ['Universitas PGRI Ronggolawe', 'UNIROW', 0], ['Politeknik Kelautan dan Perikanan Sorong', 'PKP Sorong', 3],
  ['Universitas Wiralodra', 'UNWIR', 0], ['Universitas Pertamina', 'UPER', 0],
  ['Universitas Pasir Pangaraian', 'UPP', 1], ['STAI SUSHA', 'STAI SUSHA', 3],
  ['Universitas Sriwijaya', 'UNSRI', 1], ['Universitas Udayana', 'UNUD', 3],
  ['Politeknik Negeri Cilacap', 'PNC', 0], ['Universitas Sultan Ageng Tirtayasa', 'UNTIRTA', 0],
  ['Universitas Singaperbangsa Karawang', 'UNSIKA', 0], ['Institut Teknologi Kalimantan', 'ITK', 2],
  ['Universitas Cenderawasih', 'UNCEN', 3], ['ITPB', 'ITPB', 0],
  ['Universitas Indonesia', 'UI', 0], ['Universitas Sumatera Utara', 'USU', 1],
  ['Universitas Borneo Tarakan', 'UBT', 2], ['Politeknik Negeri Fakfak', 'POLINEF', 3]
];

export const CAMPUSES: Campus[] = roster.map(([name, acronym, region, city], index) => ({
  id: `campus-${String(index + 1).padStart(3, '0')}`,
  name,
  acronym,
  initials: acronym.includes(' ')
    ? acronym
        .split(' ')
        .map((part) => part[0])
        .join('')
    : acronym,
  region: CAMPUS_REGIONS[region],
  program: PROGRAM_PROFILES[acronym],
  ...(city ? { city } : {}),
  source: index < 34 ? 'user' : 'document'
}));
export const DEMO_CAMPUS_PROFILE = CAMPUSES[0];
