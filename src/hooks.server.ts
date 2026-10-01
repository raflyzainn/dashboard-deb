import { json, type Handle } from '@sveltejs/kit';
import { sameOrigin, sessionClient } from '$lib/server/deb/auth';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.pb = null;
  if (import.meta.env.MODE === 'pocketbase-local') {
    try { await (await import('$lib/server/deb/server-client')).serverSettings(); }
    catch { return json({ message: 'Konfigurasi PocketBase lokal tidak valid. Koneksi dihentikan.' }, { status: 503 }); }
  }
  if (import.meta.env.MODE === 'mockup' && event.url.pathname.startsWith('/api/')) {
    return json({ message: 'Mode dummy: layanan tersedia di penyimpanan browser, tanpa PocketBase.' }, { status: 404 });
  }
  if (event.url.pathname.startsWith('/api/')) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) && !sameOrigin(event)) return json({ message: 'Request lintas origin ditolak.' }, { status: 403 });
    try { event.locals.pb = await sessionClient(event); } catch { return json({ message: 'Layanan sesi belum tersedia. Coba lagi.' }, { status: 503 }); }
    if (event.locals.pb?.authStore.record?.passwordChangeRequired && !['/api/session', '/api/auth/me', '/api/auth/logout', '/api/auth/change-password'].includes(event.url.pathname)) {
      return json({ message: 'Ganti kata sandi sementara sebelum melanjutkan.', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403, headers: { 'Cache-Control': 'no-store, private' } });
    }
  }
  if (import.meta.env.MODE === 'pocketbase-local' && /^\/api\/pencairan\/[a-z0-9]{15}(?:\/|$)/.test(event.url.pathname)) {
    const { serverClient } = await import('$lib/server/deb/server-client');
    const { pb, settings } = await serverClient();
    if(settings.PB_URL!=='http://127.0.0.1:8097'||settings.DEB_LOCAL_INSTANCE_ID!=='local')return json({message:'Instance lokal tidak cocok.'},{status:503});
    const campus=event.url.pathname.split('/')[3];
    const rows=await pb.collection('disbursements').getList(1,1,{filter:pb.filter('campus = {:c} && term = 1',{c:campus})});
    // Reuse existing real PocketBase services for closing documents and payment.
    const closing=/^\/api\/pencairan\/[a-z0-9]{15}\/(lampiran|pembayaran)(?:\/|$)/.test(event.url.pathname);
    if(rows.items[0]?.submissionStatus&&!closing)return (await import('$lib/server/deb/journey-local')).localJourney(event);
  }
  const response = await resolve(event);
  if (event.url.pathname.startsWith('/api/') || event.url.pathname === '/login') {
    response.headers.set('Cache-Control', 'no-store, private');
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  return response;
};
