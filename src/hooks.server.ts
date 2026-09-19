import { json, type Handle } from '@sveltejs/kit';
import { sameOrigin, sessionClient } from '$lib/server/deb/auth';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.pb = null;
  if (event.url.pathname.startsWith('/api/')) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) && !sameOrigin(event)) return json({ message: 'Request lintas origin ditolak.' }, { status: 403 });
    try { event.locals.pb = await sessionClient(event); } catch { return json({ message: 'Layanan sesi belum tersedia. Coba lagi.' }, { status: 503 }); }
  }
  const response = await resolve(event);
  if (event.url.pathname.startsWith('/api/') || event.url.pathname === '/login') {
    response.headers.set('Cache-Control', 'no-store, private');
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  return response;
};
