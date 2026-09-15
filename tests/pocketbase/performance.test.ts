import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { LOCAL, installBinary, provisionInstance, migrate, start, adminClient, client, readJson, credentialsPath, type Credentials } from '../../scripts/pocketbase/runtime';
import { seedLocal, authenticateUser } from '../../scripts/pocketbase/seed';
import { executeWorkflow, rateLimit } from '../../src/lib/server/deb/backend';
import { security } from '../../src/lib/server/deb/security';

test('bounded workflow reads, notification batches and auth limit cleanup on isolated PocketBase', { timeout: 180000 }, async t => {
  await installBinary(); await mkdir(path.join(LOCAL, 'tests'), { recursive: true });
  const instance = await provisionInstance(await mkdtemp(path.join(LOCAL, 'tests', 'performance-')), 'test');
  await migrate(instance); const child = await start(instance);
  t.after(async () => { child.kill(); await new Promise(resolve => child.once('exit', resolve)); });
  await seedLocal(instance);
  const root = await adminClient(instance);
  const credentials = await readJson<Credentials>(credentialsPath(instance));
  const admin = await authenticateUser(client(instance.url), credentials, 'admin-1');
  const other = await authenticateUser(client(instance.url), credentials, 'admin-2');
  const queries: URL[] = [];
  root.beforeSend = (url, options) => {
    if (!options.method || options.method === 'GET') {
      const query = new URL(url);
      for (const [key, value] of Object.entries(options.query || {})) query.searchParams.set(key, String(value));
      queries.push(query);
    }
    return { url, options };
  };
  const call = (body: Record<string, unknown>, key = randomUUID()) => executeWorkflow(root, admin.authStore.record, 'readNotifications', body, key, true) as Promise<{ ok: true; more?: boolean }>;
  await t.test('one notification only reads actor, requested notification and its retry receipt', async () => {
    const notice = (await admin.collection('notifications').getList(1, 1)).items[0];
    queries.length = 0;
    await call({ ids: [notice.id] });
    const collections = queries.map(url => url.pathname.split('/')[3]);
    assert.deepEqual([...new Set(collections)].sort(), ['app_revisions', 'notifications', 'users', 'workflow_operations']);
    assert.ok(queries.filter(url => ['notifications', 'workflow_operations', 'users'].includes(url.pathname.split('/')[3])).every(url => url.searchParams.get('filter')));
  });
  await t.test('more than 2000 unread notifications are completed in bounded retry-safe batches', async () => {
    const campus = (await root.collection('campuses').getList(1, 1)).items[0].id;
    for (let offset = 0; offset < 2100; offset += 500) {
      const batch = root.createBatch();
      for (let i = offset; i < Math.min(offset + 500, 2100); i++) batch.collection('notifications').create({ campus, recipientUser: admin.authStore.record!.id, eventType: 'question_created', eventKey: randomUUID(), title: 'Performance QA', body: 'Batch test', target: '/admin/questions', simulated: true });
      await batch.send();
    }
    const foreign = (await other.collection('notifications').getFullList()).filter(n => !n.readAt).length;
    const count = async () => (await admin.collection('notifications').getList(1, 1, { filter: 'readAt = ""' })).totalItems;
    const before = await count(), key = randomUUID();
    const first = await call({}, key);
    assert.equal(first.more, true);
    assert.equal(before - await count(), 500);
    assert.deepEqual(await call({}, key), first);
    assert.equal(before - await count(), 500, 'retry does not advance to the next batch');
    let result = first, batches = 1;
    while (result.more && batches < 10) { result = await call({}); batches++; }
    assert.equal(await count(), 0);
    assert.equal((await other.collection('notifications').getFullList()).filter(n => !n.readAt).length, foreign);
  });
  await t.test('rate limits read matching keys and remove only bounded expired rows, even on rejection', async () => {
    const batch = root.createBatch();
    for (let i = 0; i < 250; i++) batch.collection('auth_limits').create({ key: security.sha256(randomUUID()), count: 1, until: Date.now() - 10000 });
    const activeKey = security.sha256(randomUUID());
    batch.collection('auth_limits').create({ key: activeKey, count: 1, until: Date.now() + 600000 });
    await batch.send();
    const label = { key: randomUUID(), max: 2, duration: 600000 };
    queries.length = 0;
    await rateLimit(root, {}, [label]);
    const expired = async () => (await root.collection('auth_limits').getList(1, 1, { filter: `until < ${Date.now()}` })).totalItems;
    assert.equal(await expired(), 150);
    assert.ok(queries.filter(url => url.pathname.includes('/auth_limits/')).every(url => url.searchParams.get('filter')));
    await rateLimit(root, {}, [label]);
    await assert.rejects(rateLimit(root, {}, [label]), (error: any) => error.status === 429);
    assert.equal(await expired(), 0);
    assert.equal((await root.collection('auth_limits').getFirstListItem(root.filter('key = {:key}', { key: activeKey }))).count, 1);
    assert.equal((await root.collection('auth_limits').getFirstListItem(root.filter('key = {:key}', { key: security.sha256(label.key) }))).count, 2);
  });
});
