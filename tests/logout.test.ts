import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('logout failure is reported and does not pretend the server session ended', async t => {
  const server = await createServer({ server: { middlewareMode: true, ws: false, watch: null, preTransformRequests: false }, appType: 'custom' });
  t.after(() => server.close());
  const { app } = await server.ssrLoadModule('/src/lib/state.svelte.ts');
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('No backend in demo'); };
  app.session = { role: 'admin', id: 'admin-1', name: 'Demo' };
  app.data = { private: 'old account' };
  assert.equal(await app.logout(), false);
  assert.equal(app.session.id, 'admin-1');
  assert.deepEqual(app.data, { private: 'old account' });
  assert.match(app.error, /Keluar belum dapat dipastikan/);
  assert.equal(requests, 1);
});
