import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { json, type RequestEvent } from '@sveltejs/kit';
import { PreviewError } from './preview-error';
import type { previewContext as ContextFactory } from './local-preview';

export async function previewEndpoint(event: RequestEvent, action: (context: Awaited<ReturnType<typeof ContextFactory>>) => Promise<Response>) {
  if (event.locals.pb) {
    try {
      const pb = event.locals.pb;
      return await action({ account: async () => pb, accounts: async () => [] });
    } catch (error) {
      const e = error as { status?: number; message?: string; response?: { message?: string } };
      const status = e.status && [400,401,403,404,409,413,429,503].includes(e.status) ? e.status : 503;
      return json({ message: e.response?.message || e.message || 'Operasi akun gagal.' }, { status });
    }
  }
  const selected = event.request.headers.get('x-deb-preview-account') || (dev ? event.cookies.get('deb_local_preview') : '') || null;
  if (!selected && event.url.pathname !== '/api/dev/accounts') return json({ message: 'Silakan login.' }, { status: 401 });
  // Compile-time dev gate keeps local file reading OUT of production chunks/traces.
  if (!dev) return json({ message: 'Preview akun tidak tersedia pada production. P1 belum diaktifkan.' }, { status: 404, headers: { 'Cache-Control': 'no-store, private' } });
  try {
    const { previewContext } = await import('./local-preview');
    const headers = new Headers(event.request.headers);
    if (event.cookies.get('deb_local_preview')) headers.set('x-deb-preview', '1');
    const context = await previewContext({ dev, address: event.getClientAddress(), url: event.url, headers },
      { enabled: env.DEB_LOCAL_PREVIEW_ENABLED, url: env.PB_URL, directory: env.DEB_LOCAL_INSTANCE_DIR, root: process.cwd() });
    const response = await action({ ...context, account: key => context.account(key || selected) });
    if (response.ok && selected && event.url.pathname === '/api/session') {
      event.cookies.set('deb_local_preview', selected, { path: '/', httpOnly: true, sameSite: 'strict', secure: event.url.protocol === 'https:', maxAge: 28800 });
    }
    response.headers.set('Cache-Control', 'no-store, private');
    response.headers.set('Vary', 'X-DEB-Preview-Account');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  } catch (error) {
    const failure = error as { status?: number; response?: { message?: string } };
    const status = error instanceof PreviewError ? error.status : failure.status && [400,401,403,404,409,413,429].includes(failure.status) ? failure.status : 503;
    const message = error instanceof PreviewError ? error.message : failure.response?.message || (status === 404 ? 'Data tidak ditemukan atau tidak dapat diakses.' : 'Pembacaan PocketBase gagal. Coba muat ulang.');
    return json({ message }, { status, headers: { 'Cache-Control': 'no-store, private' } });
  }
}
