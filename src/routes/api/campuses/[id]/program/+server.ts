import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, actorInfo, recordId } from '$lib/server/deb/access';
import { auditData } from '$lib/server/deb/audit';
import { atomic, StoreRecord } from '$lib/server/deb/rest-store';
import { readJsonBody } from '$lib/server/deb/request-body';
import { PROGRAM_READINESS_FIELDS } from '$lib/program-readiness';
import { validProgramThematic, THEMATIC_DESCRIPTION_LIMIT } from '$lib/program-thematics';
import { parseContacts, contactError, normalizedPhone, serializeContacts, preserveHeroMetadata } from '$lib/contacts';

/** Profil DEB fields an admin or the owning campus may write. Contacts use one string per group (see src/lib/contacts.ts). */
const ALLOWED = ['mentor', 'coordinator', 'localHero', 'subholding', 'operatingUnit', 'actionPlanTemplate', 'replicationVillage', 'sourceStatus', 'pfTeam', 'description', 'budget', 'currentClass', 'targetClass',
  'address', 'mapUrl', 'coordinates', 'province', 'provinceId', 'regencyId', 'regency', 'districtId', 'district', 'villageId', 'village', 'postalCode', 'signatoryName', 'signatoryTitle', 'theme', 'programTitle',
  'thematic', 'thematicDescription', ...PROGRAM_READINESS_FIELDS.map(([key]) => key)];

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
    if (key === 'thematic' && !validProgramThematic(value.trim())) fail(400, 'Pilih tematik DEB yang tersedia.');
    if (key === 'thematicDescription' && value.length > THEMATIC_DESCRIPTION_LIMIT) fail(400, 'Penjelasan tematik maksimal 1.000 karakter.');
    if (['mentor', 'coordinator', 'localHero'].includes(key)) {
      const contacts = parseContacts(value);
      const error = contacts.map(contactError).find(Boolean);
      if (error) fail(400, error);
      values[key] = serializeContacts(contacts.map(contact => ({ ...contact, phone: normalizedPhone(contact.phone) })));
    } else values[key] = key === 'thematic' || key === 'thematicDescription' ? value.trim() : value;
  }
  if (!Object.keys(values).length) return ok({ ok: true });
  const before = (campus.program && typeof campus.program === 'object' ? campus.program : {}) as Record<string, unknown>;
  const changed = Object.keys(values).filter(key => (before[key] ?? '') !== values[key]);
  if (!changed.length) return ok({ ok: true });
  await atomic(pb, store => {
    const record = store.records.get('campuses')![0];
    if (!record) fail(404, 'Kampus tidak ditemukan.');
    const current = record.data.program || {};
    if (changed.some(key => (current[key] ?? '') !== (before[key] ?? ''))) fail(409, 'Bagian profil ini berubah di tab lain. Muat ulang sebelum menyimpan.');
    const program = { ...current, ...values };
    if ('localHero' in values && Array.isArray(current.localHeroes)) {
      try { program.localHeroes = preserveHeroMetadata(current.localHeroes, parseContacts(values.localHero)); }
      catch (error) { fail(409, (error as Error).message); }
    }
    record.set('program', program); record.set('programRevision', record.getInt('programRevision') + 1); store.save(record);
    const entry = new StoreRecord('audit');
    Object.assign(entry.data, auditData({ actor: actorInfo(actor), action: 'mengubah Profil DEB', context: `kampus:${id}/profil`, collection: 'campuses', record: id, campus: id,
      before: Object.fromEntries(changed.map(key => [key, before[key] ?? ''])), after: Object.fromEntries(changed.map(key => [key, values[key]])) }));
    store.save(entry);
  }, { campuses: { filter: pb.filter('id = {:id}', { id }) }, audit: null });
  return ok({ ok: true });
});
