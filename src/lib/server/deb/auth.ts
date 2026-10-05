import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';
import { security } from './security';
import { serverSettings } from './server-client';
export const SESSION_COOKIE = 'deb_session';
export function client() {
  if (!env.PB_URL) throw new Error('PB_URL belum dikonfigurasi.');
  const pb = new PocketBase(env.PB_URL); pb.autoCancellation(false);
  pb.beforeSend=(url,options)=>({url,options:{...options,redirect:'error'}}); return pb;
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
    if (!result.record.active || !result.record.verified || result.record.simulated || !['admin', 'campus'].includes(result.record.role)) throw new Error('Invalid session');
    if ((result.record.sessionVersion || '') !== claims.version) throw new Error('Revoked session');
    pb.authStore.save(token, result.record); return pb;
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
