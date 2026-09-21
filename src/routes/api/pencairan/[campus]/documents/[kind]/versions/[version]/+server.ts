import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ANY, ADMIN, actorInfo, recordId, fail } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { storage } from '$lib/server/deb/r2';
import { fileResponse, setFields, workspace } from '$lib/server/deb/pencairan';
import { KINDS, type Kind } from '$lib/pencairan';

/** Streams the stored file of one version (inline for the viewer, attachment with ?download=1). */
export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  if (!actor.admin && actor.campusId !== campusId) fail(403, 'Berkas ini bukan milik kampus Anda.');
  const versionId = recordId(event.params.version, 'Versi');
  return fileResponse(pb, storage(settings), campusId, versionId, event.url.searchParams.get('download') === '1');
});

/** Saves the typed fields of a version, or marks them checked by a second look. */
export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const kind = event.params.kind as Kind;
  if (!KINDS.includes(kind)) fail(404, 'Dokumen tidak ditemukan.');
  const versionId = recordId(event.params.version, 'Versi');
  const body = await readJsonBody(event.request, 32768);
  const fields = body.fields && typeof body.fields === 'object' ? (body.fields as Record<string, unknown>) : null;
  await setFields(pb, { ...actorInfo(actor) }, campusId, kind, versionId, fields, body.check === true);
  return ok(await workspace(pb, campusId));
});
