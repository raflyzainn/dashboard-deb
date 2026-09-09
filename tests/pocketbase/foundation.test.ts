import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { RecordModel } from 'pocketbase';
import { LOCAL, ROOT, adminClient, assertInstance, assertLocal, client, credentialsPath, installBinary, migrate, preview, provisionInstance, readJson, start, type Credentials } from '../../scripts/pocketbase/runtime';
import { authenticateUser, seedLocal } from '../../scripts/pocketbase/seed';
import { createDebRepository } from '../../src/lib/server/deb/repository';
import { mapSession } from '../../src/lib/server/deb/mappers';
import { createSeed } from '../../scripts/fixtures/seed';

const expected = { campuses: 40, indicator_definitions: 30, users: 42, campus_indicators: 1200, deb_submissions: 6, indicator_feedback: 10, proposal_versions: 52, questions: 6, question_answers: 3, question_likes: 70, faq_entries: 2, activities: 40, notifications: 31 };
const hash = async (file: string) => createHash('sha256').update(await readFile(file)).digest('hex');
const denied = async (operation: Promise<unknown>, statuses = [400, 403, 404]) => {
  let status = 0;
  try { await operation; } catch (error) { status = (error as { status: number }).status; }
  assert.ok(statuses.includes(status), `Expected denial (${statuses.join('/')}), got ${status || 'success'}`);
};

test('PocketBase foundation against an isolated real backend', { timeout: 180000 }, async t => {
  await installBinary();
  const testRoot = path.join(LOCAL, 'tests');
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'foundation-'));
  const instance = await provisionInstance(directory, 'test');
  let child: Awaited<ReturnType<typeof start>> | undefined;
  try {
    await t.test('fresh migration and read-only preview; migration rerun is unchanged', async () => {
      await migrate(instance);
      const db = path.join(directory, 'pb_data', 'data.db');
      const before = await hash(db);
      await preview();
      assert.equal(await hash(db), before);
      await migrate(instance);
      assert.equal(await hash(db), before);
    });
    child = await start(instance);
    const admin = await adminClient(instance);
    const anonymous = client(instance.url);
    await t.test('all 13 collections exist but have no data before manual seed', async () => {
      const collections = await admin.collections.getFullList();
      for (const name of Object.keys(expected)) {
        const collection = collections.find(c => c.name === name);
        assert.ok(collection, name);
        assert.equal(collection.createRule, null);
        assert.equal(collection.updateRule, null);
        assert.equal(collection.deleteRule, null);
        assert.equal((await admin.collection(name).getList(1, 1)).totalItems, 0, name);
      }
    });
    await t.test('seed guard rejects nonlocal addresses, other ports and wrong instance markers', async () => {
      for (const url of ['https://example.org', 'http://127.0.0.1:8096', 'http://127.0.0.1:8097/other', 'http://user:secret@127.0.0.1:8097', 'http://localhost:8097', 'http://127.0.0.1:8097/?x=1']) {
        assert.throws(() => assertLocal(instance, url));
      }
      await assert.rejects(assertInstance({ ...instance, instanceId: 'wrong-project-instance' }), /wrong or unmarked/);
    });
    await t.test('seed covers all baseline data and never duplicates on rerun', async () => {
      assert.deepEqual((await seedLocal(instance)).counts, expected);
      const before = await hash(credentialsPath(instance));
      const again = await seedLocal(instance);
      assert.deepEqual(again.created, {});
      assert.deepEqual(again.counts, expected);
      assert.equal(await hash(credentialsPath(instance)), before);
    });
    const credentials = await readJson<Credentials>(credentialsPath(instance));
    const campusA = await authenticateUser(client(instance.url), credentials, 'campus-001');
    const campusB = await authenticateUser(client(instance.url), credentials, 'campus-002');
    const adminA = await authenticateUser(client(instance.url), credentials, 'admin-1');
    const adminB = await authenticateUser(client(instance.url), credentials, 'admin-2');
    const lookup = (name: string, legacy: string) => admin.collection(name).getFirstListItem(admin.filter('legacyId = {:legacy}', { legacy }));
    const campusARecord = await lookup('campuses', 'campus-001');
    const campusBRecord = await lookup('campuses', 'campus-002');
    const indicatorA = await lookup('campus_indicators', 'campus-001-i1');
    const indicatorB = await lookup('campus_indicators', 'campus-002-i1');
    const proposalA = await lookup('proposal_versions', 'campus-001-v1');

    await t.test('anonymous, campus and admin reads are correctly scoped across collections', async () => {
      // PocketBase's failed listRule deliberately returns an empty 200 list.
      for (const name of Object.keys(expected)) assert.equal((await anonymous.collection(name).getList(1, 1)).totalItems, 0);
      for (const name of ['campuses', 'indicator_definitions', 'questions', 'question_answers', 'question_likes', 'faq_entries']) {
        assert.equal((await campusA.collection(name).getFullList()).length, expected[name as keyof typeof expected]);
      }
      for (const name of ['campus_indicators', 'deb_submissions', 'indicator_feedback', 'proposal_versions', 'activities']) {
        const rows = await campusA.collection(name).getFullList();
        assert.ok(rows.every(row => row.campus === campusARecord.id));
        assert.equal((await adminA.collection(name).getFullList()).length, expected[name as keyof typeof expected]);
        const foreign = (await campusB.collection(name).getFullList())[0];
        if (foreign) await denied(campusA.collection(name).getOne(foreign.id));
      }
      assert.equal((await campusA.collection('users').getFullList()).length, 1);
      await denied(adminA.collection('users').getOne(campusA.authStore.record!.id));
      assert.equal((await campusA.collection('campus_indicators').getFullList()).length, 30);
      await denied(campusA.collection('campus_indicators').getOne(indicatorB.id));
      await denied(campusB.collection('campus_indicators').getOne(indicatorA.id));
    });

    await t.test('ordinary clients cannot bypass P0 write locks or escalate their account', async () => {
      for (const user of [campusA, adminA]) {
        await denied(user.collection('users').update(user.authStore.record!.id, { role: 'admin', campus: campusBRecord.id, active: true }));
        for (const name of Object.keys(expected)) {
          await denied(user.collection(name).create({}));
          const record = (await admin.collection(name).getList(1, 1)).items[0];
          await denied(user.collection(name).update(record.id, {}));
          await denied(user.collection(name).delete(record.id));
        }
      }
      await denied(anonymous.collection('users').create({ email: 'signup@deb.local.test', password: 'not-a-real-password', passwordConfirm: 'not-a-real-password' }));
    });

    await t.test('private PDFs require authorized short-lived file tokens', async () => {
      const fileUrl = anonymous.files.getURL(proposalA, proposalA.file);
      assert.equal((await fetch(fileUrl)).status, 404);
      const tokenB = await campusB.files.getToken();
      assert.equal((await fetch(campusB.files.getURL(proposalA, proposalA.file, { token: tokenB }))).status, 404);
      for (const user of [campusA, adminA]) {
        const blob = await createDebRepository(user).proposalFile(proposalA.id);
        assert.ok((await blob.text()).startsWith('%PDF-'));
      }
      await denied(createDebRepository(campusB).proposalFile(proposalA.id));
    });

    await t.test('per-user notifications stay isolated including between two admins', async () => {
      const rowsA = await adminA.collection('notifications').getFullList();
      const rowsB = await adminB.collection('notifications').getFullList();
      assert.equal(rowsA.length, 8);
      assert.equal(rowsB.length, 8);
      assert.ok(rowsA.every(row => row.recipientUser === adminA.authStore.record!.id));
      assert.ok(rowsB.every(row => row.recipientUser === adminB.authStore.record!.id));
      await denied(adminA.collection('notifications').getOne(rowsB[0].id));
      const counterpart = rowsB.find(row => row.eventKey === rowsA[0].eventKey)!;
      const original = counterpart.readAt;
      await admin.collection('notifications').update(rowsA[0].id, { readAt: new Date().toISOString() });
      assert.equal((await adminB.collection('notifications').getOne(counterpart.id)).readAt, original);
    });

    await t.test('schema and hooks reject invalid values, role/campus relations and duplicates', async () => {
      const clean = (record: RecordModel) => {
        const { id, collectionId, collectionName, created, updated, expand, ...fields } = record;
        void id; void collectionId; void collectionName; void created; void updated; void expand;
        return { ...fields, legacyId: '' };
      };
      await admin.collection('campus_indicators').update(indicatorA.id, { current: 0, baseline: 0 });
      for (const values of [{ target: 0 }, { target: -1 }, { current: -1 }, { baseline: -1 }]) await denied(admin.collection('campus_indicators').update(indicatorA.id, values), [400]);
      await denied(admin.collection('campus_indicators').create(clean(indicatorA)), [400]);
      for (const [name, legacy] of [['deb_submissions', 'demo-submission-campus-002'], ['question_answers', 'answer-1'], ['question_likes', 'question-1:campus-2'], ['faq_entries', 'faq-1']]) {
        const original = await lookup(name, legacy);
        await denied(admin.collection(name).create(clean(original)), [400]);
      }
      const pending = await lookup('deb_submissions', 'demo-submission-campus-002');
      await denied(admin.collection('deb_submissions').create({ ...clean(pending), version: 2 }), [400]);
      await denied(admin.collection('deb_submissions').update(pending.id, { snapshot: [] }), [400]);
      const altered = structuredClone(pending.snapshot);
      altered[0].current += 1;
      await denied(admin.collection('deb_submissions').update(pending.id, { snapshot: altered }), [400]);
      const feedback = await lookup('indicator_feedback', 'feedback-0');
      await denied(admin.collection('indicator_feedback').update(feedback.id, { campus: campusBRecord.id }), [400]);
      await denied(admin.collection('users').update(campusA.authStore.record!.id, { campus: '' }), [400]);
      await denied(admin.collection('users').update(campusA.authStore.record!.id, { campus: campusBRecord.id }), [400]);
      await denied(admin.collection('users').update(adminA.authStore.record!.id, { campus: campusARecord.id }), [400]);
      const question = await lookup('questions', 'question-1');
      await denied(admin.collection('questions').update(question.id, { author: adminA.authStore.record!.id }), [400]);
      await denied(admin.collection('questions').update(question.id, { categoryIds: ['unknown-category'] }), [400]);
      for (let n = 0; n < 2; n++) await admin.collection('faq_entries').create({ question: 'Manual QA FAQ', answer: 'Local test only', order: 100 + n });
      await denied(admin.collection('campuses').update(campusARecord.id, { latitude: 91 }), [400]);
      await denied(admin.collection('campuses').delete(campusARecord.id), [400]);
      await denied(admin.collection('proposal_versions').update(proposalA.id, { changes: 'Overwrite history' }), [400]);
      const payload = { ...clean(proposalA), version: 9, file: new File(['not a PDF'], 'fake.pdf', { type: 'application/pdf' }) };
      await denied(admin.collection('proposal_versions').create(payload), [400]);
      await denied(admin.collection('proposal_versions').create({ ...payload, file: new File(['%PDF-1.4\n', new Uint8Array(10485760)], 'large.pdf', { type: 'application/pdf' }) }), [400]);
    });

    await t.test('seed rerun preserves modified values and account passwords/status', async () => {
      await admin.collection('campus_indicators').update(indicatorA.id, { current: 0, note: 'Keep local changes' });
      await admin.collection('users').update(campusB.authStore.record!.id, { active: false });
      const secretBefore = await hash(credentialsPath(instance));
      assert.deepEqual((await seedLocal(instance)).created, {});
      const preserved = await admin.collection('campus_indicators').getOne(indicatorA.id);
      assert.equal(preserved.current, 0);
      assert.equal(preserved.note, 'Keep local changes');
      assert.equal((await admin.collection('users').getOne(campusB.authStore.record!.id)).active, false);
      assert.equal(await hash(credentialsPath(instance)), secretBefore);
    });

    await t.test('deactivation blocks existing tokens, refresh, login and protected files', async () => {
      for (const name of ['campuses', 'questions', 'campus_indicators', 'notifications']) {
        assert.equal((await campusB.collection(name).getFullList()).length, 0);
      }
      await denied(campusB.collection('users').authRefresh(), [400, 401, 403]);
      await denied(authenticateUser(client(instance.url), credentials, 'campus-002'), [400, 401, 403]);
      await admin.collection('users').update(campusB.authStore.record!.id, { active: true });
      await authenticateUser(campusB, credentials, 'campus-002');
      const ownProposal = await lookup('proposal_versions', 'campus-002-v1');
      const token = await campusB.files.getToken();
      await admin.collection('users').update(campusB.authStore.record!.id, { active: false });
      assert.equal((await fetch(campusB.files.getURL(ownProposal, ownProposal.file, { token }))).status, 404);
      await admin.collection('users').update(campusB.authStore.record!.id, { active: true });
    });

    await t.test('repository maps safe DTOs, all pages, snapshot history, locations and links', async () => {
      const repository = createDebRepository(adminA);
      const snapshot = await repository.load();
      assert.equal(snapshot.indicators.length, 1200);
      assert.equal(snapshot.campuses.length, 40);
      assert.equal(snapshot.proposals.length, 52);
      assert.equal(snapshot.submissions?.length, 6);
      assert.deepEqual(Object.keys(mapSession(campusA.authStore.record!)).sort(), ['campusId', 'id', 'name', 'role']);
      const json = JSON.stringify(snapshot);
      for (const secret of ['password', 'tokenKey', 'collectionId', '@deb.local.test']) assert.ok(!json.includes(secret));
      const original = createSeed().data;
      assert.equal(snapshot.definitions.find(d => d.name === original.definitions[0].name)?.unit, original.definitions[0].unit);
      const history = snapshot.submissions!.find(s => s.campusId === campusBRecord.id)!;
      assert.equal(history.indicators.length, 30);
      await admin.collection('indicator_definitions').update(indicatorB.definition, { name: 'Changed master only' });
      const raw = await lookup('deb_submissions', 'demo-submission-campus-002');
      assert.equal(raw.snapshot[0].name, original.definitions[0].name);
      assert.ok(snapshot.notifications.every(n => !/campus-\d|question-\d/.test(n.href)));
      const locations = await repository.locations();
      assert.equal(locations.length, 40);
      assert.ok(locations.every(l => l.approximate && l.latitude >= -90 && l.longitude <= 180));
      const local = await createDebRepository(campusA).load();
      assert.equal(local.indicators.length, 30);
      assert.equal(local.questions.length, 6);
      await assert.rejects(createDebRepository(admin).load(), /user-scoped/);
    });
    await t.test('runtime artifacts do not generate schema files or mutate UI service', async () => {
      assert.deepEqual((await readdir(path.join(ROOT, 'db-schema', 'pb_migrations'))).filter(f => f.endsWith('.js')), ['1788912000_deb_foundation.js', '1789000000_deb_workflows.js']);
      assert.ok((await readFile(path.join(ROOT, 'src/lib/data/service.ts'), 'utf8')).includes('dataService = createHttpService()'));
    });
  } finally {
    if (child && child.exitCode === null) {
      const exited = new Promise(resolve => child!.once('exit', resolve));
      child.kill();
      await exited;
    }
  }
});
