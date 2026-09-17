export type PeriodState = 'draft' | 'active' | 'archived';
export interface Period { id: string; name: string; state: PeriodState }
export const periodLabel = (id: string) => id || 'Periode awal';
export const activePeriodFilter = '(periodState = "" || periodState = "active")';
export function periodsFrom(definitions: { period?: string; periodState?: string }[]): Period[] {
  return [...new Map(definitions.map(d => [d.period || '', {
    id: d.period || '', name: periodLabel(d.period || ''), state: (d.periodState || 'active') as PeriodState
  }])).values()];
}
