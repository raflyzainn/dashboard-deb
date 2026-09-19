import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { grantable, mapUser } from '$lib/server/deb/users';
import { writeAudit } from '$lib/server/deb/audit';
import { readJsonBody } from '$lib/server/deb/request-body';
import { security } from '$lib/server/deb/security';

const FIELDS = 'id,name,email,role,active,campus,created,lastLoginAt';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb }) => {
  const [users, campuses] = await Promise.all([
    pb.collection('users').getFullList({ sort: '-created', fields: FIELDS, filter: 'simulated = false', requestKey: null }),
    pb.collection('campuses').getFullList({ sort: 'name', fields: 'id,name,initials', requestKey: null })
  ]);
  return ok({ users: users.map(mapUser), campuses: campuses.map(c => ({ id: c.id, name: c.name, initials: c.initials })) });
});

/** Creates an account with a password. Microsoft accounts create themselves on first sign in. */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const body = await readJsonBody(event.request, 8192);
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = String(body.role || 'baru');
  const campus = body.campus ? recordId(body.campus, 'Kampus') : '';
  if (!name || name.length > 120) fail(400, 'Isi nama akun.');
  if (!EMAIL.test(email) || email.length > 254) fail(400, 'Isi alamat email yang benar.');
  if (password.length < 8 || password.length > 128) fail(400, 'Kata sandi minimal 8 karakter.');
  if (!grantable(actor).includes(role)) fail(403, 'Anda tidak dapat memberi peran itu.');
  if (role === 'campus' && !campus) fail(400, 'Pilih kampus untuk akun kampus.');
  const existing = await pb.collection('users').getList(1, 1, { filter: pb.filter('email = {:email}', { email }), fields: 'id', requestKey: null });
  if (existing.totalItems) fail(409, 'Email ini sudah terdaftar.');
  const created = await pb.collection('users').create({
    name, email, password, passwordConfirm: password, role, campus: role === 'campus' ? campus : '',
    active: true, verified: true, emailVisibility: false, simulated: false, sessionVersion: security.randomString(50)
  }, { requestKey: null });
  await writeAudit(pb, { actor: actorInfo(actor), action: 'membuat akun ' + email, context: 'pengguna', collection: 'users', record: created.id, after: { name, email, role, campus: campus || undefined } });
  return ok({ user: mapUser(created) }, 201);
});
