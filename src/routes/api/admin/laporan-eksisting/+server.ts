import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { laporanQueue, reviewLaporan } from '$lib/server/deb/laporan-eksisting';
import { readJsonBody } from '$lib/server/deb/request-body';
export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb }) => ok(await laporanQueue(pb)));
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const body = await readJsonBody(event.request, 8192);
  if (body.action === 'review') await reviewLaporan(pb, actorInfo(actor), recordId(body.campus), body);
  else fail(400, 'Tindakan tidak dikenal.');
  return ok();
});
