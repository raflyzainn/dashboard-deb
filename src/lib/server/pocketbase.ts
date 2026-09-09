import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

export function configuredUrl() {
  if (!env.PB_URL) throw new Error('PB_URL is required for the DEB backend');
  const url = new URL(env.PB_URL);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('PB_URL must be a clean HTTP(S) origin');
  }
  if (url.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('Remote PocketBase requires HTTPS');
  return url.origin;
}

function createClient() {
  const pb = new PocketBase(configuredUrl());
  pb.autoCancellation(false);
  pb.beforeSend = (url, options) => ({ url, options: { ...options, redirect: 'error' } });
  return pb;
}

/** Never share authStore across requests; P1 must validate the session before use. */
export function createUserPocketBase(token: string) {
  if (!token) throw new Error('User token is required');
  const pb = createClient();
  pb.authStore.save(token);
  return pb;
}

/** Infrastructure only. Superusers bypass rules; never use for user-scoped reads. */
export async function createAdminPocketBase() {
  if (!env.PB_SUPERUSER_EMAIL || !env.PB_SUPERUSER_PASSWORD) throw new Error('Private PocketBase superuser credentials are required');
  const pb = createClient();
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  return pb;
}
