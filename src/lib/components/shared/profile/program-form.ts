// Shared helpers of the program profile sections: text handling, change detection,
// Rupiah input formatting and the save call.
import { app } from '$lib/state.svelte';
import { dataService } from '$lib/data/service';
import type { ProgramProfile } from '$lib/types';

export type ProgramKey = Exclude<keyof ProgramProfile, 'simulatedFields'>;
export type ProgramValues = Partial<Record<ProgramKey, string>>;

export const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));

/** Trimmed draft values that differ from the baseline. Only these are sent to the service. */
export function changedValues<K extends ProgramKey>(draft: Record<K, string>, baseline: Record<K, string>) {
  const values: ProgramValues = {};
  for (const key of Object.keys(draft) as K[]) {
    const next = draft[key].trim();
    if (next !== baseline[key].trim()) values[key] = next;
  }
  return values;
}

/** Resolves to true once the values are stored. */
export const saveProgram = (campusId: string, values: ProgramValues) =>
  app.mutate(() => dataService.updateProgram(campusId, values), 'Data program tersimpan.');

export const isWebUrl = (value: string) => /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value.trim());

const MAX_BUDGET_DIGITS = 15;

/** Digits typed into the Rupiah input. */
export const onlyDigits = (value: string) => value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_BUDGET_DIGITS);

/** Whole Rupiah digits of stored values such as 75000000, "Rp 51,860,000" or "Rp65.347.000,00". Empty when unreadable. */
export function budgetDigits(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 1 ? String(Math.round(value)) : '';
  let source = text(value)
    .trim()
    .replace(/^rp\.?\s*/i, '')
    .replace(/[.,\s]+$/, '');
  if (!source || /[^\d.,\s]/.test(source)) return '';
  // One or two digits after the last separator are cents.
  source = source.replace(/[.,]\d{1,2}$/, '');
  return onlyDigits(source);
}

export const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const formatRupiah = (digits: string) => (digits ? `Rp ${groupDigits(digits)}` : '');
