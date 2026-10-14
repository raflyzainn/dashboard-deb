import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { monitoringQueue, reviewMonitoring, monitoringSettings } from '$lib/server/deb/monitoring';
import { readJsonBody } from '$lib/server/deb/request-body';
export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb }) => ok(await monitoringQueue(pb)));
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const body = await readJsonBody(event.request, 8192);
  if (body.action === 'review') await reviewMonitoring(pb, actorInfo(actor), recordId(body.campus), body);
  else if (body.action === 'settings') await monitoringSettings(pb, actorInfo(actor), body);
  else fail(400, 'Tindakan tidak dikenal.');
  return ok();
});
