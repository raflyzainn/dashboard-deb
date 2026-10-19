import { payoutTimeline } from '../../payout-progress';
import { KINDS } from '../../pencairan';
import { mintCode, verificationUrl } from './verifikasi';
import { qrPng } from '../../qr';
/** Relational persistence for the shared application workflow. Loads all workflow data and files from PocketBase and server storage. */
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { pksApproved } from '../../pengajuan/pks-review';
import { createEngine } from '../../pengajuan/engine';
import { ensureJourney } from '../../pengajuan/journey';
import { REVISION_SCOPES } from '../../pengajuan/revisions';
import { MERGE_KINDS, TEMPLATE_FILE } from '../../merge';
import { secured, ANY, recordId } from './access';
import { atomic, StoreRecord, type RestStore } from './rest-store';
import { PreviewError } from './preview-error';
import { security } from './security';
import { storage, ALLOWED_EXTENSIONS, extensionOf, mimeFor, MIME } from './r2';
import { readFormBody, readJsonBody } from './request-body';
import { verifyJourneyDownload } from './journey-verification';

const copies=(store:RestStore,name:string)=>store.records.get(name)!.map(r=>structuredClone(r.data));
const clean=(value:any)=>JSON.stringify(value??null);
const uid=()=>security.randomString(15);
const ordered=(rows:any[])=>{const out:any[]=[];const visit=(parent:string)=>{for(const row of rows.filter(l=>(l.parent||'')===parent).sort((a,b)=>a.order-b.order)){out.push({...row,parentId:row.parent||'',flags:row.flags||{}});visit(row.id);}};visit('');return out;};
function fail(status:number,message:string):never {throw new PreviewError(status,message);}

export function journeyRequest(event:RequestEvent,legal=false):Promise<Response>{
 return secured(event,legal?['legal','admin','super_admin']:ANY,async({actor,pb,settings})=>{
  const parts=legal?['api','pencairan',event.params.id!,'pengajuan',event.url.pathname.endsWith('/pdf')?'pks-pdf':'legal']:event.url.pathname.split('/').filter(Boolean),campusId=recordId(parts[2],'Kampus');
  if(!actor.admin&&!(legal&&actor.role==='legal')&&(actor.role!=='campus'||actor.campusId!==campusId))fail(403,'Anda tidak memiliki akses ke kampus ini.');
  const method=event.request.method,write=method!=='GET';
  const route=parts.slice(3).join('/');
  if(event.url.searchParams.get('format')==='pdf')throw new PreviewError(400,'Buka PDF melalui halaman pengajuan.');
  const allowed=method==='GET'?/^(|pengajuan(?:\/(?:file\/(?:kop|rekening|kuasa)|dokumen\/(?:pks|permohonan|kuitansi|invois)|surat-kuasa))?|rab|documents\/[^/]+\/versions\/[^/]+(?:\/file)?|buat(?:\/[^/]+)?)$/.test(route)
   :method==='PATCH'?/^(pengajuan(?:\/(?:checklist|pf))?|rab\/versions\/[^/]+\/allocation|documents\/[^/]+)$/.test(route)
   :method==='POST'?/^(buat\/(?:pks|permohonan|kuitansi|invois)|pengajuan\/(?:upload|submit|edit-requests(?:\/[^/]+)?|dokumen\/(?:pks|permohonan|kuitansi|invois))|rab\/(?:import|items|versions(?:\/[^/]+\/(?:progress|correction))?|keputusan)|documents\/[^/]+\/(?:review|catatan|versions))$/.test(route):false;
  if(!allowed&&!(['pengajuan/pks-pdf','pengajuan/legal'].includes(route)&&['GET','POST'].includes(method)))fail(405,'Operasi tidak tersedia untuk alur pengajuan.');
  if(route.startsWith('documents/')&&method==='PATCH'&&(!actor.admin||parts.length!==5))fail(403,'Hanya PF dapat mencatat penerimaan dokumen.');
  let body:any={};
  if(write&&event.request.body)body=event.request.headers.get('content-type')?.includes('multipart/form-data')?await readFormBody(event.request,41*1024*1024):await readJsonBody(event.request,4*1024*1024);
  if(method==='PATCH'&&route.startsWith('documents/')&&Object.keys(body).some(k=>!['signedReceived','originalReceived','expectedRevision'].includes(k)))fail(400,'Field dokumen tidak valid.');
  if((parts.includes('review')||route==='rab/keputusan')&&!['sesuai','perlu_revisi','perlu_konfirmasi','tidak_perlu','batal'].includes(body.decision))fail(400,'Keputusan tidak valid.');
  const navigationOnly=route==='pengajuan'&&method==='PATCH'&&Object.keys(body).every(k=>['lastSection','expectedRevision'].includes(k));
  const expected=body instanceof FormData?Number(body.get('expectedRevision')):body.expectedRevision;
  if(parts.includes('review')&&body.decision==='tidak_perlu'&&parts[4]!=='surat_kuasa')fail(400,'Hanya surat kuasa dapat ditandai tidak diperlukan.');
  if(body instanceof FormData){
   const file=body.get('file');
   if(route==='pengajuan/upload'){
    const slot=body.get('slot'),types=slot==='kop'?['image/png','image/jpeg']:['application/pdf','image/png','image/jpeg'];
    if(!(file instanceof File)||!file.size||file.size>2*1024*1024)fail(400,'Berkas maksimal 2 MB.');
    if(!types.includes(mimeFor(file.name))||!['pdf','png','jpg','jpeg'].includes(extensionOf(file.name)))fail(400,slot==='kop'?'Kop surat harus berupa PNG atau JPG.':'Pilih PDF, PNG, atau JPG maksimal 2 MB.');
   }else if(!(file instanceof File)||!file.size||file.size>40*1024*1024||!ALLOWED_EXTENSIONS.includes(extensionOf(file.name)))fail(400,'Pilih berkas PDF, gambar, Word, atau Excel maksimal 40 MB.');
  }
  const selected=(await pb.collection('disbursements').getList(1,1,{filter:pb.filter('campus = {:c} && term = 1',{c:campusId})})).items[0];
  if(!selected?.submissionStatus)fail(409,'Pengajuan lama tetap menggunakan alur sebelumnya. Pengajuan ini belum dikonversi ke alur baru.');
  const storeFiles=storage(settings);
  const transaction=async<T>(action:(state:any)=>T,mutate=false):Promise<T>=>{
   return atomic(pb,async store=>{
    const c=copies(store,'campuses')[0],award=copies(store,'sk_awards')[0],payment=copies(store,'disbursements')[0];
    if(!c||!award||!payment)fail(404,'Kampus, SK, atau pengajuan tidak ditemukan.');
    if(mutate&&write&&!navigationOnly&&(!Number.isInteger(expected)||expected!==payment.revision))fail(409,'Data berubah di akun/tab lain. Isian Anda tetap tersedia; muat data terbaru sebelum mencoba lagi.');
    if(mutate&&write&&payment.paidAt)fail(409,'Pengajuan yang sudah dibayar terkunci.');
    c.award=award;
    const rv=copies(store,'rab_versions').sort((a,b)=>a.number-b.number),rl=copies(store,'rab_lines'),dv=copies(store,'document_versions'),reviews=copies(store,'reviews'),notes=copies(store,'notes'),history=copies(store,'audit').filter(a=>a.action==='mengajukan paket pencairan').sort((a,b)=>a.created.localeCompare(b.created)).map(a=>({...a.after,id:a.id,created:a.created,actorName:a.actorName}));
    const r:any={payment,versions:rv.map(v=>({...v,active:payment.rabVersion===v.id,...(v.campusStep?{quantityAllocation:true}:{}),lines:ordered(rl.filter(l=>l.version===v.id))})),
     documents:copies(store,'documents').filter(d=>d.kind!=='laporan').map(d=>{const rs=reviews.filter(v=>v.document===d.id).sort((a,b)=>a.created.localeCompare(b.created));return {...d,currentVersionId:d.currentVersion,generated:MERGE_KINDS.includes(d.kind),versions:dv.filter(v=>v.document===d.id).sort((a,b)=>a.number-b.number).map(v=>({...v,journeyRevision:v.generation?.journeyRevision,fields:v.fields||{},reviews:rs.filter(x=>x.version===v.id)})),reviews:rs,notes:notes.filter(n=>n.document===d.id),decidedByName:rs.at(-1)?.actorName||'',decidedAt:rs.at(-1)?.created||''};}),
     bankCheck:copies(store,'bank_checks')[0]||null,attachments:copies(store,'attachments'),entries:[],templates:[],journey:{...payment.applicationData,status:payment.submissionStatus,revision:payment.applicationData?.revision||1,history}};
    // Preview/imported submissions may lack slots; persist missing ones only with a successful write in this transaction.
    for(const kind of KINDS)if(!r.documents.some((d:any)=>d.kind===kind))r.documents.push({id:uid(),kind,status:kind==='sk'?'perlu_konfirmasi':'belum_ada',currentVersionId:'',generated:MERGE_KINDS.some(generated=>generated===kind),versions:[],reviews:[],notes:[],signedReceived:false,originalReceived:false});
    if(!r.journey.fields){delete r.journey;ensureJourney(c,r);r.journey.status=payment.submissionStatus;r.journey.history=history;r.journey.datePolicy=payment.submissionStatus==='draf'&&!history.length&&!payment.paidAt&&!payment.submittedAt?'chronology':'legacy';r.journey.pf={nomorPksPf:payment.properties?.nomorPksPf||''};}
    const settingsRows=copies(store,'program_settings'),files:Record<string,Blob>={},refs:Record<string,string>={};
    for(const v of dv)if(v.r2Key)refs[v.id]=v.r2Key;
    for(const f of Object.values(r.journey.files||{}) as any[])if(f.key)refs[f.id]=f.key;
    const needsFiles=(method==='GET'&&/^documents\/[^/]+\/versions\/[^/]+$/.test(route))||route.includes('/file')||route.startsWith('buat')||route.startsWith('pengajuan/dokumen')||route==='pengajuan/surat-kuasa'||route==='pengajuan/pks-pdf';
    if(needsFiles)for(const [id,key] of Object.entries(refs)){
     try{const response=await storeFiles.get(key);const mime=dv.find(v=>v.id===id)?.mime||(Object.values(r.journey.files) as any[]).find(f=>f.id===id)?.mime;files[id]=new Blob([await response.arrayBuffer()],{type:mime||'application/octet-stream'});}catch(e){if((e as any).status!==404)throw e;}
    }
    const state:any={data:{campuses:[c]},accounts:[],files,workflow:{campuses:{[campusId]:r},users:[],settings:settingsRows,audit:[]}};
    const originalFiles=new Set(Object.keys(files)),historyCount=history.length;
    const timeline=()=>payoutTimeline({journey:r.journey,paidAt:r.payment.paidAt,hasRab:r.versions.length>0,documents:r.documents});
    const stageBefore=timeline().label;
    const legalBefore=clean(r.journey.pksReview),requestedBefore=r.journey.pfRequestedAt,pfBefore=r.journey.pf?.nomorPksPf;
    let result=action(state);
    const pksDownload=route==='pengajuan/pks-pdf'||/^documents\/pks\/versions\//.test(route);
    const requestedPksVersion=route==='pengajuan/pks-pdf'?r.journey.pksReview?.versionId:parts[6];
    if(!actor.admin&&pksDownload&&r.documents.find((d:any)=>d.kind==='pks')?.versions.find((v:any)=>v.id===requestedPksVersion)?.origin==='generated'&&result instanceof Blob&&result.type==='application/pdf'&&actor.role!=='legal'&&r.journey.datePolicy==='chronology'&&(!pksApproved(r.journey)||requestedPksVersion!==r.journey.pksReview?.versionId)){const pdf=await PDFDocument.load(await result.arrayBuffer());const font=await pdf.embedFont(StandardFonts.HelveticaBold);for(const page of pdf.getPages())page.drawText('DRAF',{x:page.getWidth()*0.15,y:page.getHeight()*0.45,size:72,font,color:rgb(0.6,0.6,0.6),opacity:0.25,rotate:degrees(35)});result=new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'}) as T;}
    if(mutate&&write&&route==='documents/rekening/review'&&body.bank){const b=body.bank;if(!['sesuai','berbeda'].includes(b.result)||typeof b.nameSeen!=='string'||!b.nameSeen.trim()||b.nameSeen.length>200)fail(400,'Isi nama yang terlihat di bank dan hasil pemeriksaan.');r.bankCheck={...r.bankCheck,id:r.bankCheck?.id||uid(),disbursement:payment.id,bankName:r.journey.fields.namaBank,accountNumber:r.journey.fields.nomorRekening,holderNames:[r.journey.fields.namaPemilik],bankResult:b.result,bankNameSeen:b.nameSeen.trim(),checkedBy:actor.record.id,checkedAt:new Date().toISOString(),revision:Number(r.bankCheck?.revision||0)+1};}
    if(!mutate||!write){if(result&&typeof result==='object'&&!(result instanceof Blob))(result as any).serverRevision=payment.revision;return result;}
    // Files are immutable. A failed DB transaction can leave an unreferenced local file, never a partial visible version.
    const keys:Record<string,string>={...refs};
    for(const [id,blob] of Object.entries(state.files) as [string,Blob][]){if(originalFiles.has(id))continue;const key=`journey/${campusId}/${uid()}`;await storeFiles.put(key,new Uint8Array(await blob.arrayBuffer()),blob.type);keys[id]=key;}
    const put=(name:string,data:any)=>{
     let record=store.records.get(name)!.find(r=>r.id===data.id);
     const next={...data};delete next.created;delete next.updated;
     if(record&&Object.keys(next).every(k=>clean(record!.data[k])===clean(next[k])))return;
     if(!record)record=new StoreRecord(name);
     record.id=data.id;Object.assign(record.data,next);store.save(record);
    };
    // Upload versions reference their slot, so create missing parents before versions in the same batch.
    for(const d of r.documents)if(!store.records.get('documents')!.some(record=>record.id===d.id))put('documents',{id:d.id,disbursement:payment.id,kind:d.kind,status:d.status,currentVersion:''});
    if(route==='pengajuan/pf')put('sk_awards',c.award);
    if(r.bankCheck)put('bank_checks',r.bankCheck);
    for(const v of r.versions){
     const existing=rv.find(old=>old.id===v.id),remap=new Map<string,string>();
     if(!existing)for(const line of v.lines)remap.set(line.id,uid());
     for(const line of v.lines)if(remap.size){const old=line.id;line.id=remap.get(old)!;line.parentId=remap.get(line.parentId)||'';}
     const changed=!existing||existing.status!==v.status||Number(existing.campusStep||0)!==Number(v.campusStep||0)||clean(ordered(rl.filter(l=>l.version===v.id)).map(l=>[l.id,l.volume,l.unitPriceSen,l.term1Sen,l.flags]))!==clean(v.lines.map((l:any)=>[l.id,l.volume,l.unitPriceSen,l.term1Sen,l.flags]));
     v.revision=existing?Number(existing.revision||0)+(changed?1:0):1;
     put('rab_versions',{id:v.id,campus:campusId,disbursement:payment.id,number:v.number,status:v.status,totalSen:v.totalSen,term1Sen:v.term1Sen,term2Sen:v.term2Sen,source:v.source,share:v.share,sourceFile:v.sourceFile,note:v.note,approvedAt:v.approvedAt||'',approvedBy:existing?.status==='disetujui'?existing.approvedBy||'':v.active?actor.record.id:'',campusStep:v.campusStep||existing?.campusStep||0,revision:v.revision});
     for(const l of v.lines)put('rab_lines',{id:l.id,version:v.id,parent:l.parentId,level:l.level,order:l.order,code:l.code,title:l.title,calculation:l.calculation||'',volume:l.volume,unit:l.unit,unitPriceSen:l.unitPriceSen,amountSen:l.amountSen,term1Sen:l.term1Sen,term2Sen:l.term2Sen,flags:l.flags||{}});
     if(keys[v.id]&&!existing){const d=r.documents.find((d:any)=>d.kind==='rab_penuh'),file=state.files[v.id];const version={id:uid(),number:d.versions.length+1,document:d.id,r2Key:keys[v.id],originalName:v.sourceFile,mime:file.type||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',size:file.size,origin:'upload',fields:{},generation:{rabVersionId:v.id},uploadedBy:actor.record.id,uploadedByName:actor.record.name};put('document_versions',version);d.currentVersionId=version.id;}
    }
    for(const d of r.documents){
     for(const v of d.versions){const existing=dv.find(old=>old.id===v.id);put('document_versions',{id:v.id,document:d.id,number:v.number,r2Key:keys[v.id]||existing?.r2Key||'',originalName:v.originalName,mime:v.mime,size:v.size,origin:v.origin,fields:v.fields||{},generation:{...existing?.generation,...v.generation,...(!existing&&v.origin==='generated'?{fields:structuredClone(r.journey.fields),pf:structuredClone(r.journey.pf),award:structuredClone(award),rabVersionId:r.versions.at(-1)?.id}:{}),...(v.journeyRevision?{journeyRevision:v.journeyRevision}:{} )},signed:!!v.signed,uploadedBy:existing?.uploadedBy||actor.record.id,uploadedByName:existing?.uploadedByName||actor.record.name,note:v.note||''});}
     put('documents',{id:d.id,disbursement:payment.id,kind:d.kind,status:d.status,currentVersion:d.currentVersionId||'',signedReceived:!!d.signedReceived,originalReceived:!!d.originalReceived,originalReceivedAt:d.originalReceivedAt||'',originalReceivedByName:d.originalReceivedByName||'',signedReceivedAt:d.signedReceivedAt||'',signedReceivedByName:d.signedReceivedByName||''});
     for(const review of d.reviews)if(!reviews.some(old=>old.id===review.id))put('reviews',{id:review.id,document:d.id,version:d.currentVersionId||'',decision:review.decision==='menunggu_review'?'perlu_konfirmasi':review.decision,note:review.note,actor:actor.record.id,actorName:actor.record.name,imported:false});
     for(const note of d.notes)if(!notes.some(old=>old.id===note.id))put('notes',{id:note.id,document:d.id,campus:campusId,body:note.body,internal:!!note.internal,author:actor.record.id,authorName:actor.record.name,authorRole:actor.admin?'admin':'campus'});
    }
    for(const document of r.documents)for(const version of document.versions)if(!dv.some(old=>old.id===version.id)&&version.generation?.pksCode)put('verifications',{id:uid(),code:version.generation.pksCode,campus:campusId,term:1,kind:'pks',documentVersion:version.id,sha256:version.generation.sha256,amountSen:award.amountSen,label:'PDF PKS - status persetujuan mengikuti versi',issuedBy:actor.record.id,issuedByName:actor.record.name});
    for(const file of Object.values(r.journey.files) as any[])file.key=keys[file.id]||file.key;
    const {history:nextHistory,status,...applicationData}=r.journey;
    if(!navigationOnly)payment.revision++;payment.rabVersion=r.versions.find((v:any)=>v.active&&v.status==='disetujui')?.id||'';
    put('disbursements',{id:payment.id,submissionStatus:status,applicationData,revision:payment.revision,requestedSen:payment.requestedSen||0,properties:payment.properties||{},rabVersion:payment.rabVersion});
    if(nextHistory.length>historyCount){const snapshot=nextHistory.at(-1);put('audit',{id:snapshot.id,actor:actor.record.id,actorName:actor.record.name,action:'mengajukan paket pencairan',context:`kampus:${campusId}/pencairan/t1`,campus:campusId,collection:'disbursements',record:payment.id,after:snapshot});}
    else if(!navigationOnly)put('audit',{id:uid(),actor:actor.record.id,actorName:actor.record.name,action:method+' '+route,context:`kampus:${campusId}/pencairan/t1`,campus:campusId,collection:'disbursements',record:payment.id,after:{revision:payment.revision,...(route==='pengajuan/legal'?{pksReview:r.journey.pksReview}:{})}});
    // Notice delivery shares the business commit and its revision; retries cannot lose or duplicate it.
    const notify=(audience:'admin'|'campus'|'legal',eventType:string,title:string,body:string,target:string)=>{
     for(const user of copies(store,'users')){
      if(!user.active||(audience==='legal'?user.role!=='legal':audience==='admin'?!['admin','super_admin'].includes(user.role):user.role!=='campus'||user.campus!==campusId))continue;
      put('notifications',{id:uid(),recipientUser:user.id,campus:campusId,eventType,eventKey:`${eventType}:${payment.id}:${payment.revision}:${user.id}`,sourceId:campusId,title,body,target,simulated:false});
     }
    };
    const stageAfter=timeline().label;
    if(stageAfter!==stageBefore)notify('campus','pencairan_tahap',`Pencairan: ${stageAfter}`,`Proses pencairan berpindah dari ${stageBefore} ke ${stageAfter}. Buka pencairan untuk melihat langkah berikutnya.`, '/campus/pencairan?bagian=ringkasan&butir=ringkasan');
    if(legalBefore!==clean(r.journey.pksReview)&&route==='pengajuan/legal')notify(actor.role==='legal'?'admin':'legal','pencairan_pks_legal','Pemeriksaan Legal PKS',actor.role==='legal'?'Keputusan Legal tersedia untuk diperiksa PF.':'PKS telah diperiksa PF dan menunggu Legal.',actor.role==='legal'?`/admin/pencairan/${campusId}?butir=pks`:'/legal/dashboard');
    if(!actor.admin&&nextHistory.length>historyCount){
     const submission=nextHistory.at(-1),revised=historyCount>0;
     notify('admin','pencairan_pengajuan',`${c.name} mengirim ${revised?'perbaikan':'pengajuan'} pencairan`,`Pengajuan ${submission.number} sudah dikirim oleh kampus dan menunggu pemeriksaan PF. Buka pengajuan untuk memeriksa data dan dokumen.`,`/admin/pencairan/${campusId}?butir=pks`);
    }
    if(!requestedBefore&&r.journey.pfRequestedAt)notify('admin','pencairan_pks_pf','Nomor PKS PF diperlukan','Data PKS kampus sudah disimpan. Lengkapi nomor PKS PF; kampus dapat melanjutkan pengisian secara paralel.',`/admin/pencairan/${campusId}?butir=pks`);
    if(method==='POST'&&route==='pengajuan/edit-requests'&&!actor.admin){const section=body?.section as keyof typeof REVISION_SCOPES;const label=REVISION_SCOPES[section]?.label||'bagian pengajuan';notify('admin','pencairan_edit_access','Permintaan akses revisi',`${actor.record.name} meminta akses revisi ${label}. Alasan: ${String(body?.reason||'').trim()}`,`/admin/pencairan/${campusId}?butir=${section}`);}
    if(route==='pengajuan/pf'&&pfBefore!==r.journey.pf?.nomorPksPf)notify('campus','pencairan_pks_pf_ready','Nomor PKS PF sudah tersedia','Lanjutkan menyiapkan dokumen dari ringkasan pengajuan.','/campus/pencairan?bagian=ringkasan&butir=ringkasan');
    if(result&&typeof result==='object'&&!(result instanceof Blob))(result as any).serverRevision=payment.revision;
    return result;
   },{campuses:{filter:pb.filter('id = {:id}',{id:campusId})},sk_awards:{filter:pb.filter('campus = {:id} && wave = 1',{id:campusId})},disbursements:{filter:pb.filter('id = {:id}',{id:selected.id})},program_settings:{},rab_versions:{filter:pb.filter('campus = {:id}',{id:campusId})},rab_lines:{filter:pb.filter('version.campus = {:id}',{id:campusId})},documents:{filter:pb.filter('disbursement = {:id}',{id:selected.id})},document_versions:{filter:pb.filter('document.disbursement = {:id}',{id:selected.id})},reviews:{filter:pb.filter('document.disbursement = {:id}',{id:selected.id})},notes:{filter:pb.filter('campus = {:id}',{id:campusId})},bank_checks:{filter:pb.filter('disbursement = {:id}',{id:selected.id})},attachments:{filter:pb.filter('disbursement = {:id}',{id:selected.id})},users:{filter:pb.filter('active = true && (role = "admin" || role = "super_admin" || role = "legal" || (role = "campus" && campus = {:id}))',{id:campusId})},notifications:null,verifications:null,audit:{filter:pb.filter('campus = {:id} && action = "mengajukan paket pencairan"',{id:campusId})}});
  };
  const award=(await pb.collection('sk_awards').getList(1,1,{filter:pb.filter('campus = {:id} && wave = 1',{id:campusId})})).items[0];
  if(!award)fail(404,'Nilai SK belum tersedia.');
  const engine=createEngine(async()=>({id:actor.record.id,name:actor.record.name,role:actor.admin?'admin':actor.role,campusId}) as any,{transaction,origin:event.url.origin,amountSen:award.amountSen,id:uid,
   templates:async()=>Object.fromEntries(await Promise.all(MERGE_KINDS.map(async kind=>{const response=await event.fetch('/templat/'+TEMPLATE_FILE[kind]);if(!response.ok)fail(503,'Template belum tersedia.');return [kind,new Uint8Array(await response.arrayBuffer())];}))),
   pdf:async file=>{
    if(file.type!=='application/pdf'||file.size>20*1024*1024)fail(400,'Pilih PDF maksimal 20 MB.');
    const pdf=await PDFDocument.load(await file.arrayBuffer());if(!pdf.getPageCount()||pdf.getPageCount()>40)fail(400,'PDF harus berisi 1-40 halaman.');
    const code=await mintCode(pb,campusId,1,'pks'),font=await pdf.embedFont(StandardFonts.Helvetica),qr=await pdf.embedPng(qrPng(verificationUrl({...settings,DEB_PUBLIC_URL:event.url.origin},code)));
    for(const page of pdf.getPages()){page.drawImage(qr,{x:page.getWidth()-57,y:12,width:36,height:36});page.drawText(code,{x:20,y:16,size:7,font,color:rgb(0.3,0.3,0.3)});}
    const bytes=new Uint8Array(await pdf.save()),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    return {blob:new Blob([bytes],{type:'application/pdf'}),hash,code};
   },
   image:async file=>{try{const pdf=await PDFDocument.create(),bytes=new Uint8Array(await file.arrayBuffer()),image=file.type==='image/png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);return {width:image.width,height:image.height};}catch{return fail(400,'Kop surat bukan PNG/JPG yang valid.');}}
  });
  try{let result=await engine.request('/'+parts.join('/')+event.url.search,method,body);if(method==='GET'&&result instanceof Blob&&!(actor.admin&&selected.applicationData?.datePolicy==='chronology'&&route.startsWith('documents/pks/versions/')))result=await verifyJourneyDownload(pb,settings,campusId,route,event.url.origin,result,{id:actor.record.id,name:actor.record.name});const responseMime=result instanceof Blob&&Object.values(MIME).includes(result.type)?result.type:'application/octet-stream';return result instanceof Blob?new Response(result,{headers:{'Content-Type':responseMime,'Content-Security-Policy':"sandbox; default-src 'none'",...(responseMime==='application/octet-stream'?{'Content-Disposition':'attachment'}:{}),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(result.type==='application/pdf'?{'Content-Disposition':`${event.url.searchParams.get('download')==='1'?'attachment':'inline'}; filename="${parts[3]==='documents'?parts[4]:parts.at(-1)}.pdf"`}:{})}}):json(result,{headers:{'Cache-Control':'no-store'}});}
  catch(e){if(e instanceof PreviewError)throw e;throw new PreviewError(400,e instanceof Error?e.message:'Pengajuan tidak dapat diproses.');}
 });
}
