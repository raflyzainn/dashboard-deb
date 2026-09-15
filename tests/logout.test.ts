import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('logout clears cookies without backend access and retains client state on failure', async t => {
  const server = await createServer({ server: { middlewareMode: true, watch: null, preTransformRequests: false }, appType: 'custom' });
  t.after(() => server.close());
  const { handle } = await server.ssrLoadModule('/src/hooks.server.ts');
  const { POST } = await server.ssrLoadModule('/src/routes/api/auth/[operation]/+server.ts');
  const deleted: string[] = [];
  const event = {
    url: new URL('https://deb.example/api/auth/logout'), locals: {}, params: { operation: 'logout' },
    request: new Request('https://deb.example/api/auth/logout', { method: 'POST', headers: { origin: 'https://deb.example' } }),
    cookies: { get() { throw new Error('Session backend unavailable'); }, delete(name: string) { deleted.push(name); } }
  };
  await t.test('same-origin logout reaches cookie deletion without session lookup', async () => {
    const response = await handle({ event, resolve: POST });
    assert.equal(response.status, 200);
    assert.deepEqual(deleted, ['deb_session']);
    assert.match(response.headers.get('cache-control'), /no-store/);
  });
  await t.test('cross-origin logout is rejected', async () => {
    deleted.length = 0;
    event.request = new Request(event.url, { method: 'POST', headers: { origin: 'https://other.example' } });
    assert.equal((await handle({ event, resolve: POST })).status, 403);
    assert.deepEqual(deleted, []);
  });
  const { app } = await server.ssrLoadModule('/src/lib/state.svelte.ts');
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  await t.test('HTTP and network failures keep the session and report an error', async () => {
    const session = { role: 'admin' };
    for (const fetcher of [async () => new Response(null, { status: 503 }), async () => { throw new Error('Offline'); }]) {
      app.session = session;
      globalThis.fetch = fetcher;
      assert.equal(await app.logout(), false);
      assert.equal(app.session, session);
      assert.ok(app.error);
    }
    globalThis.fetch = async () => Response.json({ ok: true });
    assert.equal(await app.logout(), true);
    assert.equal(app.session, null);
  });
});
