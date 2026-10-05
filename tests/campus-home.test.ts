import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campusGreeting } from '../src/lib/campus-greeting';
import { pageRequest } from '../src/lib/page-data';

test('campus greeting follows WIB at each time boundary', () => {
  for (const [time, expected] of [['03:59', 'Selamat malam'], ['04:00', 'Selamat pagi'], ['10:59', 'Selamat pagi'], ['11:00', 'Selamat siang'], ['14:59', 'Selamat siang'], ['15:00', 'Selamat sore'], ['17:59', 'Selamat sore'], ['18:00', 'Selamat malam']] as const) {
    assert.equal(campusGreeting(new Date(`2026-09-21T${time}:00+07:00`)), expected);
  }
  assert.equal(pageRequest(new URL('https://example.test/campus/dashboard')).view, 'static');
  assert.equal(pageRequest(new URL('https://example.test/admin/dashboard')).view, 'dashboard');
});
