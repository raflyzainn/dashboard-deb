import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, actorInfo, recordId } from '$lib/server/deb/access';
import { uploadLaporan } from '$lib/server/deb/laporan-eksisting';
import { readFormBody } from '$lib/server/deb/request-body';
import { storage } from '$lib/server/deb/r2';
export const POST: RequestHandler = event => secured(event, ['campus'], async ({ actor, pb, settings }) => {
  const campus = recordId(event.params.campus);
  if (actor.campusId !== campus) fail(403, 'Laporan ini bukan milik kampus Anda.');
  const form = await readFormBody(event.request, 41 * 1024 * 1024), file = form.get('file');
  if (!(file instanceof File)) fail(400, 'Pilih berkas.');
  const id = await uploadLaporan(pb, storage(settings), actorInfo(actor), campus, String(form.get('kind') || ''), String(form.get('operationId') || ''), file as File);
  return ok({ id }, 201);
});
