import type PocketBase from 'pocketbase';
import { PreviewError } from './preview-error';

/**
 * PocketBase requests must never follow a redirect: a redirect means the backend address is wrong (http instead of https, a moved host).
 * The edge runtime only knows "follow" and "manual", so the client asks for "manual" and treats any redirect as a failure itself.
 */
export function assertNoRedirect(response: Response) {
  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) throw new PreviewError(503, 'Alamat backend mengalihkan. Periksa PB_URL (https, alamat persis).');
  return response;
}
export function noRedirects(pb: PocketBase) {
  pb.beforeSend = (url, options) => ({ url, options: { ...options, redirect: 'manual' } });
  pb.afterSend = (response, data) => { assertNoRedirect(response); return data; };
  return pb;
}
