import type { RequestHandler } from '@sveltejs/kit';
import { secured, fail, ANY, recordId } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { evidenceResponse } from '$lib/server/deb/rekening';

/** Streams the evidence image of the bank check (inline). */
export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Berkas ini bukan milik kampus Anda.');
  return evidenceResponse(pb, storage(settings), campusId);
});
