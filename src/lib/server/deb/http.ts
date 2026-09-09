import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { json, type RequestEvent } from '@sveltejs/kit';
import { PreviewError } from './preview-error';
import type { previewContext as ContextFactory } from './local-preview';

export async function previewEndpoint(event: RequestEvent, action: (context: Awaited<ReturnType<typeof ContextFactory>>) => Promise<Response>) {
  // Compile-time dev gate keeps local file reading OUT of production chunks/traces.
  if (!dev) return json({ message: 'Preview akun tidak tersedia pada production. P1 belum diaktifkan.' }, { status: 404, headers: { 'Cache-Control': 'no-store, private' } });
  try {
    const { previewContext } = await import('./local-preview');
    const context = await previewContext({ dev, address: event.getClientAddress(), url: event.url, headers: event.request.headers },
      { enabled: env.DEB_LOCAL_PREVIEW_ENABLED, url: env.PB_URL, directory: env.DEB_LOCAL_INSTANCE_DIR, root: process.cwd() });
    const response = await action(context);
    response.headers.set('Cache-Control', 'no-store, private');
    response.headers.set('Vary', 'X-DEB-Preview-Account');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  } catch (error) {
    const status = error instanceof PreviewError ? error.status : (error as { status?: number }).status === 404 ? 404 : 503;
    const message = error instanceof PreviewError ? error.message : status === 404 ? 'Data tidak ditemukan atau tidak dapat diakses.' : 'Pembacaan PocketBase gagal. Coba muat ulang.';
    return json({ message }, { status, headers: { 'Cache-Control': 'no-store, private' } });
  }
}
