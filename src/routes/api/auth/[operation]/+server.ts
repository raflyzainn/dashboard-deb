import { json, type RequestHandler } from '@sveltejs/kit';
import { client, SESSION_COOKIE } from '$lib/server/deb/auth';
import { mapSession } from '$lib/server/deb/mappers';
export const GET: RequestHandler = event => event.params.operation === 'me'
  ? json({ session: event.locals.pb ? mapSession(event.locals.pb.authStore.record!) : null })
  : json({ message: 'Tidak ditemukan.' }, { status: 404 });
export const POST: RequestHandler = async event => {
  const op = event.params.operation || '';
  if (op === 'logout') { event.cookies.delete(SESSION_COOKIE, { path: '/' }); return json({ ok: true }); }
  const body = await event.request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ message: 'Data tidak valid.' }, { status: 400 });
  try {
    if (op === 'change-password') {
      if (!event.locals.pb) return json({ message: 'Silakan masuk menggunakan akun aktif, bukan akun QA.' }, { status: 401 });
      await event.locals.pb.send('/api/deb/account/password', { method: 'POST', body });
      event.cookies.delete(SESSION_COOKIE, { path: '/' });
      return json({ ok: true });
    }
    if (op === 'login') {
      if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length > 128) return json({ message: 'Email atau password tidak sesuai.' }, { status: 400 });
      const pb = client();
      const result = await pb.collection('users').authWithPassword(body.email.trim().toLowerCase(), body.password);
      if (!result.record.active || !result.record.verified || result.record.simulated) return json({ message: 'Email atau password tidak sesuai.' }, { status: 401 });
      event.cookies.set(SESSION_COOKIE, result.token, { path: '/', httpOnly: true, sameSite: 'lax', secure: event.url.protocol === 'https:', maxAge: 28800 });
      return json({ session: mapSession(result.record) });
    }
    if (['request', 'inspect', 'confirm'].includes(op)) return json(await client().send('/api/deb/activation/' + op, { method: 'POST', body }));
    return json({ message: 'Tidak ditemukan.' }, { status: 404 });
  } catch (error) {
    const e = error as { status?: number; response?: { message?: string } };
    const status = op === 'login' && e.status && [400,401,403].includes(e.status) ? 401 : e.status && [400, 401, 403, 409, 429, 503].includes(e.status) ? e.status : 503;
    return json({ message: op === 'login' && status !== 429 ? 'Email atau password tidak sesuai.' : e.response?.message || 'Layanan akun belum tersedia.' }, { status });
  }
};
