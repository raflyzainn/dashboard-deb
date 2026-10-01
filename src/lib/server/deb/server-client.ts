import PocketBase from 'pocketbase';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { PreviewError } from './preview-error';
import { noRedirects } from './pb-fetch';

export async function serverSettings(): Promise<Record<string, string>> {
  const settings: Record<string, string> = Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  if (import.meta.env.MODE === 'pocketbase-local' && (!dev || settings.PB_URL !== 'http://127.0.0.1:8097' || settings.DEB_LOCAL_PREVIEW_ENABLED !== 'true')) throw new PreviewError(503, 'Mode lokal memerlukan instance PocketBase lokal bertanda pada port 8097.');
  if (dev && settings.DEB_LOCAL_PREVIEW_ENABLED === 'true' && /^http:\/\/127\.0\.0\.1:809[67]$/.test(settings.PB_URL || '')) {
    const local = await (await import('./local-config')).localServerConfig(settings.DEB_LOCAL_INSTANCE_DIR || '', settings.PB_URL);
    // The selected marked QA instance owns its credentials; never mix them with another .env database.
    delete settings.PB_SUPER_TOKEN;
    Object.assign(settings, local);
    settings.DEB_LOCAL_INSTANCE_ID = 'local';
    settings.DEB_PUBLIC_URL ||= settings.PB_URL.endsWith('8097') ? 'http://127.0.0.1:5177' : 'http://127.0.0.1:5176';
  }
  if (import.meta.env.MODE === 'pocketbase-local') for (const key of Object.keys(settings)) if (key.startsWith('R2_')) delete settings[key];
  return settings;
}

/**
 * The superuser token is kept per isolate and reused for a while: one sign in serves many requests instead of one per request,
 * which keeps the app under PocketBase's auth rate limit even when every caller shares one address behind a proxy.
 */
const TOKEN_TTL_MS = 30 * 60 * 1000;
let cached: { key: string; token: string; until: number } | null = null;
/** The last sign in failure of this instance, for the health check: status and a short message, never credentials. */
export let lastSignInFailure: { at: string; detail: string } | null = null;
export const forgetServerAuth = () => { cached = null; };

/** Expiry of a JWT in milliseconds, or 0 when it cannot be read. */
export function tokenExpiry(token: string) {
  try { return Number(JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp || 0) * 1000; } catch { return 0; }
}
/** How the server authenticates: a pre issued superuser token (the PF Series way) or, without one, a password sign in. */
export async function serverAuthMode() {
  const settings = await serverSettings();
  if (settings.PB_SUPER_TOKEN) return { mode: 'token' as const, expiresAt: tokenExpiry(settings.PB_SUPER_TOKEN) };
  return { mode: settings.PB_SUPERUSER_EMAIL && settings.PB_SUPERUSER_PASSWORD ? 'password' as const : 'none' as const, expiresAt: 0 };
}

export async function serverClient() {
  const settings = await serverSettings();
  if (!settings.PB_URL) throw new PreviewError(503, 'Koneksi backend belum dikonfigurasi.');
  const pb = noRedirects(new PocketBase(settings.PB_URL)); pb.autoCancellation(false);
  // The pre issued superuser token: no sign in request at all, as in PF Series (PB_SUPER_TOKEN).
  if (settings.PB_SUPER_TOKEN) {
    const expiresAt = tokenExpiry(settings.PB_SUPER_TOKEN);
    if (expiresAt && expiresAt < Date.now()) throw new PreviewError(503, 'Token server ke backend sudah kedaluwarsa. Terbitkan token baru.');
    pb.authStore.save(settings.PB_SUPER_TOKEN, null);
    return { pb, settings };
  }
  if (!settings.PB_SUPERUSER_EMAIL || !settings.PB_SUPERUSER_PASSWORD) throw new PreviewError(503, 'Koneksi backend belum dikonfigurasi.');
  const key = `${settings.PB_URL}|${settings.PB_SUPERUSER_EMAIL}`;
  if (cached && cached.key === key && cached.until > Date.now()) { pb.authStore.save(cached.token, null); return { pb, settings }; }
  try {
    const auth = await pb.collection('_superusers').authWithPassword(settings.PB_SUPERUSER_EMAIL, settings.PB_SUPERUSER_PASSWORD);
    cached = { key, token: auth.token, until: Date.now() + TOKEN_TTL_MS };
  } catch (error) {
    cached = null;
    const status = (error as { status?: number }).status;
    const original = (error as { originalError?: { message?: string; cause?: { message?: string } } }).originalError;
    const reason = [original?.message, original?.cause?.message].filter(Boolean).join(' / ');
    const detail = `${status ?? 'tanpa status'}: ${String((error as Error)?.message || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}${reason ? ` (${reason.slice(0, 160)})` : ''}`;
    console.warn('PocketBase superuser sign in failed', detail);
    lastSignInFailure = { at: new Date().toISOString(), detail };
    throw new PreviewError(503, status === 429 ? 'Server sedang sibuk. Coba lagi sebentar.' : 'Koneksi backend belum tersedia.');
  }
  return { pb, settings };
}
