import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM_THEMATICS, validProgramThematic } from '../src/lib/program-thematics';

test('tematik accepts the three official themes and an unfilled legacy profile', () => {
  for (const theme of PROGRAM_THEMATICS) assert.equal(validProgramThematic(theme), true);
  assert.equal(validProgramThematic(''), true);
  assert.equal(validProgramThematic('Ekonomi Sirkular'), false);
  assert.equal(validProgramThematic('ketahanan pangan'), false);
});
