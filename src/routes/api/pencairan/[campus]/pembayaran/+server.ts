import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN, actorInfo, recordId, fail } from '$lib/server/deb/access';
import { recordPayment, workspace } from '$lib/server/deb/pencairan';

/** Records the Tahap 1 transfer: { paidAt: 'YYYY-MM-DD', paidSen: number, paidRef: string, paidNote?: string }. Returns the refreshed workspace. */
export const PATCH: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const body = await event.request.json().catch(() => null) as { paidAt?: unknown; paidSen?: unknown; paidRef?: unknown; paidNote?: unknown } | null;
  if (!body) fail(400, 'Data pembayaran tidak terbaca.');
  if(import.meta.env.MODE==='pocketbase-local'){
    const row=(await pb.collection('disbursements').getList(1,1,{filter:pb.filter('campus = {:c} && term = 1',{c:campusId}),requestKey:null})).items[0];
    if(row?.submissionStatus&&!row.paidAt){
      const view=await workspace(pb,campusId);
      if(view.readiness.state!=='siap_dibayar')fail(400,'Lengkapi penerimaan dokumen bertanda tangan/asli dan simpan lampiran sebelum mencatat pembayaran.');
    }
  }
  await recordPayment(pb, actorInfo(actor), campusId, { paidAt: String(body.paidAt || ''), paidSen: Number(body.paidSen), paidRef: String(body.paidRef || ''), paidNote: typeof body.paidNote === 'string' ? body.paidNote : '' });
  return ok(await workspace(pb, campusId));
});
