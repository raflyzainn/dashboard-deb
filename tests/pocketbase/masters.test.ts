import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { LOCAL, provisionInstance, migrate, start, adminClient, readJson, credentialsPath, client, type Credentials } from '../../scripts/pocketbase/runtime';
import { seedLocal, authenticateUser } from '../../scripts/pocketbase/seed';
import { executeWorkflow } from '../../src/lib/server/deb/backend';

test('REST master changes and native batch rollback on disposable database', { timeout: 180000 }, async () => {
  await mkdir(path.join(LOCAL, 'tests'), { recursive: true });
  const instance = await provisionInstance(await mkdtemp(path.join(LOCAL, 'tests', 'masters-rest-')), 'test');
  await migrate(instance); const child = await start(instance);
  try {
    const root = await adminClient(instance); await seedLocal(instance);
    const credentials = await readJson<Credentials>(credentialsPath(instance));
    const admin = await authenticateUser(client(instance.url), credentials, 'admin-1');
    const campus = await authenticateUser(client(instance.url), credentials, 'campus-001');
    const run = (op: string, body: object, actor = admin) => executeWorkflow(root, actor.authStore.record, op, body as Record<string, unknown>, randomUUID(), true) as Promise<any>;
    const input = {code:'QA-REST',name:'QA master',category:'QA',unit:'unit',description:'QA',baseline:2,target:10};
    await assert.rejects(run('masterSaveDefinition',input,campus),e => (e as any).status === 403);
    await assert.rejects(run('masterSaveDefinition',{...input,target:0}));
    const draft = await run('masterSaveDefinition',input);
    assert.equal((await root.collection('indicator_definitions').getOne(draft.id)).status,'draft');
    await assert.rejects(run('masterSaveDefinition',{...input,id:draft.id,revision:0}));
    // Remove pending fixture submissions only on this disposable database.
    for (const s of await root.collection('deb_submissions').getFullList()) await root.collection('deb_submissions').delete(s.id);
    const notifications = await root.collections.getOne('notifications'), original = structuredClone(notifications.fields);
    notifications.fields.find((f: any) => f.name === 'title')!.max=1;
    await root.collections.update(notifications.id,{fields:notifications.fields});
    await assert.rejects(run('masterActivateDefinition',{id:draft.id,revision:1}));
    assert.equal((await root.collection('indicator_definitions').getOne(draft.id)).status,'draft');
    assert.equal((await root.collection('campus_indicators').getList(1,1,{filter:root.filter('definition={:id}',{id:draft.id})})).totalItems,0);
    await root.collections.update(notifications.id,{fields:original});
    await run('masterActivateDefinition',{id:draft.id,revision:1});
    const rows = await root.collection('campus_indicators').getFullList({filter:root.filter('definition={:id}',{id:draft.id})});
    assert.equal(rows.length,40); assert.ok(rows.every(r => r.target===10));
    await run('masterSaveDefinition',{...input,id:draft.id,revision:2,target:20});
    assert.ok((await root.collection('campus_indicators').getFullList({filter:root.filter('definition={:id}',{id:draft.id})})).every(r => r.target===20));
    await assert.rejects(run('masterDeleteDefinition',{id:draft.id,revision:3}));
  } finally { child.kill(); }
});
