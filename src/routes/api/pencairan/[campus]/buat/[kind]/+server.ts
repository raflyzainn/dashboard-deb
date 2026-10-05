import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { generateDocument, saveGenerated } from '$lib/server/deb/generate';
import { isMergeKind, DOCX_MIME } from '$lib/merge';

/**
 * The live preview as Word bytes: merged values marked, missing values named, the sample verification code in the footer.
 * A final document is never downloaded from here; it is saved with POST so its code and hash exist before anyone prints it.
 */
export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const kind = String(event.params.kind || '');
  if (!isMergeKind(kind)) fail(404, 'Dokumen tidak ditemukan.');
  const result = await generateDocument(pb, storage(settings), campusId, kind, 'preview', event.url.origin, settings);
  const headers = new Headers();
  headers.set('Content-Type', DOCX_MIME);
  headers.set('Content-Length', String(result.bytes.byteLength));
  headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(result.fileName)}`);
  headers.set('Cache-Control', 'no-store, private');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Missing-Count', String(result.missing.length));
  headers.set('X-Deb-Code', result.code);
  return new Response(new Uint8Array(result.bytes).buffer, { status: 200, headers });
});

/** Saves the final document as a new version of its slot with a fresh verification code. Refused while a field is missing or the Termin 2 clause is unchecked. */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const kind = String(event.params.kind || '');
  if (!isMergeKind(kind)) fail(404, 'Dokumen tidak ditemukan.');
  return ok(await saveGenerated(pb, storage(settings), actorInfo(actor), campusId, kind, event.url.origin, settings), 201);
});
