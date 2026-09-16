import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('demo logout clears session without a backend request', async t => {
  const server = await createServer({ server: { middlewareMode: true, ws: false, watch: null, preTransformRequests: false }, appType: 'custom' });
  t.after(() => server.close());
  const { app } = await server.ssrLoadModule('/src/lib/state.svelte.ts');
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('No backend in demo'); };
  app.session = { role: 'admin', id: 'admin-1', name: 'Demo' };
  app.data = { private: 'old account' };
  assert.equal(await app.logout(), true);
  assert.equal(app.session, null);
  assert.equal(app.data, null);
  assert.equal(requests, 0);
});
