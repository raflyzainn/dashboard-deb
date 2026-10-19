import test from 'node:test';
import assert from 'node:assert/strict';
import { campusLogo } from '../src/lib/campus-logos';

test('campus logos match profile abbreviations and retain fallback', () => {
 assert.equal(campusLogo('POLINEF'),'/logo-kampus/polinef.png');
 assert.equal(campusLogo('UNISVET'),'/logo-kampus/ivet.png');
 assert.equal(campusLogo('STAI SUSHA'),'/logo-kampus/stai-siak.png');
 assert.equal(campusLogo('QA3'),'');
});
