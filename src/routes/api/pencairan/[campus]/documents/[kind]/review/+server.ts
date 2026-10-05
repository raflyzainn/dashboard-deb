import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, actorInfo, recordId, fail } from '$lib/server/deb/access';
import { readJsonBody } from '$lib/server/deb/request-body';
import { storage } from '$lib/server/deb/r2';
import { reviewDocument, workspace } from '$lib/server/deb/pencairan';
import { recordBankCheck } from '$lib/server/deb/rekening';
import { KINDS, splitNames, type Kind } from '$lib/pencairan';

/**
 * One click decision on an item: { decision: 'sesuai' | 'perlu_revisi' | 'perlu_konfirmasi', note?, bank?: { result: 'sesuai' | 'berbeda', nameSeen? } }.
 * For the rekening item the bank check is the decision: `bank` records it in the same call (nameSeen defaults to the typed holder name).
 * The RAB item has its own route (rab/keputusan) because Sesuai there approves the managed RAB.
 */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb, settings }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const kind = event.params.kind as Kind;
  if (!KINDS.includes(kind)) fail(404, 'Dokumen tidak ditemukan.');
  const body = await readJsonBody(event.request, 16384);
  const decision = String(body.decision || '');
  if (!['sesuai', 'perlu_revisi', 'perlu_konfirmasi', 'tidak_perlu'].includes(decision)) fail(400, 'Pilih keputusan review.');
  const note = String(body.note || '').slice(0, 4000);
  const bank = body.bank && typeof body.bank === 'object' ? (body.bank as { result?: unknown; nameSeen?: unknown }) : null;
  if (kind === 'rekening' && bank) {
    const current = await workspace(pb, campusId);
    const doc = current.documents.find(d => d.kind === 'rekening')!;
    const fields = (doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[doc.versions.length - 1])?.fields || {};
    const holders = splitNames(fields.namaPemilik as string[]);
    if (!String(fields.nomorRekening || '').trim() || !holders.length) fail(400, 'Ketik nomor rekening dan nama pemilik dari buku rekening dulu.');
    const nameSeen = String(bank.nameSeen || '').trim() || holders.join(', ');
    await recordBankCheck(pb, storage(settings), actorInfo(actor), campusId, { result: String(bank.result || ''), nameSeen });
  }
  await reviewDocument(pb, actorInfo(actor), campusId, kind, decision as 'sesuai' | 'perlu_revisi' | 'perlu_konfirmasi' | 'tidak_perlu', note);
  return ok(await workspace(pb, campusId));
});
