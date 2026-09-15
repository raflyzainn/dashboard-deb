import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { BUSINESS_COLLECTIONS, RestStore, StoreRecord } from '../src/lib/server/deb/rest-store';
import { runWorkflow } from '../src/lib/server/deb/business/workflows';

test('new workflow and master records inherit the stored actor simulation flag', () => {
  for (const simulated of [false, true]) {
    const app = new RestStore(Object.fromEntries(BUSINESS_COLLECTIONS.map(name => [name, []])));
    const campus = { id: 'c'.repeat(15), name: 'Campus' };
    const user = { id: 'u'.repeat(15), role: 'campus', campus: campus.id, active: true, verified: true, simulated };
    const admin = { ...user, id: 'a'.repeat(15), role: 'admin', campus: '' };
    for (const row of [user, admin]) app.records.get('users')!.push(new StoreRecord('users', row));
    app.records.get('campuses')!.push(new StoreRecord('campuses', campus));
    const call = (actor: typeof user, op: string, body: object = {}, file?: File): any => runWorkflow({
      app, auth: { ...actor, simulated: !simulated }, local: simulated, file,
      request: { pathValue: () => op, header: { get: () => randomUUID() } },
      requestInfo: () => ({ body: { ...body, simulated: !simulated } }), json: (_status: number, result: unknown) => result
    });
    const definition = call(admin, 'masterSaveDefinition', { code: 'TEST', name: 'Indicator', category: 'Energy', unit: 'kWh', description: '', baseline: 0, target: 10 });
    call(admin, 'masterActivateDefinition', { id: definition.id, revision: 1 });
    call(admin, 'masterSaveCampus', { name: 'New campus', initials: 'NC', acronym: '', region: 'Java', city: '', province: '', island: '', latitude: null, longitude: null, approximate: false });
    call(user, 'submitDeb');
    call(user, 'uploadProposal', {}, new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' }));
    const question = call(user, 'ask', { title: 'Question', body: 'Body' });
    call(admin, 'answer', { id: question.id, body: 'Answer' });
    call(user, 'reply', { id: question.id, body: 'Reply' });
    call(user, 'setLike', { id: question.id, liked: true });
    call(admin, 'promoteFaq', { id: question.id });
    call(admin, 'saveFaq', { question: 'Manual FAQ', answer: 'Answer' });
    call(admin, 'addFeedback', { id: app.records.get('campus_indicators')![0].id, text: 'Note', requiresRevision: false });
    const created = app.writes.filter(w => w.method === 'create' && !['workflow_operations', 'master_audit'].includes(w.name));
    assert.ok(created.length > 20);
    for (const write of created) assert.equal(write.data.simulated, simulated, write.name);
    assert.equal(app.findRecordById('campuses', campus.id).data.simulated, undefined, 'existing data is not relabeled');
  }
});
