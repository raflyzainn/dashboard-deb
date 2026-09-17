// Run against the local production build: npm run preview:cloudflare
import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:4177';
const request = (path, options = {}) => fetch(base + path, { ...options, signal: AbortSignal.timeout(15000) });
const login = await request('/login');
assert.equal(login.status, 200);
assert.match(await login.text(), /<html/);
assert.match(login.headers.get('cache-control'), /no-store/);
const me = await request('/api/auth/me');
assert.equal(me.status, 200);
assert.deepEqual(await me.json(), { session: null });
assert.equal((await request('/api/dev/accounts', { headers: { 'x-deb-preview': '1' } })).status, 404);
assert.equal((await request('/api/auth/logout', { method: 'POST', headers: { origin: 'https://other.example' } })).status, 403);
const logout = await request('/api/auth/logout', { method: 'POST', headers: { origin: base } });
assert.equal(logout.status, 200);
assert.deepEqual(await logout.json(), { ok: true });
assert.match(logout.headers.get('set-cookie'), /deb_session=/);
// Invalid JSON reaches the server's bounded body reader (uses Node Buffer).
const malformed = await request('/api/auth/login', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{' });
assert.equal(malformed.status, 401);
console.log('Cloudflare smoke passed: SSR, API, QA disabled, origin guard, logout cookie, body parser.');
