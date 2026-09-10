import { readFile } from 'node:fs/promises';
import path from 'node:path';
import PocketBase from 'pocketbase';
import type { PreviewAccount } from '../../types';
import { PreviewError } from './preview-error';
export { PreviewError } from './preview-error';
export interface PreviewConfig { enabled?: string; url?: string; directory?: string; root: string }
export interface PreviewRequest { dev: boolean; address: string; url: URL; headers: Headers }
const loopback = (address: string) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);

export function guardPreview(request: PreviewRequest, config: PreviewConfig) {
  if (!request.dev || config.enabled !== 'true') throw new PreviewError(404, 'Preview akun hanya tersedia pada development lokal. Aktifkan DEB_LOCAL_PREVIEW_ENABLED=true.');
  if (!loopback(request.address) || !['127.0.0.1', 'localhost', '[::1]'].includes(request.url.hostname)) throw new PreviewError(403, 'Preview hanya menerima koneksi lokal.');
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if ((origin && origin !== request.url.origin) || (site && site !== 'same-origin' && site !== 'none')) throw new PreviewError(403, 'Request lintas origin ditolak.');
  if (request.headers.get('x-deb-preview') !== '1') throw new PreviewError(403, 'Header preview diperlukan.');
}

type Credentials = { users: Record<string, { email: string; password: string }> };
export async function previewContext(request: PreviewRequest, config: PreviewConfig) {
  guardPreview(request, config);
  const base = path.resolve(config.root, '.local/pocketbase');
  const directory = path.resolve(config.directory || base);
  const fixture = directory.startsWith(path.join(base, 'tests') + path.sep);
  if (directory !== base && !fixture) throw new PreviewError(503, 'Direktori instance DEB tidak valid.');
  try {
    const marker = JSON.parse(await readFile(path.join(directory, 'instance.json'), 'utf8'));
    const url = new URL(config.url || '');
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== (fixture ? '8097' : '8096') ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        marker.project !== 'dashboard-deb' || marker.kind !== (fixture ? 'test' : 'development') ||
        marker.directory !== directory || marker.url !== url.origin || !marker.instanceId) throw new Error('Invalid instance');
    const response = await fetch(url.origin + '/api/deb/local-instance', { redirect: 'error', signal: AbortSignal.timeout(5000) });
    const identity = await response.json();
    if (!response.ok || identity.project !== marker.project || identity.instanceId !== marker.instanceId || identity.version !== '0.40.3') throw new Error('Wrong instance');
    const credentials: Credentials = JSON.parse(await readFile(path.join(directory, 'credentials.json'), 'utf8'));
    const keys = Object.keys(credentials.users).filter(key => /^(campus-\d{3}|admin-[12])$/.test(key));
    async function account(key: string | null) {
      if (!key || !keys.includes(key)) throw new PreviewError(403, 'Pilih akun seed lokal yang tersedia.');
      const secret = credentials.users[key];
      const pb = new PocketBase(url.origin);
      pb.autoCancellation(false);
      pb.beforeSend = (target, options) => ({ url: target, options: { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) } });
      try {
        const result = await pb.collection('users').authWithPassword(secret.email, secret.password);
        const record = result.record;
        if (!record.active || !record.simulated || record.legacyId !== key || record.role !== (key.startsWith('campus-') ? 'campus' : 'admin')) throw new Error('Invalid QA account');
        return pb;
      } catch { throw new PreviewError(403, 'Akun preview tidak aktif atau kredensial lokal tidak cocok. Periksa provisioning PocketBase.'); }
    }
    return {
      account,
      async accounts(): Promise<PreviewAccount[]> {
        const pb = await account('admin-1');
        const campuses = await pb.collection('campuses').getFullList({ sort: 'name' });
        const rows: PreviewAccount[] = campuses.filter(c => keys.includes(c.legacyId)).map(c => ({ key: c.legacyId, name: c.name, role: 'campus' }));
        return [...rows, ...keys.filter(k => k.startsWith('admin-')).sort().map(key => ({ key, name: `Admin PF lokal ${key.slice(-1)}`, role: 'admin' as const }))];
      }
    };
  } catch (error) {
    if (error instanceof PreviewError) throw error;
    throw new PreviewError(503, 'PocketBase lokal belum tersedia atau konfigurasi instance salah. Periksa PB_URL, jalankan pb:setup/pb:serve, dan seed jika belum tersedia.');
  }
}
