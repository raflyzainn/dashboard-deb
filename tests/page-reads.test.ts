import { test } from 'node:test';
import assert from 'node:assert/strict';
import type PocketBase from 'pocketbase';
import { readPage } from '../src/lib/server/deb/page-reads';
import { emptyPageData, pageRequest } from '../src/lib/page-data';
import { campusStats } from '../src/lib/domain';
import { mapCampuses, regionSummary } from '../src/lib/map';

const actor = { id: 'admin', name: 'Admin', role: 'admin' as const };
function fakeClient(rows: Record<string, object[]> = {}) {
  const calls: { collection: string; options: Record<string, unknown> }[] = [];
  const pb = { filter: (filter: string, params: unknown) => filter + JSON.stringify(params), collection: (collection: string) => ({
    getFullList: async (options: Record<string, unknown>) => { calls.push({ collection, options }); return rows[collection] || []; },
    getList: async (_page: number, _size: number, options: Record<string, unknown>) => { calls.push({ collection, options }); return { items: rows[collection] || [] }; }
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

test('admin overview summaries preserve campus and map results without transferring raw indicators or feedback', async () => {
  const rows = {
    campuses: ['one', 'empty'].map(id => ({ id, name: id, region: 'West', initials: 'C', hasLocation: true, longitude: 110, latitude: -6, island: 'Java', province: 'Central Java' })),
    indicator_definitions: [{ id: 'd', baseline: 0, target: 10 }],
    campus_indicators: [5, 20].map((current, id) => ({ id: String(id), campus: 'one', definition: 'd', current, note: 'Full indicator note', updated: '2026-01-01' })),
    indicator_feedback: ['open', 'responded', 'closed'].map((state, id) => ({ id: String(id), campus: 'one', indicator: '0', state, requiresRevision: true, text: 'Full feedback history', created: '2026-01-01', updated: '2026-01-01' })),
    proposal_versions: [1, 2].map(version => ({ id: String(version), campus: 'one', version, filename: 'proposal.pdf', size: 100, changes: 'Full changes', created: '2026-01-01', simulated: false }))
  };
  const full = { ...emptyPageData(), ...await readPage(fakeClient(rows).pb, actor, { view: 'campus-detail', campus: 'one' }) };
  assert.deepEqual(campusStats(full, 'one'), { progress: 75, achieved: 1, total: 2, revisions: 1, proposal: full.proposals[1], proposals: [...full.proposals].reverse() });
  for (const view of ['dashboard', 'campuses', 'map'] as const) {
    const response = await readPage(fakeClient(rows).pb, actor, { view });
    assert.equal(response.definitions, undefined);
    assert.equal(response.indicators, undefined);
    assert.equal(response.feedback, undefined);
    const summary = { ...emptyPageData(), ...response };
    for (const campus of full.campuses) assert.deepEqual(campusStats(summary, campus.id), campusStats(full, campus.id));
    assert.deepEqual(summary.proposals, full.proposals);
    if (view !== 'dashboard') {
      assert.deepEqual(mapCampuses(summary), mapCampuses(full));
      assert.deepEqual(regionSummary(summary), regionSummary(full));
    }
    assert.ok(Buffer.byteLength(JSON.stringify(response)) < Buffer.byteLength(JSON.stringify(full)));
  }
  const campus = await readPage(fakeClient(rows).pb, { id: 'pic', role: 'campus', name: 'PIC', campusId: 'one' }, { view: 'dashboard' });
  assert.deepEqual(campus.indicators, full.indicators);
  assert.deepEqual(campus.definitions, full.definitions);
  assert.deepEqual(campus.feedback, full.feedback);
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

test('review queries current indicators only for pending campuses and preserves all submission and feedback history', async () => {
  const submissions = ['pending', 'pending', 'approved', 'revision'].map((status, index) => ({ id: `s${index}`, campus: `campus${index}`, status, version: 1, submittedAt: '2026-01-01',
    snapshot: [{ id: `i${index}`, current: index, target: 10, updatedAt: '2026-01-01' }] }));
  for (const pending of [true, false]) {
    const client = fakeClient({ deb_submissions: submissions.map(s => ({ ...s, status: pending ? s.status : 'approved' })),
      indicator_feedback: [{ id: 'historical', campus: 'campus2', indicator: 'i2', state: 'open', requiresRevision: true, text: 'Historical feedback', created: '2026-01-01', updated: '2026-01-01' }] });
    const data = await readPage(client.pb, actor, { view: 'review' });
    assert.equal(client.calls.filter(c => c.collection === 'deb_submissions').length, 1);
    assert.equal(data.submissions?.length, 4);
    assert.deepEqual(data.submissions?.map(s => s.indicators[0].current), [0, 1, 2, 3]);
    assert.equal(data.feedback?.[0].text, 'Historical feedback');
    assert.equal(client.calls.find(c => c.collection === 'indicator_feedback')?.options.filter, undefined);
    const indicators = client.calls.find(c => c.collection === 'campus_indicators');
    if (pending) {
      assert.match(String(indicators?.options.filter), /definition.status = "active"/);
      assert.match(String(indicators?.options.filter), /campus0/);
      assert.match(String(indicators?.options.filter), /campus1/);
      assert.doesNotMatch(String(indicators?.options.filter), /campus2|campus3/);
    } else {
      assert.equal(indicators, undefined);
      assert.deepEqual(data.indicators, []);
    }
  }
});
test('routing differentiates list/account tabs and individual details without fetching unrelated query changes', () => {
  const request = (path: string) => pageRequest(new URL(path, 'http://localhost'));
  assert.deepEqual(request('/admin/campuses?tab=accounts'), { view: 'accounts' });
  assert.deepEqual(request('/admin/campuses/abcdefghijklmn0?tab=Proposal'), { view: 'campus-detail', campus: 'abcdefghijklmn0', tab: 'Proposal' });
  assert.deepEqual(request('/campus/questions/abcdefghijklmn0'), { view: 'question-detail', question: 'abcdefghijklmn0' });
  assert.deepEqual(request('/admin/verifikasi?submission=anything'), { view: 'review' });
});

test('forum list skips FAQ content but question detail retains FAQ promotion state', async () => {
  const list = fakeClient();
  const data = await readPage(list.pb, actor, { view: 'questions' });
  assert.deepEqual(list.calls.map(c => c.collection), ['campuses', 'questions', 'question_answers', 'question_likes']);
  assert.equal(data.faq, undefined);
  const detail = fakeClient();
  await readPage(detail.pb, actor, { view: 'question-detail', question: 'question1' });
  assert.match(String(detail.calls.find(c => c.collection === 'faq_entries')?.options.filter), /question1/);
});

test('campus notifications skip campus directory while admin retains author names', async () => {
  const campus = fakeClient();
  await readPage(campus.pb, { id: 'pic', name: 'PIC', role: 'campus', campusId: 'own' }, { view: 'notifications' });
  assert.deepEqual(campus.calls.map(c => c.collection), ['notifications']);
  const admin = fakeClient();
  await readPage(admin.pb, actor, { view: 'notifications' });
  assert.deepEqual(admin.calls.map(c => c.collection), ['campuses', 'notifications']);
});

test('campus indicators and proposals read only their campus while shared views and admin keep the directory', async () => {
  for (const session of [actor, { id: 'pic', name: 'PIC', role: 'campus' as const, campusId: 'own' }]) {
    for (const view of ['indicators', 'proposals', 'dashboard', 'questions'] as const) {
      const client = fakeClient();
      await readPage(client.pb, session, { view });
      const filter = client.calls.find(c => c.collection === 'campuses')?.options.filter;
      if (session.role === 'campus' && ['indicators', 'proposals'].includes(view)) assert.match(String(filter), /own/);
      else assert.equal(filter, undefined);
    }
  }
});

test('page reads project mapper fields while preserving indicator targets, proposal history and locations', async () => {
  const client = fakeClient();
  await readPage(client.pb, actor, { view: 'campus-detail', campus: 'own' });
  const fields = (collection: string) => String(client.calls.find(c => c.collection === collection)?.options.fields).split(',');
  assert.ok(fields('indicator_definitions').includes('baseline'));
  assert.ok(fields('indicator_definitions').includes('target'));
  assert.ok(fields('campuses').includes('longitude'));
  assert.ok(fields('campuses').includes('locationApproximate'));
  assert.ok(fields('proposal_versions').includes('changes'));
  assert.ok(!fields('proposal_versions').includes('file'));
  assert.ok(!fields('proposal_versions').includes('uploadedBy'));
  assert.ok(client.calls.every(c => typeof c.options.fields === 'string'));
});

test('field projection preserves populated page responses', async () => {
  const row = { id: 'one', name: 'Campus', region: 'West', initials: 'C', acronym: 'C', city: 'City', source: 'manual', revision: 2,
    province: 'Province', island: 'Island', hasLocation: true, longitude: 110, latitude: -6, locationApproximate: true,
    campus: 'one', definition: 'one', category: 'Energy', unit: 'kWh', description: 'Description', baseline: 2, target: 10,
    current: 5, note: 'Note', version: 2, status: 'pending', snapshot: [], submittedAt: '2026-01-01', reviewedAt: '2026-01-02',
    reviewedBy: 'Admin', decisionNote: 'Review', simulated: true, indicator: 'one', text: 'Feedback', requiresRevision: true,
    state: 'open', created: '2026-01-01', updated: '2026-01-02', filename: 'proposal.pdf', size: 1234, changes: ['Change'],
    title: 'Question', body: 'Body', categoryIds: ['umum'], replyCount: 3, lastReplyRole: 'admin', question: 'one',
    sourceQuestion: 'one', answer: 'Answer', order: 1, readAt: '2026-01-02' };
  const client = (project: boolean) => ({ filter: () => '', collection: () => {
    const items = (options: { fields: string }) => [project ? Object.fromEntries(options.fields.split(',').map(key => [key, row[key as keyof typeof row]])) : row];
    return { getFullList: async (options: { fields: string }) => items(options), getList: async (_page: number, _size: number, options: { fields: string }) => ({ items: items(options) }) };
  } }) as unknown as PocketBase;
  for (const request of [{ view: 'dashboard' }, { view: 'campus-detail', campus: 'one', tab: 'Indikator' }, { view: 'map' },
    { view: 'proposals' }, { view: 'question-detail', question: 'one' }, { view: 'notifications' }] as const) {
    assert.deepEqual(await readPage(client(true), actor, request), await readPage(client(false), actor, request));
  }
});
