import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { serverSettings, serverClient } from '$lib/server/deb/server-client';

/**
 * Operations check, no sign in needed and no secrets returned: whether the backend address is configured, whether it answers,
 * and whether the server can sign in to it. The hint says what to fix on the hosting side when a step fails.
 */
export const GET: RequestHandler = async () => {
  const settings = await serverSettings();
  const url = settings.PB_URL || '';
  const report: Record<string, unknown> = { configured: Boolean(url && settings.PB_SUPERUSER_EMAIL && settings.PB_SUPERUSER_PASSWORD), scheme: url ? new URL(url).protocol.replace(':', '') : '', reachable: false, signedIn: false, hint: '' };
  if (!report.configured) { report.hint = 'PB_URL, PB_SUPERUSER_EMAIL, dan PB_SUPERUSER_PASSWORD harus diisi pada variabel lingkungan hosting, lalu deploy ulang.'; return json(report, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
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
    try { await serverClient(); report.signedIn = true; }
    catch (error) { report.hint = (error as Error)?.message || 'Masuk ke backend gagal: periksa email dan kata sandi superuser.'; }
  }
  const ok = report.reachable && report.signedIn;
  return json(report, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
};
