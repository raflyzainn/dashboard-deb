import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { serverSettings, serverClient, serverAuthMode, lastSignInFailure } from '$lib/server/deb/server-client';

/**
 * Operations check, no sign in needed and no secrets returned: whether the backend address is configured, whether it answers,
 * and whether the server can sign in to it. The hint says what to fix on the hosting side when a step fails.
 */
export const GET: RequestHandler = async () => {
  const settings = await serverSettings();
  const url = settings.PB_URL || '';
  const auth = await serverAuthMode();
  const report: Record<string, unknown> = { configured: Boolean(url) && auth.mode !== 'none', scheme: url ? new URL(url).protocol.replace(':', '') : '', auth: auth.mode, tokenExpiresAt: auth.expiresAt ? new Date(auth.expiresAt).toISOString().slice(0, 10) : '', reachable: false, signedIn: false, hint: '' };
  if (!report.configured) { report.hint = 'PB_URL dan PB_SUPER_TOKEN harus diisi pada variabel lingkungan hosting, lalu deploy ulang.'; return json(report, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  try {
    const response = await fetch(url.replace(/\/+$/, '') + '/api/health', { redirect: 'manual' });
    report.reachable = response.status === 200;
    if (response.status >= 300 && response.status < 400) report.hint = 'Alamat backend mengalihkan (pakai https dan alamat persis tanpa pengalihan).';
    else if (response.status !== 200) report.hint = `Backend menjawab ${response.status}.`;
  } catch (error) {
    report.hint = 'Backend tidak terjangkau dari server: periksa alamat PB_URL.';
    report.error = (error as Error)?.message?.slice(0, 120);
  }
  if (report.reachable) {
    // The same request shape the SDK uses, with a throwaway identity: tells apart "cannot send a POST" from "wrong credentials".
    try {
      const probe = await fetch(url.replace(/\/+$/, '') + '/api/collections/_superusers/auth-with-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: 'health-check@example.invalid', password: 'health-check' }), redirect: 'manual' });
      report.postStatus = probe.status;
    } catch (error) {
      report.postError = String((error as Error)?.message || error).slice(0, 160);
    }
    // With a token the sign in is local; a small read proves the token is accepted.
    try { const { pb } = await serverClient(); await pb.collection('program_settings').getList(1, 1, { fields: 'id', requestKey: null }); report.signedIn = true; }
    catch (error) {
      report.hint = (error as Error)?.message || 'Masuk ke backend gagal: periksa email dan kata sandi superuser.';
      if (lastSignInFailure) report.signInFailure = lastSignInFailure.detail;
    }
  }
  const ok = report.reachable && report.signedIn;
  return json(report, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
};
