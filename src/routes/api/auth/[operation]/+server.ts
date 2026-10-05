import { json, type RequestHandler } from '@sveltejs/kit';
import { client, SESSION_COOKIE } from '$lib/server/deb/auth';
import { mapSession } from '$lib/server/deb/mappers';
import { serverClient } from '$lib/server/deb/server-client';
import { executeAccount, rateLimit, revokeSessions } from '$lib/server/deb/backend';
import { drainEmails, inspectEmailToken } from '$lib/server/deb/mail';
import { security } from '$lib/server/deb/security';
import { PreviewError } from '$lib/server/deb/preview-error';
import { readJsonBody } from '$lib/server/deb/request-body';
export const GET: RequestHandler = event => event.params.operation === 'me'
  ? json({ session: event.locals.pb ? mapSession(event.locals.pb.authStore.record!) : null })
  : json({ message: 'Tidak ditemukan.' }, { status: 404 });
export const POST: RequestHandler = async event => {
  const op = event.params.operation || '';
  try {
    if (op === 'logout') {
      if (event.locals.pb) {
        const backend = await serverClient();
        await revokeSessions(backend.pb, event.locals.pb.authStore.record!);
      }
      event.cookies.delete(SESSION_COOKIE, { path: '/' });
      return json({ ok: true });
    }
    const body=await readJsonBody(event.request,16384);
    const backend = await serverClient(), ip = event.getClientAddress();
    if ((backend.settings.DEB_INVITATION_KEY || '').length < 32) throw { status: 503 };
    if (op === 'change-password') {
      if (!event.locals.pb) return json({ message: 'Silakan masuk menggunakan akun aktif, bukan akun QA.' }, { status: 401 });
      const actor = event.locals.pb.authStore.record!;
      await rateLimit(backend.pb, backend.settings, [{ key: 'password-change:' + actor.id, max: 10, duration: 900000 }]);
      let passwordValid = false;
      if (typeof body.currentPassword === 'string' && body.currentPassword.length <= 128) {
        try { const result = await client().collection('users').authWithPassword(actor.email, body.currentPassword); passwordValid = result.record.id === actor.id; } catch { /* Invalid password */ }
      }
      await executeAccount(backend.pb, backend.settings, actor, 'change-password', body, ip, {}, passwordValid);
      event.cookies.delete(SESSION_COOKIE, { path: '/' });
      return json({ ok: true });
    }
    if (op === 'login') {
      if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length > 128) return json({ message: 'Email atau password tidak sesuai.' }, { status: 400 });
      await rateLimit(backend.pb, backend.settings, [{ key: 'login-ip:' + ip, max: 60, duration: 900000 }, { key: 'login:' + ip + ':' + body.email.trim().toLowerCase(), max: 10, duration: 900000 }]);
      const pb = client();
      const result = await pb.collection('users').authWithPassword(body.email.trim().toLowerCase(), body.password);
      if (!result.record.active || !result.record.verified || result.record.simulated) return json({ message: 'Email atau password tidak sesuai.' }, { status: 401 });
      const cookie = security.createJWT({ kind: 'session', token: result.token, version: result.record.sessionVersion || '' }, backend.settings.DEB_INVITATION_KEY, 28800);
      event.cookies.set(SESSION_COOKIE, cookie, { path: '/', httpOnly: true, sameSite: 'lax', secure: event.url.protocol === 'https:', maxAge: 28800 });
      return json({ session: mapSession(result.record) });
    }
    if (['request', 'inspect', 'confirm'].includes(op)) {
      if(op==='request') {
        const mail=await backend.pb.settings.getAll();
        if(!mail.smtp?.enabled||!mail.smtp.host||!mail.meta?.senderAddress)throw new PreviewError(503,'Atur pengiriman email di Mail settings PocketBase terlebih dahulu.');
      }
      if(op==='inspect'||op==='confirm') {
        await rateLimit(backend.pb,backend.settings,[{key:'email-proof:'+ip,max:60,duration:900000}]);
        // A verified application ticket may be inspected again without touching PocketBase mail tokens.
        try { security.parseJWT(body.token,backend.settings.DEB_INVITATION_KEY); }
        catch { const verified=await inspectEmailToken(backend.pb,backend.settings,String(body.token||''),ip); if(op==='inspect')return json(verified); body.token=verified.token; }
      }
      const result = await executeAccount(backend.pb, backend.settings, null, op, body, ip);
      if (op === 'request') await drainEmails(backend.pb, backend.settings, String(body.email || '').trim().toLowerCase());
      return json(result);
    }
    return json({ message: 'Tidak ditemukan.' }, { status: 404 });
  } catch (error) {
    const e = error as { status?: number; message?: string; response?: { message?: string } };
    const status = op === 'login' && e.status && [400,401,403].includes(e.status) ? 401 : e.status && [400, 401, 403, 409, 413, 429, 503].includes(e.status) ? e.status : 503;
    return json({ message: op === 'login' && status !== 429 ? 'Email atau password tidak sesuai.' : (error instanceof Error && 'status' in error ? e.message : undefined) || 'Layanan akun belum tersedia.' }, { status });
  }
};
