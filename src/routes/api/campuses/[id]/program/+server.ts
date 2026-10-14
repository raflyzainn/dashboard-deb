import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, actorInfo, recordId } from '$lib/server/deb/access';
import { writeAudit } from '$lib/server/deb/audit';
import { readJsonBody } from '$lib/server/deb/request-body';
import { PROGRAM_READINESS_FIELDS } from '$lib/program-readiness';
import { parseContacts, contactError, normalizedPhone, serializeContacts } from '$lib/contacts';

/** Profil DEB fields an admin or the owning campus may write. Contacts use one string per group (see src/lib/contacts.ts). */
const ALLOWED = ['mentor', 'coordinator', 'localHero', 'subholding', 'operatingUnit', 'actionPlanTemplate', 'replicationVillage', 'sourceStatus', 'pfTeam', 'description', 'budget', 'currentClass', 'targetClass',
  'address', 'mapUrl', 'coordinates', 'province', 'provinceId', 'regencyId', 'regency', 'districtId', 'district', 'villageId', 'village', 'postalCode', 'signatoryName', 'signatoryTitle', 'theme', 'programTitle',
  ...PROGRAM_READINESS_FIELDS.map(([key]) => key)];

export const PATCH: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const id = recordId(event.params.id, 'Kampus');
  if (!actor.admin) {
    if (actor.role !== 'campus' || actor.campusId !== id) fail(403, 'Profil ini bukan milik kampus Anda.');
  }
  const campus = await pb.collection('campuses').getOne(id, { requestKey: null });
  const body = await readJsonBody(event.request, 65536);
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED.includes(key)) fail(400, 'Isian program tidak dikenal.');
    if (!actor.admin && key === 'pfTeam') fail(403, 'Tim Pendamping dikelola oleh admin.');
    if (typeof value !== 'string' || value.length > 10000) fail(400, 'Isian program tidak valid.');
    if (['mentor', 'coordinator', 'localHero'].includes(key)) {
      const contacts = parseContacts(value);
      const error = contacts.map(contactError).find(Boolean);
      if (error) fail(400, error);
      values[key] = serializeContacts(contacts.map(contact => ({ ...contact, phone: normalizedPhone(contact.phone) })));
    } else values[key] = value;
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
