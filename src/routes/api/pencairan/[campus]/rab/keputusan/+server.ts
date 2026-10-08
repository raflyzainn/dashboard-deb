import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { workspace } from '$lib/server/deb/pencairan';
import { decideVersion } from '$lib/server/deb/rab';

/**
 * The two buttons of the RAB item: body { decision: 'sesuai' | 'perlu_revisi' | 'batal', note? }. Batal takes the decision back (item returns to Periksa).
 * Sesuai approves the latest managed RAB version (its RAB 70% total becomes the nominal of Tahap 1) and marks the item Sesuai.
 * Perlu revisi needs a note, withdraws an approval, and marks the item Perlu revisi. Returns the workspace.
 */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const body = await readJsonBody(event.request, 16384);
  const decision = String(body.decision || '');
  if (decision !== 'sesuai' && decision !== 'perlu_revisi' && decision !== 'batal') fail(400, 'Pilih keputusan.');
  const note = String(body.note || '').trim().slice(0, 4000);
  await decideVersion(pb, actorInfo(actor), campusId, decision, note, body.expectedRevision as number | undefined);
  return ok(await workspace(pb, campusId));
});
