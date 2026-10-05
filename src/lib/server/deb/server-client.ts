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

export async function serverClient() {
  const settings = await serverSettings();
  if (!settings.PB_URL || !settings.PB_SUPERUSER_EMAIL || !settings.PB_SUPERUSER_PASSWORD) throw new PreviewError(503, 'Koneksi backend belum dikonfigurasi.');
  const pb = new PocketBase(settings.PB_URL); pb.autoCancellation(false);
  pb.beforeSend=(url,options)=>({url,options:{...options,redirect:'error'}});
  try { await pb.collection('_superusers').authWithPassword(settings.PB_SUPERUSER_EMAIL, settings.PB_SUPERUSER_PASSWORD); }
  catch { throw new PreviewError(503, 'Koneksi backend belum tersedia.'); }
  return { pb, settings };
}
