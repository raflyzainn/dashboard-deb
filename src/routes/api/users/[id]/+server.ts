import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { writeAudit, pick } from '$lib/server/deb/audit';
import { readJsonBody } from '$lib/server/deb/request-body';
import { requiresPasswordChange, newSessionVersion } from '$lib/server/deb/password-policy';
import { grantable, mapUser, validatePassword } from '$lib/server/deb/users';

const AUDITED = ['name', 'email', 'role', 'active', 'campus', 'passwordChangeRequired'];

/** Changes role, status, name, campus or password of one account. Every change is audited; sessions are revoked when access shrinks. */
export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const id = recordId(event.params.id, 'Akun');
  const body = await readJsonBody(event.request, 8192);
  const target = await pb.collection('users').getOne(id, { requestKey: null });
  if (target.simulated) fail(404, 'Akun tidak ditemukan.');
  const scope = event.url.searchParams.has('campus') ? recordId(event.url.searchParams.get('campus'), 'Kampus') : '';
  if (scope && (target.role !== 'campus' || target.campus !== scope || (body.role !== undefined && body.role !== 'campus') || (body.campus !== undefined && body.campus !== scope))) fail(403, 'Akun tidak termasuk kampus yang sedang dibuka.');
  const self = target.id === actor.record.id;
  const targetIsAdmin = ['admin', 'super_admin'].includes(target.role);
  if (targetIsAdmin && !actor.superAdmin && !self) fail(403, 'Hanya super admin yang dapat mengubah akun admin.');
  if (target.role === 'super_admin' && !self) fail(403, 'Akun super admin tidak dapat diubah dari aplikasi.');
  const patch: Record<string, unknown> = {};
  let revoke = false;
  const actions: string[] = [];
  if (body.email !== undefined) {
    if (typeof body.email !== 'string') fail(400, 'Isi alamat email yang benar.');
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail(400, 'Isi alamat email yang benar.');
    if (email !== target.email) {
      if (target.role !== 'campus' || self) fail(403, 'Email hanya dapat diubah admin untuk akun kampus.');
      if ((await pb.collection('users').listExternalAuths(id)).length) fail(409, 'Email akun Microsoft dikelola melalui penyedia akun, bukan halaman ini.');
      const contacts = await pb.collection('campus_contacts').getList(1, 1, { filter: pb.filter('account = {:id}', { id }), fields: 'id' });
      if (contacts.totalItems) fail(409, 'Akun ini terhubung dengan aktivasi PIC. Ubah email melalui pengelolaan PIC agar tautan aktivasi lama ikut dicabut.');
      const existing = await pb.collection('users').getList(1, 1, { filter: pb.filter('email = {:email} && id != {:id}', { email, id }), fields: 'id' });
      if (existing.totalItems) fail(409, 'Email ini sudah terdaftar.');
      patch.email = email; revoke = true; actions.push('mengubah email');
    }
  }
  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (!name || name.length > 120) fail(400, 'Isi nama akun.');
    if (name !== target.name) { patch.name = name; actions.push('mengubah nama'); }
  }
  if (typeof body.role === 'string' && body.role !== target.role) {
    if (self) fail(400, 'Peran akun sendiri tidak dapat diubah.');
    if (!grantable(actor).includes(body.role)) fail(403, 'Anda tidak dapat memberi peran itu.');
    patch.role = body.role; revoke = true; actions.push('mengubah peran');
    if (body.role !== 'campus') patch.campus = '';
  }
  if (body.campus !== undefined) {
    const campus = body.campus ? recordId(body.campus, 'Kampus') : '';
    const role = String(patch.role || target.role);
    if (role === 'campus' && !campus) fail(400, 'Pilih kampus untuk akun kampus.');
    if (campus !== (target.campus || '')) { patch.campus = campus; revoke = true; actions.push('mengubah kampus'); }
  } else if (String(patch.role || target.role) === 'campus' && !target.campus) fail(400, 'Pilih kampus untuk akun kampus.');
  if (typeof body.active === 'boolean' && body.active !== Boolean(target.active)) {
    if (self) fail(400, 'Status akun sendiri tidak dapat diubah.');
    patch.active = body.active; if (!body.active) revoke = true;
    actions.push(body.active ? 'mengaktifkan akun' : 'menonaktifkan akun');
  }
  if (typeof body.password === 'string') {
    if (self) fail(400, 'Gunakan menu Ganti password untuk akun sendiri.');
    validatePassword(body.password);
    patch.password = body.password; patch.passwordConfirm = body.password; revoke = true;
    actions.push('mengatur ulang kata sandi');
  }
  if (!actions.length) return ok({ user: mapUser(target) });
  if (revoke) patch.sessionVersion = newSessionVersion(typeof body.password === 'string' || requiresPasswordChange(target));
  const updated = await pb.collection('users').update(id, patch, { requestKey: null });
  const auditCampus = updated.role === 'campus' ? updated.campus : target.role === 'campus' ? target.campus : '';
  await writeAudit(pb, {
    actor: actorInfo(actor), action: actions.join(', ') + ' untuk ' + target.email, context: auditCampus ? 'pengguna:' + auditCampus : 'pengguna', campus: auditCampus, collection: 'users', record: id,
    before: { ...pick(target, AUDITED.filter(k => k in patch)), passwordChangeRequired: requiresPasswordChange(target) }, after: { ...pick(updated, AUDITED.filter(k => k in patch)), passwordChangeRequired: requiresPasswordChange(updated) }
  });
  return ok({ user: mapUser(updated) });
});
