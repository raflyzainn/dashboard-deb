import { json, type RequestEvent } from '@sveltejs/kit';
import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { previewEndpoint } from './http';
import { serverClient } from './server-client';
import { PreviewError } from './preview-error';

export type AppRole = 'baru' | 'campus' | 'admin' | 'super_admin';
export interface Actor { record: RecordModel; role: AppRole; admin: boolean; superAdmin: boolean; campusId: string }

/**
 * Runs an endpoint for a signed in user (cookie session, or a local preview account in dev) with a superuser client for data access.
 * The browser never talks to PocketBase; every read and write passes through here.
 */
export function secured(event: RequestEvent, roles: AppRole[], action: (context: { actor: Actor; pb: PocketBase; settings: Record<string, string>; ip: string }) => Promise<Response>) {
  return previewEndpoint(event, async context => {
    const session = await context.account(event.request.headers.get('x-deb-preview-account'));
    const record = session.authStore.record;
    if (!record) throw new PreviewError(401, 'Silakan masuk.');
    const role = (record.superAdmin ? 'super_admin' : record.role) as AppRole;
    if (roles.length && !roles.includes(role)) throw new PreviewError(403, 'Anda tidak memiliki akses ke bagian ini.');
    const backend = await serverClient();
    const actor: Actor = { record, role, admin: role === 'admin' || role === 'super_admin', superAdmin: role === 'super_admin', campusId: String(record.campus || '') };
    return action({ actor, pb: backend.pb, settings: backend.settings, ip: event.getClientAddress() });
  });
}

export const ADMIN: AppRole[] = ['admin', 'super_admin'];
export const ANY: AppRole[] = ['baru', 'campus', 'admin', 'super_admin'];

export function fail(status: number, message: string): never { throw new PreviewError(status, message); }

export function ok(data: unknown = { ok: true }, status = 200) { return json(data, { status, headers: { 'Cache-Control': 'no-store, private' } }); }

export const RECORD_ID = /^[a-z0-9]{15}$/;
export function recordId(value: unknown, label = 'ID'): string {
  if (typeof value !== 'string' || !RECORD_ID.test(value)) fail(400, `${label} tidak valid.`);
  return value;
}
export function actorInfo(actor: Actor) { return { id: actor.record.id, name: actor.record.name || actor.record.email, email: actor.record.email }; }
