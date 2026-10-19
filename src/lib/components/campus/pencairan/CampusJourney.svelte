<script lang="ts">
  import { reportError } from '$lib/feedback';
 import { onMount, onDestroy, untrack } from 'svelte';
 import { fly } from 'svelte/transition';
 import { page } from '$app/state';
 import { beforeNavigate, goto } from '$app/navigation';
 import { dataService } from '$lib/data/service';
 import { formatSen, maskAccountNumber, KIND_SHORT, type Kind } from '$lib/pencairan';
 import { MERGE_KINDS, MERGE_LABEL, type MergeKind } from '$lib/merge';
 import Button from '$lib/components/ui/Button.svelte';
 import Icon from '$lib/components/ui/Icon.svelte';
 import Modal from '$lib/components/ui/Modal.svelte';
 import { downloadDocumentPdf } from '$lib/pengajuan/browser-document-pdf';
 import FileViewer from '$lib/components/admin/pencairan/FileViewer.svelte';
 import RabUpload from './RabUpload.svelte';
 import DocumentGuide from './DocumentGuide.svelte';
 import ProgramLocation from '$lib/components/shared/profile/ProgramLocation.svelte';
 import { REVISION_SCOPES, canRevise, canEditField, canUploadFile, openRevisions, editableSections, revisionSection, type EditableSection } from '$lib/pengajuan/revisions';
 import { grantors } from '$lib/pengajuan/grantors';
 import { parseContacts } from '$lib/contacts';
 import { minimumDate } from '$lib/pengajuan/dates';
 import { sections, sectionLabels, PKS_DATE, LETTER_MIN_DATE, PF_PKS_PREPARATION, type Section, validateJourney, requiresKuasaUpdate } from '$lib/pengajuan/journey';
 let {campusId,embedded=false,onloaded=()=>{}}:{campusId:string;embedded?:boolean;onloaded?:()=>void}=$props();
 let remoteChanged=$state(false);
 let reducedMotion=$state(false);
 let saving=$state(false);
 let disposed=false;
 onDestroy(()=>{disposed=true;});
 let savePromise:Promise<boolean>|null=null;
 let failedDraft=$state('');
 let lastDraftNotice=Number.NEGATIVE_INFINITY;
 let data=$state<any>(null),fields=$state<Record<string,string>>({}),saved=$state('{}'),busy=$state(false),error=$state(''),message=$state(''),kopUrl=$state(''),preview=$state<MergeKind|'surat_kuasa'|null>(null),pending=$state<(()=>void)|null>(null);
 let downloadingPdf=$state('');
 let scanKind=$state<MergeKind|null>(null),scanFile=$state<File|null>(null),scanNote=$state('');
 $effect(()=>{const kind=page.url.searchParams.get('butir');if(page.url.searchParams.has('signed')&&MERGE_KINDS.includes(kind as MergeKind))scanKind=kind as MergeKind;});
 const base=$derived(`/api/pencairan/${campusId}/pengajuan`);
 const section=$derived((sections.includes(page.url.searchParams.get('bagian') as Section)?page.url.searchParams.get('bagian'):page.url.searchParams.get('butir')==='sk'?'sk':['rab_penuh','rab','rab_tahap2'].includes(page.url.searchParams.get('butir')||'')?'rab':page.url.searchParams.get('butir')==='program'?'program':['administrasi','penandatangan','surat'].includes(page.url.searchParams.get('butir')||'')?page.url.searchParams.get('butir'):page.url.searchParams.get('butir')==='ringkasan'?'ringkasan':page.url.searchParams.get('butir')==='pks'?'pks':page.url.searchParams.get('butir')==='rekening'?'administrasi':page.url.searchParams.get('butir')==='surat_kuasa'?'administrasi':['invois','permohonan','kuitansi'].includes(page.url.searchParams.get('butir')||'')?'ringkasan':data?.journey.lastSection||'sk') as Section);
 const index=$derived(sections.indexOf(section));
 const kopId=$derived(data?.journey.files.kop?.id||'');
 const dirty=$derived(JSON.stringify(fields)!==saved);
 $effect(()=>{if(!message)return;const timer=setTimeout(()=>message='',4000);return()=>clearTimeout(timer);});
 $effect(()=>{
  const snapshot=JSON.stringify(fields);
  if(!['program','administrasi','penandatangan','surat','pks'].includes(section)||locked||remoteChanged||busy||snapshot===failedDraft)return;
  if(!untrack(()=>data&&snapshot!==saved))return;
  const timer=setTimeout(()=>{if(!busy&&dirty)void save();},800);
  return()=>clearTimeout(timer);
 });
 const blockers=$derived.by(()=>{
  if(!data)return [];
  if(!data.validation)return data.blockers;
  const v=data.validation;
  return validateJourney(v.campus,{journey:{...data.journey,fields},versions:v.version?[v.version]:[]},v.settings,v.tags).blockers;
 });
 const editableScope=$derived(revisionSection(section) as EditableSection);
 const locked=$derived(Boolean(data&&(data.paid||data.journey.status!=='draf'&&!(section==='ringkasan'&&data.journey.status==='revisi'&&openRevisions(data.journey).length)&&(!editableSections.includes(editableScope)||!canRevise(data.journey,editableScope)))));
 const waitingForPfPks=$derived(Boolean(data&&!data.paid&&['draf','revisi'].includes(data.journey.status)&&data.journey.datePolicy==='chronology'&&data.stale.includes('pks')));
 let requestForm=$state(false),requestReason=$state('');
 const sectionRequest=$derived(data?.journey.editRequests?.filter((request:any)=>request.section===editableScope).at(-1));
 $effect(()=>{void section;untrack(()=>{requestForm=false;requestReason='';});});
 const requests=$derived(openRevisions(data?.journey));
 const pendingRevisionLabels=$derived((data?.pendingRevisionScopes||[]).map((scope:keyof typeof REVISION_SCOPES)=>REVISION_SCOPES[scope].label));
 const sectionRequests=$derived(requests.filter(request=>request.scopes.some(scope=>REVISION_SCOPES[scope].section===editableScope)));
 const sectionNotes=$derived([...new Set(sectionRequests.map(request=>request.note))]);
 const canGenerate=(kind:string)=>!locked&&(kind!=='pks'||data?.journey.datePolicy!=='chronology')&&(data?.journey.status!=='revisi'||data.journey.revisionDocuments?.includes(kind)&&data.stale.includes(kind));
 const fieldLocked=(key:string)=>locked||(busy&&!saving)||!canEditField(data?.journey,key);
 const fileLocked=(key:string)=>locked||busy||!canUploadFile(data?.journey,key);
 const btn='min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0066B2] disabled:opacity-40';
 const docBtn='inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0066B2] disabled:opacity-40';
 const blue='min-h-11 rounded-lg bg-[#0066B2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
 const input='min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500';
 const programFields=[['judulProgram','Nama kegiatan / program'],['alamat','Alamat kampus']];
 const adminFields=[['namaBank','Nama bank'],['nomorRekening','Nomor rekening'],['namaPemilik','Nama pemilik rekening'],['penandatanganNama','Nama penandatangan PKS'],['penandatanganJabatan','Jabatan penandatangan PKS'],['tempatTandaTangan','Kota tempat surat dibuat']];
 function setGrantor(index:number,key:'name'|'title',value:string){const values=grantors(fields);values[index]={...values[index],[key]:value};fields.pemberiKuasaList=JSON.stringify(values);}
 const letterFields=[['nomorSuratPermohonan','Nomor surat permohonan'],['tanggalSuratPermohonan','Tanggal surat permohonan'],['nomorInvois','Nomor invoice'],['tanggalInvois','Tanggal invoice'],['nomorKuitansi','Nomor kuitansi'],['tanggalKuitansi','Tanggal kuitansi']];
 function sync(next:any,submitted?:Record<string,string>){if(disposed)return;const current=$state.snapshot(fields);data=next;fields={...next.journey.fields};if(next.journey.datePolicy!=='chronology'&&!next.paid&&!['menunggu','selesai'].includes(next.journey.status))fields.tanggalPerjanjian=PKS_DATE;saved=JSON.stringify(fields);if(submitted)for(const key of Object.keys(current))if(current[key]!==submitted[key])fields[key]=current[key];onloaded();}
 async function load(){try{const next=await dataService.api.get<any>(base);if(disposed||busy||next.serverRevision<data?.serverRevision)return;if(!dirty){remoteChanged=false;sync(next);}else if(next.serverRevision!==data?.serverRevision)remoteChanged=true;}catch(e){error = reportError(e instanceof Error?e.message:String(e));}}
 async function save(){
  if(disposed)return false;
  if(savePromise)return savePromise;
  savePromise=(async()=>{do{if(!await persist())return false;}while(!disposed&&dirty);return !disposed;})();
  try{return await savePromise;}finally{savePromise=null;}
 }
 async function persist(){
  if(disposed||busy)return false;if(!dirty)return true;const submitted=$state.snapshot(fields);busy=true;saving=true;failedDraft='';error='';message='';
  try{const next=await dataService.api.patch(base,{fields:submitted,revision:data.journey.revision,expectedRevision:data.serverRevision});if(disposed)return false;sync(next,submitted);if(!dirty&&Date.now()-lastDraftNotice>=20000){message='Draf tersimpan. Belum dikirim ke PF.';lastDraftNotice=Date.now();}return true;}
  catch(e){if(disposed)return false;failedDraft=JSON.stringify(submitted);error = reportError(e instanceof Error?e.message:String(e));if((e as any).status===409)remoteChanged=true;return false;}finally{busy=false;saving=false;}
 }
 async function navigate(next:Section){if(section==='rab')await load();if(!await save())return;preview=null;error='';await goto('/campus/pencairan?bagian='+next+'&butir='+({sk:'sk',program:'program',rab:'rab_penuh',administrasi:'administrasi',penandatangan:'penandatangan',surat:'surat',pks:'pks',ringkasan:'ringkasan'}[next]));}
 async function upload(slot:string,file?:File,control?:HTMLInputElement){
  if(!file)return;
  if(!await save()){if(control)control.value='';return;}busy=true;error='';message='';
  try{
   if(!file.size||file.size>2*1024*1024)throw Error('Berkas maksimal 2 MB.');
   if(slot==='kop'&&!['image/png','image/jpeg'].includes(file.type))throw Error('Kop surat harus berupa PNG atau JPG.');
   const body=new FormData();body.set('slot',slot);body.set('file',file);if(data.serverRevision!==undefined)body.set('expectedRevision',String(data.serverRevision));
   if(slot==='kop'){const image=await createImageBitmap(file);body.set('width',String(image.width));body.set('height',String(image.height));image.close();}
   sync(await dataService.api.post(base+'/upload',body));message='Berkas tersimpan dalam draf.';
  }catch(e){reportError(e instanceof Error?e.message:String(e));if(control)control.value='';}finally{busy=false;}
 }
 async function requestEdit(){
  if(busy||!requestReason.trim())return;busy=true;error='';
  try{sync(await dataService.api.post(base+'/edit-requests',{section:editableScope,reason:requestReason.trim(),expectedRevision:data.serverRevision}));requestForm=false;requestReason='';message='Permintaan revisi dikirim ke admin.';}
  catch(e){error=reportError(e instanceof Error?e.message:String(e));}finally{busy=false;}
 }
 let fileToRemove=$state<{slot:string;name:string}|null>(null);
 async function removeFile(slot:string){
  if(fileLocked(slot))return;
  if(!await save())return;busy=true;error='';
  try{sync(await dataService.api.patch(base,{removeFile:slot,revision:data.journey.revision,expectedRevision:data.serverRevision}));fileToRemove=null;message='Berkas dilepas dari pengajuan. Unggah berkas pengganti.';}
  catch(e){error=reportError(e instanceof Error?e.message:String(e));if((e as any).status===409)remoteChanged=true;}finally{busy=false;}
 }
 async function generate(kind:MergeKind){
  if(!await save())return;busy=true;error='';message='';
  try{sync(await dataService.api.post(base+'/dokumen/'+kind,{expectedRevision:data.serverRevision}));preview=kind;message=MERGE_LABEL[kind]+' dibuat dari data terbaru.';}
  catch(e){error = reportError(e instanceof Error?e.message:String(e));}finally{busy=false;}
 }
 async function generateAll(){
  if(!await save())return;busy=true;error='';message='';
  try{let next=data;for(const kind of MERGE_KINDS)if(next.stale.includes(kind)&&canGenerate(kind))next=await dataService.api.post(base+'/dokumen/'+kind,{expectedRevision:next.serverRevision});sync(next);preview='pks';message=next.stale.includes('pks')?'Surat pencairan sudah disiapkan. PKS masih perlu disiapkan ulang oleh Admin PF.':'Semua dokumen siap diperiksa.';}
  catch(e){error = reportError(e instanceof Error?e.message:String(e));void load();}finally{busy=false;}
 }
 async function submit(){
  if(!await save())return;
  if(waitingForPfPks){error=reportError(PF_PKS_PREPARATION);return;}
  if(data.journey.status==='revisi'&&pendingRevisionLabels.length){error=reportError('Belum ada perubahan pada '+pendingRevisionLabels.join(', ')+'. Perbaiki semua bagian yang dibuka PF sebelum mengirim.');return;}
  busy=true;error='';message='';
  try{if(data.journey.status==='revisi'){let next=data;for(const kind of next.stale.filter(canGenerate))next=await dataService.api.post(base+'/dokumen/'+kind,{expectedRevision:next.serverRevision});sync(next);}
   sync(await dataService.api.post(base+'/submit',{expectedRevision:data.serverRevision}));message='Pengajuan terkirim. PF akan memeriksa RAB dan dokumen Anda.';}
  catch(e){error = reportError(e instanceof Error?e.message:String(e));}finally{busy=false;}
 }
 function signedVersion(kind:MergeKind){const generated=latest(kind);return data.documents.find((d:any)=>d.kind===kind)?.versions.filter((v:any)=>v.signed&&(!generated||v.number>generated.number)).at(-1);}
 function openScan(kind:MergeKind){scanKind=kind;scanFile=null;scanNote='';error='';}
 async function uploadSigned(kind:MergeKind){
  if(busy||!scanFile||data.paid||data.journey.status!=='selesai')return;
  busy=true;error='';
  try{
   const body=new FormData();body.set('file',scanFile);body.set('signed','true');body.set('note',scanNote.trim());body.set('expectedRevision',String(data.serverRevision));
   await dataService.api.post(`/api/pencairan/${campusId}/documents/${kind}/versions`,body);
   sync(await dataService.api.get(base));scanKind=null;scanFile=null;scanNote='';message='Pindaian tersimpan. Admin PF akan membandingkan dengan dokumen final dan mencatat penerimaan asli.';
  }catch(e){error=reportError(e instanceof Error?e.message:'Pindaian belum dapat dikirim.');}finally{busy=false;}
 }
 function latest(kind:MergeKind){return data.documents.find((d:any)=>d.kind===kind)?.versions.filter((v:any)=>v.origin==='generated'&&(kind!=='pks'||data.journey.datePolicy!=='chronology'||v.mime==='application/pdf')).at(-1);}
 function canPreview(kind:MergeKind){return !!latest(kind)&&(kind==='pks'&&data.journey.datePolicy==='chronology'||!data.stale.includes(kind)||locked);}
 function docUrl(kind:MergeKind|'surat_kuasa'){if(kind==='pks'&&data.journey.datePolicy==='chronology'){const version=latest(kind);return version?`/api/pencairan/${campusId}/documents/pks/versions/${version.id}`:base+'/pks-pdf';}if(kind==='surat_kuasa')return base+'/surat-kuasa';const version=latest(kind);return data.journey.status!=='selesai'&&version?`/api/pencairan/${campusId}/documents/${kind}/versions/${version.id}/file`:base+'/dokumen/'+kind;}
 async function checkGuide(key:string,checked:boolean){if(busy)return;busy=true;error='';try{data=await dataService.api.patch(base+'/checklist',{key,checked,expectedRevision:data.serverRevision});onloaded();}catch(e){error = reportError(e instanceof Error?e.message:String(e));if((e as any).status===409)remoteChanged=true;}finally{busy=false;}}
 async function downloadPdf(kind:MergeKind){downloadingPdf=kind;try{await downloadDocumentPdf(docUrl(kind),kind+'.pdf');}catch(e){reportError(e instanceof Error?e.message:'PDF belum dapat diunduh.');}finally{downloadingPdf='';}}
 async function downloadKuasa(){
  if(!await save())return;busy=true;error='';
  try{const blob=await dataService.api.blob(base+'/surat-kuasa'),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Surat_Kuasa_'+campusId+'.docx';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);preview='surat_kuasa';}
  catch(e){error = reportError(e instanceof Error?e.message:String(e));}finally{busy=false;}
 }
 function requestLeave(action:()=>void){if(dirty)pending=action;else action();}
 beforeNavigate(n=>{if(!n.to||!dirty)return;
  n.cancel();const target=n.to.url.href;
  if(remoteChanged)requestLeave(()=>void goto(target));
  else void save().then(ok=>{if(ok)void goto(target);});});
 onMount(()=>{
  reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  void load();
  const timer=import.meta.env.MODE==='pocketbase-local'?setInterval(()=>{if(!busy&&document.visibilityState==='visible')void load();},10000):undefined;
  const focus=()=>{if(!busy)void load();};window.addEventListener('focus',focus);
  const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};
  const logout=(e:Event)=>{if(dirty){e.preventDefault();const resume=(e as CustomEvent).detail.resume;if(remoteChanged)requestLeave(resume);else void save().then(ok=>{if(ok)resume();});}};
  window.addEventListener('beforeunload',warn);window.addEventListener('beforelogout',logout);
  return()=>{clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('beforeunload',warn);window.removeEventListener('beforelogout',logout);};
 });
 $effect(()=>{const fileId=kopId;if(!fileId){kopUrl='';return;}let active=true,url='';void dataService.api.blob(base+'/file/kop').then(blob=>{url=URL.createObjectURL(blob);if(active)kopUrl=url;else URL.revokeObjectURL(url);}).catch(e=>{if(active)reportError(e instanceof Error?e.message:'Kop surat belum dapat dimuat.');});return()=>{active=false;if(url)requestAnimationFrame(()=>URL.revokeObjectURL(url));};});
 $effect(()=>{if(!data||locked||data.journey.lastSection===section||busy||dirty)return;const current=section;data.journey.lastSection=current;void dataService.api.patch(base,{lastSection:current,expectedRevision:data.serverRevision}).catch(()=>{});});
</script>

    {#snippet adminUpload(slot:string,label:string)}
     <section class="min-w-0 overflow-hidden rounded-xl border border-[#dce7f7] bg-white" aria-label={label}>
       <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
         <div><h3 class="text-sm font-semibold text-[#17365f]">{label}</h3><p class="mt-1 text-xs text-slate-500">{slot==='kop'?'PNG/JPG':'PDF/PNG/JPG'} &middot; maksimal 2 MB</p></div>
         {#if !fileLocked(slot)}<label class="relative inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-[#0066B2] transition hover:bg-blue-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500"><Icon name="upload" size={17}/><span class="field-caption">{data.journey.files[slot]?'Ganti file':'Pilih file'}</span><input class="sr-only" type="file" required={!data.journey.files[slot]||data.journey.files[slot].stale} aria-label={label} accept={slot==='kop'?'.png,.jpg,.jpeg':'.pdf,.png,.jpg,.jpeg'} disabled={fileLocked(slot)} onchange={e=>upload(slot,e.currentTarget.files?.[0],e.currentTarget)}/></label>{/if}
       </div>
       {#if data.journey.files[slot]}
         {#if slot==='kop'}<a class="group m-4 flex min-h-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4 focus-visible:outline-2 focus-visible:outline-blue-500 sm:mx-5" href={base+'/file/'+slot} target="_blank" rel="noreferrer" aria-label="Buka gambar kop surat ukuran penuh"><img class="max-h-64 max-w-full rounded bg-white object-contain shadow-sm transition group-hover:shadow-md" src={kopUrl} alt="Pratinjau kop surat kampus"/></a>{:else if slot==='rekening'}<div class="m-4 min-w-0 sm:mx-5" aria-label="Pratinjau buku rekening">{#key data.journey.files[slot].id}<FileViewer src={base+'/file/'+slot} mime={data.journey.files[slot].mime} name={data.journey.files[slot].name} height={360} showDownload={false}/>{/key}</div>{/if}
         <div class="flex min-w-0 flex-col items-stretch justify-between gap-4 px-4 pb-4 {slot==='kop'?'':'pt-4'} sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
           <div class="flex min-w-0 flex-1 items-start gap-3"><span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066B2]"><Icon name="file" size={20}/></span><div class="min-w-0"><a class="block break-words text-sm font-medium leading-5 text-[#17365f] hover:text-[#0066B2] hover:underline [overflow-wrap:anywhere]" href={base+'/file/'+slot} target="_blank" rel="noreferrer">{data.journey.files[slot].name}</a><p class="mt-1 text-xs text-slate-500">{data.journey.files[slot].stale?'Perlu diperbarui':'File tersimpan'}</p></div></div>
           <div class="flex shrink-0 flex-wrap items-center gap-2"><Button size="sm" variant="ghost" icon="external" href={base+'/file/'+slot} target="_blank">{slot==='kop'?'Lihat gambar':'Lihat file'}</Button>{#if !fileLocked(slot)}<Button size="sm" variant="danger" icon="trash" onclick={()=>{error='';fileToRemove={slot,name:data.journey.files[slot].name};}}>Hapus file</Button>{/if}</div>
         </div>
       {:else}<div class="flex items-center gap-3 px-4 py-6 text-sm text-slate-500 sm:px-5"><Icon name="upload" size={22}/><p>Belum ada file. Pilih {slot==='kop'?'gambar kop surat':'berkas'} untuk diunggah.</p></div>{/if}
     </section>
    {/snippet}

<div class={embedded?'grid min-w-0 gap-3 '+(section==='rab'?'':'p-4'):'mx-auto grid w-full max-w-[1400px] min-w-0 gap-5 p-4 sm:p-6'}>
 {#if !embedded}<header><p class="text-sm text-slate-500">Pencairan Dana</p><h1 class="mt-1 text-2xl font-bold text-slate-900">Pengajuan pencairan</h1><p class="mt-2 text-sm text-slate-600">Isian disimpan otomatis. Lengkapi data sesuai urutan menu, lalu ajukan setelah semuanya siap.</p></header>{/if}
 {#if remoteChanged}<p class="rounded-lg bg-amber-50 p-3 text-amber-900" role="alert">Data diperbarui oleh akun lain. Isian Anda tetap tersedia.<button class={btn+' ml-2'} onclick={()=>requestLeave(()=>{fields={...data.journey.fields};saved=JSON.stringify(fields);remoteChanged=false;void load();})}>Muat data terbaru</button></p>{/if}
 {#if error}<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700 {embedded&&section==='rab'?'mx-4 mt-4':''}" role="alert">{error}</p>{/if}
 {#if message}<div class="fixed inset-x-4 bottom-5 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg" role="status" aria-live="polite" transition:fly={{y:16,duration:reducedMotion?0:200}}><span aria-hidden="true" class="text-green-400">✓</span><span>{message}</span><button type="button" class="grid size-8 shrink-0 place-items-center rounded-md hover:bg-white/15 focus-visible:outline focus-visible:outline-2" aria-label="Tutup pemberitahuan" onclick={()=>message=''}>×</button></div>{/if}
 {#if !data}<p role="status">Memuat pengajuan…</p>{:else}
 {#if !embedded}<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><strong>{data.campus.name}</strong><p class="mt-1 text-sm text-slate-500">{data.paid?'Tahap 1 sudah dibayar':data.journey.status==='menunggu'?'Menunggu pemeriksaan PF':data.journey.status==='selesai'?'Disetujui · lanjutkan tanda tangan':data.journey.status==='revisi'?'Perlu revisi · periksa catatan PF':'Draf · belum diajukan'}</p></div><span class="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0066B2]">Nilai SK {formatSen(data.summary.amountSen)}</span></div>{/if}
 <div class={embedded?'min-w-0':'grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]'}>
  {#if !embedded}<nav class="flex gap-2 overflow-x-auto lg:block" aria-label="Bagian pengajuan pencairan">
   {#each sections as item,i}<button class="mb-2 flex min-h-14 min-w-[145px] flex-col items-start rounded-lg border px-3 py-2 text-left lg:w-full {section===item?'border-blue-300 bg-blue-50 text-[#0066B2]':'border-slate-200 bg-white text-slate-700'}" aria-current={section===item?'step':undefined} disabled={busy} onclick={()=>navigate(item)}><span class="text-sm font-bold">{i+1}. {sectionLabels[i]}</span><span class="mt-1 text-xs">{item==='ringkasan'?'Periksa sebelum mengirim':locked?'Lihat hasil pemeriksaan':blockers.some((b:any)=>b.section===item)?'Belum lengkap':'Siap diperiksa'}</span></button>{/each}
  </nav>{/if}
  <section class={embedded?'min-w-0':'min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5'} aria-label="Isi pengajuan">
   {#if !embedded||section!=='rab'}<h2 class="mb-2 text-xl font-bold">{sectionLabels[index]}</h2>{/if}
   {#if sectionNotes.length}<aside class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm" aria-label="Catatan revisi bagian ini"><h3 class="font-semibold text-amber-950">Catatan perbaikan dari PF</h3>{#each sectionNotes as note}<p class="mt-1 whitespace-pre-wrap text-amber-950">{note}</p>{/each}</aside>{/if}
   {#if waitingForPfPks&&['pks','ringkasan'].includes(section)}<aside class="mb-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm" aria-label="Menunggu PDF PKS dari PF"><h3 class="font-semibold">Menunggu PDF PKS terbaru dari Admin PF</h3><p>{PF_PKS_PREPARATION}</p><Button size="sm" variant="secondary" icon="reset" disabled={busy||dirty} onclick={()=>void load()}>Perbarui status dokumen</Button></aside>{/if}
   {#if locked}<p class="mb-3 text-sm text-slate-500">Hanya lihat. Data dapat diubah setelah akses revisi disetujui admin.</p>{:else if ['program','administrasi','penandatangan','surat','pks'].includes(section)}<p class="mb-3 text-xs text-slate-500"><span class="font-bold text-red-600">*</span> {data.journey.status==='revisi'?'Wajib dilengkapi sebelum mengirim perbaikan.':'Wajib dilengkapi sebelum mengajukan. Anda tetap dapat berpindah menu.'} Draf boleh disimpan saat isian belum lengkap.</p>{/if}
   {#if section==='sk'}
    <p class="mb-4 text-sm text-slate-600">Gunakan nilai bantuan dalam SK sebagai acuan seluruh anggaran.</p>
    <dl class="mb-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"><div><dt class="text-sm text-slate-500">Nomor SK</dt><dd class="font-semibold">{data.summary.skNumber}</dd></div><div><dt class="text-sm text-slate-500">Nilai bantuan</dt><dd class="font-semibold">{formatSen(data.summary.amountSen)}</dd></div></dl>
    <FileViewer src="/api/pencairan/sk" mime="application/pdf" name="SK.pdf" height={420}/>
   {:else if section==='program'}
    <p class="mb-4 text-sm text-slate-600">Data awal diambil dari profil kampus. Periksa nama kegiatan dan lokasi sebelum dipakai dalam surat.</p>
     <div class="grid gap-5">
      <div class="grid gap-4 sm:grid-cols-2">{#each programFields as [key,label]}<label class="grid gap-1 text-sm font-semibold"><span class="field-caption">{label}</span><input class={input} required bind:value={fields[key]} disabled={fieldLocked(key)} maxlength="2000"/></label>{/each}</div>
      <ProgramLocation bind:fields disabled={locked||(busy&&!saving)||!canRevise(data.journey,'program')} />
      {#if data.journey.status==='revisi'&&!locked&&requiresKuasaUpdate({...data.journey,fields})}<section class="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><p class="text-sm">Nama program tercantum pada surat kuasa. Unduh versi terbaru dan unggah kembali hasil tanda tangan untuk mengikuti perbaikan Data Program.</p><button class={btn+' justify-self-start'} disabled={busy} onclick={downloadKuasa}>Unduh template surat kuasa</button><label class="grid gap-1 text-sm font-semibold">Surat kuasa terbaru<input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} onchange={e=>upload('kuasa',e.currentTarget.files?.[0],e.currentTarget)}/></label></section>{/if}
      <div class="grid gap-4 sm:grid-cols-2">{#each [['mentor','Nama mentor'],['koordinator','Nama koordinator']] as [key,label]}<label class="grid gap-1 text-sm font-semibold"><span class="field-caption">{label}</span><input class={input} required bind:value={fields[key]} disabled={fieldLocked(key)} maxlength="2000"/></label>{/each}</div>
     </div>
   {:else if section==='rab'}
    <RabUpload {campusId} kind={page.url.searchParams.get('rabStep')==='term1'||page.url.searchParams.get('butir')==='rab'?'rab':page.url.searchParams.get('rabStep')==='term2'||page.url.searchParams.get('butir')==='rab_tahap2'?'rab_tahap2':'rab_penuh'} admin={false} journey={true} locked={locked||!canRevise(data.journey,'rab')} onloaded={()=>void load()} oncontinue={()=>navigate('penandatangan')}/>
   {:else if section==='administrasi'}
    <p class="mb-4 text-sm text-slate-600">Lengkapi rekening tujuan pencairan dan unggah foto buku rekening.</p>
<div class="grid gap-4 ">
       <label class="mb-4 grid gap-1 text-sm font-semibold"><span class="field-caption">Rekening penerima</span><select class={input} required bind:value={fields.jenisRekening} disabled={fieldLocked('jenisRekening')}><option value="kampus">Rekening kampus</option><option value="kuasa">Rekening Bersama</option></select></label>
       <div class="grid gap-4 sm:grid-cols-2">{#each adminFields.slice(0,3) as [key,label]}<label class="grid gap-1 text-sm font-semibold"><span class="field-caption">{label}</span><input class={input} required={key!=='kecamatan'} bind:value={fields[key]} disabled={fieldLocked(key)} inputmode={key==='nomorRekening'?'numeric':'text'} maxlength="2000"/></label>{/each}</div>
       {@render adminUpload('rekening','Foto Buku Rekening')}
       {#if fields.jenisRekening==='kampus'}<p class="text-sm text-slate-600">Rekening kampus tidak memerlukan surat kuasa.</p>{/if}
      </div>
    {#if fields.jenisRekening==='kuasa'}
     <section class="mt-5 rounded-xl border border-slate-200 p-4">
<div class="grid gap-4 ">
        <section class="grid gap-3"><h3 class="font-bold">Surat kuasa diperlukan</h3><p class="text-sm">Rekening bersama memerlukan surat kuasa. Lengkapi identitas kuasa di bawah, data Penandatangan Kampus, kop pada Identitas Surat dan Kop, serta tanggal PKS dari PF. Tanggal surat kuasa harus setelah tanggal PKS. Unduh template, tandatangani, lalu unggah surat kuasa terpisah dari foto buku rekening.</p><p class="text-sm">{#if data.journey.datePolicy==='chronology'}Semua pemberi dan penerima kuasa wajib menandatangani. PF memeriksa kewenangan pemberi kuasa. Penerima kuasa harus sama dengan pemilik rekening.{:else}Pemberi kuasa adalah penandatangan kampus. Penerima kuasa harus sama dengan pemilik rekening.{/if}</p>{#if data.journey.datePolicy==='chronology'}{#each grantors(fields) as giver,i}<fieldset class="grid gap-2 rounded-lg border p-3"><legend>Pemberi kuasa {i+1}</legend>{#each [['name','Nama'],['title','Jabatan']] as [key,label]}<label class="grid gap-1">{label}<input class={input} value={giver[key as 'name'|'title']} disabled={fieldLocked('pemberiKuasaList')} oninput={event=>setGrantor(i,key as 'name'|'title',event.currentTarget.value)}/></label>{/each}<button class={btn} disabled={fieldLocked('pemberiKuasaList')} onclick={()=>fields.pemberiKuasaList=JSON.stringify(grantors(fields).filter((_,index)=>index!==i))}>Hapus pemberi kuasa {i+1}</button></fieldset>{/each}<button class={btn} disabled={fieldLocked('pemberiKuasaList')||grantors(fields).length>=20} onclick={()=>fields.pemberiKuasaList=JSON.stringify([...grantors(fields),{name:'',title:''}])}>Tambah pemberi kuasa</button>{/if}{#each (data.journey.datePolicy==='chronology'?[['penerimaKuasa','Nama penerima kuasa']]:[['pemberiKuasa','Nama pemberi kuasa'],['penerimaKuasa','Nama penerima kuasa']]) as [key,label]}<label class="grid gap-1 text-sm font-semibold"><span class="field-caption">{label}</span><input class={input} required={key!=='kecamatan'} bind:value={fields[key]} disabled={fieldLocked(key)}/></label>{/each}<label class="grid gap-1 text-sm font-semibold"><span class="field-caption">Tanggal surat kuasa</span><input class={input} type="date" min={data.journey.datePolicy==='chronology'?minimumDate('tanggalKuasa',fields):LETTER_MIN_DATE} required bind:value={fields.tanggalKuasa} disabled={fieldLocked('tanggalKuasa')}/></label><button class={btn+' justify-self-start'} disabled={busy||locked} onclick={downloadKuasa}>Unduh template surat kuasa</button><DocumentGuide kind="surat_kuasa" checklist={data.journey.checklist} kuasa={true} onchange={checkGuide}/></section>
        {@render adminUpload('kuasa','Surat kuasa')}
       </div>
     </section>
    {/if}
   {:else if section==='penandatangan'}
<div class="grid gap-4 ">
       <p class="text-sm text-slate-600">PKS ditandatangani pejabat kampus yang berwenang, misalnya rektor, wakil rektor, atau mentor.</p>
       <div class="grid gap-4 sm:grid-cols-2">{#each adminFields.slice(3) as [key,label]}<label class="grid gap-1 text-sm font-semibold"><span class="field-caption">{label}</span><input class={input} required={key!=='kecamatan'} bind:value={fields[key]} disabled={fieldLocked(key)} inputmode={key==='nomorRekening'?'numeric':'text'} maxlength="2000"/></label>{/each}</div>
       <div class="grid gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span class="field-caption font-semibold">Penandatangan RAB, surat permohonan, invois, dan kuitansi</span><span class="font-semibold text-slate-900">{parseContacts(fields.mentor)[0]?.name||'Belum diisi'} (Mentor)</span><span class="text-slate-600">Diambil dari Data Program. Ubah di Data Program bila perlu.</span></div>
      </div>
   {:else if section==='surat'}
    <p class="mb-4 text-sm text-slate-600">Lengkapi identitas surat dan unggah kop yang akan dipakai pada dokumen pencairan.</p>
<div class="grid gap-4 ">
       <p class="mb-3 text-sm text-slate-600">{#if data.journey.datePolicy==='chronology'}SK &le; PKS &lt; permohonan &le; invoice &lt; kuitansi. Tanggal tidak berubah otomatis saat tanggal sebelumnya diubah.{:else}Tanggal PKS: 17 Juni 2026. Tanggal dokumen pencairan paling awal 18 Juni 2026.{/if}</p><div class="grid gap-4 sm:grid-cols-2">{#each letterFields as [key,label]}<label class="grid gap-1 text-sm font-semibold"><span class="field-caption">{label}</span><input class={input} type={key.startsWith('tanggal')?'date':'text'} min={key.startsWith('tanggal')?(data.journey.datePolicy==='chronology'?minimumDate(key,fields):LETTER_MIN_DATE):undefined} required={key!=='kecamatan'} bind:value={fields[key]} disabled={fieldLocked(key)}/></label>{/each}</div>
       {@render adminUpload('kop','Kop surat kampus')}
      </div>
   {:else if section==='pks'}
    <p class="mb-4 text-sm text-slate-600">Lengkapi data khusus PKS. Identitas kampus, program, dan pembagian dana diambil dari langkah sebelumnya.</p>
    <div class="grid gap-4 sm:grid-cols-2"><label class="grid gap-1 text-sm font-semibold"><span class="field-caption">Nomor PKS kampus</span><input class={input} required bind:value={fields.nomorPksKampus} disabled={fieldLocked('nomorPksKampus')}/></label><label class="grid gap-1 text-sm font-semibold"><span class="field-caption">Tanggal perjanjian</span><input class={input} type="date" bind:value={fields.tanggalPerjanjian} readonly/></label></div>
    <dl class="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2"><div><dt class="font-semibold">Diisi kampus</dt><dd>Nomor PKS kampus, identitas, nama dan jabatan satu penandatangan.</dd></div><div><dt class="font-semibold">Diisi PF</dt><dd>{data.pf.nomorPksPf||'masih menunggu surat dari PF'}<br/>{data.pf.name} - {data.pf.title}</dd></div><div><dt class="font-semibold">Otomatis dari pengajuan</dt><dd>Nama program, nilai SK, nominal termin, identitas dan rekening.</dd></div><div><dt class="font-semibold">Tanggal dan naskah PKS</dt><dd>{#if data.journey.datePolicy==='chronology'}Tanggal PKS dan masa perjanjian ditentukan PF untuk pengajuan ini.{:else}Tanggal PKS 17 Juni 2026.{/if} Naskah memakai templat PF; kebutuhan lampiran mengikuti jenis rekening.</dd></div></dl>
   {:else}
    <p class="mb-4 text-sm text-slate-600">Periksa data dan dokumen sebelum mengirim satu pengajuan kepada PF.</p>
    <dl class="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">{#each [['Nilai SK',formatSen(data.summary.amountSen)],['Total RAB 100%',formatSen(data.rab?.totalSen||0)],['Termin 1 · maksimal 70%',formatSen(data.rab?.term1Sen||0)],['Termin 2 · sisa',formatSen(data.rab?.term2Sen||0)],['Nama kegiatan',fields.judulProgram],['Rekening tujuan',`${fields.namaBank} · ${maskAccountNumber(fields.nomorRekening)} · ${fields.namaPemilik}`]] as [label,value]}<div><dt class="text-xs text-slate-500">{label}</dt><dd class="mt-1 break-words text-sm font-semibold">{value||'Belum diisi'}</dd></div>{/each}</dl>
    {#if data.journey.history.length}<details class="mt-4 rounded-lg border p-3"><summary class="cursor-pointer text-sm font-semibold">Riwayat pengajuan ({data.journey.history.length})</summary>{#each [...data.journey.history].reverse() as packet}<div class="mt-3 border-t pt-3 text-sm"><strong>Pengajuan {packet.number} · {new Date(packet.created).toLocaleString('id-ID')}</strong><p>{packet.fields.judulProgram} · {packet.fields.namaBank} · {maskAccountNumber(packet.fields.nomorRekening || '')}</p></div>{/each}</details>{/if}
   {/if}
   {#if section!=='rab'&&blockers.some((b:any)=>section==='ringkasan'||b.section===section)}<aside class="mt-4 rounded-lg bg-amber-50 p-3"><h3 class="text-sm font-semibold">Masih perlu dilengkapi</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{#each blockers.filter((b:any)=>section==='ringkasan'||b.section===section) as b}<li>{b.text}{#if section==='pks'&&data.journey.datePolicy==='chronology'}<p class="mt-3 text-sm text-slate-600">PF menyiapkan PDF PKS. Setelah nomor kampus diisi, PF menyiapkan ulang PDF lengkap. Dokumen kampus tetap bertanda DRAF sampai PF dan Legal menyetujui.</p>{#if data.journey.pksReview}<a class={btn+' inline-block mt-3'} href={base+'/pks-pdf'} target="_blank" rel="noreferrer">Lihat PDF PKS</a>{/if}{/if}{#if section==='ringkasan'} <button type="button" class="font-semibold underline" onclick={()=>navigate(b.section)}>Buka {sectionLabels[sections.indexOf(b.section)]||b.section}</button>{/if}</li>{/each}</ul></aside>{/if}
   {#if section==='ringkasan'}
    <section class="mt-5 grid gap-3" aria-label="Dokumen otomatis">
     <div class="flex flex-wrap items-center justify-between gap-3"><h3 class="font-bold">Dokumen dari data pengajuan</h3>{#if data.stale.some(canGenerate)}<button class={docBtn} disabled={busy||blockers.length>0} onclick={generateAll}>{data.journey.datePolicy==='chronology'?'Siapkan surat pencairan':'Siapkan semua dokumen'}</button>{/if}</div>
     {#each MERGE_KINDS as kind}
      {@const doc=data.documents.find((d:any)=>d.kind===kind)}
      {@const signed=signedVersion(kind)}
      <article class="min-w-0 space-y-4 rounded-xl border border-[#dce7f7] bg-white p-4 sm:p-5">
       <div class="flex flex-wrap items-center justify-between gap-3">
        <div><h4 class="inline font-semibold text-[#17365f]">{MERGE_LABEL[kind]}</h4><span class="ml-2 text-xs text-slate-500">{doc?.status==='sesuai'?'Sesuai':doc?.status==='perlu_revisi'?'Perlu revisi':doc?.status==='menunggu_review'?'Menunggu PF':'Draf'}</span><p class="mt-1 text-xs text-slate-500">{data.stale.includes(kind)?kind==='pks'&&data.journey.datePolicy==='chronology'?'Menunggu PDF terbaru dari Admin PF':latest(kind)?'Data berubah, buat ulang dokumen':'Belum dibuat':'Menggunakan data terbaru'}{latest(kind)?` / versi ${latest(kind).number}`:''}</p></div>
        <div class="flex flex-wrap gap-2">
         {#if canGenerate(kind)}<Button size="sm" variant="secondary" disabled={busy||blockers.length>0} onclick={()=>generate(kind)}>{latest(kind)?'Buat ulang':'Buat'} {MERGE_LABEL[kind]}</Button>{/if}
         {#if canPreview(kind)}<Button size="sm" variant="secondary" icon="download" label={'Unduh PDF '+MERGE_LABEL[kind]} disabled={!!downloadingPdf} onclick={()=>downloadPdf(kind)}>{downloadingPdf===kind?'Menyiapkan PDF...':'PDF'}</Button>{#if kind!=='pks'||data.journey.datePolicy!=='chronology'}<a aria-label={'Unduh DOCX '+MERGE_LABEL[kind]} class={docBtn} href={docUrl(kind)} download>DOCX</a>{/if}{/if}
         {#if data.journey.status==='selesai'&&!data.paid&&!doc?.signedReceived}<Button size="sm" icon="upload" disabled={busy} onclick={()=>openScan(kind)}>{signed?'Ganti pindaian':'Unggah bertanda tangan'}</Button>{/if}
        </div>
       </div>
       {#if scanKind===kind&&data.journey.status==='selesai'&&!data.paid&&!doc?.signedReceived}
        <form class="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4" aria-label={'Unggah pindaian '+MERGE_LABEL[kind]} onsubmit={event=>{event.preventDefault();void uploadSigned(kind);}}>
         <div><h5 class="font-semibold text-[#17365f]">Pindaian {MERGE_LABEL[kind]} bertanda tangan</h5><p class="mt-1 text-sm text-slate-600">Unggah hasil pindai dokumen final yang sudah ditandatangani. Admin PF akan memeriksa kesesuaiannya.</p></div>
         <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[#0066B2] focus-within:outline-2 focus-within:outline-blue-500"><Icon name="upload" size={18}/>Pilih pindaian<input class="sr-only" type="file" aria-label={'Pindaian '+MERGE_LABEL[kind]} accept=".pdf,.png,.jpg,.jpeg,.webp" disabled={busy} onchange={event=>{scanFile=event.currentTarget.files?.[0]||null;}}/></label>
         <p class="break-words text-sm text-slate-600">{scanFile?.name||'Belum ada file dipilih.'}</p><p class="text-xs text-slate-500">PDF, PNG, JPG atau WebP. Maksimal 40 MB.</p>
         <label class="grid gap-2 text-sm font-medium text-[#17365f]">Catatan unggahan (opsional)<textarea class="min-h-20 rounded-lg border border-[#cfe0f5] bg-white p-3 font-normal" maxlength="2000" bind:value={scanNote} disabled={busy}></textarea></label>
         <div class="flex flex-wrap gap-2"><Button type="submit" icon="upload" disabled={busy||!scanFile}>Kirim pindaian</Button><Button variant="ghost" disabled={busy} onclick={()=>{scanKind=null;scanFile=null;scanNote='';}}>Batal</Button></div>
        </form>
       {/if}
       {#if signed}<section class="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4" aria-label={'Pindaian tersimpan '+MERGE_LABEL[kind]}><div><h5 class="font-semibold text-[#17365f]">Pindaian bertanda tangan</h5><p class="mt-1 text-sm text-slate-600">{doc?.signedReceived?'Sudah diperiksa dan dinyatakan sesuai oleh PF.':'Sudah diunggah. Menunggu PF membandingkan dengan dokumen final.'}</p></div><FileViewer src={`/api/pencairan/${campusId}/documents/${kind}/versions/${signed.id}`} mime={signed.mime} name={signed.originalName} height={360}/></section>{/if}
       {#if canPreview(kind)}<section class="min-w-0 overflow-hidden rounded-lg border" aria-label={'Pratinjau '+MERGE_LABEL[kind]}>{#key kind+latest(kind)?.id+data.journey.status+data.journey.revision}<FileViewer src={docUrl(kind)} pdf mime={kind==='pks'&&data.journey.datePolicy==='chronology'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'} name={kind+'.pdf'} height={620} showDownload={false}/>{/key}</section>{/if}
       {#if kind==='pks'&&data.journey.datePolicy==='chronology'&&data.stale.includes(kind)}<p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{latest(kind)?'PDF di atas adalah draf sebelumnya. Data telah berubah; Admin PF perlu menyiapkan ulang PDF sebelum Anda dapat mengajukan paket.':'Admin PF belum menyiapkan PDF PKS. Lengkapi nomor PKS kampus pada bagian PKS, lalu minta PF menyiapkan PDF.'}</p>{/if}
       <DocumentGuide {kind} disabled={locked||busy} checklist={data.journey.checklist} kuasa={fields.jenisRekening==='kuasa'} onchange={checkGuide}/>
      </article>
     {/each}
    </section>
    {#if preview==='surat_kuasa'}<section class="mt-4 min-w-0 overflow-hidden rounded-lg border"><h3 class="border-b p-3 font-semibold">Pratinjau {preview==='surat_kuasa'?'surat kuasa':MERGE_LABEL[preview]}</h3>{#key preview+data.journey.revision}<FileViewer src={docUrl(preview)} mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document" name={preview+'.docx'} height={620}/>{/key}</section>{/if}
   {/if}
   {#if data.journey.status==='revisi'&&!locked}<footer class="mt-6 grid gap-3 border-t pt-4"><p class="text-sm text-slate-600">Surat pencairan yang terdampak diperbarui saat perbaikan dikirim. PDF PKS disiapkan Admin PF. Persetujuan bagian lain tetap tersimpan.</p><button class={blue+' justify-self-end'} disabled={busy||waitingForPfPks||blockers.length>0||!requests.length||!dirty&&pendingRevisionLabels.length>0} onclick={submit}>Kirim perbaikan</button>{#if pendingRevisionLabels.length}<p class="text-sm text-amber-900">Bagian yang masih perlu perubahan tersimpan: {pendingRevisionLabels.join(', ')}.</p>{:else if data.revisionBlockers?.length}<p class="text-sm text-amber-900">Perbaiki isian atau berkas sesuai catatan PF sebelum mengirim.</p>{/if}</footer>{:else if section!=='rab'}<footer class="mt-6 flex flex-wrap justify-between gap-3 border-t pt-4"><div class="flex flex-wrap gap-2">{#if index>0}<button class={btn} disabled={busy} onclick={()=>navigate(sections[index-1])}>Kembali</button>{/if}</div>{#if section==='ringkasan'}{#if !locked}<button class={blue} disabled={busy||dirty||blockers.length>0||data.stale.length>0||data.revisionBlockers?.length>0} onclick={submit}>{data.journey.status==='revisi'?'Kirim perbaikan':'Ajukan untuk diperiksa'}</button>{/if}{:else}<button class={blue} disabled={busy} onclick={()=>navigate(sections[index+1])}>Lanjut: {sectionLabels[index+1]}</button>{/if}</footer>{/if}
   {#if section==='ringkasan'&&data.revisionBlockers?.length&&!locked}<p class="mt-3 text-sm text-amber-900">Selesaikan catatan revisi sebelum mengirim ulang: {data.revisionBlockers.map((k:Kind)=>KIND_SHORT[k]).join(', ')}. Unggah berkas pengganti, buat ulang dokumen, atau perbaiki alokasi RAB sesuai catatan PF.</p>{/if}
   {#if section==='ringkasan'&&data.stale.length&&!locked}<p class="mt-3 text-sm text-amber-900">{data.stale.includes('pks')&&data.journey.datePolicy==='chronology'?'PKS menunggu PDF terbaru dari Admin PF. Siapkan surat lain yang belum tersedia, lalu perbarui status setelah PF selesai.':'Buat semua dokumen dari data terbaru sebelum mengajukan.'}</p>{/if}
   {#if locked&&editableSections.includes(editableScope)}
    <section class="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label="Permintaan revisi">
     <p class="text-sm text-slate-600">Ajukan revisi untuk meminta akses edit dari admin.</p>
     {#if sectionRequest}<div class="rounded-lg bg-slate-50 p-3 text-sm"><strong>{sectionRequest.status==='pending'?'Menunggu persetujuan admin':sectionRequest.status==='rejected'?'Permintaan revisi ditolak':'Permintaan revisi disetujui'}</strong><p class="mt-1 whitespace-pre-wrap">Alasan: {sectionRequest.reason}</p>{#if sectionRequest.decisionNote}<p class="mt-1 whitespace-pre-wrap">Catatan admin: {sectionRequest.decisionNote}</p>{/if}</div>{/if}
     {#if !data.paid&&sectionRequest?.status!=='pending'}
      {#if requestForm}<form class="grid gap-4" onsubmit={event=>{event.preventDefault();void requestEdit();}}><label class="grid gap-2 text-sm font-semibold"><span class="field-caption">Alasan pengajuan revisi</span><textarea class={input} required maxlength="2000" rows="3" bind:value={requestReason} disabled={busy}></textarea></label><div class="flex flex-wrap justify-end gap-2"><button type="button" class={btn} disabled={busy} onclick={()=>requestForm=false}>Batal</button><button class={blue} disabled={busy||!requestReason.trim()}>Kirim permintaan revisi</button></div></form>{:else}<div class="flex justify-end"><button class={blue} disabled={busy} onclick={()=>requestForm=true}>Ajukan Revisi</button></div>{/if}
     {:else if data.paid}<p class="text-sm text-slate-500">Pengajuan sudah dibayar. Akses edit tidak dapat dibuka.</p>{/if}
    </section>
   {/if}
   {#if ['program','administrasi','penandatangan','surat','pks'].includes(section)&&!locked}<p class="mt-3 text-sm text-slate-500" role="status">{busy?'Menyimpan draf…':dirty?'Perubahan belum tersimpan. Draf disimpan otomatis setelah selesai mengetik.':'Draf tersimpan otomatis. Belum dikirim ke PF.'}</p>{#if error&&dirty&&!remoteChanged}<button class={btn+' mt-2'} disabled={busy} onclick={save}>Coba simpan lagi</button>{/if}{:else if dirty}<p class="mt-3 text-sm text-amber-900" role="status">Perubahan belum tersimpan.</p>{/if}
  </section>
 </div>
 {/if}
</div>
{#if pending}<Modal title="Perubahan belum disimpan" onclose={()=>pending=null}><p>Simpan draf agar isian Anda tidak hilang.</p><div class="mt-4 flex flex-wrap justify-end gap-2"><button class={btn} onclick={()=>pending=null}>Tetap di sini</button><button class={btn} onclick={()=>{const action=pending;pending=null;fields={...data.journey.fields};saved=JSON.stringify(fields);action?.();}}>Buang perubahan</button><button class={blue} disabled={busy} onclick={async()=>{if(await save()){const action=pending;pending=null;action?.();}}}>Simpan dan lanjutkan</button></div></Modal>{/if}

{#if fileToRemove}<Modal title="Hapus file?" onclose={()=>{if(!busy)fileToRemove=null;}}><p class="break-words text-sm text-slate-700">Hapus <strong>{fileToRemove.name}</strong> dari pengajuan? Unggah file pengganti sebelum mengirim.</p>{#if error}<p class="mt-3 text-sm text-red-700" role="alert">{error}</p>{/if}<div class="mt-4 flex justify-end gap-2"><button type="button" class={btn} disabled={busy} onclick={()=>fileToRemove=null}>Batal</button><button type="button" class="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={busy||fileLocked(fileToRemove.slot)} onclick={()=>removeFile(fileToRemove!.slot)}>{busy?'Menghapus...':'Hapus file'}</button></div></Modal>{/if}
