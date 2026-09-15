import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { atomic, StoreRecord } from '../../src/lib/server/deb/rest-store';
import { LOCAL, installBinary, provisionInstance, migrate, start, adminClient } from '../../scripts/pocketbase/runtime';
import { configureRestSchema } from '../../scripts/pocketbase/rest-schema';

test('collection revisions isolate independent writes and retry overlapping snapshots', { timeout: 180000 }, async t => {
  await installBinary();
  await mkdir(path.join(LOCAL, 'tests'), { recursive: true });
  const instance = await provisionInstance(await mkdtemp(path.join(LOCAL, 'tests', 'transactions-')), 'test');
  await migrate(instance);
  const child = await start(instance);
  t.after(async () => { child.kill(); await new Promise(resolve => child.once('exit', resolve)); });
  const pb = await adminClient(instance);

  await t.test('upgrades the previous global index while retaining revision history', async () => {
    const collection = await pb.collections.getOne('app_revisions');
    await pb.collections.update(collection.id, { fields: collection.fields.filter(field => field.name !== 'scope'), indexes: ['CREATE UNIQUE INDEX idx_app_revisions_sequence ON app_revisions (sequence)'] });
    const legacy = await pb.collection('app_revisions').create({ sequence: 1234 });
    await configureRestSchema(pb, { local: true, publicURL: 'http://127.0.0.1:5177' });
    const preserved = await pb.collection('app_revisions').getOne(legacy.id);
    assert.equal(preserved.sequence, 1234);
    assert.equal(preserved.scope, '');
  });

  // Hold the first two commits until both real database snapshots have been read.
  function concurrentCommits() {
    let arrived = 0, release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    pb.beforeSend = async (url, options) => {
      if (url.endsWith('/api/batch') && ++arrived <= 2) {
        if (arrived === 2) release();
        await ready;
      }
      return { url, options };
    };
  }

  await t.test('independent collections commit without recomputing either transaction', async () => {
    concurrentCommits();
    const attempts = [0, 0];
    await Promise.all([
      atomic(pb, store => { attempts[0]++; const row = new StoreRecord('faq_entries'); row.set('question', 'Independent'); row.set('answer', 'Answer'); store.save(row); }, { faq_entries: null }),
      atomic(pb, store => { attempts[1]++; const row = new StoreRecord('auth_limits'); row.set('key', 'independent'); row.set('count', 1); row.set('until', Date.now() + 60000); store.save(row); }, { auth_limits: null })
    ]);
    assert.deepEqual(attempts, [1, 1]);
    assert.equal((await pb.collection('faq_entries').getFullList()).length, 1);
    assert.equal((await pb.collection('auth_limits').getFullList()).length, 1);
  });

  await t.test('overlapping reads prevent lost updates, including a conflict after the first fence', async () => {
    pb.beforeSend = (url, options) => ({ url, options });
    const row = (await pb.collection('faq_entries').getFullList())[0];
    await pb.collection('faq_entries').update(row.id, { order: 0 });
    concurrentCommits();
    let attempts = 0;
    const increment = (extra: string) => atomic(pb, store => {
      attempts++;
      const record = store.findRecordById('faq_entries', row.id);
      record.set('order', record.getInt('order') + 1); store.save(record);
    }, { [extra]: {}, faq_entries: {} });
    await Promise.all([increment('auth_limits'), increment('campuses')]);
    assert.equal((await pb.collection('faq_entries').getOne(row.id)).order, 2);
    assert.equal(attempts, 3);
  });

  await t.test('a rejected business write rolls back every revision too', async () => {
    pb.beforeSend = (url, options) => ({ url, options });
    const before = (await pb.collection('app_revisions').getList(1, 1)).totalItems;
    await assert.rejects(atomic(pb, store => {
      const row = new StoreRecord('faq_entries'); row.set('question', ''); store.save(row);
    }, { campuses: {}, faq_entries: null }));
    assert.equal((await pb.collection('app_revisions').getList(1, 1)).totalItems, before);
  });

  await t.test('read dependencies prevent write skew even when the writes target different collections', async () => {
    pb.beforeSend = (url, options) => ({ url, options });
    const faq = (await pb.collection('faq_entries').getFullList())[0];
    const limit = (await pb.collection('auth_limits').getFullList())[0];
    await pb.collection('faq_entries').update(faq.id, { order: 0 });
    await pb.collection('auth_limits').update(limit.id, { count: 0 });
    concurrentCommits();
    await Promise.all([
      atomic(pb, store => {
        if (store.findRecordById('auth_limits', limit.id).getInt('count')) return;
        const row = store.findRecordById('faq_entries', faq.id); row.set('order', 1); store.save(row);
      }, { faq_entries: {}, auth_limits: {} }),
      atomic(pb, store => {
        if (store.findRecordById('faq_entries', faq.id).getInt('order')) return;
        const row = store.findRecordById('auth_limits', limit.id); row.set('count', 1); store.save(row);
      }, { faq_entries: {}, auth_limits: {} })
    ]);
    assert.equal((await pb.collection('faq_entries').getOne(faq.id)).order + (await pb.collection('auth_limits').getOne(limit.id)).count, 1);
  });
});
