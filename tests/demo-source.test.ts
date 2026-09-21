import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, upgradeAccounts } from '../src/lib/data/demo/store';
import { PROGRAM_PROFILES } from '../src/lib/data/demo/fixtures/programs';
import { completeDemoProgram } from '../src/lib/data/demo/fixtures/complete-program';

test('demo retains source values and fills spreadsheet gaps without visible simulation labels', () => {
  const state = initialState();
  for (const campus of state.data.campuses) {
    const original = PROGRAM_PROFILES[campus.acronym!];
    for (const [key, value] of Object.entries(original)) {
      if (value != null && !['', '-'].includes(String(value).trim()) && !String(value).startsWith('#')) assert.deepEqual(campus.program![key as keyof typeof original], value, `${campus.acronym} ${key}`);
      else assert.ok(campus.program![key as keyof typeof original] != null);
      assert.ok(!String(campus.program![key as keyof typeof original]).includes('[Simulasi]'));
    }
    for (const notice of state.data.notifications.filter(n => n.campusId === campus.id && n.id.startsWith('demo-source-'))) {
      assert.ok(notice.body.includes(campus.name));
      assert.ok(notice.simulated);
    }
  }
  assert.equal(state.data.indicators.filter(i => i.unfilled).length, 0);
  for (const definition of state.data.definitions) assert.ok(state.data.indicators.filter(i => i.definitionId === definition.id).every(i => i.target === definition.target));
});

test('source enrichment preserves saved campus edits and account state', () => {
  const state = initialState();
  delete state.sourceProfileVersion;
  state.data.campuses[0].program!.mentor = 'Kontak yang telah diedit';
  state.data.campuses[0].program!.landPermit = 'Persetujuan kampus';
  delete state.data.campuses[0].program!.coordinator;
  state.data.indicators[0].current = 123;
  state.data.indicators[0].updatedAt = '2026-09-17T08:00:00.000Z';
  state.data.indicators[0].target = 777;
  state.accounts[0].name = 'PIC tersimpan';
  upgradeAccounts(state);
  assert.equal(state.data.campuses[0].program!.mentor, 'Kontak yang telah diedit');
  assert.equal(state.data.campuses[0].program!.landPermit, 'Persetujuan kampus');
  assert.ok(state.data.campuses[0].program!.coordinator);
  assert.equal(state.data.indicators[0].current, 123);
  assert.equal(state.data.indicators[0].target, 60000000);
  assert.equal(state.accounts[0].name, 'PIC tersimpan');
  assert.equal(upgradeAccounts(state), false);
});

test('migration removes previous simulated defaults but preserves edited fields', () => {
  const state = initialState();
  state.sourceProfileVersion = 1;
  const campus = state.data.campuses[0];
  campus.program = completeDemoProgram(PROGRAM_PROFILES[campus.acronym!], campus.acronym!, true);
  campus.program.landPermit = 'Dokumen yang diisi kampus';
  state.data.indicators[0].current = 30000000;
  state.data.indicators[0].unfilled = false;
  state.data.indicators[0].target = 36000000;
  state.data.indicators[0].targetSimulated = true;
  upgradeAccounts(state);
  assert.equal(campus.program.landPermit, 'Dokumen yang diisi kampus');
  assert.ok(campus.program.siteSurvey);
  assert.ok(campus.program.subholding);
  assert.equal(state.data.indicators[0].unfilled, false);
  assert.equal(state.data.indicators[0].target, 60000000);
});
