import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { workspace, updateDisbursement } from '$lib/server/deb/pencairan';

export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Halaman ini bukan milik kampus Anda.');
  return ok(await workspace(pb, campusId));
});

export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const body = await readJsonBody(event.request, 32768);
  const patch: Parameters<typeof updateDisbursement>[3] = {};
  if (body.stage !== undefined) patch.stage = Number(body.stage);
  if (body.requestedSen !== undefined) patch.requestedSen = Number(body.requestedSen);
  if (body.properties && typeof body.properties === 'object') patch.properties = body.properties as Record<string, unknown>;
  if (typeof body.clauseChecked === 'boolean') patch.clauseChecked = body.clauseChecked;
  if (typeof body.templateMode === 'string') patch.templateMode = body.templateMode;
  await updateDisbursement(pb, actorInfo(actor), campusId, patch);
  return ok(await workspace(pb, campusId));
});
