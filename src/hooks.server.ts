import { json, type Handle } from '@sveltejs/kit';
import { sameOrigin, sessionClient } from '$lib/server/deb/auth';
import { secured, ANY } from '$lib/server/deb/access';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.pb = null;
  if (import.meta.env.MODE === 'pocketbase-local') {
    try { await (await import('$lib/server/deb/server-client')).serverSettings(); }
    catch { return json({ message: 'Konfigurasi PocketBase lokal tidak valid. Koneksi dihentikan.' }, { status: 503 }); }
  }
  if (event.url.pathname.startsWith('/api/')) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) && !sameOrigin(event)) return json({ message: 'Request lintas origin ditolak.' }, { status: 403 });
    try { event.locals.pb = await sessionClient(event); } catch { return json({ message: 'Layanan sesi belum tersedia. Coba lagi.' }, { status: 503 }); }
    if (event.locals.pb?.authStore.record?.passwordChangeRequired && !['/api/session', '/api/auth/me', '/api/auth/logout', '/api/auth/change-password'].includes(event.url.pathname)) {
      return json({ message: 'Ganti kata sandi sementara sebelum melanjutkan.', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403, headers: { 'Cache-Control': 'no-store, private' } });
    }
  }
  let response: Response;
  if (/^\/api\/pencairan\/[a-z0-9]{15}(?:\/|$)/.test(event.url.pathname)) {
    response = await secured(event, ANY, async ({ pb }) => {
    const campus=event.url.pathname.split('/')[3];
    const rows=await pb.collection('disbursements').getList(1,1,{filter:pb.filter('campus = {:c} && term = 1',{c:campus})});
    // Reuse existing real PocketBase services for closing documents and payment.
    const closing=/^\/api\/pencairan\/[a-z0-9]{15}\/(lampiran|pembayaran)(?:\/|$)/.test(event.url.pathname);
    if(rows.items[0]?.submissionStatus&&!closing)return (await import('$lib/server/deb/journey')).journeyRequest(event);
    return resolve(event);
    });
  }
  else response = await resolve(event);
  if (event.url.pathname.startsWith('/api/') || event.url.pathname === '/login') {
    response.headers.set('Cache-Control', 'no-store, private');
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  return response;
};
