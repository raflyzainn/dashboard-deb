import type { RequestHandler } from '@sveltejs/kit';
import { secured, fail, ANY, recordId } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { attachmentResponse } from '$lib/server/deb/lampiran';

/** Downloads one built attachment PDF by its number. */
export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Berkas ini bukan milik kampus Anda.');
  const number = Number(event.params.number);
  if (!Number.isInteger(number) || number < 1 || number > 9999) fail(404, 'Lampiran tidak ditemukan.');
  return attachmentResponse(pb, storage(settings), campusId, number);
});
