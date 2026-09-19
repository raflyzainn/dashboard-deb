// Standard address and map pin helpers shared by the profile form and the dashboards.

/** Administrative area picked with RegionSelect. Ids follow the Kemendagri codes of the region data. */
export interface RegionValue {
  provinceId: string;
  province: string;
  regencyId: string;
  regency: string;
  districtId: string;
  district: string;
  villageId: string;
  village: string;
  postalCode: string;
}

export const REGION_KEYS = [
  'provinceId',
  'province',
  'regencyId',
  'regency',
  'districtId',
  'district',
  'villageId',
  'village',
  'postalCode'
] as const;

export const emptyRegion = (): RegionValue => ({
  provinceId: '',
  province: '',
  regencyId: '',
  regency: '',
  districtId: '',
  district: '',
  villageId: '',
  village: '',
  postalCode: ''
});

export interface LatLng {
  lat: number;
  lng: number;
}

/** Indonesia bounding box, used to reject swapped or mistyped values. */
export const INDONESIA_BOUNDS = { minLat: -11.5, maxLat: 6.5, minLng: 94.5, maxLng: 141.5 };
export const INDONESIA_CENTER: LatLng = { lat: -2.5, lng: 118 };

export const insideIndonesia = ({ lat, lng }: LatLng) =>
  lat >= INDONESIA_BOUNDS.minLat &&
  lat <= INDONESIA_BOUNDS.maxLat &&
  lng >= INDONESIA_BOUNDS.minLng &&
  lng <= INDONESIA_BOUNDS.maxLng;

/** Reads "-7.5561, 110.8316" (comma, semicolon or space separated). Returns null when unusable. */
export function parseCoordinates(text: string | null | undefined): LatLng | null {
  let source = String(text ?? '').trim();
  if (!source.includes('.')) {
    // "-7,5561; 110,8316" written with decimal commas
    const decimalComma = source.match(/^(-?\d+),(\d+)[\s;,]+(-?\d+),(\d+)$/);
    if (decimalComma) source = `${decimalComma[1]}.${decimalComma[2]} ${decimalComma[3]}.${decimalComma[4]}`;
  }
  const numbers = source.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const lat = Number(numbers[0]);
  const lng = Number(numbers[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export const formatCoordinates = ({ lat, lng }: LatLng) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

export const mapsUrl = ({ lat, lng }: LatLng) => `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

/** "Desa X, Kec. Y, Kab. Z, Provinsi" for read only views. */
export function regionLine(region: Partial<RegionValue>): string {
  return [
    region.village,
    region.district && `Kec. ${region.district}`,
    region.regency,
    region.province,
    region.postalCode
  ]
    .filter(Boolean)
    .join(', ');
}
