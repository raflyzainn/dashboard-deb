import { regionLine, type RegionValue } from '../location';

// Keep the existing document fields for the program's village, district and regency.
export const LOCATION_FIELDS: Record<keyof RegionValue, string> = {
  provinceId: 'lokasiProvinsiId', province: 'lokasiProvinsi',
  regencyId: 'lokasiKabupatenId', regency: 'kabupaten',
  districtId: 'lokasiKecamatanId', district: 'kecamatan',
  villageId: 'lokasiDesaId', village: 'desa', postalCode: 'lokasiKodePos'
};

export const programRegion = (fields: Record<string, string>): RegionValue =>
  Object.fromEntries(Object.entries(LOCATION_FIELDS).map(([key, field]) => [key, fields[field] || ''])) as unknown as RegionValue;

export function pickProgramRegion(fields: Record<string, string>, next: RegionValue) {
  const previous = programRegion(fields);
  const full = fields.lokasiAlamatLengkap || '';
  return {
    ...fields,
    ...Object.fromEntries(Object.entries(LOCATION_FIELDS).map(([key, field]) => [field, next[key as keyof RegionValue]])),
    lokasiAlamatLengkap: !full || full === regionLine(previous)
      ? next.villageId ? regionLine(next) : ''
      : full
  };
}

// Drafts may be incomplete, but a supplied child code must belong to its parent.
export function programLocationErrors(fields: Record<string, string>, complete = false): string[] {
  const r = programRegion(fields);
  const errors: string[] = [];
  const levels = [
    [r.provinceId, r.province, '', /^\d{2}$/, 'provinsi'],
    [r.regencyId, r.regency, r.provinceId, /^\d{2}\.\d{2}$/, 'kabupaten/kota'],
    [r.districtId, r.district, r.regencyId, /^\d{2}\.\d{2}\.\d{2}$/, 'kecamatan'],
    [r.villageId, r.village, r.districtId, /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, 'desa/kelurahan']
  ] as const;
  for (const [id, name, parent, pattern, label] of levels) {
    if (complete && (!id || !name.trim())) errors.push(`Pilih ${label} lokasi program.`);
    else if (id && (!pattern.test(id) || !name.trim() || label !== 'provinsi' && (!parent || !id.startsWith(parent + '.')))) {
      errors.push(`Pilihan ${label} lokasi program tidak sesuai. Pilih ulang wilayah.`);
    }
  }
  if (r.postalCode && !/^\d{5}$/.test(r.postalCode)) errors.push('Kode pos lokasi program harus berisi 5 angka.');
  if (complete && !fields.lokasiAlamatLengkap?.trim()) errors.push('Alamat lengkap lokasi program belum diisi.');
  return errors;
}
