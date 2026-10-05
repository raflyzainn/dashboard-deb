import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/lib/data/demo/store';

test('each demo campus has an action-plan profile from the spreadsheet', () => {
  const campuses = initialState().data.campuses as Array<{
    acronym?: string;
    program?: { description?: string; intervention?: string };
  }>;
  assert.equal(campuses.length, 40);
  assert.ok(campuses.every((campus) => campus.program));
  assert.match(campuses.find((campus) => campus.acronym === 'UNS')!.program!.description!, /Sobokerto/);
  assert.match(campuses.find((campus) => campus.acronym === 'UIR')!.program!.intervention!, /PLTS/);
});

test('indicators use the numeric metrics provided by the spreadsheet', () => {
  const data = initialState().data;
  assert.deepEqual(
    data.definitions.map((definition) => definition.name),
    ['Pendapatan total', 'Penerima manfaat', 'Pendapatan per kapita']
  );
  const uir = data.campuses.find((campus) => campus.acronym === 'UIR')!;
  const indicators = data.indicators.filter((indicator) => indicator.campusId === uir.id);
  assert.equal(indicators.find((indicator) => indicator.definitionId === 'def-income')!.current, 40_000_000);
  assert.equal(indicators.find((indicator) => indicator.definitionId === 'def-beneficiaries')!.current, 10);
  assert.equal(indicators.find((indicator) => indicator.definitionId === 'def-income-per-capita')!.current, 4_000_000);
});

test('readiness indicators retain the spreadsheet evidence instead of converting it to numbers', () => {
  const campus = initialState().data.campuses.find((campus) => campus.acronym === 'UNS') as {
    program?: { socialMapping?: string; conflict?: string; institution?: string };
  };
  assert.match(campus.program!.socialMapping!, /September/);
  assert.match(campus.program!.conflict!, /keberlanjutan/i);
  assert.match(campus.program!.institution!, /Belum/i);
});

test('fills source gaps and applies the shared initial targets', () => {
  const data = initialState().data;
  const stai = data.campuses.find((campus) => campus.acronym === 'STAI TUNTAS')!;
  const itb = data.campuses.find((campus) => campus.acronym === 'ITB')!;
  const uns = data.campuses.find((campus) => campus.acronym === 'UNS') as {
    program?: { interventionSummary?: string };
  };
  const staiPerCapita = data.indicators.find(
    (indicator) => indicator.campusId === stai.id && indicator.definitionId === 'def-income-per-capita'
  )!;
  const itbBeneficiaries = data.indicators.find(
    (indicator) => indicator.campusId === itb.id && indicator.definitionId === 'def-beneficiaries'
  )!;
  const staiIncome = data.indicators.find(
    (indicator) => indicator.campusId === stai.id && indicator.definitionId === 'def-income'
  )!;

  assert.equal(staiPerCapita.current, 30_000_000 / 9);
  assert.equal(itbBeneficiaries.unfilled, false);
  assert.equal(staiIncome.target, 60000000);
  assert.match(uns.program!.interventionSummary!, /Optimalisasi PLTS/);
});
