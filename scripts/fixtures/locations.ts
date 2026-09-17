import type { CampusLocation } from '../../src/lib/map';

// Approximate city-level longitude and latitude, not operational GPS coordinates.
const locations: [string, string, number, number][] = [
  ['DKI Jakarta','Jawa',106.82,-6.18], ['DI Yogyakarta','Jawa',110.37,-7.8], ['Jawa Barat','Jawa',107.61,-6.91], ['Jawa Barat','Jawa',107.64,-6.87],
  ['Jawa Tengah','Jawa',110.42,-6.99], ['Jawa Timur','Jawa',112.62,-7.95], ['Jawa Timur','Jawa',112.75,-7.25], ['Jawa Timur','Jawa',112.78,-7.28],
  ['Jawa Barat','Jawa',106.8,-6.6], ['DI Yogyakarta','Jawa',110.39,-7.77], ['Jawa Barat','Jawa',107.3,-6.3], ['DKI Jakarta','Jawa',106.84,-6.15],
  ['Aceh','Sumatra',95.32,5.55], ['Sumatra Utara','Sumatra',98.67,3.59], ['Sumatra Selatan','Sumatra',104.75,-2.99], ['Lampung','Sumatra',105.26,-5.4],
  ['Riau','Sumatra',101.45,.51], ['Sumatra Barat','Sumatra',100.35,-.95], ['Aceh','Sumatra',97.14,5.18], ['Sumatra Utara','Sumatra',99.63,.8],
  ['Riau','Sumatra',101.48,.48], ['Riau','Sumatra',101.18,.85], ['Kalimantan Timur','Kalimantan',117.15,-.5], ['Kalimantan Utara','Kalimantan',117.63,3.3],
  ['Kalimantan Selatan','Kalimantan',114.59,-3.3], ['Kalimantan Timur','Kalimantan',116.86,-1.24], ['Kalimantan Timur','Kalimantan',117.18,-.47],
  ['Sulawesi Selatan','Sulawesi',119.43,-5.15], ['Sulawesi Utara','Sulawesi',124.84,1.47], ['Bali','Bali & Nusa Tenggara',115.17,-8.65],
  ['Nusa Tenggara Barat','Bali & Nusa Tenggara',116.1,-8.58], ['Maluku','Maluku',128.18,-3.7], ['Maluku','Maluku',131.3,-7.18], ['Papua','Papua',140.7,-2.59],
  ['Banten','Jawa',106.1,-6.12], ['Jawa Tengah','Jawa',110.82,-7.57], ['Jawa Tengah','Jawa',109,-7.7], ['Nusa Tenggara Timur','Bali & Nusa Tenggara',123.6,-10.17],
  ['Papua Barat','Papua',134.08,-.86], ['Papua Barat Daya','Papua',131.25,-.88]
];

export const CAMPUS_LOCATIONS: CampusLocation[] = locations.map(([province, island, longitude, latitude], index) => ({
  campusId: `campus-${String(index + 1).padStart(3, '0')}`, province, island,
  x: 3 + (longitude - 94.5) / (141.5 - 94.5) * 94,
  y: 7 + (6.5 - latitude) / (6.5 - (-11.5)) * 90
}));
