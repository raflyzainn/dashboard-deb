import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareText, normalizeLine, splitRows } from '../src/lib/data/proposal-diff';

const lines = (values: string[]) => values.map((text, i) => ({ text, page: i > 1 ? 2 : 1 }));
test('proposal comparison preserves direction, line numbers, page references and unchanged context', async () => {
  const before = lines(['Judul', 'Anggaran Rp 10 juta', 'Kegiatan lama', 'Penutup']);
  const after = lines(['Judul', 'Anggaran Rp 15 juta', 'Penutup', 'Lampiran baru']);
  const result = await compareText(before, after);
  assert.equal(result.added, 2); assert.equal(result.removed, 2);
  assert.deepEqual(result.rows.filter(r => r.before).map(r => r.before?.text), before.map(l => l.text));
  assert.deepEqual(result.rows.filter(r => r.after).map(r => r.after?.text), after.map(l => l.text));
  assert.equal(result.rows.at(-1)?.after?.number, 4);
  assert.equal(result.rows.at(-1)?.after?.page, 2);
  const paired = splitRows(result.rows);
  assert.equal(paired[1].before?.text, 'Anggaran Rp 10 juta');
  assert.equal(paired[1].after?.text, 'Anggaran Rp 15 juta');
  assert.equal(paired[2].after, undefined);
  const reversed = await compareText(after, before);
  assert.deepEqual(reversed.rows.filter(r => r.kind === 'added').map(r => r.after?.text), ['Anggaran Rp 10 juta', 'Kegiatan lama']);
});
test('identical text, insertions, deletions and literal markup remain accurate', async () => {
  const content = lines(['<script>alert(1)</script>', 'Angka 100,50']);
  const equal = await compareText(content, content);
  assert.equal(equal.added + equal.removed, 0);
  assert.equal((await compareText([], content)).added, 2);
  assert.equal((await compareText(content, [])).removed, 2);
  assert.equal(normalizeLine('  Biaya\u00a0 Rp   100,50  '), 'Biaya Rp 100,50');
  assert.equal((await compareText(lines(['100,50']), lines(['100,51']))).added, 1);
});
