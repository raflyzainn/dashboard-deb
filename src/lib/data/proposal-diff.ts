import { diffLines, type Change } from 'diff';

export interface TextLine { text: string; page: number }
export interface ExtractedProposal { lines: TextLine[]; pages: number; emptyPages: number[] }
export interface DiffLine extends TextLine { number: number }
export interface DiffRow { kind: 'same' | 'removed' | 'added'; before?: DiffLine; after?: DiffLine }
export interface ProposalDiff { rows: DiffRow[]; added: number; removed: number }

// Normalize PDF spacing, but preserve case, punctuation and numeric changes.
export function normalizeLine(text: string): string { return text.normalize('NFC').replace(/\s+/gu, ' ').trim(); }

export async function compareText(before: TextLine[], after: TextLine[]): Promise<ProposalDiff> {
  if (before.length + after.length > 12000) throw new Error('Teks terlalu panjang untuk dibandingkan. Buka kedua PDF untuk meninjaunya.');
  const changes = await new Promise<Change[] | undefined>(resolve => {
    diffLines(before.map(l => l.text + '\n').join(''), after.map(l => l.text + '\n').join(''), { timeout: 2000, callback: resolve });
  });
  if (!changes) throw new Error('Perbedaan dokumen terlalu besar untuk diproses. Buka kedua PDF untuk meninjaunya.');
  const rows: DiffRow[] = [];
  let oldIndex = 0, newIndex = 0, added = 0, removed = 0;
  for (const change of changes) {
    for (let i = 0; i < change.count; i++) {
      const row: DiffRow = { kind: change.added ? 'added' : change.removed ? 'removed' : 'same' };
      if (!change.added) { row.before = { ...before[oldIndex], number: ++oldIndex }; }
      if (!change.removed) { row.after = { ...after[newIndex], number: ++newIndex }; }
      if (change.added) added++;
      if (change.removed) removed++;
      rows.push(row);
    }
  }
  return { rows, added, removed };
}

// Pair neighboring removals/additions for a PR-style split view.
export function splitRows(rows: DiffRow[]): { before?: DiffLine; after?: DiffLine; changed: boolean }[] {
  const result: { before?: DiffLine; after?: DiffLine; changed: boolean }[] = [];
  let index = 0;
  while (index < rows.length) {
    if (rows[index].kind === 'same') { result.push({ ...rows[index++], changed: false }); continue; }
    const removed: DiffLine[] = [], added: DiffLine[] = [];
    while (index < rows.length && rows[index].kind !== 'same') {
      const row = rows[index++];
      if (row.before) removed.push(row.before);
      if (row.after) added.push(row.after);
    }
    for (let i = 0; i < Math.max(removed.length, added.length); i++) result.push({ before: removed[i], after: added[i], changed: true });
  }
  return result;
}
