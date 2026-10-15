import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, actorInfo, recordId } from '$lib/server/deb/access';
import { changeReport, reportFile, reportWorkspace } from '$lib/server/deb/pelaporan';
import { readJsonBody } from '$lib/server/deb/request-body';
import { storage } from '$lib/server/deb/r2';

export const GET: RequestHandler = event => secured(event, ['campus', 'admin', 'super_admin'], async ({ actor, pb, settings }) => {
  const campus = recordId(event.params.campus);
  if (!actor.admin && actor.campusId !== campus) fail(403, 'Pelaporan ini bukan milik kampus Anda.');
  return reportFile(pb, storage(settings), campus, recordId(event.params.version));
});
export const PATCH: RequestHandler = event => secured(event, ['campus', 'admin', 'super_admin'], async ({ actor, pb }) => {
  const campus = recordId(event.params.campus);
  if (!actor.admin && actor.campusId !== campus) fail(403, 'Pelaporan ini bukan milik kampus Anda.');
  const body = await readJsonBody(event.request, 8192);
  if (!['submit', 'sesuai', 'perlu_revisi'].includes(body.action)) fail(400, 'Pilih tindakan yang valid.');
  if (body.action !== 'submit' && !actor.admin) fail(403, 'Keputusan pemeriksaan hanya untuk admin.');
  await changeReport(pb, actorInfo(actor), campus, recordId(event.params.version), body.action, String(body.note || ''));
  return ok(await reportWorkspace(pb, campus));
});
