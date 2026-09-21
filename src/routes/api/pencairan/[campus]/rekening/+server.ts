import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { loadRekening, saveRekening, checkRekeningFields, compareNames, overrideNames } from '$lib/server/deb/rekening';

/** Step 5 of one campus: typed bank values, the name comparison and the bank check. The account number is shown in full only here. */
export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Halaman ini bukan milik kampus Anda.');
  return ok(await loadRekening(pb, campusId));
});

/** One of: fields (save), check (second look on one document), compare (names again), overrideReason (skip a mismatch, empty string removes it). */
export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const body = await readJsonBody(event.request, 16384);
  const who = actorInfo(actor);
  let handled = false;
  if (body.fields && typeof body.fields === 'object' && !Array.isArray(body.fields)) { await saveRekening(pb, who, campusId, body.fields as Record<string, unknown>); handled = true; }
  if (body.check === 'rekening' || body.check === 'surat_kuasa') { await checkRekeningFields(pb, who, campusId, body.check); handled = true; }
  if (body.compare === true) { await compareNames(pb, who, campusId); handled = true; }
  if (typeof body.overrideReason === 'string') { await overrideNames(pb, who, campusId, body.overrideReason); handled = true; }
  if (!handled) fail(400, 'Tidak ada perubahan yang dikirim.');
  return ok(await loadRekening(pb, campusId));
});
