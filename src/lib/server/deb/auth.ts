import { noRedirects } from './pb-fetch';
import PocketBase, { type RecordModel } from 'pocketbase';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';
import { security } from './security';
import { serverSettings } from './server-client';
import { requiresPasswordChange } from './password-policy';
export const SESSION_COOKIE = 'deb_session';
export function client() {
  if (import.meta.env.MODE === 'pocketbase-local' && (env.PB_URL !== 'http://127.0.0.1:8097' || env.DEB_LOCAL_PREVIEW_ENABLED !== 'true')) throw new Error('Koneksi selain PocketBase lokal ditolak.');
  if (!env.PB_URL) throw new Error('PB_URL belum dikonfigurasi.');
  const pb = new PocketBase(env.PB_URL); pb.autoCancellation(false);
  return noRedirects(pb);
}
export async function sessionClient(event: RequestEvent) {
  const cookie = event.cookies.get(SESSION_COOKIE); if (!cookie) return null;
  const pb = client();
  try {
    const settings = await serverSettings();
    const claims = security.parseJWT(cookie, settings.DEB_INVITATION_KEY);
    if (claims.kind !== 'session' || typeof claims.token !== 'string') throw new Error('Invalid session');
    const token = claims.token;
    pb.authStore.save(token);
    // Refresh verifies the signature/tokenKey and fetches the current account. Keep the original expiry.
    const result = await pb.collection('users').authRefresh();
    if (!result.record.active || !result.record.verified || result.record.simulated || !['admin', 'campus', 'baru', 'super_admin'].includes(result.record.role)) throw new Error('Invalid session');
    if ((result.record.sessionVersion || '') !== claims.version) throw new Error('Revoked session');
    // The existing modules check the literal role admin; a super admin is an admin with a flag.
    const record: RecordModel = result.record.role === 'super_admin' ? { ...result.record, role: 'admin', superAdmin: true } : result.record;
    // Only a server-signed OAuth session bypasses the application password prompt.
    record.passwordChangeRequired = requiresPasswordChange(record) && claims.method !== 'oauth';
    pb.authStore.save(token, record); return pb;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== undefined && ![400,401,403,404].includes(status)) throw new Error('Layanan sesi belum tersedia.');
    event.cookies.delete(SESSION_COOKIE, { path: '/' }); return null;
  }
}
export function sameOrigin(event: RequestEvent) {
  const origin = event.request.headers.get('origin');
  return origin === event.url.origin && !['cross-site', 'same-site'].includes(event.request.headers.get('sec-fetch-site') || '');
}
