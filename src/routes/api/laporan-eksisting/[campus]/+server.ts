import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, actorInfo, recordId } from '$lib/server/deb/access';
import { laporanWorkspace, saveLaporan, submitLaporan } from '$lib/server/deb/laporan-eksisting';
import { readJsonBody } from '$lib/server/deb/request-body';
export const GET: RequestHandler = event => secured(event, ['campus', 'admin', 'super_admin'], async ({ actor, pb }) => {
  const campus = recordId(event.params.campus);
  if (!actor.admin && actor.campusId !== campus) fail(403, 'Laporan ini bukan milik kampus Anda.');
  return ok(await laporanWorkspace(pb, campus));
});
export const POST: RequestHandler = event => secured(event, ['campus'], async ({ actor, pb }) => {
  const campus = recordId(event.params.campus);
  if (actor.campusId !== campus) fail(403, 'Laporan ini bukan milik kampus Anda.');
  const body = await readJsonBody(event.request, 65536);
  if (body.action === 'save') await saveLaporan(pb, actorInfo(actor), campus, body);
  else if (body.action === 'submit') await submitLaporan(pb, actorInfo(actor), campus, body);
  else fail(400, 'Tindakan tidak dikenal.');
  return ok(await laporanWorkspace(pb, campus));
});
