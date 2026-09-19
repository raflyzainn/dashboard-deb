import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { writeAudit, pick } from '$lib/server/deb/audit';
import { readJsonBody } from '$lib/server/deb/request-body';
import { security } from '$lib/server/deb/security';
import { grantable, mapUser } from '$lib/server/deb/users';

const AUDITED = ['name', 'role', 'active', 'campus'];

/** Changes role, status, name, campus or password of one account. Every change is audited; sessions are revoked when access shrinks. */
export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const id = recordId(event.params.id, 'Akun');
  const body = await readJsonBody(event.request, 8192);
  const target = await pb.collection('users').getOne(id, { requestKey: null });
  if (target.simulated) fail(404, 'Akun tidak ditemukan.');
  const self = target.id === actor.record.id;
  const targetIsAdmin = ['admin', 'super_admin'].includes(target.role);
  if (targetIsAdmin && !actor.superAdmin && !self) fail(403, 'Hanya super admin yang dapat mengubah akun admin.');
  if (target.role === 'super_admin' && !self) fail(403, 'Akun super admin tidak dapat diubah dari aplikasi.');
  const patch: Record<string, unknown> = {};
  let revoke = false;
  const actions: string[] = [];
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
    if (campus !== (target.campus || '')) { patch.campus = campus; actions.push('mengubah kampus'); }
  } else if (String(patch.role || target.role) === 'campus' && !target.campus) fail(400, 'Pilih kampus untuk akun kampus.');
  if (typeof body.active === 'boolean' && body.active !== Boolean(target.active)) {
    if (self) fail(400, 'Status akun sendiri tidak dapat diubah.');
    patch.active = body.active; if (!body.active) revoke = true;
    actions.push(body.active ? 'mengaktifkan akun' : 'menonaktifkan akun');
  }
  if (typeof body.password === 'string') {
    if (body.password.length < 8 || body.password.length > 128) fail(400, 'Kata sandi minimal 8 karakter.');
    patch.password = body.password; patch.passwordConfirm = body.password; revoke = !self || revoke;
    actions.push('mengatur ulang kata sandi');
  }
  if (!actions.length) return ok({ user: mapUser(target) });
  if (revoke) patch.sessionVersion = security.randomString(50);
  const updated = await pb.collection('users').update(id, patch, { requestKey: null });
  await writeAudit(pb, {
    actor: actorInfo(actor), action: actions.join(', ') + ' untuk ' + target.email, context: 'pengguna', collection: 'users', record: id,
    before: pick(target, AUDITED.filter(k => k in patch)), after: pick(updated, AUDITED.filter(k => k in patch))
  });
  return ok({ user: mapUser(updated) });
});
