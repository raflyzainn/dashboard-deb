import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { security } from '../../src/lib/server/deb/security';
import { executeAccount, revokeSessions } from '../../src/lib/server/deb/backend';
import { LOCAL, installBinary, provisionInstance, migrate, start, adminClient, client, readJson, credentialsPath, type Credentials, password } from '../../scripts/pocketbase/runtime';

test('logout revokes copied account sessions only after a successful database commit', { timeout: 180000 }, async t => {
  await installBinary(); await mkdir(path.join(LOCAL, 'tests'), { recursive: true });
  const instance = await provisionInstance(await mkdtemp(path.join(LOCAL, 'tests', 'logout-')), 'test');
  await migrate(instance); const child = await start(instance);
  t.after(async () => { child.kill(); await new Promise(resolve => child.once('exit', resolve)); });
  const pb = await adminClient(instance), credentials = await readJson<Credentials>(credentialsPath(instance));
  const secret = password() + password();
  const settings = { PB_URL: instance.url, PB_SUPERUSER_EMAIL: credentials.superuser.email, PB_SUPERUSER_PASSWORD: credentials.superuser.password, DEB_INVITATION_KEY: secret, DEB_LOCAL_PREVIEW_ENABLED: 'false' };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  const server = await createServer({ server: { middlewareMode: true, ws: false, watch: null, preTransformRequests: false }, appType: 'custom' });
  t.after(() => server.close());
  const { handle } = await server.ssrLoadModule('/src/hooks.server.ts');
  const { POST, GET } = await server.ssrLoadModule('/src/routes/api/auth/[operation]/+server.ts');
  async function login(email: string) {
    const pass = password();
    const record = await pb.collection('users').create({ name: 'Logout test', email, password: pass, passwordConfirm: pass, role: 'admin', active: true, verified: true, simulated: false, sessionVersion: password() });
    const user = client(instance.url); const result = await user.collection('users').authWithPassword(email, pass);
    return { record, user, signIn: () => user.collection('users').authWithPassword(email, pass), cookie: security.createJWT({ kind: 'session', token: result.token, version: record.sessionVersion }, secret, 28800) };
  }
  async function call(operation: string, cookie?: string) {
    const deleted: string[] = [];
    const url = new URL('https://deb.example/api/auth/' + operation);
    const method = operation === 'me' ? 'GET' : 'POST';
    const event = { url, locals: {}, params: { operation }, request: new Request(url, { method, headers: { origin: url.origin } }),
      cookies: { get: () => cookie, delete: (name: string) => deleted.push(name) }, getClientAddress: () => '127.0.0.1' };
    const response = await handle({ event, resolve: method === 'GET' ? GET : POST });
    return { response, deleted, body: await response.json() };
  }
  const account = await login('logout@deb.local.test'), other = await login('other@deb.local.test');
  assert.ok((await call('me', account.cookie)).body.session);

  await t.test('logout makes a copied cookie unusable while other accounts remain logged in', async () => {
    const result = await call('logout', account.cookie);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.deleted, ['deb_session']);
    assert.equal((await call('me', account.cookie)).body.session, null);
    assert.ok((await call('me', other.cookie)).body.session);
  });

  await t.test('failed revocation preserves the cookie and returns a retryable failure', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, options?: RequestInit) => {
      if (String(input).endsWith('/api/batch')) return Promise.reject(new Error('Injected database outage'));
      return original(input, options);
    }) as typeof fetch;
    try {
      const result = await call('logout', other.cookie);
      assert.equal(result.response.status, 503);
      assert.deepEqual(result.deleted, []);
    } finally { globalThis.fetch = original; }
    assert.ok((await call('me', other.cookie)).body.session);
  });

  await t.test('the embedded native PocketBase token is revoked too', async () => {
    await assert.rejects(account.user.collection('users').authRefresh(), (error: any) => [401, 403].includes(error.status));
    assert.equal((await other.user.collection('users').authRefresh()).record.id, other.record.id);
  });

  await t.test('a stale in-flight admin request cannot change accounts after logout', async () => {
    await assert.rejects(executeAccount(pb, settings, account.record, 'save', { changes: [] }, '127.0.0.1'), (error: any) => error.status === 401);
    const version = (await pb.collection('users').getOne(account.record.id)).sessionVersion;
    await revokeSessions(pb, account.record);
    assert.equal((await pb.collection('users').getOne(account.record.id)).sessionVersion, version, 'a retry cannot revoke a newer session generation');
  });

  await t.test('missing or already revoked sessions can safely finish logout', async () => {
    for (const cookie of [undefined, account.cookie]) assert.equal((await call('logout', cookie)).response.status, 200);
  });

  await t.test('the unchanged password can log in again and stale logout retries preserve that new session', async () => {
    const fresh = await account.signIn();
    const cookie = security.createJWT({ kind: 'session', token: fresh.token, version: fresh.record.sessionVersion }, secret, 28800);
    await revokeSessions(pb, account.record);
    await call('logout', account.cookie);
    assert.ok((await call('me', cookie)).body.session);
  });
});
