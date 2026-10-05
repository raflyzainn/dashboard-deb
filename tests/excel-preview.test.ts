import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excelSheetPreview } from '../src/lib/excel-preview';

test('oversized Excel ranges and merged cells cannot produce millions of preview cells', () => {
  const sheet = {
    '!ref': 'A1:WWN186',
    '!merges': [{ s: { r: 0, c: 0 }, e: { r: 0, c: 16159 } }],
    A1: { t: 's' as const, v: 'Judul RAB' },
    A2: { t: 'n' as const, v: 125000 },
  };
  const preview = excelSheetPreview(sheet);
  assert.equal(preview.limited, true);
  assert.ok(preview.html.includes('Judul RAB'));
  assert.ok(preview.html.includes('125000'));
  assert.ok((preview.html.match(/<td\b/g) || []).length <= 186 * 50);
  assert.ok(!preview.html.includes('colspan="16160"'));
  assert.equal(sheet['!ref'], 'A1:WWN186');
  assert.equal(sheet['!merges'][0].e.c, 16159);
});
