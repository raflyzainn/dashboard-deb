import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { readiness, previewAttachment, saveAttachment, previewResponse } from '$lib/server/deb/lampiran';

/** Readiness of the lampiran: the six sheet entries with their state, the blockers, the saved attachments and the payment. */
export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Halaman ini bukan milik kampus Anda.');
  return ok(await readiness(pb, campusId));
});

/**
 * { mode: 'preview' } streams the merged PDF with the sample code and a PRATINJAU stamp, nothing stored.
 * { mode: 'simpan' } mints the verification code, stores the PDF, records its hash and returns the refreshed view.
 */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const body = (await event.request.json().catch(() => null)) as { mode?: unknown } | null;
  const mode = body?.mode === 'simpan' ? 'simpan' : body?.mode === 'preview' ? 'preview' : '';
  if (!mode) fail(400, 'Pilih pratinjau atau simpan.');
  const info = actorInfo(actor);
  if (mode === 'preview') {
    const { bytes } = await previewAttachment(pb, storage(settings), settings, campusId, info.name || info.email || 'Sistem');
    return previewResponse(bytes);
  }
  await saveAttachment(pb, storage(settings), settings, info, campusId);
  return ok(await readiness(pb, campusId), 201);
});
