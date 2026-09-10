import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';
export const SESSION_COOKIE = 'deb_session';
export function client() {
  if (!env.PB_URL) throw new Error('PB_URL belum dikonfigurasi.');
  const pb = new PocketBase(env.PB_URL); pb.autoCancellation(false); return pb;
}
export async function sessionClient(event: RequestEvent) {
  const token = event.cookies.get(SESSION_COOKIE); if (!token) return null;
  const pb = client(); pb.authStore.save(token);
  try {
    // Refresh verifies the signature/tokenKey and fetches the current account. Keep the original expiry.
    const result = await pb.collection('users').authRefresh();
    if (!result.record.active || !result.record.verified || result.record.simulated || !['admin', 'campus'].includes(result.record.role)) throw new Error('Invalid session');
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
