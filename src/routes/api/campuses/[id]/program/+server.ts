import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, actorInfo, recordId } from '$lib/server/deb/access';
import { writeAudit } from '$lib/server/deb/audit';
import { readJsonBody } from '$lib/server/deb/request-body';

/** Profil DEB fields an admin may write. Contacts are stored as one string per group (see src/lib/contacts.ts). */
const ALLOWED = ['mentor', 'coordinator', 'localHero', 'subholding', 'operatingUnit', 'actionPlanTemplate', 'replicationVillage', 'sourceStatus', 'pfTeam', 'description', 'budget', 'currentClass', 'targetClass',
  'address', 'mapUrl', 'coordinates', 'province', 'provinceId', 'regencyId', 'regency', 'districtId', 'district', 'villageId', 'village', 'postalCode', 'signatoryName', 'signatoryTitle', 'theme', 'programTitle'];

export const PATCH: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const id = recordId(event.params.id, 'Kampus');
  const campus = await pb.collection('campuses').getOne(id, { requestKey: null });
  if (!actor.admin) {
    if (actor.role !== 'campus' || actor.campusId !== id) fail(403, 'Profil ini bukan milik kampus Anda.');
    if (campus.fillMode !== 'campus') fail(403, 'Profil DEB kampus ini diisi oleh admin program.');
  }
  const body = await readJsonBody(event.request, 65536);
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED.includes(key)) fail(400, 'Isian program tidak dikenal.');
    if (typeof value !== 'string' || value.length > 10000) fail(400, 'Isian program tidak valid.');
    values[key] = value;
  }
  if (!Object.keys(values).length) return ok({ ok: true });
  const before = (campus.program && typeof campus.program === 'object' ? campus.program : {}) as Record<string, unknown>;
  const changed = Object.keys(values).filter(key => (before[key] ?? '') !== values[key]);
  if (!changed.length) return ok({ ok: true });
  const program = { ...before, ...values };
  await pb.collection('campuses').update(id, { program, programRevision: Number(campus.programRevision || 0) + 1 }, { requestKey: null });
  await writeAudit(pb, {
    actor: actorInfo(actor), action: 'mengubah Profil DEB', context: `kampus:${id}/profil`, collection: 'campuses', record: id, campus: id,
    before: Object.fromEntries(changed.map(key => [key, before[key] ?? ''])), after: Object.fromEntries(changed.map(key => [key, values[key]]))
  });
  return ok({ ok: true });
});
