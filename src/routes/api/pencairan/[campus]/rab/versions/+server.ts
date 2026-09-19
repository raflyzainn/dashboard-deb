import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { createVersion, overview } from '$lib/server/deb/rab';

/** A new draft, empty or copied from a version: body { from?: versionId }. */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const body = await readJsonBody(event.request, 4096);
  const from = body.from ? recordId(body.from, 'Versi') : '';
  const created = await createVersion(pb, actorInfo(actor), campusId, { fromVersionId: from || undefined, source: 'manual' });
  return ok(await overview(pb, campusId, created.id), 201);
});
