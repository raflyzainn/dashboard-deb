import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, actorInfo, recordId, fail } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { setDocumentFlags, workspace } from '$lib/server/deb/pencairan';
import { KINDS, type Kind } from '$lib/pencairan';

export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const kind = event.params.kind as Kind;
  if (!KINDS.includes(kind)) fail(404, 'Dokumen tidak ditemukan.');
  const body = await readJsonBody(event.request, 4096);
  await setDocumentFlags(pb, actorInfo(actor), campusId, kind, { signedReceived: body.signedReceived as boolean | undefined, originalReceived: body.originalReceived as boolean | undefined });
  return ok(await workspace(pb, campusId));
});
