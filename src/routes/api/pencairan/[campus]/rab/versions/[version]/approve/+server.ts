import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { approveVersion, overview } from '$lib/server/deb/rab';

/** Approval: total equals the SK and Termin 1 within the limit. Locks Termin 1 diajukan and moves the disbursement to stage 4. */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const versionId = recordId(event.params.version, 'Versi');
  await approveVersion(pb, actorInfo(actor), campusId, versionId);
  return ok(await overview(pb, campusId, versionId));
});
