import { utils, type WorkSheet } from 'xlsx';

// Preview only: formatting can extend Excel's used range to its last column.
// Keep the original workbook untouched and bound both cells and merged spans.
export function excelSheetPreview(sheet: WorkSheet) {
  const source = utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
  const range = { s: { r: 0, c: 0 }, e: { r: Math.min(source.e.r, 499), c: Math.min(source.e.c, 49) } };
  const merges = (sheet['!merges'] || [])
    .filter(m => m.s.r <= range.e.r && m.s.c <= range.e.c)
    .map(m => ({ s: { ...m.s }, e: { r: Math.min(m.e.r, range.e.r), c: Math.min(m.e.c, range.e.c) } }));
  return {
    limited: source.e.r > range.e.r || source.e.c > range.e.c,
    html: utils.sheet_to_html({ ...sheet, '!ref': utils.encode_range(range), '!merges': merges }, { editable: false })
  };
}
