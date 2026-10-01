<script lang="ts">
 import { onMount } from 'svelte';
 import { page } from '$app/state';
 import { beforeNavigate, goto } from '$app/navigation';
 import { dataService } from '$lib/data/service';
 import { formatSen } from '$lib/pencairan';
 import { MERGE_KINDS, MERGE_LABEL, type MergeKind } from '$lib/merge';
 import Modal from '$lib/components/ui/Modal.svelte';
 import FileViewer from '$lib/components/admin/pencairan/FileViewer.svelte';
 import RabUpload from './RabUpload.svelte';
 import DocumentGuide from './DocumentGuide.svelte';
 import { sections, sectionLabels, PKS_DATE, LETTER_MIN_DATE, type Section, validateJourney } from './journey';
 let {campusId,embedded=false,onloaded=()=>{}}:{campusId:string;embedded?:boolean;onloaded?:()=>void}=$props();
 let remoteChanged=$state(false);
 let data=$state<any>(null),fields=$state<Record<string,string>>({}),saved=$state('{}'),busy=$state(false),error=$state(''),message=$state(''),kopUrl=$state(''),preview=$state<MergeKind|'surat_kuasa'|null>(null),pending=$state<(()=>void)|null>(null);
 const base=$derived(`/api/pencairan/${campusId}/pengajuan`);
 const section=$derived((sections.includes(page.url.searchParams.get('bagian') as Section)?page.url.searchParams.get('bagian'):page.url.searchParams.get('butir')==='sk'?'sk':['rab_penuh','rab','rab_tahap2'].includes(page.url.searchParams.get('butir')||'')?'rab':page.url.searchParams.get('butir')==='program'?'program':page.url.searchParams.get('butir')==='administrasi'?'administrasi':page.url.searchParams.get('butir')==='ringkasan'?'ringkasan':page.url.searchParams.get('butir')==='pks'?'pks':['rekening','surat_kuasa','invois','permohonan','kuitansi'].includes(page.url.searchParams.get('butir')||'')?'administrasi':data?.journey.lastSection||'sk') as Section);
 const index=$derived(sections.indexOf(section));
 const kopId=$derived(data?.journey.files.kop?.id||'');
 const dirty=$derived(JSON.stringify(fields)!==saved);
 const blockers=$derived.by(()=>{
  if(!data)return [];
  if(!data.validation)return data.blockers;
  const v=data.validation;
  return validateJourney(v.campus,{journey:{...data.journey,fields},versions:v.version?[v.version]:[]},v.settings,v.tags).blockers;
 });
 const locked=$derived(Boolean(data&&(data.paid||['menunggu','selesai'].includes(data.journey.status))));
 const btn='min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0066B2] disabled:opacity-40';
 const blue='min-h-11 rounded-lg bg-[#0066B2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
 const input='min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500';
 const programFields=[['judulProgram','Nama kegiatan / program'],['alamat','Alamat kampus'],['desa','Desa / lokasi program'],['kecamatan','Kecamatan'],['kabupaten','Kabupaten / kota'],['mentor','Nama mentor'],['koordinator','Nama koordinator']];
 const adminFields=[['namaBank','Nama bank'],['nomorRekening','Nomor rekening'],['namaPemilik','Nama pemilik rekening'],['penandatanganNama','Nama penandatangan kampus'],['penandatanganJabatan','Jabatan penandatangan'],['tempatTandaTangan','Kota tempat surat dibuat']];
 const letterFields=[['nomorSuratPermohonan','Nomor surat permohonan'],['tanggalSuratPermohonan','Tanggal surat permohonan'],['nomorInvois','Nomor invoice'],['tanggalInvois','Tanggal invoice'],['nomorKuitansi','Nomor kuitansi'],['tanggalKuitansi','Tanggal kuitansi']];
 function sync(next:any){data=next;fields={...next.journey.fields};saved=JSON.stringify(fields);if(!next.paid&&!['menunggu','selesai'].includes(next.journey.status))fields.tanggalPerjanjian=PKS_DATE;onloaded();}
 async function load(){try{const next=await dataService.api.get<any>(base);if(busy||next.serverRevision<data?.serverRevision)return;if(!dirty){remoteChanged=false;sync(next);}else if(next.serverRevision!==data?.serverRevision)remoteChanged=true;}catch(e){error=e instanceof Error?e.message:String(e);}}
 async function save(){
  if(busy)return false;if(!dirty)return true;busy=true;error='';message='';
  try{sync(await dataService.api.patch(base,{fields:$state.snapshot(fields),revision:data.journey.revision,expectedRevision:data.serverRevision}));message='Draf tersimpan. Belum dikirim ke PF.';return true;}
  catch(e){error=e instanceof Error?e.message:String(e);if((e as any).status===409)remoteChanged=true;return false;}finally{busy=false;}
 }
 async function navigate(next:Section){if(!await save())return;if(section==='rab')await load();preview=null;error='';await goto('/campus/pencairan?bagian='+next+'&butir='+({sk:'sk',program:'program',rab:'rab_penuh',administrasi:'administrasi',pks:'pks',ringkasan:'ringkasan'}[next]));}
 async function upload(slot:string,file?:File){
  if(!file||!await save())return;busy=true;error='';message='';
  try{
   if(!file.size||file.size>2*1024*1024)throw Error('Pilih berkas maksimal 2 MB.');
   if(slot==='kop'&&!['image/png','image/jpeg'].includes(file.type))throw Error('Kop surat harus berupa PNG atau JPG.');
   const body=new FormData();body.set('slot',slot);body.set('file',file);if(data.serverRevision!==undefined)body.set('expectedRevision',String(data.serverRevision));
   if(slot==='kop'){const image=await createImageBitmap(file);body.set('width',String(image.width));body.set('height',String(image.height));image.close();}
   sync(await dataService.api.post(base+'/upload',body));message='Berkas tersimpan dalam draf.';
  }catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
 async function generate(kind:MergeKind){
  if(!await save())return;busy=true;error='';message='';
  try{sync(await dataService.api.post(base+'/dokumen/'+kind,{expectedRevision:data.serverRevision}));preview=kind;message=MERGE_LABEL[kind]+' dibuat dari data terbaru.';}
  catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
 async function generateAll(){
  if(!await save())return;busy=true;error='';message='';
  try{let next=data;for(const kind of MERGE_KINDS)if(next.stale.includes(kind))next=await dataService.api.post(base+'/dokumen/'+kind,{expectedRevision:next.serverRevision});sync(next);preview='pks';message='Semua dokumen siap diperiksa.';}
  catch(e){error=e instanceof Error?e.message:String(e);void load();}finally{busy=false;}
 }
 async function submit(){
  if(!await save())return;busy=true;error='';message='';
  try{sync(await dataService.api.post(base+'/submit',{expectedRevision:data.serverRevision}));message='Pengajuan terkirim. PF akan memeriksa RAB dan dokumen Anda.';}
  catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
 function latest(kind:MergeKind){return data.documents.find((d:any)=>d.kind===kind)?.versions.filter((v:any)=>v.origin==='generated').at(-1);}
 function docUrl(kind:MergeKind|'surat_kuasa'){if(kind==='surat_kuasa')return base+'/surat-kuasa';const version=latest(kind);return locked&&data.journey.status!=='selesai'&&version?`/api/pencairan/${campusId}/documents/${kind}/versions/${version.id}/file`:base+'/dokumen/'+kind;}
 async function checkGuide(key:string,checked:boolean){if(busy)return;busy=true;error='';try{data=await dataService.api.patch(base+'/checklist',{key,checked,expectedRevision:data.serverRevision});onloaded();}catch(e){error=e instanceof Error?e.message:String(e);if((e as any).status===409)remoteChanged=true;}finally{busy=false;}}
 async function downloadKuasa(){
  if(!await save())return;busy=true;error='';
  try{const blob=await dataService.api.blob(base+'/surat-kuasa'),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Surat_Kuasa_'+campusId+'.docx';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);preview='surat_kuasa';}
  catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
 function requestLeave(action:()=>void){if(dirty)pending=action;else action();}
 beforeNavigate(n=>{if(!dirty||!n.to)return;n.cancel();const target=n.to.url.href;requestLeave(()=>void goto(target));});
 onMount(()=>{
  void load();
  const timer=import.meta.env.MODE==='pocketbase-local'?setInterval(()=>{if(!busy&&document.visibilityState==='visible')void load();},10000):undefined;
  const focus=()=>{if(!busy)void load();};window.addEventListener('focus',focus);
  const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};
  const logout=(e:Event)=>{if(dirty){e.preventDefault();requestLeave((e as CustomEvent).detail.resume);}};
  window.addEventListener('beforeunload',warn);window.addEventListener('beforelogout',logout);
  return()=>{clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('beforeunload',warn);window.removeEventListener('beforelogout',logout);};
 });
 $effect(()=>{const fileId=kopId;if(!fileId){kopUrl='';return;}let active=true,url='';void dataService.api.blob(base+'/file/kop').then(blob=>{url=URL.createObjectURL(blob);if(active)kopUrl=url;else URL.revokeObjectURL(url);});return()=>{active=false;if(url)requestAnimationFrame(()=>URL.revokeObjectURL(url));};});
 $effect(()=>{if(!data||data.journey.lastSection===section||busy||dirty)return;const current=section;data.journey.lastSection=current;void dataService.api.patch(base,{lastSection:current,expectedRevision:data.serverRevision}).catch(()=>{});});
</script>

<div class={embedded?'grid min-w-0 gap-3 '+(section==='rab'?'':'p-4'):'mx-auto grid w-full max-w-[1400px] min-w-0 gap-5 p-4 sm:p-6'}>
 {#if !embedded}<header><p class="text-sm text-slate-500">Pencairan Dana · Data dummy</p><h1 class="mt-1 text-2xl font-bold text-slate-900">Pengajuan pencairan</h1><p class="mt-2 text-sm text-slate-600">Lengkapi data sekali. Simpan draf kapan saja, lalu ajukan setelah semuanya siap.</p></header>{/if}
 {#if remoteChanged}<p class="rounded-lg bg-amber-50 p-3 text-amber-900" role="alert">Data diperbarui oleh akun lain. Isian Anda tetap tersedia.<button class={btn+' ml-2'} onclick={()=>requestLeave(()=>{fields={...data.journey.fields};saved=JSON.stringify(fields);remoteChanged=false;void load();})}>Muat data terbaru</button></p>{/if}
 {#if error}<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>{/if}
 {#if message}<p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-900" role="status">{message}</p>{/if}
 {#if !data}<p role="status">Memuat pengajuan…</p>{:else}
 {#if !embedded}<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><strong>{data.campus.name}</strong><p class="mt-1 text-sm text-slate-500">{data.paid?'Tahap 1 sudah dibayar':data.journey.status==='menunggu'?'Menunggu pemeriksaan PF':data.journey.status==='selesai'?'Disetujui · lanjutkan tanda tangan':data.journey.status==='revisi'?'Perlu revisi · periksa catatan PF':'Draf · belum diajukan'}</p></div><span class="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0066B2]">Nilai SK {formatSen(data.summary.amountSen)}</span></div>{/if}
 {#if data.journey.status==='revisi'}<aside class="rounded-xl border border-amber-200 bg-amber-50 p-4"><h2 class="font-bold">Catatan perbaikan dari PF</h2>{#each data.documents.filter((d:any)=>d.status==='perlu_revisi') as doc}<p class="mt-2 text-sm">{doc.kind}: {doc.notes.at(-1)?.note||'Periksa kembali bagian ini.'}</p>{/each}</aside>{/if}
 <div class={embedded?'min-w-0':'grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]'}>
  {#if !embedded}<nav class="flex gap-2 overflow-x-auto lg:block" aria-label="Bagian pengajuan pencairan">
   {#each sections as item,i}<button class="mb-2 flex min-h-14 min-w-[145px] flex-col items-start rounded-lg border px-3 py-2 text-left lg:w-full {section===item?'border-blue-300 bg-blue-50 text-[#0066B2]':'border-slate-200 bg-white text-slate-700'}" aria-current={section===item?'step':undefined} disabled={busy} onclick={()=>navigate(item)}><span class="text-sm font-bold">{i+1}. {sectionLabels[i]}</span><span class="mt-1 text-xs">{item==='ringkasan'?'Periksa sebelum mengirim':locked?'Lihat hasil pemeriksaan':blockers.some((b:any)=>b.section===item)?'Belum lengkap':'Siap diperiksa'}</span></button>{/each}
  </nav>{/if}
  <section class={embedded?'min-w-0':'min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5'} aria-label="Isi pengajuan">
   {#if !embedded||section!=='rab'}<h2 class="mb-2 text-xl font-bold">{sectionLabels[index]}</h2>{/if}
   {#if section==='sk'}
    <p class="mb-4 text-sm text-slate-600">Gunakan nilai bantuan dalam SK sebagai acuan seluruh anggaran.</p>
    <dl class="mb-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"><div><dt class="text-sm text-slate-500">Nomor SK</dt><dd class="font-semibold">{data.summary.skNumber}</dd></div><div><dt class="text-sm text-slate-500">Nilai bantuan</dt><dd class="font-semibold">{formatSen(data.summary.amountSen)}</dd></div></dl>
    <FileViewer src="/sk-dummy.pdf" mime="application/pdf" name="SK_DUMMY.pdf" height={420}/>
   {:else if section==='program'}
    <p class="mb-4 text-sm text-slate-600">Data awal diambil dari profil kampus. Periksa nama kegiatan dan lokasi sebelum dipakai dalam surat.</p>
    <div class="grid gap-4 sm:grid-cols-2">{#each programFields as [key,label]}<label class="grid gap-1 text-sm font-semibold">{label}<input class={input} bind:value={fields[key]} disabled={locked||busy} maxlength="2000"/></label>{/each}</div>
   {:else if section==='rab'}
    <RabUpload {campusId} kind={page.url.searchParams.get('rabStep')==='term1'||page.url.searchParams.get('butir')==='rab'?'rab':page.url.searchParams.get('rabStep')==='term2'||page.url.searchParams.get('butir')==='rab_tahap2'?'rab_tahap2':'rab_penuh'} admin={false} journey={true} locked={locked} onloaded={()=>void load()} oncontinue={()=>navigate('administrasi')}/>
   {:else if section==='administrasi'}
    <p class="mb-4 text-sm text-slate-600">Data ini dipakai bersama pada invoice, permohonan, kuitansi, dan PKS. Nominal mengikuti RAB.</p>
    <label class="mb-4 grid gap-1 text-sm font-semibold">Rekening penerima<select class={input} bind:value={fields.jenisRekening} disabled={locked||busy}><option value="kampus">Rekening kampus</option><option value="kuasa">Rekening pihak yang diberi kuasa</option></select></label>
    <div class="grid gap-4 sm:grid-cols-2">{#each adminFields as [key,label]}<label class="grid gap-1 text-sm font-semibold">{label}<input class={input} bind:value={fields[key]} disabled={locked||busy} inputmode={key==='nomorRekening'?'numeric':'text'} maxlength="2000"/></label>{/each}</div>
    {#if fields.jenisRekening==='kuasa'}<section class="mt-4 grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 class="font-bold">Surat kuasa diperlukan</h3><p class="text-sm">Isi identitas, tanggal, dan kop surat terlebih dahulu. Unduh template simulasi, tandatangani, lalu unggah hasilnya di bawah.</p><p class="text-sm">Pemberi kuasa adalah penandatangan kampus. Penerima kuasa harus sama dengan pemilik rekening.</p>{#each [['pemberiKuasa','Nama pemberi kuasa'],['penerimaKuasa','Nama penerima kuasa']] as [key,label]}<label class="grid gap-1 text-sm font-semibold">{label}<input class={input} bind:value={fields[key]} disabled={locked||busy}/></label>{/each}<label class="grid gap-1 text-sm font-semibold">Tanggal surat kuasa<input class={input} type="date" min={LETTER_MIN_DATE} bind:value={fields.tanggalKuasa} disabled={locked||busy}/></label><button class={btn+' justify-self-start'} disabled={busy||locked} onclick={downloadKuasa}>Unduh template surat kuasa</button><DocumentGuide kind="surat_kuasa" checklist={data.journey.checklist} kuasa={true} onchange={checkGuide}/></section>{/if}
    <p class="mt-3 text-sm text-slate-600">Gunakan satu perwakilan kampus yang berwenang, misalnya dosen atau pejabat kampus. Nama dan jabatan yang sama akan dipakai pada PKS dan dokumen pencairan.</p>{#if fields.jenisRekening==='kampus'}<p class="mt-2 text-sm text-slate-600">Rekening universitas tidak memerlukan surat kuasa. Lampiran surat kuasa akan dihapus dari dokumen otomatis.</p>{/if}<div class="mt-5 grid gap-4 sm:grid-cols-2">{#each [['rekening','Bukti rekening'],['kop','Kop surat kampus'],...(fields.jenisRekening==='kuasa'?[['kuasa','Surat kuasa']]:[])] as [slot,label]}<section class="grid gap-2 rounded-lg border border-slate-200 p-3"><label class="grid gap-2 text-sm font-semibold">{label}<input class={input} type="file" aria-label={label} accept={slot==='kop'?'.png,.jpg,.jpeg':'.pdf,.png,.jpg,.jpeg'} disabled={locked||busy} onchange={e=>upload(slot,e.currentTarget.files?.[0])}/></label><p class="text-xs text-slate-500">{slot==='kop'?'PNG/JPG':'PDF/PNG/JPG'} · maksimal 2 MB</p>{#if data.journey.files[slot]}<a class="break-all text-sm text-[#0066B2] underline" href={base+'/file/'+slot} target="_blank">{data.journey.files[slot].name}</a>{#if slot==='kop'}<img class="max-h-28 max-w-full object-contain" src={kopUrl} alt="Pratinjau kop surat kampus"/>{/if}{/if}</section>{/each}</div>
    <h3 class="mb-3 mt-6 font-bold">Identitas surat</h3><p class="mb-3 text-sm text-slate-600">Tanggal PKS: 17 Juni 2026. Tanggal dokumen pencairan paling awal 18 Juni 2026.</p><div class="grid gap-4 sm:grid-cols-2">{#each letterFields as [key,label]}<label class="grid gap-1 text-sm font-semibold">{label}<input class={input} type={key.startsWith('tanggal')?'date':'text'} min={key.startsWith('tanggal')?LETTER_MIN_DATE:undefined} bind:value={fields[key]} disabled={locked||busy}/></label>{/each}</div>
   {:else if section==='pks'}
    <p class="mb-4 text-sm text-slate-600">Lengkapi data khusus PKS. Identitas kampus, program, dan pembagian dana diambil dari langkah sebelumnya.</p>
    <div class="grid gap-4 sm:grid-cols-2"><label class="grid gap-1 text-sm font-semibold">Nomor PKS kampus<input class={input} bind:value={fields.nomorPksKampus} disabled={locked||busy}/></label><label class="grid gap-1 text-sm font-semibold">Tanggal perjanjian<input class={input} type="date" bind:value={fields.tanggalPerjanjian} readonly/></label></div>
    <dl class="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2"><div><dt class="font-semibold">Diisi kampus</dt><dd>Nomor PKS kampus, identitas, nama dan jabatan satu penandatangan.</dd></div><div><dt class="font-semibold">Diisi PF</dt><dd>{data.pf.nomorPksPf}<br/>{data.pf.name} - {data.pf.title}</dd></div><div><dt class="font-semibold">Otomatis dari pengajuan</dt><dd>Nama program, nilai SK, nominal termin, identitas dan rekening.</dd></div><div><dt class="font-semibold">Tetap dari template PF</dt><dd>Tanggal PKS 17 Juni 2026 dan naskah perjanjian baku. Kebutuhan lampiran mengikuti jenis rekening.</dd></div></dl>
   {:else}
    <p class="mb-4 text-sm text-slate-600">Periksa data dan dokumen sebelum mengirim satu pengajuan kepada PF.</p>
    <dl class="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">{#each [['Nilai SK',formatSen(data.summary.amountSen)],['Total RAB 100%',formatSen(data.rab?.totalSen||0)],['Termin 1 · maksimal 70%',formatSen(data.rab?.term1Sen||0)],['Termin 2 · sisa',formatSen(data.rab?.term2Sen||0)],['Nama kegiatan',fields.judulProgram],['Rekening tujuan',`${fields.namaBank} · ${fields.nomorRekening} · ${fields.namaPemilik}`]] as [label,value]}<div><dt class="text-xs text-slate-500">{label}</dt><dd class="mt-1 break-words text-sm font-semibold">{value||'Belum diisi'}</dd></div>{/each}</dl>
    {#if data.journey.history.length}<details class="mt-4 rounded-lg border p-3"><summary class="cursor-pointer text-sm font-semibold">Riwayat pengajuan ({data.journey.history.length})</summary>{#each [...data.journey.history].reverse() as packet}<div class="mt-3 border-t pt-3 text-sm"><strong>Pengajuan {packet.number} · {new Date(packet.created).toLocaleString('id-ID')}</strong><p>{packet.fields.judulProgram} · {packet.fields.namaBank} · {packet.fields.nomorRekening}</p></div>{/each}</details>{/if}
   {/if}
   {#if section!=='rab'&&blockers.some((b:any)=>b.section===section)}<aside class="mt-4 rounded-lg bg-amber-50 p-3"><h3 class="text-sm font-semibold">Masih perlu dilengkapi</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{#each blockers.filter((b:any)=>b.section===section) as b}<li>{b.text}</li>{/each}</ul></aside>{/if}
   {#if ['administrasi','pks','ringkasan'].includes(section)}
    {#if blockers.length&&section!=='administrasi'}<div class="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 class="font-semibold">Lengkapi data sebelum membuat dokumen</h3><ul class="mt-2 list-disc space-y-2 pl-5 text-sm">{#each blockers as b}<li>{b.text} <button class="font-semibold text-[#0066B2] underline" onclick={()=>navigate(b.section)}>Perbaiki {sectionLabels[sections.indexOf(b.section)]}</button></li>{/each}</ul></div>{/if}
    <section class="mt-5 grid gap-3" aria-label="Dokumen otomatis"><div class="flex flex-wrap items-center justify-between gap-3"><h3 class="font-bold">Dokumen dari data pengajuan</h3>{#if !locked&&data.stale.length}<button class={blue} disabled={busy||blockers.length>0} onclick={generateAll}>Siapkan semua dokumen</button>{/if}</div>{#if section==='administrasi'&&blockers.some((b:any)=>b.section==='pks')}<p class="text-sm text-slate-500">Lengkapi data PKS pada langkah berikutnya untuk menyiapkan dokumen.</p>{/if}{#each MERGE_KINDS as kind}<div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><strong class="text-sm">{MERGE_LABEL[kind]}</strong><span class="ml-2 text-xs text-slate-500">{data.documents.find((d:any)=>d.kind===kind)?.status==='sesuai'?'Sesuai':data.documents.find((d:any)=>d.kind===kind)?.status==='perlu_revisi'?'Perlu revisi':data.documents.find((d:any)=>d.kind===kind)?.status==='menunggu_review'?'Menunggu PF':'Draf'}</span><p class="mt-1 text-xs text-slate-500">{data.stale.includes(kind)?latest(kind)?'Data berubah · buat ulang dokumen':'Belum dibuat':'Menggunakan data terbaru'}{latest(kind)?` · versi ${latest(kind).number}`:''}</p></div><div class="flex flex-wrap gap-2">{#if !locked}<button class={btn} disabled={busy||blockers.length>0} onclick={()=>generate(kind)}>{latest(kind)?'Buat ulang':'Buat'} {MERGE_LABEL[kind]}</button>{/if}{#if latest(kind)&&(!data.stale.includes(kind)||locked)}<button class={btn} disabled={busy||dirty} onclick={()=>preview=preview===kind?null:kind}>Pratinjau {MERGE_LABEL[kind]}</button><a class={btn} href={docUrl(kind)} download>Unduh DOCX</a>{/if}{#if locked&&data.journey.status==='selesai'&&!data.paid}<a class={btn} href={`/campus/pencairan?butir=${kind}&signed=1`}>{data.documents.find((d:any)=>d.kind===kind)?.signedReceived?'Lihat berkas bertanda tangan':'Unggah bertanda tangan'}</a>{/if}</div><DocumentGuide {kind} checklist={data.journey.checklist} kuasa={fields.jenisRekening==='kuasa'} onchange={checkGuide}/></div>{/each}</section>
    {#if preview}<section class="mt-4 min-w-0 overflow-hidden rounded-lg border"><h3 class="border-b p-3 font-semibold">Pratinjau {preview==='surat_kuasa'?'surat kuasa':MERGE_LABEL[preview]}</h3>{#key preview+data.journey.revision}<FileViewer src={docUrl(preview)} mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document" name={preview+'.docx'} height={620}/>{/key}</section>{/if}
   {/if}
   {#if section!=='rab'}<footer class="mt-6 flex flex-wrap justify-between gap-3 border-t pt-4"><div class="flex flex-wrap gap-2">{#if index>0}<button class={btn} disabled={busy} onclick={()=>navigate(sections[index-1])}>Kembali</button>{/if}{#if !locked}<button class={btn} disabled={busy||!dirty} onclick={save}>Simpan draf</button>{/if}</div>{#if section==='ringkasan'}{#if !locked}<button class={blue} disabled={busy||dirty||blockers.length>0||data.stale.length>0} onclick={submit}>Ajukan untuk diperiksa</button>{/if}{:else}<button class={blue} disabled={busy} onclick={()=>navigate(sections[index+1])}>Lanjut: {sectionLabels[index+1]}</button>{/if}</footer>{/if}
   {#if section==='ringkasan'&&data.stale.length&&!locked}<p class="mt-3 text-sm text-amber-900">Buat semua dokumen dari data terbaru sebelum mengajukan.</p>{/if}
   {#if dirty}<p class="mt-3 text-sm text-amber-900" role="status">Perubahan belum tersimpan.</p>{/if}
  </section>
 </div>
 {/if}
</div>
{#if pending}<Modal title="Perubahan belum disimpan" onclose={()=>pending=null}><p>Simpan draf agar isian Anda tidak hilang.</p><div class="mt-4 flex flex-wrap justify-end gap-2"><button class={btn} onclick={()=>pending=null}>Tetap di sini</button><button class={btn} onclick={()=>{const action=pending;pending=null;fields={...data.journey.fields};saved=JSON.stringify(fields);action?.();}}>Buang perubahan</button><button class={blue} disabled={busy} onclick={async()=>{if(await save()){const action=pending;pending=null;action?.();}}}>Simpan dan lanjutkan</button></div></Modal>{/if}
