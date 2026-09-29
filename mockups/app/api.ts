import { transaction } from '../../src/lib/data/demo/store';
import { samplePdf } from '../../src/lib/data/demo/fixtures/pdf';
import { KINDS, KIND_LABEL, assess, isRabKind, parseSen } from '../../src/lib/pencairan';
import { arrange, type LineInput } from '../../src/lib/rab';
import { BUDGET, LIMIT, sampleItems, readExcel } from '../rab/model';
import type { AppSession } from '../../src/lib/types';
const now=()=>new Date().toISOString(),id=()=>crypto.randomUUID();
const clone=<T,>(v:T):T=>structuredClone(v);
const rabKinds=['rab_penuh','rab','rab_tahap2'];
export function itemLines(items:ReturnType<typeof sampleItems>) {
 const input:LineInput[]=[], parents=new Map<string,string>();
 const base=(key:string,parentKey:string,title:string):LineInput=>({key,parentKey,title,calculation:'',volume:0,unit:'',unitPriceSen:0,amountSen:0,term1Sen:0,term2Sen:0});
 items.forEach((v,i)=>{let parent='';for(const title of [v.group,v.activity,v.section]){const path=parent+'|'+title;if(!parents.has(path)){const key='h'+parents.size;parents.set(path,key);input.push(base(key,parent,title));}parent=parents.get(path)!;}input.push({...base('i'+i,parent,v.title),volume:v.volume,unit:v.unit,unitPriceSen:v.priceSen,amountSen:v.amountSen,term1Sen:v.term1Sen||0,term2Sen:v.amountSen-(v.term1Sen||0)});});
 return lines(input);
}
function lines(input:LineInput[]) {return arrange(input).map(n=>({id:n.key,parentId:n.parentKey,level:n.level,order:n.order,code:n.code,title:n.title,calculation:n.calculation,volume:n.volume,unit:n.unit,unitPriceSen:n.unitPriceSen,amountSen:n.sumSen,term1Sen:n.sumTerm1Sen,term2Sen:n.sumTerm2Sen,flags:n.flags||{}}));}
function totals(v:any){const roots=v.lines.filter((l:any)=>l.level===1);v.totalSen=roots.reduce((s:number,l:any)=>s+l.amountSen,0);v.term1Sen=roots.reduce((s:number,l:any)=>s+l.term1Sen,0);v.term2Sen=roots.reduce((s:number,l:any)=>s+l.term2Sen,0);return v;}
function version(number:number,items:any[]=sampleItems()) {return totals({id:id(),number,status:'draf',source:'import',share:'gabungan',sourceFile:'RAB_CONTOH.xlsx',note:'Data dummy',approvedByName:'',approvedAt:'',created:now(),updated:now(),active:false,lines:itemLines(items)});}
function check(v:any){if(!v||!v.lines.length)throw Error('Isi RAB terlebih dahulu.');if(v.totalSen!==BUDGET||v.term1Sen>LIMIT||v.term1Sen<=0||v.term1Sen+v.term2Sen!==v.totalSen||v.lines.some((l:any)=>l.term1Sen<0||l.term2Sen<0))throw Error('Total RAB harus sesuai SK dan alokasi Tahap 1 maksimal 70%.');}
function documentVersion(kind:string,name:string,number=1){return {id:id(),number,originalName:name,size:1500,mime:'application/pdf',origin:'upload',uploadedByName:'Kampus Dummy',created:now(),note:'Dokumen simulasi',signed:false,scan:null,fields:{amountSen:LIMIT,name:'Rektor Dummy',bankName:'Bank Contoh',accountName:'Kampus Dummy',accountNumber:'0000000000'},fieldsByName:'Admin Dummy',fieldsAt:now(),fieldsCheckedByName:'Admin Dummy',fieldsCheckedAt:now(),fieldsSamePerson:false,reviews:[]};}
function init(c:any,index:number){
 const scenario=index%5;
 const versions=scenario===0?[]:[version(1)];if(versions.length){versions[0].status=scenario===1?'menunggu':scenario===2||scenario===4?'disetujui':'draf';versions[0].active=versions[0].status==='disetujui';}
 const documents=KINDS.map(kind=>{const v=documentVersion(kind,`${kind}_DUMMY.pdf`);return {id:id(),kind,status:isRabKind(kind)?scenario===0?'belum_ada':scenario===1?'menunggu_review':scenario===3?'perlu_revisi':'sesuai':'sesuai',signedReceived:scenario===4,signedReceivedAt:'',signedReceivedByName:'',originalReceived:scenario===4,originalReceivedAt:'',originalReceivedByName:'',currentVersionId:isRabKind(kind)?'':v.id,versions:isRabKind(kind)?[]:[v],generated:['pks','permohonan','kuitansi','invois'].includes(kind),decidedByName:'Admin Dummy',decidedAt:now(),notes:[],reviews:scenario===3&&isRabKind(kind)?[{id:id(),decision:'perlu_revisi',note:'Periksa kembali alokasi kegiatan Tahap 1.',actorName:'Admin Dummy',created:now(),imported:false}]:[]};});
 return {versions,documents,payment:{id:id(),stage:4,requestedSen:versions[0]?.term1Sen||0,paidSen:scenario===4?LIMIT:0,paidAt:scenario===4?'2026-09-20':'',paidRef:scenario===4?'DUMMY-TRANSFER':'',paidByName:scenario===4?'Admin Dummy':'',properties:{},clauseChecked:true,templateMode:'standard'},attachments:[],entries:[],templates:[],note:'',bankCheck:{id:id(),bankResult:'sesuai',bankNameSeen:c.name,checkedAt:now(),evidence:true}};
}
function card(c:any,r:any,actor:AppSession){const v=r.versions.at(-1),statuses=Object.fromEntries(r.documents.map((d:any)=>[d.kind,d.status]));const ready=assess(statuses,{suratKuasaRequired:false,redChecks:0,paidAt:r.payment.paidAt,originalsAll:r.documents.filter((d:any)=>d.generated).every((d:any)=>d.originalReceived),lampiranCount:r.attachments.length});return {campus:{...c,code:c.acronym||c.initials,signatoryName:'Rektor Dummy',team:c.program?.pfTeam||'Tim Dummy',contacts:{mentor:c.program?.mentor||'Mentor Dummy',coordinator:c.program?.coordinator||'SoBI Dummy',localHero:c.program?.localHero||'Pendamping Dummy'}},summary:{skNumber:'SK-DUMMY/2026/'+c.id,amountSen:BUDGET,limitSen:LIMIT,requestedSen:r.payment.requestedSen,term2Sen:BUDGET-r.payment.requestedSen,term1Percent:70,term2Percent:30,programTitle:c.program?.description||'Program Dummy',programYear:c.programYear,skFile:true},disbursement:r.payment,documents:r.documents.map((d:any)=>({...d,notes:d.notes.filter((n:any)=>actor.role==='admin'||!n.internal)})),bankCheck:r.bankCheck,rab:v?{id:v.id,number:v.number,status:v.status,totalSen:v.totalSen,term1Sen:v.term1Sen}:null,lampiranCount:r.attachments.length,checks:[{kind:'rab',level:v&&v.totalSen===BUDGET&&v.term1Sen<=LIMIT?'ok':'info',text:v?'Alokasi RAB dummy tersimpan.':'Kampus belum mengunggah RAB.'}],readiness:ready};}
function overview(c:any,r:any,versionId=''){return {campus:{...c,code:c.acronym||c.initials},summary:{skNumber:'SK-DUMMY/2026/'+c.id,amountSen:BUDGET,limitSen:LIMIT},disbursement:{...r.payment,rabVersionId:r.versions.find((v:any)=>v.active)?.id||''},versions:r.versions.map(({lines,...v}:any)=>v),version:r.versions.find((v:any)=>v.id===versionId)||r.versions.at(-1)||null,checks:[]};}
export function createApi(actor:()=>Promise<AppSession>){
 async function request(url:string,method='GET',body:any={}):Promise<any>{
  const user=await actor(),u=new URL(url,location.origin),parts=u.pathname.split('/').filter(Boolean),write=method!=='GET';
  if(!u.pathname.startsWith('/api/'))return (await fetch(url)).blob();
  let imported:any=null,file:File|null=null;
  if(body instanceof FormData){file=body.get('file') as File|null;if(parts.includes('rab')&&parts.includes('import')&&file)imported=await readExcel(file);}
  return transaction(s=>{
   const state=s as any;state.fullDummy??={campuses:{},users:[],audit:[],settings:['kedua','ketiga'].map(programYear=>({id:programYear,programYear,pfSignatoryName:'Penandatangan Dummy',pfSignatoryTitle:'Direktur Contoh',agreementStart:'2026-01-01',agreementEnd:'2026-12-31',reportDeadline:'2027-01-31'}))};const db=state.fullDummy;
   s.data.campuses.forEach((c,i)=>{db.campuses[c.id]??=init(c,i);});
   if(!db.users.length)db.users=[...s.accounts.map(a=>({...a,role:'campus',created:now(),lastLoginAt:'',passwordChangeRequired:false})),...['admin-1','admin-2'].map((id,i)=>({id,name:`Admin PF ${i+1} Dummy`,email:`admin${i+1}@example.test`,role:'admin',active:true,campusId:'',created:now(),lastLoginAt:'',passwordChangeRequired:false}))];
   if(write)db.audit.unshift({id:id(),context:u.pathname,action:method,actorName:user.name,created:now(),changes:[],summary:'Perubahan data dummy'});
   const admin=()=>{if(user.role!=='admin')throw Error('Hanya admin dapat melakukan tindakan ini.');};
   if(parts[1]==='audit'){admin();return {items:db.audit,total:db.audit.length};}
   if(parts[1]==='users'){
    admin();const uid=parts[2];
    if(write){const input={...body,campusId:body.campus??body.campusId??''};if(uid){const row=db.users.find((v:any)=>v.id===uid);if(!row)throw Error('Pengguna tidak ditemukan.');Object.assign(row,input);const a=s.accounts.find(a=>a.id===uid);if(a)Object.assign(a,{name:row.name,email:row.email,active:row.active,campusId:row.campusId||a.campusId});return {user:row};}
     if(!input.name||!input.email)throw Error('Nama dan email wajib diisi.');if(db.users.some((v:any)=>v.email===input.email))throw Error('Email sudah digunakan.');const row={...input,id:id(),created:now(),lastLoginAt:'',active:true,passwordChangeRequired:false};db.users.push(row);if(row.role==='campus')s.accounts.push({id:row.id,slot:2,campusId:row.campusId,campus:s.data.campuses.find(c=>c.id===row.campusId)?.name||'',name:row.name,email:row.email,revision:1,status:'Aktif',active:true});return {user:row};
    }
    return {users:db.users.filter((v:any)=>!u.searchParams.get('campus')||v.campusId===u.searchParams.get('campus')),campuses:s.data.campuses.map(c=>({...c,contacts:{mentor:c.program?.mentor,coordinator:c.program?.coordinator,localHero:c.program?.localHero}}))};
   }
   if(parts[1]==='pengaturan-program'){admin();if(write)Object.assign(db.settings.find((r:any)=>r.programYear===body.programYear),body);return {rows:db.settings};}
   if(parts[1]!=='pencairan')throw Error('Endpoint dummy belum dikenali: '+u.pathname);
   if(parts[2]==='sk')return samplePdf('SK DUMMY SELURUH KAMPUS',1);
   if(!parts[2]||parts[2]==='periksa'){
    const campuses=s.data.campuses.filter(c=>user.role==='admin'||c.id===user.campusId);
    if(parts[2]==='periksa')return {rows:campuses.flatMap(c=>{const r=db.campuses[c.id];return r.documents.filter((d:any)=>['menunggu_review','perlu_konfirmasi'].includes(d.status)).map((d:any)=>({campus:{...c,code:c.acronym||c.initials,team:c.program?.pfTeam||'Tim Dummy'},kind:d.kind,status:d.status,reason:'baru',arrivedAt:now(),arrival:{number:r.versions.at(-1)?.number||1,originalName:r.versions.at(-1)?.sourceFile||'Dokumen_Dummy.pdf',uploadedByName:'Kampus Dummy',created:now(),note:''},request:null}));})};
    return {rows:campuses.map(c=>{const r=db.campuses[c.id],v=card(c,r,user);return {campus:v.campus,amountSen:BUDGET,limitSen:LIMIT,stage:r.payment.stage,requestedSen:r.payment.requestedSen,paidSen:r.payment.paidSen,paidAt:r.payment.paidAt,lampiranCount:r.attachments.length,statuses:Object.fromEntries(r.documents.map((d:any)=>[d.kind,d.status])),assessment:v.readiness,checkedAt:now(),bukti:{r100:r.versions.length?'ada':'',r70:r.versions.length?'ada':'',r30:r.versions.length?'ada':''}};})};
   }
   const c=s.data.campuses.find(c=>c.id===parts[2]);if(!c)throw Error('Kampus tidak ditemukan.');if(user.role!=='admin'&&user.campusId!==c.id)throw Error('Akun ini tidak boleh mengakses kampus lain.');const r=db.campuses[c.id];
   if(parts[3]==='rab'){
    let v=r.versions.find((v:any)=>v.id===parts[5])||r.versions.at(-1);
    if(parts[4]==='import'&&imported){const next=version((v?.number||0)+1,imported);next.sourceFile=file!.name;
     if(body.get('mode')==='preview')return {preview:{rows:imported.length,kind:'penuh',totalSen:next.totalSen,term1Sen:next.term1Sen,term2Sen:next.term2Sen,problems:[],problemCount:0,fileName:file!.name}};
     if(next.totalSen!==BUDGET)throw Error('Total RAB harus sama dengan nilai SK.');next.quantityAllocation=true;next.lines.forEach((l:any)=>{l.term1Sen=0;l.term2Sen=0;});totals(next);r.versions.push(next);rabKinds.forEach(k=>{r.documents.find((d:any)=>d.kind===k).status='belum_ada';});s.files[next.id]=file!;return overview(c,r);
    }
    if(parts[4]==='versions'&&write){
     if(!parts[5]){const source=r.versions.find((v:any)=>v.id===body.from);const next=source?{...clone(source),id:id(),number:r.versions.length+1,status:'draf',active:false,created:now(),updated:now()}:version(r.versions.length+1,[]);r.versions.push(next);return overview(c,r);}
     if(!v)throw Error('Versi tidak ditemukan.');
     if(parts[6]==='allocation'){
      if(v.status!=='draf')throw Error('Versi terkunci.');
      const next=clone(v);next.quantityAllocation=true;
      for(const l of next.lines.filter((l:any)=>l.level===4)){
       const q=body.quantities?.[l.id];
       if(q===null||q===undefined){l.flags={...l.flags,term1Volume:null,term2Volume:null};l.term1Sen=0;l.term2Sen=0;continue;}
       if(typeof q!=='number'||!Number.isFinite(q)||q<0||q>l.volume||Math.abs(q*10000-Math.round(q*10000))>0.00001)throw Error('Jumlah alokasi harus antara 0 dan volume item, maksimal 4 desimal.');
       l.flags={...l.flags,term1Volume:q,term2Volume:Math.round((l.volume-q)*10000)/10000};l.term1Sen=Math.round(q*l.unitPriceSen);l.term2Sen=l.amountSen-l.term1Sen;
      }
      for(const l of [...next.lines].reverse().filter((l:any)=>l.level<4)){const children=next.lines.filter((c:any)=>c.parentId===l.id);l.term1Sen=children.reduce((s:number,c:any)=>s+c.term1Sen,0);l.term2Sen=children.reduce((s:number,c:any)=>s+c.term2Sen,0);}
      totals(next);next.updated=now();Object.assign(v,next);return overview(c,r,v.id);
     }
     if(method==='PATCH'){if(v.status!=='draf')throw Error('Versi terkunci.');v.lines=lines(body.lines);totals(v);v.updated=now();}
     if(parts[6]==='submit'){if(v.quantityAllocation&&v.lines.some((l:any)=>l.level===4&&typeof l.flags?.term1Volume!=='number'))throw Error('Bagikan jumlah setiap item terlebih dahulu.');check(v);v.status='menunggu';r.documents.filter((d:any)=>isRabKind(d.kind)).forEach((d:any)=>d.status='menunggu_review');}
     if(parts[6]==='approve'){admin();check(v);v.status='disetujui';v.active=true;v.approvedAt=now();v.approvedByName=user.name;r.payment.requestedSen=v.term1Sen;r.documents.filter((d:any)=>isRabKind(d.kind)).forEach((d:any)=>d.status='sesuai');}
     if(parts[6]==='revoke'){admin();v.status='draf';v.active=false;r.documents.filter((d:any)=>isRabKind(d.kind)).forEach((d:any)=>d.status='perlu_revisi');}
     return overview(c,r,v.id);
    }
    if(parts[4]!=='keputusan')return overview(c,r,u.searchParams.get('version')||'');
   }
   if(parts[3]==='documents'||parts[3]==='rab'&&parts[4]==='keputusan'){
    const kind=parts[3]==='rab'?'rab':parts[4],d=r.documents.find((d:any)=>d.kind===kind);if(!d)throw Error('Dokumen tidak ditemukan.');
    if(parts.includes('file')||(method==='GET'&&parts[5]==='versions'&&parts[6]))return s.files[parts[6]]||samplePdf(`${c.name} ${KIND_LABEL[kind as keyof typeof KIND_LABEL]} DUMMY`,1);
    if(parts[5]==='review'||parts[4]==='keputusan'){
     admin();const v=r.versions.at(-1);if(isRabKind(kind)&&(!v||v.status==='draf'))throw Error('Kampus belum mengajukan RAB.');
     const decision=body.decision==='batal'?'menunggu_review':body.decision;
     if(decision==='perlu_revisi'&&!body.note?.trim())throw Error('Catatan revisi wajib diisi.');if(isRabKind(kind)&&decision==='sesuai')check(v);
     d.status=decision;d.decidedByName=user.name;d.decidedAt=now();d.reviews.push({id:id(),decision,note:body.note||'',actorName:user.name,created:now(),imported:false});
     if(isRabKind(kind)){if(decision==='perlu_revisi'){v.status='draf';v.note=body.note;}else if(r.documents.filter((d:any)=>isRabKind(d.kind)).every((d:any)=>d.status==='sesuai')){v.status='disetujui';v.active=true;r.payment.requestedSen=v.term1Sen;}}
    }else if(parts[5]==='catatan'){if(!body.body?.trim())throw Error('Isi catatan.');d.notes.push({id:id(),body:body.body,internal:user.role==='admin'&&!!body.internal,authorName:user.name,authorRole:user.role,created:now()});}
    else if(parts[5]==='versions'&&method==='POST'&&file){const v=documentVersion(kind,file.name,d.versions.length+1);v.mime=file.type||'application/pdf';v.size=file.size;v.signed=['true','1'].includes(String(body.get('signed')));d.versions.push(v);d.currentVersionId=v.id;d.status='menunggu_review';s.files[v.id]=file;}
    else if(method==='PATCH'){admin();if(parts[6])Object.assign(d.versions.find((v:any)=>v.id===parts[6]).fields,body.fields);else Object.assign(d,body);}
    return card(c,r,user);
   }
   if(parts[3]==='buat'){
    admin();if(parts[4]){if(write){const d=r.documents.find((d:any)=>d.kind===parts[4]),v=documentVersion(parts[4],`${parts[4]}_DUMMY.pdf`,d.versions.length+1);v.origin='generated';d.versions.push(v);d.currentVersionId=v.id;return {version:v,code:'DUMMY-'+v.id.slice(0,8)};}return samplePdf(c.name+' DOKUMEN DUMMY',1);}
    return {readiness:[],clauseRequired:false,data:r.payment.properties,missing:Object.fromEntries(['pks','permohonan','kuitansi','invois'].map(k=>[k,[]])),templates:{mode:r.payment.templateMode,active:r.templates.at(-1)||null,versions:r.templates},documents:r.documents.filter((d:any)=>d.generated).map((d:any)=>({kind:d.kind,versions:d.versions.filter((v:any)=>v.origin==='generated').map((v:any)=>({id:v.id,number:v.number,code:'DUMMY-'+v.id.slice(0,8)}))})),settingsYear:c.programYear,settingsReady:true};
   }
   if(parts[3]==='pks-templat'){admin();if(file)r.templates.push({id:id(),version:r.templates.length+1,originalName:file.name,reason:body.get('reason')||'Simulasi',active:true,uploadedByName:user.name,created:now(),differences:{changed:0,added:0,pasal:[],missingTags:[]}});r.payment.templateMode=body.mode||'custom';return {ok:true};}
   if(parts[3]==='lampiran'){
    const view=card(c,r,user);if(write){admin();if(!view.readiness.lengkap)throw Error('Selesaikan pemeriksaan seluruh dokumen terlebih dahulu.');if(body.mode==='preview')return samplePdf(c.name+' LAMPIRAN DUMMY',1);r.attachments.unshift({id:id(),number:r.attachments.length+1,size:1500,pages:1,sha256:'dummy',verification:'DUMMY-'+id(),created:now(),createdByName:user.name});}
    if(parts[4])return samplePdf(c.name+' LAMPIRAN DUMMY',1);
    return {campus:view.campus,summary:view.summary,payment:r.payment,entries:['rab','permohonan','kuitansi','invois','rekening','pks'].map((kind,i)=>({entry:i+1,title:KIND_LABEL[kind as keyof typeof KIND_LABEL],items:[{entry:i+1,kind,label:kind,status:r.documents.find((d:any)=>d.kind===kind).status,version:null,skipped:false,ready:view.readiness.lengkap,state:'Data dummy',blocker:view.readiness.lengkap?'':'Dokumen belum lengkap'}]})),readiness:{lengkap:view.readiness.lengkap,missing:view.readiness.missing},blockers:view.readiness.lengkap?[]:['Selesaikan pemeriksaan dokumen.'],ready:view.readiness.lengkap,reason:'',attachments:r.attachments};
   }
   if(parts[3]==='lpj'){
    if(write){if(method==='PATCH'){admin();Object.assign(r.entries.find((e:any)=>e.id===parts[4]),body);}else{if(!r.payment.paidAt)throw Error('Dana Tahap 1 belum dibayar.');const fields=body instanceof FormData?Object.fromEntries(body):body;const amountSen=fields.amountSen!==undefined?Number(fields.amountSen):parseSen(String(fields.amount||''));if(!Number.isSafeInteger(amountSen)||amountSen<=0)throw Error('Isi nominal positif.');const e={...fields,id:id(),amountSen,status:'menunggu_review',created:now(),createdByName:user.name,originalName:file?.name||'',rabCode:'',rabTitle:'',rabLineId:fields.rabLineId||fields.rabLine||''};r.entries.push(e);if(file)s.files[e.id]=file;}}
    if(parts.at(-1)==='file')return s.files[parts[4]]||samplePdf(c.name+' LPJ DUMMY',1);
    const spent=r.entries.reduce((n:number,e:any)=>n+e.amountSen,0);return {campus:{...c,code:c.acronym||c.initials},amountSen:BUDGET,receivedSen:r.payment.paidSen,reportedSen:spent,remainingSen:r.payment.paidSen-spent,paid:!!r.payment.paidAt,entries:r.entries,rabNodes:r.versions.at(-1)?.lines||[],hasApprovedRab:r.versions.some((v:any)=>v.active)};
   }
   if(write){admin();if(parts[3]==='pembayaran'&&!card(c,r,user).readiness.lengkap)throw Error('Dokumen belum lengkap.');Object.assign(r.payment,{...body,properties:{...r.payment.properties,...body.properties}});}
   return card(c,r,user);
  },true).then(result=>{if(write)window.dispatchEvent(new Event('deb-dummy-change'));return result;});
 }
 return {request,get:<T,>(url:string)=>request(url) as Promise<T>,post:<T,>(url:string,body?:object|FormData)=>request(url,'POST',body) as Promise<T>,patch:<T,>(url:string,body?:object)=>request(url,'PATCH',body) as Promise<T>,del:<T,>(url:string,body?:object)=>request(url,'DELETE',body) as Promise<T>,blob:(url:string)=>request(url) as Promise<Blob>};
}
