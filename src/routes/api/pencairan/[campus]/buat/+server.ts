import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, recordId } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { buatInfo } from '$lib/server/deb/generate';

/** Everything the Buat dokumen page needs: readiness, merged values, missing fields per document and the PKS template in use. */
export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  return ok(await buatInfo(pb, storage(settings), campusId, event.url.origin));
});
