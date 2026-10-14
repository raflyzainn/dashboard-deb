import type { RequestHandler } from './$types';
import { secured, ok } from '$lib/server/deb/access';
export const GET:RequestHandler=event=>secured(event,['legal','admin','super_admin'],async({pb})=>{
 const rows=await pb.collection('disbursements').getFullList({filter:'term = 1',expand:'campus',fields:'campus,applicationData,expand.campus.name'});
 return ok(rows.filter(row=>['legal','approved','revision'].includes(row.applicationData?.pksReview?.state)).map(row=>({campusId:row.campus,name:row.expand?.campus?.name||'Kampus',state:row.applicationData.pksReview.state})));
});
