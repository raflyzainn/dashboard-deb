import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ANY, actorInfo, recordId, fail } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { addNote, workspace, forCampus } from '$lib/server/deb/pencairan';
import { KINDS, type Kind } from '$lib/pencairan';

/** Posts one message on the item's conversation: { body, internal? }. Staff for any campus; a campus account only for its own campus and never internal. */
export const POST: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const kind = event.params.kind as Kind;
  if (!KINDS.includes(kind)) fail(404, 'Dokumen tidak ditemukan.');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Halaman ini bukan milik kampus Anda.');
  const body = await readJsonBody(event.request, 16384);
  await addNote(pb, { ...actorInfo(actor), role: actor.role }, campusId, kind, String(body.body || ''), actor.admin && body.internal === true);
  const ws = await workspace(pb, campusId);
  return ok(actor.admin ? ws : forCampus(ws), 201);
});
