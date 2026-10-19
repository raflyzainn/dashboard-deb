import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, actorInfo, recordId } from '$lib/server/deb/access';
import { reportWorkspace, saveReport } from '$lib/server/deb/pelaporan';
import { readFormBody } from '$lib/server/deb/request-body';
import { storage } from '$lib/server/deb/r2';
import type { ReportKind } from '$lib/pelaporan';

export const GET: RequestHandler = event => secured(event, ['campus', 'admin', 'super_admin'], async ({ actor, pb }) => {
  const campus = recordId(event.params.campus);
  if (!actor.admin && actor.campusId !== campus) fail(403, 'Pelaporan ini bukan milik kampus Anda.');
  return ok(await reportWorkspace(pb, campus));
});
export const POST: RequestHandler = event => secured(event, ['campus', 'admin', 'super_admin'], async ({ actor, pb, settings }) => {
  const campus = recordId(event.params.campus);
  if (!actor.admin && actor.campusId !== campus) fail(403, 'Pelaporan ini bukan milik kampus Anda.');
  const form = await readFormBody(event.request, 41 * 1024 * 1024), file = form.get('file');
  await saveReport(pb, storage(settings), actorInfo(actor), campus, {
    kind: String(form.get('kind')) as ReportKind, format: String(form.get('format')) as 'text' | 'file', title: String(form.get('title') || ''), body: String(form.get('body') || ''),
    operationId: String(form.get('operationId') || ''), expectedVersion: Number(form.get('expectedVersion'))
  }, file instanceof File ? { name: file.name, bytes: await file.arrayBuffer() } : undefined);
  return ok(await reportWorkspace(pb, campus), 201);
});
