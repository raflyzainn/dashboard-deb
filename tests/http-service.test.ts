import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpService, DataReadError } from '../src/lib/data/service';
import { guardPreview, previewContext, PreviewError } from '../src/lib/server/deb/local-preview';
import { progress, average, campusStats } from '../src/lib/domain';
import { createSeed } from '../scripts/fixtures/seed';
import { questionCategories, matchesQuestion, validateCategories } from '../src/lib/forum';
import { changedSinceSubmission } from '../src/lib/verification';
import { mapCampuses, regionSummary } from '../src/lib/map';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

test('HTTP-only service sends preview key, not browser actor, and reads data/PDF', async () => {
  const requests: { url: string; options?: RequestInit }[] = [];
  const service = createHttpService(async (url, options) => {
    requests.push({ url: String(url), options });
    return String(url).endsWith('/file') ? new Response('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } }) : Response.json({ data: { campuses: [] }, session: { role: 'campus' } });
  });
  service.selectAccount('campus-002');
  assert.deepEqual(await service.load({ role: 'admin', name: 'Forged browser role' }), { campuses: [] });
  assert.equal(new Headers(requests[0].options?.headers).get('x-deb-preview-account'), 'campus-002');
  assert.equal(requests[0].options?.cache, 'no-store');
  assert.ok(!JSON.stringify(requests).includes('Forged'));
  assert.ok((await (await service.proposalFile({ role: 'admin', name: '' }, 'abc')).text()).startsWith('%PDF'));
});

test('all legacy mutation entrypoints reject without calling the network', async () => {
  let called = false;
  const service = createHttpService(async () => { called = true; return Response.json({}); });
  for (const method of ['submitDeb', 'reviewDeb', 'updateIndicator', 'addFeedback', 'closeFeedback', 'uploadProposal', 'ask', 'answer', 'toggleLike', 'promoteFaq', 'saveFaq', 'moveFaq', 'deleteFaq', 'readNotifications', 'reset'] as const) {
    await assert.rejects((service[method] as () => Promise<unknown>)(), /Hanya baca/);
  }
  assert.equal(called, false);
});

test('network errors and rejected requests never return seed data', async () => {
  const down = createHttpService(async () => { throw new Error('offline'); });
  await assert.rejects(down.bootstrap(), /PocketBase tidak dapat dimuat/);
  const forbidden = createHttpService(async () => Response.json({ message: 'Account disabled' }, { status: 403 }));
  await assert.rejects(forbidden.bootstrap(), error => error instanceof DataReadError && error.status === 403);
});

test('account switch discards a late response even when the transport ignores abort', async () => {
  let finish!: (response: Response) => void;
  const service = createHttpService(() => new Promise(resolve => { finish = resolve; }));
  service.selectAccount('campus-001');
  const previous = service.bootstrap();
  service.selectAccount('campus-002');
  finish(Response.json({ data: { private: 'campus A' } }));
  await assert.rejects(previous, error => error instanceof DataReadError && error.status === 409);
});

test('local preview guard fails closed outside dev, without flag/header, or across origins/peers', async () => {
  const request = { dev: true, address: '127.0.0.1', url: new URL('http://127.0.0.1:5179'), headers: new Headers({ 'x-deb-preview': '1' }) };
  const config = { enabled: 'true', root: process.cwd() };
  guardPreview(request, config);
  for (const bad of [{ ...request, dev: false }, { ...request, address: '192.168.1.4' }, { ...request, url: new URL('http://evil.test:5179') },
    { ...request, headers: new Headers() }, { ...request, headers: new Headers({ 'x-deb-preview': '1', origin: 'https://evil.test' }) },
    { ...request, headers: new Headers({ 'x-deb-preview': '1', 'sec-fetch-site': 'cross-site' }) }]) assert.throws(() => guardPreview(bad, config), PreviewError);
  assert.throws(() => guardPreview(request, { ...config, enabled: 'false' }), PreviewError);
  await assert.rejects(previewContext(request, { ...config, directory: path.resolve('outside-local') }), /Direktori/);
  await assert.rejects(previewContext(request, { ...config, url: 'https://example.org' }), /konfigurasi/);
});

test('pure domain, roster, categories and immutable-history comparisons remain valid', () => {
  const { data } = createSeed();
  assert.equal(data.campuses.length, 40);
  assert.equal(data.campuses.filter(c => c.source === 'user').length, 34);
  assert.equal(data.definitions.length, 30);
  assert.equal(data.indicators.length, 1200);
  assert.equal(campusStats(data, data.campuses[0].id).progress, 76);
  assert.equal(progress({ current: 15, target: 10 }), 100);
  assert.equal(progress({ current: -1, target: 10 }), 0);
  assert.equal(average([]), 0);
  assert.throws(() => validateCategories(['invalid' as never]));
  assert.deepEqual(questionCategories(data.questions[0]), ['indikator']);
  assert.ok(matchesQuestion(data.questions[0], data.answers, 'baseline', ['indikator']));
  const submission = data.submissions![0];
  assert.equal(changedSinceSubmission(data, submission), false);
  data.indicators.find(i => i.id === submission.indicators[0].id)!.current++;
  assert.equal(changedSinceSubmission(data, submission), true);
});

test('missing/invalid/out-of-map coordinates do not fabricate markers or lose campus totals', () => {
  const { data } = createSeed();
  data.locations![0].latitude = null;
  data.locations![1].longitude = 0;
  data.locations![2].latitude = Number.NaN;
  data.locations!.splice(3, 1);
  assert.equal(mapCampuses(data).length, 36);
  assert.equal(regionSummary(data).reduce((n, region) => n + region.campuses, 0), 40);
  const campus = data.campuses[4];
  const location = data.locations!.find(l => l.campusId === campus.id)!;
  campus.id = 'actualpbid123456'; location.campusId = campus.id;
  assert.ok(mapCampuses(data).some(point => point.id === campus.id));
});

test('application runtime has no mock/Dexie/fixture imports or legacy campus IDs', async () => {
  async function files(directory: string): Promise<string[]> {
    return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
  }
  for (const file of (await files('src')).filter(f => /\.(ts|svelte)$/.test(f))) {
    const content = await readFile(file, 'utf8');
    assert.ok(!/createMockService|createSeed|fake-indexeddb|from ['"]dexie|scripts\/fixtures|DEMO_CAMPUS|['"]campus-001['"]/.test(content), file);
  }
});
