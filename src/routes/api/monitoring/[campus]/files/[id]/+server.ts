import type { RequestHandler } from '@sveltejs/kit';
import { secured, fail, recordId } from '$lib/server/deb/access';
import { monitoringFile } from '$lib/server/deb/monitoring';
import { storage } from '$lib/server/deb/r2';
export const GET: RequestHandler = event => secured(event, ['campus', 'admin', 'super_admin'], async ({ actor, pb, settings }) => {
  const campus = recordId(event.params.campus);
  if (!actor.admin && actor.campusId !== campus) fail(403, 'Monitoring ini bukan milik kampus Anda.');
  return monitoringFile(pb, storage(settings), campus, recordId(event.params.id));
});
