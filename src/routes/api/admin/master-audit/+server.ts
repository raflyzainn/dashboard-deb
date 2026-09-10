import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from '$lib/server/deb/http';
import { PreviewError } from '$lib/server/deb/preview-error';
import { auditSearchFilter } from '$lib/server/deb/audit-search';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb=await context.account(event.request.headers.get('x-deb-preview-account'));
  if(pb.authStore.record?.role!=='admin')throw new PreviewError(403,'Hanya Admin dapat membaca riwayat master.');
  const query=(event.url.searchParams.get('q')||'').trim();
  const page=Number(event.url.searchParams.get('page')||1);
  if(query.length>200||!Number.isSafeInteger(page)||page<1)throw new PreviewError(400,'Pencarian atau nomor halaman tidak valid.');
  const result=await pb.collection('master_audit').getList(page,20,{filter:auditSearchFilter(pb,query),sort:'-created,-id'});
  return json({page:result.page,totalItems:result.totalItems,totalPages:result.totalPages,
    items:result.items.map(r=>({id:r.id,actor:r.actor,entity:r.entity,entityId:r.entityId,operation:r.operation,before:r.before,after:r.after,created:r.created}))});
});
