import type { RequestHandler } from '@sveltejs/kit';
import { PDFDocument } from 'pdf-lib';
import { secured, ANY, ADMIN, fail, ok, recordId, actorInfo } from '$lib/server/deb/access';
import { readFormBody } from '$lib/server/deb/request-body';
import { storage, extensionOf, mimeFor } from '$lib/server/deb/r2';
import { atomic } from '$lib/server/deb/rest-store';
import { writeAudit } from '$lib/server/deb/audit';

export const GET: RequestHandler = event => secured(event, ANY, async ({actor,pb,settings}) => {
 const campus=recordId(event.params.campus,'Kampus');
 if(!actor.admin&&actor.campusId!==campus)fail(403,'Bukti ini bukan milik kampus Anda.');
 const row=(await pb.collection('disbursements').getList(1,1,{filter:pb.filter('campus = {:c} && term = 1',{c:campus}),requestKey:null})).items[0];
 if(!row||!actor.admin&&!row.paidAt)fail(404,'Pembayaran belum tercatat.');
 const proof=row.properties?.paymentProof;
 if(!proof?.key)fail(404,'Bukti transfer belum diunggah.');
 const file=await storage(settings).get(proof.key);
 return new Response(file.body,{headers:{'Content-Type':proof.mime,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(proof.name)}`,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
});

export const POST: RequestHandler = event => secured(event, ADMIN, async ({actor,pb,settings}) => {
 const campus=recordId(event.params.campus,'Kampus'),body=await readFormBody(event.request,3*1024*1024),file=body.get('file');
 if(!(file instanceof File)||!file.size||file.size>2*1024*1024)fail(400,'Pilih bukti transfer maksimal 2 MB.');
 const ext=extensionOf(file.name);
 if(!['pdf','png','jpg','jpeg'].includes(ext))fail(400,'Bukti transfer harus PDF, PNG, atau JPG.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 try{if(ext==='pdf')await PDFDocument.load(bytes);else{const doc=await PDFDocument.create();if(ext==='png')await doc.embedPng(bytes);else await doc.embedJpg(bytes);}}catch{fail(400,'Berkas bukti transfer tidak valid.');}
 const expected=Number(body.get('expectedRevision'));
 if(!Number.isInteger(expected)||expected<1)fail(409,'Muat ulang data sebelum mengunggah bukti.');
 const proof={key:`payment/${campus}/${crypto.randomUUID()}`,name:file.name.slice(0,200),mime:mimeFor(file.name),size:file.size,uploadedAt:new Date().toISOString(),uploadedByName:actor.record.name||actor.record.email};
 const result=await atomic(pb,async store=>{
  const row=store.records.get('disbursements')?.[0];
  if(!row)fail(404,'Pencairan tidak ditemukan.');
  if(Number(row.data.revision)!==expected)fail(409,'Data berubah. Muat ulang sebelum mengunggah bukti.');
  await storage(settings).put(proof.key,bytes,proof.mime);
  row.set('properties',{...row.data.properties,paymentProof:proof});row.set('revision',expected+1);store.save(row);
  return {proof,revision:expected+1,id:row.id};
 },{disbursements:{filter:pb.filter('campus = {:c} && term = 1',{c:campus})}});
 await writeAudit(pb,{actor:actorInfo(actor),action:'mengunggah bukti transfer Tahap 1',context:`pencairan:${campus}`,collection:'disbursements',record:result.id,campus,after:{berkas:proof.name}});
 return ok(result);
});
