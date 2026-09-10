import { test } from 'node:test';
import assert from 'node:assert/strict';
import type PocketBase from 'pocketbase';
import { readPage } from '../src/lib/server/deb/page-reads';
import { pageRequest } from '../src/lib/page-data';

const actor = { id: 'admin', name: 'Admin', role: 'admin' as const };
function fakeClient() {
  const calls: { collection: string; options: Record<string, unknown> }[] = [];
  const pb = { filter: (filter: string, params: unknown) => filter + JSON.stringify(params), collection: (collection: string) => ({
    getFullList: async (options: Record<string, unknown>) => { calls.push({ collection, options }); return []; },
    getList: async (_page: number, _size: number, options: Record<string, unknown>) => { calls.push({ collection, options }); return { items: [] }; }
  }) } as unknown as PocketBase;
  return { pb, calls };
}
test('FAQ and account views query only their own collections, not a full snapshot', async () => {
  for (const [view, collection, key] of [['faq', 'faq_entries', 'faq'], ['accounts', 'campuses', 'campuses']] as const) {
    const { pb, calls } = fakeClient();
    const data = await readPage(pb, actor, { view });
    assert.deepEqual(calls.map(c => c.collection), [collection]);
    assert.deepEqual(Object.keys(data), [key]);
  }
});
test('campus proposal tab scopes reads to selected campus and excludes indicators/submissions', async () => {
  const { pb, calls } = fakeClient();
  await readPage(pb, actor, { view: 'campus-detail', campus: 'abcdefghijklmn0', tab: 'Proposal' });
  assert.deepEqual(calls.map(c => c.collection).sort(), ['campuses', 'indicator_feedback', 'proposal_versions']);
  assert.ok(calls.every(c => String(c.options.filter).includes('abcdefghijklmn0')));
});
test('campus session cannot request admin views or another campus', async () => {
  const { pb, calls } = fakeClient();
  const campus = { id: 'pic', name: 'PIC', role: 'campus' as const, campusId: 'own' };
  await assert.rejects(readPage(pb, campus, { view: 'review' }), /Admin/);
  await assert.rejects(readPage(pb, campus, { view: 'proposals', campus: 'other' }), /tidak dapat diakses/);
  assert.equal(calls.length, 0);
});
test('routing differentiates list/account tabs and individual details without fetching unrelated query changes', () => {
  const request = (path: string) => pageRequest(new URL(path, 'http://localhost'));
  assert.deepEqual(request('/admin/campuses?tab=accounts'), { view: 'accounts' });
  assert.deepEqual(request('/admin/campuses/abcdefghijklmn0?tab=Proposal'), { view: 'campus-detail', campus: 'abcdefghijklmn0', tab: 'Proposal' });
  assert.deepEqual(request('/campus/questions/abcdefghijklmn0'), { view: 'question-detail', question: 'abcdefghijklmn0' });
  assert.deepEqual(request('/admin/verifikasi?submission=anything'), { view: 'review' });
});
