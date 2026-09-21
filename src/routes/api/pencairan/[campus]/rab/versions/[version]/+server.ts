import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { saveLines, validateLines, overview } from '$lib/server/deb/rab';

/** Saves the whole tree of a draft: body { lines: [{ key, parentKey, title, calculation, volume, unit, unitPriceSen, amountSen, term1Sen, flags? }] }. */
export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const versionId = recordId(event.params.version, 'Versi');
  const body = await readJsonBody(event.request, 4 * 1024 * 1024);
  await saveLines(pb, actorInfo(actor), campusId, versionId, validateLines(body.lines));
  return ok(await overview(pb, campusId, versionId));
});
