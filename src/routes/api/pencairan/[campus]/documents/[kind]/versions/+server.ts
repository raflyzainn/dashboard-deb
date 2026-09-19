import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ANY, actorInfo, recordId, fail } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { addVersion, workspace, forCampus } from '$lib/server/deb/pencairan';
import { KINDS, type Kind } from '$lib/pencairan';

/** Uploads a new version of one document. Admins for every campus; campus accounts only in campus mode for their own campus. */
export const POST: RequestHandler = event => secured(event, ANY, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const kind = event.params.kind as Kind;
  if (!KINDS.includes(kind)) fail(404, 'Dokumen tidak ditemukan.');
  if (!actor.admin) {
    if (actor.campusId !== campusId) fail(403, 'Halaman ini bukan milik kampus Anda.');
    const campus = await pb.collection('campuses').getOne(campusId, { requestKey: null });
    if (campus.fillMode !== 'campus') fail(403, 'Dokumen kampus ini diunggah oleh admin program.');
  }
  const form = await event.request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) fail(400, 'Pilih berkas yang akan diunggah.');
  const note = String(form?.get('note') || '').slice(0, 2000);
  const bytes = await file.arrayBuffer();
  const signed = String(form?.get('signed') || '') === '1';
  // A signed scan is the next version of the same document. Whether it matches the final document is a person's tick on the signing page, never automatic.
  await addVersion(pb, storage(settings), actorInfo(actor), campusId, kind, { name: file.name, bytes, mime: file.type }, { origin: 'upload', note: signed ? (note || 'Pindaian bertanda tangan') : note, byCampus: !actor.admin, signed });
  const ws = await workspace(pb, campusId);
  return ok(actor.admin ? ws : forCampus(ws), 201);
});
