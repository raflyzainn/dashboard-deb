export const PROGRAM_THEMATICS = ['Ketahanan Pangan', 'Pesisir Modern', 'Wisata Energi'] as const;
export const THEMATIC_DESCRIPTION_LIMIT = 1000;

export function validProgramThematic(value: string) {
  return value === '' || PROGRAM_THEMATICS.some(theme => theme === value);
}
