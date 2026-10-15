import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, actorInfo, recordId } from '$lib/server/deb/access';
import { monitoringWorkspace, saveMonitoring, submitMonitoring } from '$lib/server/deb/monitoring';
import { readJsonBody } from '$lib/server/deb/request-body';
export const GET: RequestHandler = event => secured(event, ['campus', 'admin', 'super_admin'], async ({ actor, pb }) => {
  const campus = recordId(event.params.campus);
  if (!actor.admin && actor.campusId !== campus) fail(403, 'Monitoring ini bukan milik kampus Anda.');
  return ok(await monitoringWorkspace(pb, campus, event.url.searchParams.get('period') || ''));
});
export const POST: RequestHandler = event => secured(event, ['campus'], async ({ actor, pb }) => {
  const campus = recordId(event.params.campus);
  if (actor.campusId !== campus) fail(403, 'Monitoring ini bukan milik kampus Anda.');
  const body = await readJsonBody(event.request, 200000);
  if (body.action === 'save') await saveMonitoring(pb, actorInfo(actor), campus, body);
  else if (body.action === 'submit') await submitMonitoring(pb, actorInfo(actor), campus, body);
  else fail(400, 'Tindakan tidak dikenal.');
  return ok(await monitoringWorkspace(pb, campus, body.period));
});
