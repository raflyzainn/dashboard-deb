import type { Campus } from '../types';

export const CAMPUS_ROSTER_VERSION = 1;
export const CAMPUS_REGIONS = ['Jawa', 'Sumatra', 'Kalimantan & Sulawesi', 'Bali, Nusa Tenggara & Indonesia Timur'] as const;
// First 34 entries: supplied by the user. Last six: Appendix A of the project Word brief.
// Names do not imply that the generated program metrics are real campus data.
const roster: [string, string, number, string?][] = [
  ['Universitas Indonesia', 'UI', 0, 'Jakarta'],
  ['Universitas Gadjah Mada', 'UGM', 0, 'Yogyakarta'],
  ['Institut Teknologi Bandung', 'ITB', 0, 'Bandung'],
  ['Universitas Padjadjaran', 'UNPAD', 0, 'Bandung'],
  ['Universitas Diponegoro', 'UNDIP', 0, 'Semarang'],
  ['Universitas Brawijaya', 'UB', 0, 'Malang'],
  ['Universitas Airlangga', 'UNAIR', 0, 'Surabaya'],
  ['Institut Teknologi Sepuluh Nopember', 'ITS', 0, 'Surabaya'],
  ['IPB University', 'IPB', 0, 'Bogor'],
  ['Universitas Negeri Yogyakarta', 'UNY', 0],
  ['Universitas Singaperbangsa Karawang', 'UNSIKA', 0],
  ['Universitas Pertamina', 'UPER', 0, 'Jakarta'],
  ['Universitas Syiah Kuala', 'USK', 1, 'Aceh'],
  ['Universitas Sumatera Utara', 'USU', 1, 'Medan'],
  ['Universitas Sriwijaya', 'UNSRI', 1, 'Palembang'],
  ['Institut Teknologi Sumatera', 'ITERA', 1, 'Lampung'],
  ['Universitas Riau', 'UNRI', 1],
  ['Universitas Andalas', 'UNAND', 1],
  ['Universitas Malikussaleh', 'UNIMAL', 1, 'Aceh'],
  ['STAIN Mandailing Natal', 'STAIN Madina', 1],
  ['Universitas Islam Riau', 'UIR', 1],
  ['Universitas Pasir Pangaraian', 'UPP', 1],
  ['Universitas Mulawarman', 'UNMUL', 2, 'Samarinda'],
  ['Universitas Borneo Tarakan', 'UBT', 2],
  ['Universitas Lambung Mangkurat', 'ULM', 2, 'Banjarmasin'],
  ['Institut Teknologi Kalimantan', 'ITK', 2],
  ['Politeknik Negeri Samarinda', 'POLNES', 2],
  ['Universitas Hasanuddin', 'UNHAS', 2, 'Makassar'],
  ['Universitas Sam Ratulangi', 'UNSRAT', 2, 'Manado'],
  ['Universitas Udayana', 'UNUD', 3, 'Bali'],
  ['Universitas Mataram', 'UNRAM', 3, 'NTB'],
  ['Universitas Pattimura', 'UNPATTI', 3, 'Ambon'],
  ['Universitas Lelemuku Saumlaki', 'UNLESA', 3, 'Tanimbar, Maluku'],
  ['Universitas Cenderawasih', 'UNCEN', 3, 'Papua'],
  ['Universitas Sultan Ageng Tirtayasa', 'UNTIRTA', 0],
  ['Universitas Sebelas Maret', 'UNS', 0],
  ['Politeknik Negeri Cilacap', 'PNC', 0],
  ['Politeknik Negeri Kupang', 'PNK', 3],
  ['Universitas Papua', 'UNIPA', 3],
  ['Politeknik Kelautan dan Perikanan Sorong', 'Poltek KP Sorong', 3]
];

export const CAMPUSES: Campus[] = roster.map(([name, acronym, region, city], index) => ({
  id: `campus-${String(index + 1).padStart(3, '0')}`, name, acronym,
  initials: acronym.includes(' ') ? acronym.split(' ').map(part => part[0]).join('') : acronym,
  region: CAMPUS_REGIONS[region], ...(city ? { city } : {}),
  source: index < 34 ? 'user' : 'document'
}));
export const DEMO_CAMPUS_PROFILE = CAMPUSES[0];
