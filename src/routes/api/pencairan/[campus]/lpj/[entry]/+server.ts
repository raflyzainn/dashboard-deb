import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { storage } from '$lib/server/deb/r2';
import { entryFile, reviewEntry, lpjSummary } from '$lib/server/deb/lpj';

export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Bukti ini bukan milik kampus Anda.');
  return entryFile(pb, storage(settings), campusId, recordId(event.params.entry, 'Bukti'));
});

export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const body = await readJsonBody(event.request, 8192);
  const status = String(body.status || '');
  if (!['sesuai', 'perlu_revisi', 'menunggu_review'].includes(status)) fail(400, 'Pilih keputusan untuk bukti ini.');
  await reviewEntry(pb, actorInfo(actor), campusId, recordId(event.params.entry, 'Bukti'), status as 'sesuai' | 'perlu_revisi' | 'menunggu_review', String(body.note || '').slice(0, 2000));
  return ok(await lpjSummary(pb, campusId));
});
