import { AwsClient } from 'aws4fetch';
import { PreviewError } from './preview-error';

/**
 * Private object storage for every document version. One object per version, never overwritten, never deleted.
 * The browser never receives storage addresses: files go in and out through the app server.
 */
export interface Storage {
  put(key: string, body: ArrayBuffer | Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Response>;
  exists(key: string): Promise<boolean>;
}

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

export function storage(settings: Record<string, string>): Storage {
  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = settings;
  if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new PreviewError(503, 'Penyimpanan berkas belum dikonfigurasi.');
  const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
  const base = R2_ENDPOINT.replace(/\/+$/, '') + '/' + R2_BUCKET + '/';
  const url = (key: string) => base + encodeKey(key);
  return {
    async put(key, body, contentType) {
      const response = await client.fetch(url(key), { method: 'PUT', body, headers: { 'content-type': contentType || 'application/octet-stream' } });
      if (!response.ok) { console.warn('R2 put failed', response.status); throw new PreviewError(503, 'Berkas belum dapat disimpan. Coba lagi.'); }
    },
    async get(key) {
      const response = await client.fetch(url(key), { method: 'GET' });
      if (response.status === 404) throw new PreviewError(404, 'Berkas tidak ditemukan.');
      if (!response.ok) { console.warn('R2 get failed', response.status); throw new PreviewError(503, 'Berkas belum dapat dibuka. Coba lagi.'); }
      return response;
    },
    async exists(key) {
      const response = await client.fetch(url(key), { method: 'HEAD' });
      return response.ok;
    }
  };
}

/** Object key for a document version: kampus/<code>/termin-<n>/<kind>/v<number>_<timestamp>_<safe name>. */
export function versionKey(code: string, term: number, kind: string, number: number, originalName: string) {
  const safe = originalName.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'berkas';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `kampus/${code}/termin-${term}/${kind}/v${number}_${stamp}_${safe}`;
}

export const MIME: Record<string, string> = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel', csv: 'text/csv'
};
export const ALLOWED_EXTENSIONS = Object.keys(MIME);
export function extensionOf(name: string) { return (name.split('.').pop() || '').toLowerCase(); }
export function mimeFor(name: string, fallback = '') { return MIME[extensionOf(name)] || fallback || 'application/octet-stream'; }
