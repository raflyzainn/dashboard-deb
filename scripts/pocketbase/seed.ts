import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { createSeed } from '../fixtures/seed';
import { CAMPUS_LOCATIONS } from '../fixtures/locations';
import { questionCategories } from '../../src/lib/forum';
import { adminClient, credentialsPath, password, privateJson, readJson, type Credentials, type LocalInstance } from './runtime';

/** Only baseline mock data, never browser data. Insert missing records; never update existing ones. */
export async function seedLocal(instance: LocalInstance) {
  const pb = await adminClient(instance);
  const credentials = await readJson<Credentials>(credentialsPath(instance));
  const { data, files } = createSeed();
  const cache = new Map<string, Map<string, RecordModel>>();
  const created: Record<string, number> = {};
  async function records(name: string) {
    if (!cache.has(name)) cache.set(name, new Map((await pb.collection(name).getFullList()).map(r => [r.legacyId, r])));
    return cache.get(name)!;
  }
  async function put(name: string, legacyId: string, body: Record<string, unknown>) {
    const existing = await records(name);
    if (existing.has(legacyId)) return existing.get(legacyId)!;
    let record: RecordModel;
    try {
      record = await pb.collection(name).create({ ...body, legacyId, simulated: true });
    } catch (error) {
      const failure = error as { status?: number; response?: { data?: Record<string, unknown> } };
      const fields = Object.keys(failure.response?.data || {}).join(', ');
      throw new Error(`Seed ${name}/${legacyId} failed (${failure.status || 'network'})${fields ? '; fields: ' + fields : ''}. Existing data was not overwritten.`);
    }
    existing.set(legacyId, record);
    created[name] = (created[name] || 0) + 1;
    return record;
  }
  const id = (collection: string, legacy: string) => {
    const record = cache.get(collection)?.get(legacy);
    if (!record) throw new Error(`Missing seed reference: ${collection}/${legacy}`);
    return record.id;
  };
  for (const campus of data.campuses) {
    const point = CAMPUS_LOCATIONS.find(point => point.campusId === campus.id);
    if (!point) throw new Error('Missing baseline campus location: ' + campus.id);
    const { id: legacy, ...fields } = campus;
    await put('campuses', legacy, { ...fields, province: point.province, island: point.island,
      longitude: Number((94.5 + (point.x - 3) / 94 * 47).toFixed(6)),
      latitude: Number((6.5 - (point.y - 7) / 90 * 18).toFixed(6)), locationApproximate: true, hasLocation: true, revision: 1 });
  }
  for (const definition of data.definitions) {
    const { id: legacy, ...fields } = definition;
    const shared = data.indicators.find(i => i.definitionId === legacy)!;
    await put('indicator_definitions', legacy, { ...fields, code: legacy, baseline: shared.baseline, target: shared.target, status: 'active', revision: 1 });
  }
  for (const account of [
    ...data.campuses.map(c => ({ key: c.id, name: c.name, role: 'campus', campus: id('campuses', c.id) })),
    { key: 'admin-1', name: 'Admin DEB Lokal 1', role: 'admin', campus: '' },
    { key: 'admin-2', name: 'Admin DEB Lokal 2', role: 'admin', campus: '' }
  ]) {
    const existing = (await records('users')).get(account.key);
    if (existing) continue;
    if (!credentials.users[account.key]) {
      credentials.users[account.key] = { email: `${account.key}@deb.local.test`, password: password() };
      // Persist before create so an interrupted seed never loses a created account's password.
      await privateJson(credentialsPath(instance), credentials);
    }
    const auth = credentials.users[account.key];
    await put('users', account.key, { name: account.name, role: account.role, campus: account.campus,
      active: true, email: auth.email, password: auth.password, passwordConfirm: auth.password, verified: true });
  }
  for (const row of data.indicators) await put('campus_indicators', row.id, {
    campus: id('campuses', row.campusId), definition: id('indicator_definitions', row.definitionId),
    baseline: row.baseline, target: row.target, current: row.current, note: row.note, updated: row.updatedAt
  });
  for (const row of data.submissions || []) await put('deb_submissions', row.id, {
    campus: id('campuses', row.campusId), version: row.version, status: row.status,
    submittedBy: id('users', row.campusId), submittedAt: row.submittedAt,
    snapshot: row.indicators.map(indicator => {
      const definition = data.definitions.find(d => d.id === indicator.definitionId)!;
      return { ...indicator, id: id('campus_indicators', indicator.id), campusId: id('campuses', indicator.campusId),
        definitionId: id('indicator_definitions', indicator.definitionId), name: definition.name, category: definition.category, unit: definition.unit };
    })
  });
  for (const row of data.feedback) await put('indicator_feedback', row.id, {
    campus: id('campuses', row.campusId), indicator: id('campus_indicators', row.indicatorId), author: id('users', 'admin-1'),
    text: row.text, requiresRevision: row.requiresRevision, state: row.state, created: row.createdAt, updated: row.updatedAt
  });
  for (const row of data.proposals) {
    const file = files.find(file => file.id === row.id)!;
    await put('proposal_versions', row.id, { campus: id('campuses', row.campusId), version: row.version,
      filename: row.filename, size: file.blob.size, changes: row.changes, uploadedBy: id('users', row.campusId),
      created: row.createdAt, file: new File([file.blob], row.filename, { type: 'application/pdf' }) });
  }
  for (const row of data.questions) await put('questions', row.id, { campus: id('campuses', row.campusId), author: id('users', row.campusId),
    title: row.title, body: row.body, categoryIds: questionCategories(row), created: row.createdAt });
  for (const row of data.answers) await put('question_answers', row.id, { question: id('questions', row.questionId),
    author: id('users', 'admin-1'), body: row.body, updated: row.updatedAt });
  for (const row of data.likes) await put('question_likes', row.id, { question: id('questions', row.questionId), campus: id('campuses', row.campusId) });
  for (const row of data.faq) await put('faq_entries', row.id, { sourceQuestion: row.questionId ? id('questions', row.questionId) : '', question: row.question, answer: row.answer, order: row.order });
  for (const row of data.activities) await put('activities', row.id, { campus: id('campuses', row.campusId), actor: id('users', row.campusId),
    eventType: 'mock.indicators.initialized', sourceId: id('campuses', row.campusId), text: row.text, created: row.createdAt });
  for (const row of data.notifications) {
    const targets = row.recipient === 'admin' ? ['admin-1', 'admin-2'] : [row.campusId];
    // Replace path segments, never substrings (question-1 must not corrupt question-10).
    const target = row.href.split('/').map(segment => cache.get('campuses')?.get(segment)?.id || cache.get('questions')?.get(segment)?.id || segment).join('/');
    for (const recipient of targets) await put('notifications', `${row.id}:${recipient}`, {
      recipientUser: id('users', recipient), campus: id('campuses', row.campusId), eventType: 'mock.notification', eventKey: row.id,
      sourceId: target.split('/').at(-1), title: row.title, body: row.body, target, created: row.createdAt, readAt: row.readAt || ''
    });
  }
  return { created, counts: Object.fromEntries([...cache].map(([name, records]) => [name, records.size])) };
}

export async function authenticateUser(pb: PocketBase, credentials: Credentials, key: string) {
  const account = credentials.users[key];
  await pb.collection('users').authWithPassword(account.email, account.password);
  return pb;
}
