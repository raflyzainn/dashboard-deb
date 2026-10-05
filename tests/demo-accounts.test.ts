import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/lib/data/demo/store';

test('40 demo campuses each have two distinct PIC accounts sharing their campus', () => {
  const state = initialState();
  assert.equal(state.data.campuses.length, 40);
  assert.equal(state.accounts.length, 80);
  assert.equal(new Set(state.accounts.map((a) => a.id)).size, 80);
  assert.equal(new Set(state.accounts.map((a) => a.email)).size, 80);
  for (const campus of state.data.campuses) {
    const accounts = state.accounts.filter((a) => a.campusId === campus.id);
    assert.deepEqual(
      accounts.map((a) => a.slot),
      [1, 2]
    );
    assert.equal(accounts[0].id, campus.id);
  }
});
import { upgradeAccounts, type DemoState } from '../src/lib/data/demo/store';
test('legacy PIC and campus work survive the two-PIC migration without duplicate records', () => {
  const state = initialState();
  state.accounts = state.accounts
    .filter((a) => a.slot === 1)
    .map(({ id, slot, ...a }) => a) as DemoState['accounts'];
  state.accounts[0].name = 'PIC existing';
  state.accounts[0].email = 'existing@example.test';
  state.data.indicators[0].current = 987;
  const proposals = state.data.proposals.map((p) => p.id);
  assert.equal(upgradeAccounts(state), true);
  assert.equal(state.accounts.length, 80);
  assert.equal(state.accounts[0].name, 'PIC existing');
  assert.equal(state.accounts[0].email, 'existing@example.test');
  assert.equal(state.data.indicators[0].current, 987);
  assert.deepEqual(
    state.data.proposals.map((p) => p.id),
    proposals
  );
  assert.equal(upgradeAccounts(state), false);
  assert.equal(state.accounts.length, 80);
});
