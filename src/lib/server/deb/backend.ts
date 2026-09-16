import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { atomic, StoreRecord, type SnapshotReads } from './rest-store';
import { runWorkflow } from './business/workflows';
import { createAccounts } from './business/accounts';
import { security } from './security';
import { PreviewError } from './preview-error';

function workflowReads(pb: PocketBase, actor: RecordModel, operation: string, body: Record<string, unknown>, key: string): SnapshotReads {
  const dependencies: Record<string, string[]> = {
    updateIndicator: ['indicator_definitions', 'campus_indicators', 'deb_submissions', 'indicator_feedback'],
    submitDeb: ['indicator_definitions', 'campus_indicators', 'deb_submissions'],
    reviewDeb: ['indicator_definitions', 'campus_indicators', 'deb_submissions', 'indicator_feedback'],
    addFeedback: ['campus_indicators','indicator_definitions'], closeFeedback: ['indicator_feedback', 'campus_indicators','indicator_definitions'],
    uploadProposal: ['proposal_versions'], reviewProposal: ['proposal_versions'], ask: [], answer: ['questions', 'question_answers'],
    reply: ['campuses', 'questions', 'question_answers', 'question_replies'], setLike: ['questions', 'question_likes'],
    promoteFaq: ['questions', 'question_answers', 'faq_entries'], saveFaq: ['faq_entries'], moveFaq: ['faq_entries'], deleteFaq: ['faq_entries'],
    readNotifications: ['notifications'],
    masterCreatePeriod: ['indicator_definitions'],
    masterOpenPeriod: ['indicator_definitions','campuses','deb_submissions'],
    masterSaveDefinition: ['campuses', 'indicator_definitions', 'campus_indicators', 'deb_submissions'],
    masterActivateDefinition: ['campuses', 'indicator_definitions', 'campus_indicators', 'deb_submissions'],
    masterDeleteDefinition: ['indicator_definitions', 'campus_indicators', 'deb_submissions'],
    masterSaveCampus: ['campuses', 'indicator_definitions'],
    masterDeleteCampus: ['campuses', 'campus_indicators', 'deb_submissions', 'indicator_feedback', 'proposal_versions', 'questions', 'question_likes', 'activities', 'notifications']
  };
  if (!dependencies[operation]) throw new PreviewError(404, 'Workflow tidak ditemukan.');
  const reads: SnapshotReads = { activities: null, notifications: null, master_audit: null, campus_indicators: null, indicator_feedback: null, questions: null };
  for (const name of dependencies[operation]) reads[name] = {};
  reads.users = { fields: 'id,role,campus,active,verified,simulated,sessionVersion' };
  reads.workflow_operations = { filter: pb.filter('actor = {:actor} && key = {:key}', { actor: actor.id, key }), limit: 1 };
  const id = { filter: pb.filter('id = {:id}', { id: String(body.id || '') }) };
  const campus = pb.filter('campus = {:campus}', { campus: String(actor.campus || '') });
  if (['answer', 'reply', 'setLike', 'promoteFaq'].includes(operation)) {
    reads.questions = id;
    if (reads.question_answers) reads.question_answers = { filter: pb.filter('question = {:id}', { id: String(body.id || '') }) };
  }
  if (operation === 'reply') {
    reads.campuses = { filter: pb.filter('id = {:id}', { id: String(actor.campus || '') }) };
    reads.question_replies = body.replyTo ? { filter: pb.filter('id = {:id}', { id: String(body.replyTo) }) } : null;
  }
  if (operation === 'setLike') reads.question_likes = { filter: pb.filter('question = {:id} && campus = {:campus}', { id: String(body.id || ''), campus: String(actor.campus || '') }) };
  if (operation === 'reviewProposal') reads.proposal_versions = id;
  if (operation === 'uploadProposal') reads.proposal_versions = { filter: campus, sort: '-version', limit: 1 };
  if (operation === 'submitDeb') {
    reads.campus_indicators = { filter: campus };
    reads.deb_submissions = { filter: campus }; // Versions are scoped to the active period inside the transaction.
  }
  if (operation === 'updateIndicator') {
    reads.campus_indicators = id;
    reads.deb_submissions = { filter: campus + ' && status = "pending"', limit: 1 };
    reads.indicator_feedback = { filter: pb.filter('indicator = {:id} && requiresRevision = true && state = "open"', { id: String(body.id || '') }) };
  }
  if (operation === 'reviewDeb') reads.deb_submissions = id;
  if (operation === 'addFeedback') reads.campus_indicators = id;
  if (operation === 'closeFeedback') reads.indicator_feedback = id;
  if (['masterSaveDefinition', 'masterActivateDefinition'].includes(operation)) reads.deb_submissions = { filter: 'status = "pending"', limit: 1 };
  if (operation === 'masterActivateDefinition') reads.campus_indicators = null;
  if (operation === 'masterSaveCampus') {
    reads.campuses = body.id ? id : null;
    reads.indicator_definitions = { filter: 'status = "active"' };
  }
  if (operation === 'readNotifications') {
    if (body.ids !== undefined && (!Array.isArray(body.ids) || body.ids.length > 1000 || body.ids.some(id => typeof id !== 'string' || !/^[a-z0-9]{15}$/.test(id)))) throw new PreviewError(400, 'Daftar notifikasi tidak valid.');
    const own = pb.filter('recipientUser = {:actor}', { actor: actor.id });
    reads.notifications = body.ids === undefined ? { filter: own + ' && readAt = ""', limit: 501 } :
      body.ids.length ? { filter: own + ' && (' + body.ids.map(id => pb.filter('id = {:id}', { id })).join(' || ') + ')' } : null;
  }
  if (['readNotifications', 'setLike', 'saveFaq', 'moveFaq', 'deleteFaq', 'promoteFaq'].includes(operation)) reads.users = { ...reads.users, filter: pb.filter('id = {:id}', { id: actor.id }) };
  return reads;
}

export async function executeWorkflow(pb: PocketBase, actor: RecordModel | null, operation: string, body: Record<string, unknown>, key: string, local: boolean, file?: File) {
  if (!actor) throw new PreviewError(401, 'Silakan masuk terlebih dahulu.');
  if (file && file.size > 10485760) throw new PreviewError(413, 'PDF maksimal 10 MiB.');
  if (operation === 'uploadProposal' && (!file || !file.size || file.size > 10485760 || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf') || new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-')) throw new PreviewError(400, 'Pilih satu PDF valid maksimal 10 MiB.');
  let fileHash = '';
  if (file) fileHash = security.sha256(Buffer.from(await file.arrayBuffer()).toString('base64'));
  return atomic(pb, store => runWorkflow({ app: store, auth: actor, local, file, fileHash,
    request: { pathValue: () => operation, header: { get: () => key } },
    requestInfo: () => ({ body }), json: (_status: number, value: unknown) => value }), workflowReads(pb, actor, operation, body, key));
}

export function accountApi(settings: Record<string, string>) { return createAccounts({ get: (key: string) => settings[key] || '' }); }
export async function revokeSessions(pb: PocketBase, actor: RecordModel) {
  await atomic(pb, store => {
    const user = store.findRecordById('users', actor.id);
    // A retry must not revoke sessions created after this logout already committed.
    if (user.getString('sessionVersion') !== (actor.sessionVersion || '')) return;
    user.set('sessionVersion', security.randomString(50));
    // StoreRecord's legacy tokenKey setter aliases sessionVersion; rotate the native key explicitly too.
    user.data.tokenKey = security.randomString(50);
    store.save(user);
  }, { users: { filter: pb.filter('id = {:id}', { id: actor.id }), fields: 'id,role,campus,sessionVersion' } });
}
export async function rateLimit(pb: PocketBase, settings: Record<string, string>, labels: { key: string; max: number; duration: number }[]) {
  const api = accountApi(settings);
  let failure: unknown;
  const now = Date.now();
  const keys = labels.map(label => pb.filter('key = {:key}', { key: security.sha256(label.key) })).join(' || ');
  await atomic(pb, store => {
    failure = undefined;
    for (const row of store.findRecordsByFilter('auth_limits', 'until < {:now}', 'until,id', 100, 0, { now })) store.delete(row);
    for (const label of labels) { try { api.limit(store, label.key, label.max, label.duration); } catch (e) { failure = e; break; } }
  }, { auth_limits: [{ filter: keys || 'id = ""' }, { filter: pb.filter('until < {:now}', { now }), sort: 'until,id', limit: 100 }] });
  if (failure) throw failure;
}
export async function executeAccount(pb: PocketBase, settings: Record<string, string>, actor: RecordModel | null, operation: string, body: Record<string, any>, ip: string, query: Record<string, string> = {}, passwordValid = false) {
  const api = accountApi(settings);
  if (operation === 'request') await rateLimit(pb, settings, [{ key: 'email-ip:' + ip, max: 60, duration: 3600000 }, { key: 'email:' + String(body.email || '').trim().toLowerCase(), max: 20, duration: 3600000 }]);
  if (['inspect', 'confirm'].includes(operation)) await rateLimit(pb, settings, [{ key: 'token:' + ip, max: 60, duration: 900000 }]);
  const handler = operation === 'read' ? api.read : operation === 'save' ? api.save : operation === 'change-password' ? api.changePassword : api.public;
  if (!['read', 'save', 'change-password', 'request', 'inspect', 'confirm'].includes(operation)) throw new PreviewError(404, 'Tidak ditemukan.');
  return atomic(pb, store => handler({ app: store, auth: actor ? new StoreRecord('users', actor) : null, passwordValid,
    request: { pathValue: () => operation }, requestInfo: () => ({ body, query }), realIP: () => ip,
    json: (_status: number, value: unknown) => value }), {
      users: {}, campuses: {}, campus_contacts: {}, account_invitations: {}, account_audit: null,
      ...(operation === 'read' || operation === 'inspect' ? {} : { email_challenges: {} })
    });
}
