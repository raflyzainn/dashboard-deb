import type { Campus, Snapshot } from './types';
import { campusStats } from './domain';

export type ProgressBand = 'early' | 'growing' | 'near' | 'reached';
export interface CampusLocation {
  campusId: string; province: string; island: string; x: number; y: number;
}


export const progressBands: Record<ProgressBand, { label: string; short: string; color: string }> = {
  early: { label: 'Perlu perhatian', short: '< 62%', color: '#94a8c8' },
  growing: { label: 'Berkembang', short: '62–65%', color: '#e2a84a' },
  near: { label: 'Maju', short: '66–69%', color: '#2584d8' },
  reached: { label: 'Progres tertinggi', short: '≥ 70%', color: '#145ee8' }
};

export function progressBand(value: number): ProgressBand {
  if (value >= 70) return 'reached';
  if (value >= 66) return 'near';
  if (value >= 62) return 'growing';
  return 'early';
}

export function mapCampuses(data: Snapshot) {
  return data.campuses.flatMap((campus: Campus) => {
    const location = data.locations?.find(point => point.campusId === campus.id);
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number' ||
      !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) ||
      location.longitude < 94.5 || location.longitude > 141.5 || location.latitude < -11.5 || location.latitude > 6.5) return [];
    const score = campusStats(data, campus.id).progress;
    return [{ ...campus, ...location, x: 3 + (location.longitude - 94.5) / 47 * 94,
      y: 7 + (6.5 - location.latitude) / 18 * 90, score, band: progressBand(score) }];
  });
}

export function regionSummary(data: Snapshot) {
  const points = data.campuses.map(c => {
    const location = data.locations?.find(l => l.campusId === c.id);
    return { island: location?.island || 'Wilayah belum diisi', province: location?.province || '', score: campusStats(data, c.id).progress };
  });
  return [...new Set(points.map(point => point.island))].map(island => {
    const rows = points.filter(point => point.island === island);
    return {
      island, campuses: rows.length, provinces: new Set(rows.map(row => row.province).filter(Boolean)).size,
      average: rows.reduce((sum, row) => sum + row.score, 0) / rows.length
    };
  }).sort((a, b) => b.campuses - a.campuses || a.island.localeCompare(b.island));
}
