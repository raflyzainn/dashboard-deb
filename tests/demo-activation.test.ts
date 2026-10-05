import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_ACTIVATION_EMAIL,
  activateDemoAccount,
  canUseDemoPassword
} from '../src/lib/data/demo/activation';

test('demo activation only accepts its PIC email and creates a usable password', () => {
  assert.throws(() => activateDemoAccount('lain@example.test', 'rahasia12'));
  assert.throws(() => activateDemoAccount(DEMO_ACTIVATION_EMAIL, 'singkat'));

  const activation = activateDemoAccount(DEMO_ACTIVATION_EMAIL.toUpperCase(), 'rahasia12');
  assert.equal(canUseDemoPassword(activation, DEMO_ACTIVATION_EMAIL, 'rahasia12'), true);
  assert.equal(canUseDemoPassword(activation, DEMO_ACTIVATION_EMAIL, 'salah123'), false);
});
