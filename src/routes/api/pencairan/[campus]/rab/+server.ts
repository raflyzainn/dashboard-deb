import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, recordId } from '$lib/server/deb/access';
import { overview } from '$lib/server/deb/rab';

/** Versions, the selected version with its lines, and the checks against the SK. ?version= selects a version; default is the latest. */
export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Halaman ini bukan milik kampus Anda.');
  const requested = event.url.searchParams.get('version') || '';
  return ok(await overview(pb, campusId, requested ? recordId(requested, 'Versi') : ''));
});
