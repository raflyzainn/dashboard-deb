import type { RequestEvent } from '@sveltejs/kit';
import { client, SESSION_COOKIE } from './auth';
import { serverClient } from './server-client';
import { security } from './security';
import { PreviewError } from './preview-error';
import { writeAudit } from './audit';

const FLOW_COOKIE = 'deb_oauth';
export const PROVIDER = 'microsoft';
const SESSION_SECONDS = 28800;

/** Microsoft only returns to registered addresses: the production origin, or http://localhost with any port in development. */
export function callbackUrl(event: RequestEvent) {
  return event.url.origin + '/api/auth/oauth/microsoft/callback';
}

function sessionKey(settings: Record<string, string>) {
  const key = settings.DEB_INVITATION_KEY || '';
  if (key.length < 32) throw new PreviewError(503, 'Konfigurasi sesi belum tersedia.');
  return key;
}

export async function startMicrosoft(event: RequestEvent) {
  const { settings } = await serverClient();
  const pb = client();
  const methods = await pb.collection('users').listAuthMethods();
  const provider = methods.oauth2?.providers?.find(p => p.name === PROVIDER);
  if (!methods.oauth2?.enabled || !provider) throw new PreviewError(503, 'Masuk dengan Microsoft belum tersedia.');
  const redirect = callbackUrl(event);
  const flow = security.createJWT({ kind: 'oauth', state: provider.state, verifier: provider.codeVerifier, redirect }, sessionKey(settings), 600);
  event.cookies.set(FLOW_COOKIE, flow, { path: '/api/auth/oauth', httpOnly: true, sameSite: 'lax', secure: event.url.protocol === 'https:', maxAge: 600 });
  const url = new URL(provider.authURL + encodeURIComponent(redirect));
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

/** Exchanges the code, creates the account on a first sign in, sets the role, and returns the page to open. */
export async function finishMicrosoft(event: RequestEvent) {
  const code = event.url.searchParams.get('code') || '';
  const state = event.url.searchParams.get('state') || '';
  const denied = event.url.searchParams.get('error');
  const flowCookie = event.cookies.get(FLOW_COOKIE) || '';
  event.cookies.delete(FLOW_COOKIE, { path: '/api/auth/oauth' });
  if (denied) throw new PreviewError(400, 'Masuk dengan Microsoft dibatalkan.');
  const backend = await serverClient();
  const settings = backend.settings;
  let flow: Record<string, unknown>;
  try { flow = security.parseJWT(flowCookie, sessionKey(settings)); }
  catch { throw new PreviewError(400, 'Sesi masuk sudah kedaluwarsa. Coba lagi.'); }
  if (flow.kind !== 'oauth' || !code || !state || flow.state !== state || typeof flow.verifier !== 'string' || typeof flow.redirect !== 'string') {
    throw new PreviewError(400, 'Permintaan masuk tidak valid. Coba lagi.');
  }
  // The exchange runs with superuser rights so a first sign in may create the account although self registration is closed.
  const superToken = backend.pb.authStore.token;
  const superRecord = backend.pb.authStore.record;
  let result;
  try {
    result = await backend.pb.collection('users').authWithOAuth2Code(PROVIDER, code, flow.verifier, flow.redirect, { role: 'baru', active: true, verified: true, emailVisibility: false, simulated: false });
  } catch (error) {
    console.warn('OAuth exchange failed', (error as { status?: number }).status);
    throw new PreviewError(400, 'Microsoft tidak menerima permintaan masuk ini. Coba lagi.');
  } finally {
    backend.pb.authStore.save(superToken, superRecord);
  }
  const record = result.record;
  const isNew = Boolean(result.meta?.isNew);
  const superEmail = (settings.DEB_SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const email = String(record.email || '').trim().toLowerCase();
  const patch: Record<string, unknown> = { lastLoginAt: new Date().toISOString() };
  if (email && email === superEmail && record.role !== 'super_admin') patch.role = 'super_admin';
  if (isNew) { patch.role = patch.role || 'baru'; patch.active = true; patch.verified = true; }
  if (!isNew && !record.active) throw new PreviewError(403, 'Akun ini dinonaktifkan. Hubungi admin program.');
  const updated = await backend.pb.collection('users').update(record.id, patch, { requestKey: null });
  const actor = { id: updated.id, name: updated.name || updated.email, email: updated.email };
  await writeAudit(backend.pb, { actor, action: isNew ? 'membuat akun baru lewat Microsoft' : 'masuk lewat Microsoft', context: 'pengguna', collection: 'users', record: updated.id, campus: updated.role === 'campus' ? updated.campus : '', after: isNew ? { role: updated.role, email: updated.email } : null });
  const cookie = security.createJWT({ kind: 'session', method: 'oauth', token: result.token, version: updated.sessionVersion || '' }, sessionKey(settings), SESSION_SECONDS);
  event.cookies.delete('deb_local_preview', { path: '/' });
  event.cookies.set(SESSION_COOKIE, cookie, { path: '/', httpOnly: true, sameSite: 'lax', secure: event.url.protocol === 'https:', maxAge: SESSION_SECONDS });
  return updated.role === 'baru' ? '/menunggu' : '/' + (updated.role === 'super_admin' ? 'admin' : updated.role) + '/dashboard';
}
