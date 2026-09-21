import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { storage } from '$lib/server/deb/r2';
import { listTemplates, uploadTemplate, activateTemplate } from '$lib/server/deb/generate';

/** Campus specific PKS templates (P1 A): every upload is a new version, compared against the standard template. */
export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  return ok(await listTemplates(pb, campusId));
});

export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const form = await event.request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) fail(400, 'Pilih berkas templat Word yang akan diunggah.');
  const reason = String(form?.get('reason') || '');
  const bytes = await file.arrayBuffer();
  return ok(await uploadTemplate(pb, storage(settings), actorInfo(actor), campusId, { name: file.name, bytes }, reason, event.url.origin), 201);
});

export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const body = await readJsonBody(event.request, 2048);
  if (body.mode === 'standard') return ok(await activateTemplate(pb, actorInfo(actor), campusId, null));
  const templateId = recordId(body.activate, 'Templat');
  return ok(await activateTemplate(pb, actorInfo(actor), campusId, templateId));
});
