import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { atomic, StoreRecord } from './rest-store';
import { runWorkflow } from './business/workflows';
import { createAccounts } from './business/accounts';
import { security } from './security';
import { PreviewError } from './preview-error';

export async function executeWorkflow(pb: PocketBase, actor: RecordModel | null, operation: string, body: Record<string, unknown>, key: string, local: boolean, file?: File) {
  if (!actor) throw new PreviewError(401, 'Silakan masuk terlebih dahulu.');
  if (file && file.size > 10485760) throw new PreviewError(413, 'PDF maksimal 10 MiB.');
  if (operation === 'uploadProposal' && (!file || !file.size || file.size > 10485760 || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf') || new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-')) throw new PreviewError(400, 'Pilih satu PDF valid maksimal 10 MiB.');
  let fileHash = '';
  if (file) fileHash = security.sha256(Buffer.from(await file.arrayBuffer()).toString('base64'));
  return atomic(pb, store => runWorkflow({ app: store, auth: actor, local, file, fileHash,
    request: { pathValue: () => operation, header: { get: () => key } },
    requestInfo: () => ({ body }), json: (_status: number, value: unknown) => value }));
}

export function accountApi(settings: Record<string, string>) { return createAccounts({ get: (key: string) => settings[key] || '' }); }
export async function rateLimit(pb: PocketBase, settings: Record<string, string>, labels: { key: string; max: number; duration: number }[]) {
  const api = accountApi(settings);
  let failure: unknown;
  await atomic(pb, store => {
    failure = undefined;
    for (const label of labels) { try { api.limit(store, label.key, label.max, label.duration); } catch (e) { failure = e; break; } }
  }, ['auth_limits']);
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
    json: (_status: number, value: unknown) => value }), ['users', 'campuses', 'campus_contacts', 'account_invitations', 'account_audit', 'auth_limits', 'email_challenges']);
}
