import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, actorInfo } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { readSettings, writeSettings } from '$lib/server/deb/generate';

/** Program settings per program year: Pertamina Foundation signatory, agreement period, report deadline. Used by every campus of that year. */
export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb }) => ok({ rows: await readSettings(pb) }));

export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const body = await readJsonBody(event.request, 8192);
  const { programYear, ...values } = body;
  await writeSettings(pb, actorInfo(actor), String(programYear || ''), values);
  return ok({ rows: await readSettings(pb) });
});
