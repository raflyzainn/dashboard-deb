import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import { createMockService } from '../src/lib/data/service';
import { createSeed, DEMO_CAMPUS } from '../src/lib/data/seed';
import { latestSubmission, changedSinceSubmission } from '../src/lib/verification';
import type { DemoSession } from '../src/lib/types';

const admin: DemoSession = { role: 'admin', name: 'QA Admin' };
const campus: DemoSession = { role: 'campus', name: 'QA Campus', campusId: DEMO_CAMPUS };
const service = () => createMockService(`deb-review-${crypto.randomUUID()}`);

test('campus submits its own snapshot; pending data cannot change and roles cannot bypass review', async () => {
  const api = service();
  await assert.rejects(api.submitDeb(admin), /akses/);
  await assert.rejects(api.submitDeb({ ...campus, campusId: 'campus-002' }), /tidak valid/);
  await api.submitDeb(campus);
  const own = await api.load(campus);
  const submission = latestSubmission(own, DEMO_CAMPUS)!;
  assert.equal(own.submissions!.length, 1);
  assert.equal(submission.status, 'pending');
  assert.deepEqual(submission.indicators, own.indicators);
  assert.equal(submission.indicators.length, 30);
  await assert.rejects(api.updateIndicator(campus, own.indicators[0].id, 999, 'changed'), /sedang diverifikasi/);
  await assert.rejects(api.updateIndicator(admin, own.indicators[0].id, 999, 'changed'), /akses/);
  await assert.rejects(api.reviewDeb(campus, submission.id, 'approved', ''), /akses/);
  const results = await Promise.allSettled([api.submitDeb(campus), api.submitDeb(campus)]);
  assert.ok(results.every(r => r.status === 'rejected'));
  assert.equal((await api.load(campus)).submissions!.length, 1);
  assert.ok((await api.load(admin)).notifications.some(n => n.href.includes(submission.id)));
});

test('revision, resubmission and confirmation retain historical values and notify the campus', async () => {
  const api = service();
  await api.submitDeb(campus);
  let own = await api.load(campus);
  const first = latestSubmission(own, DEMO_CAMPUS)!;
  await assert.rejects(api.reviewDeb(admin, first.id, 'revision', '  '), /wajib/);
  await api.reviewDeb(admin, first.id, 'revision', 'QA: periksa periode data.');
  await assert.rejects(api.reviewDeb(admin, first.id, 'approved', ''), /sudah diputuskan/);
  await api.updateIndicator(campus, own.indicators[0].id, 321, 'QA data terbaru');
  own = await api.load(campus);
  assert.notEqual(own.submissions![0].indicators[0].current, 321);
  assert.equal(own.submissions![0].decisionNote, 'QA: periksa periode data.');
  await api.submitDeb(campus);
  own = await api.load(campus);
  const second = latestSubmission(own, DEMO_CAMPUS)!;
  assert.equal(second.version, 2);
  assert.equal(second.indicators[0].current, 321);
  for (const feedback of own.feedback.filter(f => f.requiresRevision && f.state !== 'closed')) await api.closeFeedback(admin, feedback.id);
  await api.reviewDeb(admin, second.id, 'approved', 'Sudah sesuai');
  own = await api.load(campus);
  assert.equal(latestSubmission(own, DEMO_CAMPUS)!.status, 'approved');
  assert.equal(latestSubmission(own, DEMO_CAMPUS)!.reviewedBy, 'QA Admin');
  assert.ok(own.notifications.some(n => n.title === 'Data DEB terverifikasi'));
  assert.equal(changedSinceSubmission(own, latestSubmission(own, DEMO_CAMPUS)!), false);
  await assert.rejects(api.submitDeb(campus), /sudah terverifikasi/);
  await api.updateIndicator(campus, own.indicators[0].id, 322, 'Perubahan setelah persetujuan');
  own = await api.load(campus);
  assert.equal(changedSinceSubmission(own, latestSubmission(own, DEMO_CAMPUS)!), true);
  assert.equal(latestSubmission(own, DEMO_CAMPUS)!.indicators[0].current, 321);
});

test('unresolved feedback blocks approval; concurrent decisions cannot overwrite the first result', async () => {
  const api = service();
  await api.submitDeb(campus);
  let own = await api.load(campus);
  const submission = latestSubmission(own, DEMO_CAMPUS)!;
  await api.addFeedback(admin, own.indicators[0].id, 'QA wajib diperbaiki', true);
  await assert.rejects(api.reviewDeb(admin, submission.id, 'approved', ''), /Selesaikan feedback/);
  own = await api.load(campus);
  for (const f of own.feedback.filter(f => f.state !== 'closed')) await api.closeFeedback(admin, f.id);
  const decisions = await Promise.allSettled([
    api.reviewDeb(admin, submission.id, 'approved', 'valid'),
    api.reviewDeb(admin, submission.id, 'revision', 'revisi')
  ]);
  assert.equal(decisions.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(decisions.filter(r => r.status === 'rejected').length, 1);
});

test('old IndexedDB data gets demo review examples once without resetting campus work', async () => {
  const name = `deb-old-review-${crypto.randomUUID()}`;
  const db = new Dexie(name);
  db.version(1).stores({ state: 'id', files: 'id' });
  const { data, files } = createSeed();
  delete data.submissions;
  data.indicators[0].current = 12345;
  await db.table('state').put({ id: 'main', data });
  await db.table('files').bulkPut(files);
  db.close();
  const api = createMockService(name);
  assert.equal((await api.load(admin)).submissions!.length, 6);
  assert.equal((await api.load(admin)).submissions!.length, 6);
  const own = await api.load(campus);
  assert.equal(own.indicators[0].current, 12345);
  assert.equal(own.submissions!.length, 0);
  assert.equal(own.proposals.length, 3);
});
