import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { revokeVersion, overview } from '$lib/server/deb/rab';

/** Back to draft. Withdrawing an approval unlocks Termin 1 diajukan. */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const versionId = recordId(event.params.version, 'Versi');
  await revokeVersion(pb, actorInfo(actor), campusId, versionId);
  return ok(await overview(pb, campusId, versionId));
});
