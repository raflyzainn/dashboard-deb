import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, actorInfo, recordId } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { lpjSummary, addEntry } from '$lib/server/deb/lpj';
import { parseSen } from '$lib/pencairan';

export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Halaman ini bukan milik kampus Anda.');
  return ok(await lpjSummary(pb, campusId));
});

/** One invoice, one scan, one entry. Admins for every campus; campus accounts for their own campus when they fill their own documents. */
export const POST: RequestHandler = event => secured(event, ANY, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin) {
    if (actor.campusId !== campusId) fail(403, 'Halaman ini bukan milik kampus Anda.');
    const campus = await pb.collection('campuses').getOne(campusId, { requestKey: null });
    if (campus.fillMode !== 'campus') fail(403, 'LPJ kampus ini diisi oleh admin program.');
  }
  const form = await event.request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) fail(400, 'Unggah pindaian bukti.');
  const amountSen = parseSen(String(form?.get('amount') || ''));
  if (amountSen === null) fail(400, 'Isi jumlah pada bukti, misalnya 250.000.');
  await addEntry(pb, storage(settings), actorInfo(actor), campusId, {
    date: String(form?.get('date') || ''), reference: String(form?.get('reference') || ''), payee: String(form?.get('payee') || ''), amountSen, memo: String(form?.get('memo') || ''), rabLine: String(form?.get('rabLine') || '')
  }, { name: file.name, bytes: await file.arrayBuffer(), mime: file.type });
  return ok(await lpjSummary(pb, campusId), 201);
});
