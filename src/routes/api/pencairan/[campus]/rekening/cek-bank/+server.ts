import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { loadRekening, recordBankCheck } from '$lib/server/deb/rekening';

/** Records the check with the bank: result (sesuai or berbeda), the name as seen there, and an optional evidence image. */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const form = await event.request.formData().catch(() => null);
  if (!form) fail(400, 'Form tidak valid.');
  const result = String(form.get('result') || '');
  const nameSeen = String(form.get('nameSeen') || '');
  const file = form.get('evidence');
  const evidence = file instanceof File && file.size ? { name: file.name, bytes: await file.arrayBuffer(), mime: file.type } : null;
  await recordBankCheck(pb, storage(settings), actorInfo(actor), campusId, { result, nameSeen, evidence });
  return ok(await loadRekening(pb, campusId));
});
