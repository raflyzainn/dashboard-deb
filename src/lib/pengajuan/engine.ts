import { samplePdf } from '../data/demo/fixtures/pdf';
import { KINDS, KIND_LABEL, documentReceiptFlags, assess, isRabKind, parseSen, terbilang } from '../pencairan';
import { arrange, type LineInput } from '../rab';
import { BUDGET, LIMIT, sampleItems, readExcel, validQuantity, validEditedVolume } from '../../../mockups/rab/model';
import { ensureJourney, journeyView, touchJourney, sections, PKS_DATE, validDate, documentGuides, kuasaSource, settingsSource, pfNumber } from './journey';
import { journeyTemplates, journeyDocx, finalJourneyDocx } from './journey-documents';
import { MERGE_KINDS, isMergeKind, DOCX_MIME, MERGE_LABEL, type MergeKind } from '../merge';
import type { AppSession } from '../types';
import { programLocationErrors } from './location';
const now=()=>new Date().toISOString();
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
export interface EngineOptions {
 transaction: <T>(action:(state:{data:{campuses:any[]};accounts:any[];[key:string]:any})=>T,write?:boolean)=>Promise<T>;
 origin: string; amountSen: number; dummy?:boolean; id:()=>string;
 templates?:()=>Promise<any>; image?: (file:File)=>Promise<{width:number;height:number}>;
}
export function createEngine(actor:()=>Promise<AppSession>,options:EngineOptions){
 const transaction=options.transaction, BUDGET=options.amountSen,LIMIT=Math.floor(BUDGET*0.7),id=options.id;
function version(number:number,items:any[]=sampleItems()) {return totals({id:id(),number,status:'draf',revision:1,source:'import',share:'gabungan',sourceFile:'RAB_CONTOH.xlsx',note:options.dummy?'Data dummy':'',approvedByName:'',approvedAt:'',created:now(),updated:now(),active:false,lines:itemLines(items)});}
// Jumlah contoh mengikuti enam item sampleItems; total Tahap 1 Rp14 juta.
function completeSeedQuantities(v:any){
 if(v.quantityAllocation||v.sourceFile!=='RAB_CONTOH.xlsx')return;
 const quantities=[1,1,15,2,0,1],seed=sampleItems();
 if(v.lines.filter((l:any)=>l.level===4).length!==seed.length||v.lines.filter((l:any)=>l.level===4).some((l:any,i:number)=>l.title!==seed[i].title))return;
 v.lines=itemLines(seed.map((item,i)=>({...item,term1Sen:quantities[i]*item.priceSen})));
 v.lines.filter((l:any)=>l.level===4).forEach((line:any,i:number)=>{line.flags={...line.flags,term1Volume:quantities[i],term2Volume:line.volume-quantities[i]};});
 v.quantityAllocation=true;totals(v);
}
function check(v:any){if(!v||!v.lines.length)throw Error('Isi RAB terlebih dahulu.');if(v.quantityAllocation&&v.lines.some((l:any)=>l.level===4&&!validQuantity(l.flags?.term1Volume,l.volume)))throw Error('Periksa pembagian jumlah: item dengan volume bulat harus dibagi dalam bilangan bulat.');if(v.totalSen!==BUDGET||v.term1Sen>LIMIT||v.term1Sen<=0||v.term1Sen+v.term2Sen!==v.totalSen||v.lines.some((l:any)=>l.term1Sen<0||l.term2Sen<0))throw Error('Total RAB harus sesuai SK dan alokasi Tahap 1 maksimal 70%.');}
function documentVersion(kind:string,name:string,number=1){return {id:id(),number,originalName:name,size:1500,mime:'application/pdf',origin:'upload',uploadedByName:options.dummy?'Kampus Dummy':'',created:now(),note:options.dummy?'Dokumen simulasi':'',signed:false,scan:null,fields:{},fieldsByName:'Admin Dummy',fieldsAt:now(),fieldsCheckedByName:'Admin Dummy',fieldsCheckedAt:now(),fieldsSamePerson:false,reviews:[]};}
function init(c:any,index:number){
 const scenario=index%5;
 const versions=scenario===0?[]:[version(1)];if(versions.length){versions[0].status=scenario===1?'menunggu':scenario===2||scenario===4?'disetujui':'draf';versions[0].active=versions[0].status==='disetujui';}
 const documents=KINDS.map(kind=>{const v=documentVersion(kind,`${kind}_DUMMY.pdf`);return {id:id(),kind,status:isRabKind(kind)?scenario===0?'belum_ada':scenario===1?'menunggu_review':scenario===3?'perlu_revisi':'sesuai':'sesuai',signedReceived:scenario===4,signedReceivedAt:'',signedReceivedByName:'',originalReceived:scenario===4,originalReceivedAt:'',originalReceivedByName:'',currentVersionId:isRabKind(kind)?'':v.id,versions:isRabKind(kind)?[]:[v],generated:['pks','permohonan','kuitansi','invois'].includes(kind),decidedByName:'Admin Dummy',decidedAt:now(),notes:[],reviews:scenario===3&&isRabKind(kind)?[{id:id(),decision:'perlu_revisi',note:'Periksa kembali alokasi kegiatan Tahap 1.',actorName:'Admin Dummy',created:now(),imported:false}]:[]};});
 return {versions,documents,payment:{id:id(),stage:4,requestedSen:versions[0]?.term1Sen||0,paidSen:scenario===4?LIMIT:0,paidAt:scenario===4?'2026-09-20':'',paidRef:scenario===4?'DUMMY-TRANSFER':'',paidByName:scenario===4?'Admin Dummy':'',properties:{},clauseChecked:true,templateMode:'standard'},attachments:[],entries:[],templates:[],note:'',bankCheck:{id:id(),bankResult:'sesuai',bankNameSeen:c.name,checkedAt:now(),evidence:true}};
}
function card(c:any,r:any,actor:AppSession){const v=r.versions.at(-1),documents=r.documents.map((d:any)=>({...d,status:isRabKind(d.kind)&&v?.status==='draf'&&d.status!=='perlu_revisi'?'belum_ada':d.status})),statuses=Object.fromEntries(documents.map((d:any)=>[d.kind,d.status]));const ready=assess(statuses as Parameters<typeof assess>[0],{suratKuasaRequired:r.journey?.fields.jenisRekening==='kuasa',redChecks:0,paidAt:r.payment.paidAt,originalsAll:r.documents.filter((d:any)=>d.generated).every((d:any)=>d.originalReceived),lampiranCount:r.attachments.length});return {journey:r.journey?{revision:r.journey.revision,files:r.journey.files,status:r.journey.status,lastSection:r.journey.lastSection,fields:r.journey.fields,pf:{...r.journey.pf,nomorPksPf:pfNumber(r.journey)},checklist:r.journey.checklist,history:r.journey.history}:null,campus:{...c,code:c.acronym||c.initials,signatoryName:r.journey?.fields.penandatanganNama||'',team:c.program?.pfTeam||'',contacts:{mentor:c.program?.mentor||'',coordinator:c.program?.coordinator||'',localHero:c.program?.localHero||''}},summary:{skNumber:c.award?.skNumber||'SK-DUMMY/2026/'+c.id,amountSen:BUDGET,limitSen:LIMIT,requestedSen:r.journey?.history.length?v?.term1Sen||0:r.payment.requestedSen,term2Sen:BUDGET-(r.journey?.history.length?v?.term1Sen||0:r.payment.requestedSen),term1Percent:70,term2Percent:30,programTitle:r.journey?.fields.judulProgram||c.program?.description||'Program Dummy',programYear:c.programYear,skFile:true},disbursement:r.payment,documents:documents.map((d:any)=>({...d,notes:d.notes.filter((n:any)=>actor.role==='admin'||!n.internal)})),bankCheck:r.bankCheck,rab:v?{id:v.id,number:v.number,status:v.status,totalSen:v.totalSen,term1Sen:v.term1Sen,term2Sen:v.term2Sen}:null,lampiranCount:r.attachments.length,checks:[{kind:'rab',level:v&&v.totalSen===BUDGET&&v.term1Sen<=LIMIT?'ok':'info',text:v?'Alokasi RAB tersimpan.':'Kampus belum mengunggah RAB.'}],readiness:ready};}
function overview(c:any,r:any,versionId=''){return {campus:{...c,code:c.acronym||c.initials},summary:{skNumber:c.award?.skNumber||'SK-DUMMY/2026/'+c.id,amountSen:BUDGET,limitSen:LIMIT},disbursement:{...r.payment,rabVersionId:r.versions.find((v:any)=>v.active)?.id||''},versions:r.versions.map(({lines,...v}:any)=>v),version:r.versions.find((v:any)=>v.id===versionId)||r.versions.at(-1)||null,checks:[]};}
function revisePfData(c:any,r:any,user:AppSession){
 const j=ensureJourney(c,r);if(j.history.length){j.status='revisi';j.lastSection='pks';if(r.versions.length)r.versions.at(-1).status='draf';}
 touchJourney(c,r);
 if(j.history.length){const pks=r.documents.find((d:any)=>d.kind==='pks');pks.status='perlu_revisi';pks.reviews.push({id:id(),decision:'perlu_revisi',note:'Data PKS dari PF diperbarui. Periksa data dan buat ulang dokumen sebelum mengajukan kembali.',actorName:user.name,created:now(),imported:false});}
}

 async function request(url:string,method='GET',body:any={}):Promise<any>{
  const user=await actor(),u=new URL(url,options.origin),parts=u.pathname.split('/').filter(Boolean),write=method!=='GET';
  if(!u.pathname.startsWith('/api/'))return (await fetch(url)).blob();
  if(parts[3]==='buat'&&isMergeKind(parts[4])){
   const current=await request(`/api/pencairan/${parts[2]}`);
   if(current.journey?.status==='selesai'&&!write)return request(`/api/pencairan/${parts[2]}/pengajuan/dokumen/${parts[4]}`);
   if(write){if(current.journey?.status!=='selesai')throw Error('Tunggu seluruh dokumen disetujui.');body={...body,final:await request(`/api/pencairan/${parts[2]}/pengajuan/dokumen/${parts[4]}`)};}
  }
  let imported:any=null,file:File|null=null;
  if(body instanceof FormData){file=body.get('file') as File|null;if(parts.includes('rab')&&parts.includes('import')&&file)imported=await readExcel(file);if(parts[3]==='pengajuan'&&parts[4]==='upload'&&file){if(!file.size||file.size>2*1024*1024)throw Error('Pilih berkas maksimal 2 MB.');if(body.get('slot')==='kop'){const image=options.image?await options.image(file):await createImageBitmap(file);body.set('width',String(image.width));body.set('height',String(image.height));if('close' in image)image.close();}}}
  const templates=parts[3]==='pengajuan'?await (options.templates||journeyTemplates)():null;
  let generated:Blob|null=null,expectedRevision=0,renderedSettings='';
  if(parts[3]==='pengajuan'&&(parts[4]==='dokumen'||parts[4]==='surat-kuasa')){
   const kuasa=parts[4]==='surat-kuasa';
   if(!kuasa&&!isMergeKind(parts[5]))throw Error('Jenis dokumen tidak dikenal.');
   const view=await request(`/api/pencairan/${parts[2]}/pengajuan`);
   if(!write&&!kuasa&&(view.journey.status==='selesai'||!view.stale.includes(parts[5]))){const stored=await transaction(s=>{const r=s.fullDummy.campuses[parts[2]],v=r.documents.find((d:any)=>d.kind===parts[5])?.versions.filter((v:any)=>v.origin==='generated').at(-1);return v&&s.files[v.id];});if(!stored)throw Error('Dokumen yang disetujui belum tersedia.');return view.journey.status==='selesai'?finalJourneyDocx(new Uint8Array(await stored.arrayBuffer())):stored;}
   if(kuasa){
    if(write)throw Error('Gunakan unduh template surat kuasa.');
    const f=view.journey.fields;
    if(f.jenisRekening!=='kuasa'||['judulProgram','pemberiKuasa','penerimaKuasa','namaBank','nomorRekening','namaPemilik','penandatanganNama','penandatanganJabatan','tempatTandaTangan'].some(k=>!f[k]?.trim())||!validDate(f.tanggalKuasa||'')||f.tanggalKuasa<=PKS_DATE||f.pemberiKuasa.trim().toLowerCase()!==f.penandatanganNama.trim().toLowerCase()||f.penerimaKuasa.trim().toLowerCase()!==f.namaPemilik.trim().toLowerCase()||!/^\d{5,40}$/.test(f.nomorRekening))throw Error('Lengkapi identitas pemberi/penerima kuasa, rekening, dan tanggal setelah 17 Juni 2026 sebelum mengunduh template.');
   }else if(view.blockers.length)throw Error('Lengkapi data pengajuan sebelum membuat dokumen.');
   const snapshot=await transaction(s=>{const db=(s as any).fullDummy;return {c:s.data.campuses.find(c=>c.id===parts[2]),r:db.campuses[parts[2]],settings:db.settings.find((v:any)=>v.programYear===s.data.campuses.find(c=>c.id===parts[2])?.programYear),kop:s.files[view.journey.files.kop?.id]};});
   if(!snapshot.kop)throw Error('Kop surat belum tersedia.');
   expectedRevision=snapshot.r.journey.revision;renderedSettings=settingsSource(snapshot.settings);if(expectedRevision!==view.journey.revision)throw Error('Data berubah saat dokumen dibuat. Coba kembali.');
   generated=journeyDocx(kuasa?'surat_kuasa':parts[5] as MergeKind,snapshot.c,snapshot.r,snapshot.settings,templates!,{bytes:new Uint8Array(await snapshot.kop.arrayBuffer()),mime:snapshot.kop.type,width:view.journey.files.kop.width,height:view.journey.files.kop.height},!kuasa&&view.journey.status!=='selesai');
   if(!write)return generated;
  }
  return transaction(s=>{
   const state=s as any;state.fullDummy??={campuses:{},users:[],audit:[],settings:['kedua','ketiga'].map(programYear=>({id:programYear,programYear,pfSignatoryName:'Penandatangan Dummy',pfSignatoryTitle:'Direktur Contoh',agreementStart:'2026-01-01',agreementEnd:'2026-12-31',reportDeadline:'2027-01-31'}))};const db=state.fullDummy;
   if(options.dummy)s.data.campuses.forEach((c,i)=>{db.campuses[c.id]??=init(c,i);db.campuses[c.id].versions.forEach(completeSeedQuantities);});
   if(options.dummy&&!db.users.length)db.users=[...s.accounts.map(a=>({...a,role:'campus',created:now(),lastLoginAt:'',passwordChangeRequired:false})),...['admin-1','admin-2'].map((id,i)=>({id,name:`Admin PF ${i+1} Dummy`,email:`admin${i+1}@example.test`,role:'admin',active:true,campusId:'',created:now(),lastLoginAt:'',passwordChangeRequired:false}))];
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
   if(parts[1]==='pengaturan-program'){admin();if(write){const row=db.settings.find((r:any)=>r.programYear===body.programYear);if(!row)throw Error('Tahun program tidak ditemukan.');const before=JSON.stringify(row);Object.assign(row,body);if(JSON.stringify(row)!==before)for(const campus of s.data.campuses.filter(c=>c.programYear===body.programYear)){const r=db.campuses[campus.id];if(r.journey&&!r.payment.paidAt)revisePfData(campus,r,user);}}return {rows:db.settings};}
   if(parts[1]!=='pencairan')throw Error('Endpoint dummy belum dikenali: '+u.pathname);
   if(parts[2]==='sk')return samplePdf('SK DUMMY SELURUH KAMPUS',1);
   if(!parts[2]||parts[2]==='periksa'){
    const campuses=s.data.campuses.filter(c=>user.role==='admin'||c.id===user.campusId);
    if(parts[2]==='periksa')return {rows:campuses.flatMap(c=>{const r=db.campuses[c.id];return card(c,r,user).documents.filter((d:any)=>['menunggu_review','perlu_konfirmasi'].includes(d.status)).map((d:any)=>({campus:{...c,code:c.acronym||c.initials,team:c.program?.pfTeam||''},kind:d.kind,status:d.status,reason:'baru',arrivedAt:now(),arrival:{number:r.versions.at(-1)?.number||1,originalName:r.versions.at(-1)?.sourceFile||'Dokumen_Dummy.pdf',uploadedByName:options.dummy?'Kampus Dummy':'',created:now(),note:''},request:null}));})};
    return {rows:campuses.map(c=>{const r=db.campuses[c.id],v=card(c,r,user);return {campus:v.campus,amountSen:BUDGET,limitSen:LIMIT,stage:r.payment.stage,requestedSen:r.payment.requestedSen,paidSen:r.payment.paidSen,paidAt:r.payment.paidAt,lampiranCount:r.attachments.length,statuses:Object.fromEntries(v.documents.map((d:any)=>[d.kind,d.status])),assessment:v.readiness,checkedAt:now(),bukti:{r100:r.versions.length?'ada':'',r70:r.versions.length?'ada':'',r30:r.versions.length?'ada':''}};})};
   }
   const c=s.data.campuses.find(c=>c.id===parts[2]);if(!c)throw Error('Kampus tidak ditemukan.');if(user.role!=='admin'&&user.campusId!==c.id)throw Error('Akun ini tidak boleh mengakses kampus lain.');const r=db.campuses[c.id];
   if(parts[3]==='pengajuan'){
    const j=ensureJourney(c,r),settings=db.settings.find((v:any)=>v.programYear===c.programYear);
    const view=()=>journeyView(c,r,settings,templates!);
    const locked=r.payment.paidAt||j.status==='menunggu';
    if(parts[4]==='checklist'){
     if(method!=='PATCH'||typeof body.checked!=='boolean'||!Object.entries(documentGuides).some(([kind,items])=>items.some((_,i)=>body.key===kind+'-'+i)))throw Error('Checklist tidak valid.');
     j.checklist![body.key]=body.checked;return view();
    }
    if(write&&body.requestPf===true){
     if(method!=='PATCH'||locked||pfNumber(j))throw Error('Permintaan data PF sudah tidak diperlukan.');
     j.pfRequestedAt ||= now();return view();
    }
    if(parts[4]==='pf'){
     admin();if(method!=='PATCH'||r.payment.paidAt)throw Error('Data PF tidak dapat diubah.');
     if(typeof body.nomorPksPf!=='string'||!body.nomorPksPf.trim()||body.nomorPksPf.length>200)throw Error('Isi nomor PKS PF, maksimal 200 karakter.');
     if(j.pf!.nomorPksPf!==body.nomorPksPf.trim()||!j.pf!.confirmedByAdmin){
      j.pf!.nomorPksPf=body.nomorPksPf.trim();j.pf!.confirmedByAdmin=true;revisePfData(c,r,user);
     }return card(c,r,user);
    }
    if(parts[4]==='file'){
     const ref=j.files[parts[5]];if(!ref||!s.files[ref.id])throw Error('Berkas belum tersedia.');return s.files[ref.id];
    }
    if(parts[4]==='dokumen'&&generated){
     if(j.revision!==expectedRevision||settingsSource(settings)!==renderedSettings)throw Error('Data berubah saat dokumen dibuat. Coba kembali.');
     if(locked)throw Error('Pengajuan terkunci selama pemeriksaan atau setelah pembayaran.');
     const d=r.documents.find((d:any)=>d.kind===parts[5]),v=documentVersion(parts[5],`${MERGE_LABEL[parts[5] as keyof typeof MERGE_LABEL]}_${c.id}_v${d.versions.length+1}.docx`,d.versions.length+1);
     Object.assign(v,{origin:'generated',mime:DOCX_MIME,size:generated.size,journeyRevision:j.revision,generation:{settingsSource:renderedSettings},fields:{...j.fields,nominalSen:r.versions.at(-1)?.term1Sen}});
     d.versions.push(v);d.currentVersionId=v.id;d.status='belum_ada';s.files[v.id]=generated;return view();
    }
    if(parts[4]==='submit'){
     if(method!=='POST'||locked||j.status==='selesai')throw Error('Pengajuan tidak dapat dikirim ulang.');
     const current=view();if(current.blockers.length||current.stale.length)throw Error('Lengkapi data dan buat ulang dokumen sebelum mengajukan.');
     if(current.revisionBlockers.length)throw Error('Selesaikan catatan revisi: unggah ulang berkas, buat ulang dokumen, atau ubah alokasi RAB yang diminta sebelum mengajukan.');
     check(r.versions.at(-1));j.status='menunggu';
     j.history.push({id:id(),number:j.history.length+1,revision:j.revision,created:now(),actorName:user.name,fields:clone(j.fields),files:clone(j.files),rabVersionId:r.versions.at(-1).id,documents:r.documents.map((d:any)=>({kind:d.kind,versionId:d.currentVersionId}))});
     r.versions.at(-1).status='menunggu';r.payment.properties={...r.payment.properties,...j.fields,nomorPksPf:j.pf!.nomorPksPf};
     r.documents.forEach((d:any)=>{if(d.kind==='sk')return;const version=d.versions.find((v:any)=>v.id===d.currentVersionId);if(version){const f=j.fields;const amount=r.versions.at(-1).term1Sen;if(d.kind==='pks')version.fields={nomorPksPf:j.pf!.nomorPksPf,nomorPksKampus:f.nomorPksKampus,tanggalPerjanjian:f.tanggalPerjanjian,penandatangan:f.penandatanganNama+' - '+f.penandatanganJabatan,nilaiBantuanSen:BUDGET};if(d.kind==='rekening')version.fields={namaBank:f.namaBank,nomorRekening:f.nomorRekening,namaPemilik:[f.namaPemilik]};if(d.kind==='surat_kuasa')version.fields={pemberiKuasa:f.pemberiKuasa,penerimaKuasa:[f.penerimaKuasa]};if(d.kind==='invois')Object.assign(version.fields,{namaBank:f.namaBank,rekeningTujuan:f.nomorRekening,namaPemilik:[f.namaPemilik],tanggal:f.tanggalInvois,nominalSen:amount});if(d.kind==='permohonan')Object.assign(version.fields,{nomorSurat:f.nomorSuratPermohonan,tanggalSurat:f.tanggalSuratPermohonan,penandatangan:f.penandatanganNama,nominalSen:amount});if(d.kind==='kuitansi')Object.assign(version.fields,{tanggal:f.tanggalKuitansi,nominalSen:amount,terbilang:terbilang(amount)});}d.status=d.kind==='surat_kuasa'&&j.fields.jenisRekening==='kampus'?'tidak_perlu':'menunggu_review';});return view();
    }
    if(write){
     if(parts[4]==='upload'){
      if(locked||j.status==='selesai')throw Error('Pengajuan terkunci.');
      const key=body.get('slot');if(!['kop','rekening','kuasa'].includes(key)||!file||!file.size||file.size>2*1024*1024)throw Error('Pilih berkas maksimal 2 MB.');
      if(key==='kop'&&!['image/png','image/jpeg'].includes(file.type)||key!=='kop'&&!['image/png','image/jpeg','application/pdf'].includes(file.type))throw Error('Format berkas tidak sesuai.');
      const width=Number(body.get('width')),height=Number(body.get('height'));
      if(key==='kop'&&(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0))throw Error('Kop surat tidak dapat dibaca.');
      const ref={id:id(),name:file.name,mime:file.type,width,height,...(key==='kuasa'?{source:kuasaSource(j.fields)}:{})};j.files[key]=ref;s.files[ref.id]=file;
      if(key!=='kop'){const d=r.documents.find((d:any)=>d.kind===(key==='kuasa'?'surat_kuasa':'rekening')),v=documentVersion(d.kind,file.name,d.versions.length+1);Object.assign(v,{mime:file.type,size:file.size});d.versions.push(v);d.currentVersionId=v.id;d.status='belum_ada';s.files[v.id]=file;}
      touchJourney(c,r);
     }else{
      if(body.fields){
       if(locked||j.status==='selesai')throw Error('Pengajuan terkunci.');
       if(body.revision!==j.revision)throw Error('Draf berubah di tab lain. Muat ulang sebelum menyimpan.');
       if(typeof body.fields!=='object'||Array.isArray(body.fields))throw Error('Data isian tidak valid.');
       const fields={...j.fields};for(const [key,value] of Object.entries(body.fields)){if(!(key in fields)||typeof value!=='string'||value.length>2000)throw Error('Isian tidak valid.');fields[key]=value.trim();}
       const locationErrors=programLocationErrors(fields);if(locationErrors.length)throw Error(locationErrors[0]);
       if(fields.tanggalPerjanjian!==PKS_DATE)throw Error('Tanggal PKS wajib 17 Juni 2026.');
       if(!['kampus','kuasa'].includes(fields.jenisRekening))throw Error('Pilih jenis rekening.');
       if(JSON.stringify(fields)!==JSON.stringify(j.fields)){j.fields=fields;touchJourney(c,r);}
      }
      if(body.lastSection&&sections.includes(body.lastSection))j.lastSection=body.lastSection;
     }
    }
    return view();
   }
   if(user.role!=='admin'&&write&&parts[3]==='rab'&&(r.payment.paidAt||r.journey?.status==='menunggu'||r.journey?.status==='selesai'))throw Error('Pengajuan terkunci. Tunggu hasil pemeriksaan PF.');
   if(parts[3]==='rab'){
    let v=r.versions.find((v:any)=>v.id===parts[5])||r.versions.at(-1);
    if(parts[4]==='import'&&imported){const next=version((v?.number||0)+1,imported);next.sourceFile=file!.name;
     if(body.get('mode')==='preview')return {preview:{rows:imported.length,kind:'penuh',totalSen:next.totalSen,term1Sen:next.term1Sen,term2Sen:next.term2Sen,problems:[],problemCount:0,fileName:file!.name}};
     if(next.totalSen!==BUDGET)throw Error('Total RAB harus sama dengan nilai SK.');next.quantityAllocation=true;next.campusStep=1;next.lines.forEach((l:any)=>{l.term1Sen=0;l.term2Sen=0;});totals(next);r.versions.push(next);touchJourney(c,r);rabKinds.forEach(k=>{r.documents.find((d:any)=>d.kind===k).status='belum_ada';});s.files[next.id]=file!;return overview(c,r);
    }
    if(parts[4]==='versions'&&write){
     if(!parts[5]){if(r.versions.at(-1)?.status==='menunggu')throw Error('Tunggu keputusan PF sebelum membuat draf baru.');if(body.from&&!r.versions.some((v:any)=>v.id===body.from))throw Error('Versi sumber tidak ditemukan.');const source=r.versions.find((v:any)=>v.id===body.from);const next=source?{...clone(source),id:id(),number:r.versions.length+1,status:'draf',active:false,approvedAt:'',approvedByName:'',note:'',created:now(),updated:now()}:version(r.versions.length+1,[]);next.campusStep=1;r.versions.push(next);touchJourney(c,r);r.documents.filter((d:any)=>isRabKind(d.kind)).forEach((d:any)=>d.status='belum_ada');return overview(c,r);}
     if(!v||!r.versions.some((version:any)=>version.id===parts[5]))throw Error('Versi tidak ditemukan.');if(v.id!==r.versions.at(-1)?.id)throw Error('Versi lama hanya dapat dilihat. Buat draf terbaru untuk melanjutkan.');
     if(parts[6]==='correction'){
      admin();if(method!=='POST')throw Error('Gunakan POST untuk koreksi.');
      if(r.payment.paidAt)throw Error('RAB yang sudah dibayar tidak dapat diubah.');
      if(!rabKinds.includes(body.kind))throw Error('Pilih kolom RAB yang akan diedit.');
      const leaves=v.lines.filter((l:any)=>l.level===4);
      if(!Array.isArray(body.items)||body.items.length!==leaves.length||new Set(body.items.map((i:any)=>i.lineId)).size!==leaves.length)throw Error('Kirim seluruh item RAB tanpa duplikasi.');
      const next={...clone(v),id:id(),number:r.versions.length+1,status:v.status==='draf'?'draf':'menunggu',active:false,approvedAt:'',approvedByName:'',created:now(),updated:now(),note:`Koreksi admin ${user.name}: ${body.note?.trim()||'Jumlah, harga satuan, atau pembagian diperbarui melalui tabel RAB.'}`};
      for(const input of body.items){
       const changed=next.lines.find((l:any)=>l.id===input.lineId&&l.level===4);
       const {volume,unitPriceSen,term1Volume}=input;
       if(!changed||!validEditedVolume(volume,changed.volume)||!Number.isSafeInteger(unitPriceSen)||unitPriceSen<=0||!Number.isSafeInteger(Math.round(volume*unitPriceSen))||!validQuantity(term1Volume,volume))throw Error('Isi jumlah positif, harga satuan positif, dan pembagian jumlah yang valid.');
       if(body.kind!=='rab_penuh'&&(volume!==changed.volume||unitPriceSen!==changed.unitPriceSen)||body.kind==='rab_penuh'&&term1Volume!==changed.flags?.term1Volume)throw Error('Hanya kolom RAB yang dipilih boleh diubah.');
       Object.assign(changed,{volume,unitPriceSen,amountSen:Math.round(volume*unitPriceSen),term1Sen:Math.round(term1Volume*unitPriceSen),term2Sen:Math.round(volume*unitPriceSen)-Math.round(term1Volume*unitPriceSen),flags:{...changed.flags,term1Volume,term2Volume:Math.round((volume-term1Volume)*10000)/10000}});
      }
      if(r.journey){next.status='draf';next.campusStep=1;r.journey.status='revisi';r.journey.lastSection='rab';}
      next.quantityAllocation=true;
      next.lines=lines(next.lines.map((l:any)=>({...l,key:l.id,parentKey:l.parentId})));totals(next);
      r.versions.push(next);touchJourney(c,r);r.documents.filter((d:any)=>isRabKind(d.kind)).forEach((d:any)=>d.status=next.status==='draf'?(r.journey?'perlu_revisi':'belum_ada'):'menunggu_review');
      return overview(c,r,next.id);
     }
     if(parts[6]==='progress'){
      const current=v.campusStep??1,target=body.step;
      if(method!=='POST'||v.status!=='draf'||!Number.isInteger(target)||target<1||target>3||target>current+1)throw Error('Selesaikan tahap sebelumnya melalui tombol Lanjut.');
      if(target>=2&&v.totalSen!==BUDGET)throw Error('Total RAB harus sama dengan nilai SK.');
      if(target===3)check(v);
      v.campusStep=Math.max(current,target);return overview(c,r,v.id);
     }
     if(parts[6]==='allocation'){
      if(v.status!=='draf')throw Error('Versi terkunci.');
      const next=clone(v);next.quantityAllocation=true;
      for(const l of next.lines.filter((l:any)=>l.level===4)){
       const q=body.quantities?.[l.id];
       if(q===null||q===undefined){l.flags={...l.flags,term1Volume:null,term2Volume:null};l.term1Sen=0;l.term2Sen=0;continue;}
       if(!validQuantity(q,l.volume))throw Error(`${l.title}: jumlah harus antara 0 dan ${l.volume}${Number.isInteger(l.volume)?' dan berupa bilangan bulat':' dengan maksimal 4 desimal'}.`);
       l.flags={...l.flags,term1Volume:q,term2Volume:Math.round((l.volume-q)*10000)/10000};l.term1Sen=Math.round(q*l.unitPriceSen);l.term2Sen=l.amountSen-l.term1Sen;
      }
      for(const l of [...next.lines].reverse().filter((l:any)=>l.level<4)){const children=next.lines.filter((c:any)=>c.parentId===l.id);l.term1Sen=children.reduce((s:number,c:any)=>s+c.term1Sen,0);l.term2Sen=children.reduce((s:number,c:any)=>s+c.term2Sen,0);}
      const changed=JSON.stringify(next.lines)!==JSON.stringify(v.lines);
      totals(next);next.updated=now();Object.assign(v,next);touchJourney(c,r);if(changed)r.documents.filter((d:any)=>isRabKind(d.kind)&&d.status==='perlu_revisi').forEach((d:any)=>d.status='belum_ada');return overview(c,r,v.id);
     }
     if(method==='PATCH'){if(v.status!=='draf')throw Error('Versi terkunci.');v.lines=lines(body.lines);totals(v);v.updated=now();}
     if(parts[6]==='submit'){if(r.journey)throw Error('Ajukan RAB bersama dokumen melalui Ringkasan pengajuan.');if(v.quantityAllocation&&v.lines.some((l:any)=>l.level===4&&typeof l.flags?.term1Volume!=='number'))throw Error('Bagikan jumlah setiap item terlebih dahulu.');check(v);v.status='menunggu';r.documents.filter((d:any)=>isRabKind(d.kind)).forEach((d:any)=>d.status='menunggu_review');}
     if(parts[6]==='approve'){admin();if(r.journey)throw Error('Periksa RAB melalui keputusan tiap butir pengajuan.');check(v);r.versions.forEach((previous:any)=>previous.active=false);v.status='disetujui';v.active=true;v.approvedAt=now();v.approvedByName=user.name;r.payment.requestedSen=v.term1Sen;r.documents.filter((d:any)=>isRabKind(d.kind)).forEach((d:any)=>d.status='sesuai');}
     if(parts[6]==='revoke'){admin();v.status='draf';v.active=false;r.documents.filter((d:any)=>isRabKind(d.kind)).forEach((d:any)=>d.status='perlu_revisi');}
     return overview(c,r,v.id);
    }
    if(parts[4]!=='keputusan')return overview(c,r,u.searchParams.get('version')||'');
   }
   if(parts[3]==='documents'||parts[3]==='rab'&&parts[4]==='keputusan'){
    const kind=parts[3]==='rab'?'rab':parts[4],d=r.documents.find((d:any)=>d.kind===kind);if(!d)throw Error('Dokumen tidak ditemukan.');
    if(parts.includes('file')||(method==='GET'&&parts[5]==='versions'&&parts[6])){if(!d.versions.some((v:any)=>v.id===parts[6]))throw Error('Versi tidak sesuai dokumen.');if(s.files[parts[6]])return s.files[parts[6]];if(!options.dummy)throw Error('Berkas lokal tidak tersedia.');return samplePdf(`${c.name} ${KIND_LABEL[kind as keyof typeof KIND_LABEL]} DUMMY`,1);}
    if(parts[5]==='review'||parts[4]==='keputusan'){
     admin();const v=r.versions.at(-1);if(isRabKind(kind)&&(!v||v.status==='draf'))throw Error('Kampus belum mengajukan RAB.');
     const decision=body.decision==='batal'?'menunggu_review':body.decision;
     if(decision==='perlu_revisi'&&!body.note?.trim())throw Error('Catatan revisi wajib diisi.');if(isRabKind(kind)&&decision==='sesuai')check(v);if(r.journey&&decision==='sesuai'&&!['menunggu','selesai'].includes(r.journey.status))throw Error('Kampus belum mengajukan paket terbaru.');
     if(r.journey&&decision==='sesuai'){const settings=db.settings.find((s:any)=>s.programYear===c.programYear);if(r.documents.filter((d:any)=>MERGE_KINDS.includes(d.kind)).some((d:any)=>d.versions.filter((v:any)=>v.origin==='generated').at(-1)?.generation?.settingsSource!==settingsSource(settings)))throw Error('Pengaturan PF berubah. Minta kampus membuat ulang dokumen sebelum menyetujui.');}
     d.status=decision;d.decidedByName=user.name;d.decidedAt=now();d.reviews.push({id:id(),decision,note:body.note||'',actorName:user.name,created:now(),imported:false});
     if(isRabKind(kind)&&!['sesuai','perlu_revisi'].includes(decision)){v.status='menunggu';v.active=false;}
     if(isRabKind(kind)){if(decision==='perlu_revisi'){v.status='draf';v.note=body.note;r.documents.filter((other:any)=>isRabKind(other.kind)).forEach((other:any)=>other.status='perlu_revisi');}else if(r.documents.filter((d:any)=>isRabKind(d.kind)).every((d:any)=>d.status==='sesuai')){r.versions.forEach((previous:any)=>previous.active=false);v.status='disetujui';v.active=true;v.approvedAt=now();v.approvedByName=user.name;r.payment.requestedSen=v.term1Sen;}}
     if(r.journey){
      if(decision==='perlu_revisi'){touchJourney(c,r);r.journey.status='revisi';r.journey.lastSection=isRabKind(kind)?'rab':kind==='pks'?'pks':kind==='rekening'?'administrasi':'surat';r.versions.at(-1).status='draf';r.versions.at(-1).active=false;}
      else if(!['sesuai','tidak_perlu'].includes(decision)&&r.journey.status==='selesai')r.journey.status='menunggu';
      else if(r.journey.status==='menunggu'&&r.documents.every((other:any)=>['sesuai','tidak_perlu'].includes(other.status)))r.journey.status='selesai';
     }
    }else if(parts[5]==='catatan'){if(!body.body?.trim())throw Error('Isi catatan.');d.notes.push({id:id(),body:body.body,internal:user.role==='admin'&&!!body.internal,authorName:user.name,authorRole:user.role,created:now()});}
    else if(parts[5]==='versions'&&method==='POST'&&file){
     const signed=['true','1'].includes(String(body.get('signed')));
     if(user.role!=='admin'&&r.journey&&(!signed||r.journey.status!=='selesai'||!d.generated||d.signedReceived||r.payment.paidAt))throw Error('Gunakan formulir pengajuan untuk memperbarui dokumen sebelum pemeriksaan selesai.');
     const v=documentVersion(kind,file.name,d.versions.length+1);v.mime=file.type||'application/pdf';v.size=file.size;v.signed=['true','1'].includes(String(body.get('signed')));d.versions.push(v);d.currentVersionId=v.id;d.status=signed?'sesuai':'menunggu_review';if(signed){d.signedReceived=true;d.signedReceivedAt=now();d.signedReceivedByName=user.name;}s.files[v.id]=file;}
    else if(method==='PATCH'){admin();if(r.journey&&parts[6])throw Error('Data dokumen mengikuti pengajuan kampus. Koreksi data sumber agar dokumen tetap konsisten.');if(parts[6])Object.assign(d.versions.find((v:any)=>v.id===parts[6]).fields,body.fields);else Object.assign(d,documentReceiptFlags(body,user.name));}
    return card(c,r,user);
   }
   if(parts[3]==='buat'){
    admin();if(parts[4]&&write&&body.final){const d=r.documents.find((d:any)=>d.kind===parts[4]);if(d.signedReceived)throw Error('Dokumen bertanda tangan sudah diterima.');const source=d.versions.filter((v:any)=>v.origin==='generated').at(-1),v={...clone(source),id:id(),number:d.versions.length+1,note:'Dokumen final dari versi disetujui',generation:{...source.generation,final:true},created:now()};d.versions.push(v);d.currentVersionId=v.id;s.files[v.id]=body.final;return {version:v,code:'FINAL-'+v.id};}if(parts[4]){if(r.journey){const d=r.documents.find((d:any)=>d.kind===parts[4]);const version=d?.versions.filter((v:any)=>v.origin==='generated').at(-1);if(version&&s.files[version.id])return write?{version,code:'DUMMY-'+version.id.slice(0,8)}:s.files[version.id];throw Error('Kampus perlu menyiapkan dokumen pengajuan terlebih dahulu.');}if(write){const d=r.documents.find((d:any)=>d.kind===parts[4]),v=documentVersion(parts[4],`${parts[4]}_DUMMY.pdf`,d.versions.length+1);v.origin='generated';d.versions.push(v);d.currentVersionId=v.id;return {version:v,code:(options.dummy?'DUMMY-':'FINAL-')+v.id.slice(0,8)};}return samplePdf(c.name+' DOKUMEN DUMMY',1);}
    return {readiness:[],clauseRequired:false,data:r.payment.properties,missing:Object.fromEntries(['pks','permohonan','kuitansi','invois'].map(k=>[k,[]])),templates:{mode:r.payment.templateMode,active:r.templates.at(-1)||null,versions:r.templates},documents:r.documents.filter((d:any)=>d.generated).map((d:any)=>({kind:d.kind,versions:d.versions.filter((v:any)=>v.origin==='generated').map((v:any)=>({id:v.id,number:v.number,code:(options.dummy?'DUMMY-':'FINAL-')+v.id.slice(0,8)}))})),settingsYear:c.programYear,settingsReady:true};
   }
   if(parts[3]==='pks-templat'){admin();if(file)r.templates.push({id:id(),version:r.templates.length+1,originalName:file.name,reason:body.get('reason')||'Simulasi',active:true,uploadedByName:user.name,created:now(),differences:{changed:0,added:0,pasal:[],missingTags:[]}});r.payment.templateMode=body.mode||'custom';return {ok:true};}
   if(parts[3]==='lampiran'){
    const view=card(c,r,user);if(write){admin();if(!view.readiness.lengkap)throw Error('Selesaikan pemeriksaan seluruh dokumen terlebih dahulu.');if(body.mode==='preview')return samplePdf(c.name+' LAMPIRAN DUMMY',1);r.attachments.unshift({id:id(),number:r.attachments.length+1,size:1500,pages:1,sha256:'dummy',verification:'DUMMY-'+id(),created:now(),createdByName:user.name});}
    if(parts[4])return samplePdf(c.name+' LAMPIRAN DUMMY',1);
    return {campus:view.campus,summary:view.summary,payment:r.payment,entries:['rab','permohonan','kuitansi','invois','rekening','pks'].map((kind,i)=>({entry:i+1,title:KIND_LABEL[kind as keyof typeof KIND_LABEL],items:[{entry:i+1,kind,label:kind,status:r.documents.find((d:any)=>d.kind===kind).status,version:null,skipped:false,ready:view.readiness.lengkap,state:'Data dummy',blocker:view.readiness.lengkap?'':'Dokumen belum lengkap'}]})),readiness:{lengkap:view.readiness.lengkap,missing:view.readiness.missing},blockers:view.readiness.lengkap?[]:['Selesaikan pemeriksaan dokumen.'],ready:view.readiness.lengkap,reason:'',attachments:r.attachments};
   }
   if(parts[3]==='lpj'){
    if(write){if(method==='PATCH'){admin();Object.assign(r.entries.find((e:any)=>e.id===parts[4]),body);}else{if(!r.payment.paidAt)throw Error('Dana Tahap 1 belum dibayar.');const fields=body instanceof FormData?Object.fromEntries(body):body;const amountSen=fields.amountSen!==undefined?Number(fields.amountSen):parseSen(String(fields.amount||''));if(amountSen===null||!Number.isSafeInteger(amountSen)||amountSen<=0)throw Error('Isi nominal positif.');const e={...fields,id:id(),amountSen,status:'menunggu_review',created:now(),createdByName:user.name,originalName:file?.name||'',rabCode:'',rabTitle:'',rabLineId:fields.rabLineId||fields.rabLine||''};r.entries.push(e);if(file)s.files[e.id]=file;}}
    if(parts.at(-1)==='file')return s.files[parts[4]]||samplePdf(c.name+' LPJ DUMMY',1);
    const spent=r.entries.reduce((n:number,e:any)=>n+e.amountSen,0);return {campus:{...c,code:c.acronym||c.initials},amountSen:BUDGET,receivedSen:r.payment.paidSen,reportedSen:spent,remainingSen:r.payment.paidSen-spent,paid:!!r.payment.paidAt,entries:r.entries,rabNodes:r.versions.at(-1)?.lines||[],hasApprovedRab:r.versions.some((v:any)=>v.active)};
   }
   if(write){admin();if(parts[3]==='pembayaran'&&!card(c,r,user).readiness.lengkap)throw Error('Dokumen belum lengkap.');Object.assign(r.payment,{...body,properties:{...r.payment.properties,...body.properties}});}
   return card(c,r,user);
  },write||!!options.dummy).then(result=>{if(write&&options.dummy)window.dispatchEvent(new Event('deb-dummy-change'));return result;});
 }
 return {request,get:<T,>(url:string)=>request(url) as Promise<T>,post:<T,>(url:string,body?:object|FormData)=>request(url,'POST',body) as Promise<T>,patch:<T,>(url:string,body?:object)=>request(url,'PATCH',body) as Promise<T>,del:<T,>(url:string,body?:object)=>request(url,'DELETE',body) as Promise<T>,blob:(url:string)=>request(url) as Promise<Blob>};
}
