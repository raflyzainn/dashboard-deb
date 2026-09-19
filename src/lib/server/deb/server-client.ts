import PocketBase from 'pocketbase';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { PreviewError } from './preview-error';

export async function serverSettings(): Promise<Record<string, string>> {
  const settings: Record<string, string> = Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  if (dev && settings.DEB_LOCAL_PREVIEW_ENABLED === 'true' && /^http:\/\/127\.0\.0\.1:809[67]$/.test(settings.PB_URL || '')) {
    const local = await (await import('./local-config')).localServerConfig(settings.DEB_LOCAL_INSTANCE_DIR || '', settings.PB_URL);
    // The selected marked QA instance owns its credentials; never mix them with another .env database.
    Object.assign(settings, local);
    settings.DEB_LOCAL_INSTANCE_ID = 'local';
    settings.DEB_PUBLIC_URL ||= settings.PB_URL.endsWith('8097') ? 'http://127.0.0.1:5177' : 'http://127.0.0.1:5176';
  }
  return settings;
}

/**
 * The superuser token is kept per isolate and reused for a while: one sign in serves many requests instead of one per request,
 * which keeps the app under PocketBase's auth rate limit even when every caller shares one address behind a proxy.
 */
const TOKEN_TTL_MS = 30 * 60 * 1000;
let cached: { key: string; token: string; until: number } | null = null;
export const forgetServerAuth = () => { cached = null; };

export async function serverClient() {
  const settings = await serverSettings();
  if (!settings.PB_URL || !settings.PB_SUPERUSER_EMAIL || !settings.PB_SUPERUSER_PASSWORD) throw new PreviewError(503, 'Koneksi backend belum dikonfigurasi.');
  const pb = new PocketBase(settings.PB_URL); pb.autoCancellation(false);
  pb.beforeSend=(url,options)=>({url,options:{...options,redirect:'error'}});
  const key = `${settings.PB_URL}|${settings.PB_SUPERUSER_EMAIL}`;
  if (cached && cached.key === key && cached.until > Date.now()) { pb.authStore.save(cached.token, null); return { pb, settings }; }
  try {
    const auth = await pb.collection('_superusers').authWithPassword(settings.PB_SUPERUSER_EMAIL, settings.PB_SUPERUSER_PASSWORD);
    cached = { key, token: auth.token, until: Date.now() + TOKEN_TTL_MS };
  } catch (error) {
    cached = null;
    const status = (error as { status?: number }).status;
    console.warn('PocketBase superuser sign in failed', status ?? '', (error as Error)?.message?.slice(0, 120));
    throw new PreviewError(503, status === 429 ? 'Server sedang sibuk. Coba lagi sebentar.' : 'Koneksi backend belum tersedia.');
  }
  return { pb, settings };
}
