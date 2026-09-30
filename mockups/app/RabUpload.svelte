<script lang="ts">
 import { onMount, untrack } from 'svelte';
 import { page } from '$app/state';
 import Icon from '$lib/components/ui/Icon.svelte';
 import Modal from '$lib/components/ui/Modal.svelte';
 import { beforeNavigate, goto } from '$app/navigation';
 import { dataService } from '$lib/data/service';
 import { onChange } from '$lib/realtime.svelte';
 import { formatSen } from '$lib/pencairan';
 import type { RabOverview, RabLine } from '$lib/rab';
 import { formatVolume } from '$lib/rab';
 import { validQuantity, validEditedVolume } from '../rab/model';
 let {campusId,kind,admin,onloaded,onediting=()=>{},journey=false,locked=false,oncontinue=()=>{}}:{campusId:string;kind:string;admin:boolean;onloaded:()=>void;onediting?:(editing:boolean)=>void;journey?:boolean;locked?:boolean;oncontinue?:()=>void}=$props();
 let data=$state<(RabOverview & {disbursement:RabOverview['disbursement'] & {paidAt?:string}})|null>(null),error=$state(''),busy=$state(false),replace=$state(false),confirmed=$state(false),message=$state('');
 let editingAdmin=$state(false);
 let edits=$state<Record<string,{volume:number;price:number;first:number}>>({});
 const editsValid=$derived(items.every(l=>{const e=edits[l.id];return e&&validEditedVolume(e.volume,l.volume)&&e.price>0&&Math.abs(e.price*100-Math.round(e.price*100))<0.00001&&Number.isSafeInteger(Math.round(e.volume*e.price*100))&&validQuantity(e.first,e.volume);}));
 const editedTotal=$derived(items.reduce((sum,l)=>sum+Math.round((edits[l.id]?.volume||0)*(edits[l.id]?.price||0)*100),0));
 const editedFirst=$derived(items.reduce((sum,l)=>sum+Math.round((edits[l.id]?.first||0)*(edits[l.id]?.price||0)*100),0));
 function startEdit(){edits=Object.fromEntries(items.map(l=>[l.id,{volume:l.volume,price:l.unitPriceSen/100,first:typeof l.flags?.term1Volume==='number'?l.flags.term1Volume:0}]));error='';editingAdmin=true;}
 async function saveCorrection(){
  if(!v||busy||!editsValid)return;
  busy=true;error='';
  try{data=await dataService.api.post<RabOverview>(`${base}/versions/${v.id}/correction`,{kind,items:items.map(l=>({lineId:l.id,volume:edits[l.id].volume,unitPriceSen:Math.round(edits[l.id].price*100),term1Volume:edits[l.id].first}))});sync();editingAdmin=false;message='Koreksi tersimpan sebagai versi baru. Periksa kembali RAB 100%, 70%, dan 30% sebelum menyetujui.';onloaded();}
  catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
 $effect(()=>{onediting(editingAdmin);});
 let comparisonSearch=$state('');
 let search=$state(''),showGroups=$state(false);
 let pendingLeave=$state<(()=>void)|null>(null);
 let quantities=$state<Record<string,number|null>>({}),saved=$state('{}');
 let autosaving=$state(false),saveFailed=$state(false);
 let savedNotice=$state(false),noticeTimer:ReturnType<typeof setTimeout>|undefined;
 function showSaved(){clearTimeout(noticeTimer);savedNotice=true;noticeTimer=setTimeout(()=>savedNotice=false,3000);}
 const v=$derived(data?.version),latest=$derived(data?.versions.at(-1)),historical=$derived(Boolean(v&&latest&&v.id!==latest.id));
 const editable=$derived(!admin&&!locked&&!historical&&(!v||v.status==='draf'));
 const items=$derived(v?.lines.filter(l=>l.level===4)||[]);
 let itemPage=$state(1),itemsTop:HTMLDivElement;
 const pageCount=$derived(Math.max(1,Math.ceil(items.length/5)));
 const currentPage=$derived(Math.min(itemPage,pageCount));
 const pagedItems=$derived(items.slice((currentPage-1)*5,currentPage*5));
 const paginationContext=$derived((v?.id||'')+':'+journeyStep);
 $effect(()=>{if(paginationContext)itemPage=1;});
 function changeItemPage(next:number){itemPage=Math.max(1,Math.min(next,pageCount));itemsTop?.scrollIntoView({block:'start'});}
 const reviewItems=$derived(items.filter(line=>`${line.code} ${line.title}`.toLowerCase().includes(comparisonSearch.trim().toLowerCase())));
 const visibleLines=$derived((showGroups&&!search.trim()?v?.lines||[]:items).filter(line=>!search.trim()||`${line.code} ${line.title}`.toLocaleLowerCase('id-ID').includes(search.trim().toLocaleLowerCase('id-ID'))));
 const legacy=$derived(Boolean(v&&!('quantityAllocation' in v)));
 const approved=$derived(data?.versions.filter(version=>version.active&&version.status==='disetujui').at(-1));
 const dirty=$derived(editingAdmin||JSON.stringify(quantities)!==saved);
 const allocated=$derived(items.filter(l=>validQuantity(quantities[l.id],l.volume)).length);
 const first=$derived(legacy&&!editable?v?.term1Sen||0:items.reduce((sum,l)=>sum+(validQuantity(quantities[l.id],l.volume)?Math.round(quantities[l.id]!*l.unitPriceSen):0),0));
 const second=$derived(legacy&&!editable?v?.term2Sen||0:items.reduce((sum,l)=>sum+(validQuantity(quantities[l.id],l.volume)?l.amountSen-Math.round(quantities[l.id]!*l.unitPriceSen):0),0));
 const invalid=$derived(items.some(l=>quantities[l.id]!=null&&!validQuantity(quantities[l.id],l.volume)));
 const ready=$derived(allocated===items.length&&items.length>0&&!invalid&&first>0&&first<=(data?.summary.limitSen||0)&&v?.totalSen===data?.summary.amountSen);
 const journeyStep=$derived(page.url.searchParams.get('rabStep')||(kind==='rab'?'term1':kind==='rab_tahap2'?'term2':!v?'upload':'full'));
 const unlockedStep=$derived(!v?0:v.status!=='draf'||historical?3:(v as typeof v & {campusStep?:number}).campusStep??1);
 $effect(()=>{if(journey&&data&&!busy&&step>unlockedStep)void goto(journeyUrl(['upload','full','term1','term2'][unlockedStep]),{replaceState:true});});
 const editingAllocation=$derived(editable&&(journey?journeyStep==='term1':kind==='rab_penuh')&&!replace);
 const step=$derived(journey?['upload','full','term1','term2'].indexOf(journeyStep):!v||replace?0:editingAllocation?1:editable?kind==='rab'?2:3:4);
 const journeyUrl=(step:string)=>'/campus/pencairan?bagian=rab&butir='+(step==='term1'?'rab':step==='term2'?'rab_tahap2':'rab_penuh')+'&rabStep='+step;

 let hoveredReview=$state('');
 function reviewColumns(node:HTMLTableElement){
  const column=(target:EventTarget|null)=>(target as Element|null)?.closest<HTMLElement>('[data-review-column]')?.dataset.reviewColumn||'';
  const hover=(event:PointerEvent)=>hoveredReview=column(event.target);
  const clear=()=>hoveredReview='';
  const click=(event:MouseEvent)=>{if((event.target as Element).closest('button,input,select,textarea,a,label'))return;const selected=column(event.target);if(selected)selectReview(selected);};
  node.addEventListener('pointerover',hover);node.addEventListener('pointerleave',clear);node.addEventListener('click',click);
  return {destroy(){node.removeEventListener('pointerover',hover);node.removeEventListener('pointerleave',clear);node.removeEventListener('click',click);}};
 }
 function selectReview(column:string){if(busy||column===kind)return;const url=new URL(page.url);url.searchParams.set('butir',column);void goto(url.pathname+url.search,{replaceState:true,noScroll:true,keepFocus:true});}
 const reviewLabel=$derived(kind==='rab'?'RAB 70% - Tahap 1':kind==='rab_tahap2'?'RAB 30% - Tahap 2':'RAB 100% - seluruh anggaran');
 function openStep(index:number){
  if(index>unlockedStep||busy)return;
  const target=['upload','full','term1','term2'][index];
  if(target==='term2'&&editingAllocation){void save(true);return;}
  leave(()=>{sync();replace=false;comparisonSearch='';void goto(journeyUrl(target));});
 }

 const attention=$derived.by(()=>{
  if(!data)return [];
  if(!v)return ['Kampus belum mengunggah RAB 100%. Tunggu unggahan sebelum melakukan pemeriksaan.'];
  const notes:string[]=[],total=editingAdmin?editedTotal:v.totalSen,term1=editingAdmin?editedFirst:first;
  const missing=items.filter(l=>editingAdmin?!validQuantity(edits[l.id]?.first,edits[l.id]?.volume):!validQuantity(quantities[l.id],l.volume));
  const incomplete=items.filter(l=>!l.title.trim()||!l.unit.trim()||(editingAdmin?!(edits[l.id]?.price>0&&edits[l.id]?.volume>0):l.unitPriceSen<=0||l.volume<=0));
  if(!items.length)notes.push('RAB belum memiliki rincian item.');
  if(incomplete.length)notes.push(`${incomplete.length} item belum memiliki jumlah, satuan, atau harga yang lengkap: ${incomplete.slice(0,3).map(l=>l.title||l.code).join(', ')}.`);
  if(missing.length)notes.push(`${missing.length} dari ${items.length} item belum memiliki pembagian jumlah yang valid: ${missing.slice(0,3).map(l=>l.title).join(', ')}. Periksa jumlah Tahap 1; isi 0 jika seluruhnya masuk Tahap 2.`);
  if(total!==data.summary.amountSen)notes.push(`Total RAB ${formatSen(total)} ${total>data.summary.amountSen?'melebihi':'kurang dari'} nilai SK ${formatSen(data.summary.amountSen)} sebesar ${formatSen(Math.abs(total-data.summary.amountSen))}. Sesuaikan rincian sebelum menyetujui.`);
  if(term1>data.summary.limitSen)notes.push(`Tahap 1 melebihi batas 70% SK sebesar ${formatSen(term1-data.summary.limitSen)}. Kurangi alokasi Tahap 1.`);
  if(!missing.length&&term1<=0)notes.push('Tahap 1 masih Rp0. Tentukan kebutuhan tahap pertama sebelum pengajuan.');
  if(v.status==='draf')notes.push('RAB masih draf dan belum diajukan. Tunggu pengajuan kampus sebelum memberikan keputusan.');
  if(!notes.length)notes.push(v.status==='disetujui'?'RAB sudah disetujui. Jumlah, pembagian, dan total sesuai pemeriksaan otomatis.':'Rincian dan pembagian sudah lengkap; total sesuai SK dan Tahap 1 dalam batas 70%. Periksa kesesuaian kebutuhan sebelum menyetujui.');
  return notes;
 });
 const base=$derived(`/api/pencairan/${campusId}/rab`);
 const btn='min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0066B2] disabled:opacity-40';
 const blue='min-h-11 rounded-lg bg-[#0066B2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
 function sync(){quantities=Object.fromEntries((data?.version?.lines||[]).filter(l=>l.level===4).map(l=>[l.id,typeof l.flags?.term1Volume==='number'?l.flags.term1Volume:null]));saved=JSON.stringify(quantities);}
 function setQuantity(id:string,q:number|null){quantities[id]=q;confirmed=false;message='';error='';saveFailed=false;savedNotice=false;}
 $effect(()=>{
  const draft=JSON.stringify(quantities);
  if(!journey||!editingAllocation||draft===saved||invalid||busy||saveFailed)return;
  const timer=setTimeout(()=>void save(false,true),800);
  return ()=>clearTimeout(timer);
 });
 function remaining(line:RabLine){const q=quantities[line.id];return validQuantity(q,line.volume)?formatVolume(Math.round((line.volume-q)*10000)/10000)+' '+line.unit:'—';}
 function leave(action:()=>void){if(dirty)pendingLeave=action;else action();}
 function discard(){const action=pendingLeave;pendingLeave=null;editingAdmin=false;sync();action?.();}
 beforeNavigate(navigation=>{
  if(!dirty)return;
  const target=navigation.to?.url;
  if(target?.pathname==='/campus/pencairan'&&['rab_penuh','rab','rab_tahap2'].includes(target.searchParams.get('butir')||''))return;
  if(!target)return;navigation.cancel();leave(()=>{if(target.origin===page.url.origin)void goto(target.href);else window.location.assign(target.href);});
 });
 $effect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return ()=>window.removeEventListener('beforeunload',warn);
 });
 async function load(versionId=page.url.searchParams.get('rabVersion')||''){
  try{if(dirty||busy||editingAdmin)return;const result=await dataService.api.get<RabOverview>(base+(versionId?'?version='+encodeURIComponent(versionId):''));if(dirty||busy||editingAdmin||versionId!==(page.url.searchParams.get('rabVersion')||''))return;data=result;sync();}
  catch(e){error=e instanceof Error?e.message:String(e);}
 }
 $effect(()=>{const versionId=page.url.searchParams.get('rabVersion')||'';untrack(()=>void load(versionId));});
 function versionLabel(version:NonNullable<RabOverview['version']>|RabOverview['versions'][number]){
  const date=new Date(version.updated||version.created).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
  return `Versi ${version.number} - ${version.sourceFile} - ${version.status==='draf'?'Draf':version.status==='menunggu'?'Menunggu PF':'Disetujui'} - ${date}${version.id===latest?.id?' (terbaru)':''}`;
 }
 function openVersion(id:string){
  if(busy)return;leave(()=>{sync();confirmed=false;replace=false;error='';message='';
   const url=new URL(page.url);if(id===latest?.id)url.searchParams.delete('rabVersion');else url.searchParams.set('rabVersion',id);
   void goto(url.pathname+url.search);
  });
 }
 onMount(()=>{
  const unsubscribe=onChange(()=>void load(),{campus:campusId});
  const logout=(event:Event)=>{if(dirty){event.preventDefault();const resume=(event as CustomEvent<{resume:()=>void}>).detail?.resume;if(resume)leave(resume);}};
  window.addEventListener('beforelogout',logout);
  return ()=>{clearTimeout(noticeTimer);onediting(false);unsubscribe();window.removeEventListener('beforelogout',logout);};
 });
 async function upload(file?:File){
  if(!file||busy)return;busy=true;error='';
  try{const body=new FormData();body.set('file',file);data=await dataService.api.post<RabOverview>(base+'/import',body);sync();message='Excel berhasil dibaca. Periksa seluruh rincian RAB 100% terlebih dahulu.';replace=false;confirmed=false;onloaded();if(journey)await goto(journeyUrl('full'));}
  catch(e){error=e instanceof Error?e.message:'Unggahan gagal.';}finally{busy=false;}
 }
 async function advance(index:number){
  if(!v)return;
  if(index>unlockedStep)data=await dataService.api.post<RabOverview>(`${base}/versions/${v.id}/progress`,{step:index});
  await goto(journeyUrl(['upload','full','term1','term2'][index]));
 }
 async function continueFull(){
  if(busy)return;busy=true;error='';
  try{await advance(2);}catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
 async function save(next=false,automatic=false){
  if(!v||invalid||busy)return;
  const submitted=$state.snapshot(quantities);
  busy=true;autosaving=automatic;error='';saveFailed=false;
  try{if(dirty){data=await dataService.api.patch<RabOverview>(`${base}/versions/${v.id}/allocation`,{quantities:submitted});saved=JSON.stringify(submitted);}if(journey){message='';if(!dirty)showSaved();}else message='Pembagian tersimpan sebagai draf. Belum dikirim ke PF.';onloaded();if(next&&!dirty){if(journey)await advance(3);else await goto('/campus/pencairan?butir=rab');}}
  catch(e){error=e instanceof Error?e.message:String(e);saveFailed=true;}finally{busy=false;autosaving=false;}
 }
 async function submit(){
  if(!v||!confirmed||!ready||busy||dirty)return;busy=true;error='';message='';
  try{data=await dataService.api.post<RabOverview>(`${base}/versions/${v.id}/submit`);sync();confirmed=false;message='RAB terkirim. Tunggu pemeriksaan PF; pembagian terkunci selama pemeriksaan.';onloaded();}
  catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
 async function revise(){
  if(!v||busy||latest?.status==='menunggu')return;busy=true;error='';
  try{data=await dataService.api.post<RabOverview>(base+'/versions',{from:v.id});sync();confirmed=false;message='Draf terbaru dibuat dari versi yang dipilih. Pembagian lama tetap tersimpan. Periksa lalu ajukan kembali.';await goto(journey?journeyUrl('full'):'/campus/pencairan?butir=rab_penuh');onloaded();}
  catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
 async function exportRab(share:'penuh'|'tahap1'|'tahap2'){
  if(!v||busy||dirty)return;busy=true;error='';
  try{
   const {downloadRabWorkbook,linesToRows}=await import('$lib/rab-excel');
   await downloadRabWorkbook(`RAB_${share}_${campusId}_v${v.number}.xlsx`,{university:data!.campus.name,penuh:linesToRows(v.lines,'penuh'),tahap1:linesToRows(v.lines,'tahap1'),tahap2:linesToRows(v.lines,'tahap2')},share);
  }catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
 }
</script>

{#snippet itemPagination(position:string)}
 <nav class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label={`Halaman item RAB ${position}`}>
  <p class="text-sm text-slate-600" role="status">Item {(currentPage-1)*5+1}–{Math.min(currentPage*5,items.length)} dari {items.length} · Halaman {currentPage} dari {pageCount}</p>
  <div class="flex gap-2"><button type="button" class={btn} disabled={busy||currentPage===1} aria-label="Sebelumnya" title="Halaman sebelumnya" onclick={()=>changeItemPage(currentPage-1)}><Icon name="back" size={18}/></button><button type="button" class={btn} disabled={busy||currentPage===pageCount} aria-label="Berikutnya" title="Halaman berikutnya" onclick={()=>changeItemPage(currentPage+1)}><Icon name="arrow" size={18}/></button></div>
 </nav>
{/snippet}

<section class="grid min-w-0 gap-4 bg-white p-4 text-sm" aria-label="Pengajuan RAB kampus">
 {#if !admin&&!historical}
  <ol class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Langkah pengajuan RAB">
   {#each journey?['Upload Excel','Periksa RAB 100%','Atur Termin 1','Periksa Termin 2']:['Unggah RAB 100%','Bagi jumlah item','Periksa Tahap 1','Periksa & ajukan'] as label,index}
    <li>{#if journey}<button type="button" aria-current={step===index?'step':undefined} class="min-h-11 w-full rounded-lg border p-2 text-left disabled:cursor-not-allowed disabled:opacity-40 {step===index?'border-blue-300 bg-blue-50 font-bold text-blue-900':'border-slate-200 text-[#0066B2] hover:bg-slate-50'}" disabled={busy||step===index||(index===0&&!editable)||index>unlockedStep} onclick={()=>openStep(index)}>{index+1}. {label}</button>{:else}<span aria-current={step===index?'step':undefined} class="block rounded-lg border p-2 {step===index?'border-blue-300 bg-blue-50 font-bold text-blue-900':'border-slate-200 text-slate-500'}">{index+1}. {label}</span>{/if}</li>
   {/each}
  </ol>
 {/if}
 {#if error}<p class="rounded-lg bg-red-50 p-3 text-red-800" role="alert">{error}</p>{/if}
 {#if message}<p class="rounded-lg bg-blue-50 p-3 text-blue-900" role="status">{message}</p>{/if}
 {#if !admin&&data&&data.versions.length}
  <section class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Riwayat versi RAB">
   <label class="grid gap-2 font-bold">Riwayat versi RAB<select class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal" aria-label="Pilih versi RAB" value={v?.id||''} disabled={busy} onchange={e=>{const id=e.currentTarget.value;e.currentTarget.value=v?.id||'';void openVersion(id);}}>{#each [...data.versions].reverse() as version}<option value={version.id}>{versionLabel(version)}</option>{/each}</select></label>
   <p class="text-xs text-slate-600">Pilih unggahan untuk melihat rincian dan pembagian yang tersimpan. Draf lama tetap tersedia setelah unggah file baru.</p>
   {#if historical}
    <p class="font-semibold text-amber-900">Anda melihat versi lama {v?.number}. Versi terbaru adalah versi {latest?.number}. Versi lama hanya dapat dilihat.</p>
    <div class="flex flex-wrap gap-2"><button class={btn} disabled={busy} onclick={()=>openVersion(latest!.id)}>Kembali ke versi terbaru</button><button class={blue} disabled={busy||latest?.status==='menunggu'} onclick={revise}>Gunakan versi ini sebagai draf terbaru</button></div>
    <p class="text-xs text-slate-600">Membuat salinan baru dengan pembagian yang sama; versi lama dan unggahan lain tetap tersimpan.{latest?.status==='menunggu'?' Tunggu keputusan PF atas pengajuan terbaru sebelum membuat draf.':''}</p>
   {/if}
  </section>
 {/if}
 {#if admin&&data}<aside class="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label="Hal yang perlu diperhatikan" aria-live="polite"><h2 class="font-semibold">Yang perlu diperhatikan / {data.campus.name}</h2><ul class="list-disc space-y-1 pl-5 text-sm text-slate-700">{#each attention as note}<li>{note}</li>{/each}</ul></aside>{/if}
 {#if !data}<p>Memuat RAB…</p>
 {:else if editable&&kind==='rab_penuh'&&(!v||replace||journey&&journeyStep==='upload')}
  <h2 class="text-lg font-bold text-slate-900">Unggah satu file RAB 100%</h2>
  <p>Isi seluruh kebutuhan di lembar RAB 100%. Pembagian Tahap 1 dan Tahap 2 dilakukan di aplikasi setelah unggah; tidak perlu mengunggah dua file lagi.</p>
  <div class="grid gap-3 sm:grid-cols-2">
   <div class="grid gap-2 rounded-xl border border-slate-200 p-4"><strong>1. Siapkan Excel</strong><p>Total RAB harus sama dengan nilai SK: <b>{formatSen(data.summary.amountSen)}</b>.</p><a class={btn+' justify-self-start'} href="/contoh-rab.xlsx" download="Contoh_RAB_100_Persen.xlsx">Unduh Excel contoh (.xlsx)</a><p class="text-xs text-slate-500">Ganti 6 item contoh dengan kebutuhan kampus. Pertahankan nama lembar dan kepala tabel.</p></div>
   <div class="grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4"><strong>2. Pilih file untuk diunggah</strong><label class="grid gap-2 font-semibold">Excel RAB 100%<input class="min-w-0 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" type="file" aria-label="Unggah Excel RAB 100%" accept=".xlsx" disabled={busy} onchange={e=>void upload(e.currentTarget.files?.[0])}/></label><p class="text-xs text-slate-600">.xlsx · maksimal 2 MB dan 500 item. File langsung dibaca setelah dipilih.</p>{#if busy}<p role="status">Membaca Excel…</p>{/if}</div>
  </div>
  {#if replace||journey&&v}<p class="text-amber-900">File baru akan membuat versi baru dan mengosongkan pembagian. Versi lama tetap tersimpan.</p>{#if journey}<button class={blue+' justify-self-end'} disabled={busy} onclick={()=>openStep(1)}>Lanjut</button>{:else}<button class={btn+' justify-self-start'} disabled={busy} onclick={()=>replace=false}>Batal ganti file</button>{/if}{/if}
 {:else if v}
  <div class="flex flex-wrap items-center gap-2" aria-label="Unduh hasil RAB">
   {#each [['penuh','100%'],['tahap1','Termin 1'],['tahap2','Termin 2']] as [share,label]}<button class="group inline-flex min-h-11 items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-[#0066B2] shadow-sm transition hover:border-blue-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066B2] disabled:cursor-not-allowed disabled:opacity-40" disabled={busy||dirty||(share!=='penuh'&&(allocated!==items.length||invalid))} onclick={()=>exportRab(share as 'penuh'|'tahap1'|'tahap2')}><span>Unduh RAB {label}</span><span class="grid size-6 shrink-0 place-items-center rounded-full bg-[#0066B2] text-white transition group-hover:bg-[#005493]"><Icon name="download" size={14}/></span></button>{/each}
  </div>
  {#if dirty}<p class="text-xs text-slate-500">Simpan perubahan untuk mengunduh RAB terbaru.</p>{/if}
  <div class="rounded-xl border p-4 {v.status==='disetujui'?'border-green-200 bg-green-50 text-green-900':v.status==='menunggu'?'border-blue-200 bg-blue-50 text-blue-900':'border-amber-200 bg-amber-50 text-amber-950'}">
   <strong>{v.status==='menunggu'?'Menunggu pemeriksaan PF':v.status==='disetujui'?'RAB disetujui':'Draf RAB · belum diajukan'} · versi {v.number}</strong>
   <p class="mt-1 break-all text-xs">{v.sourceFile} · {items.length} item · {data.campus.name}</p>
   {#if !historical&&approved&&approved.id!==v.id}<p class="mt-2">Versi {approved.number} sebelumnya telah disetujui. {v.status==='draf'?`Versi ${v.number} ini perlu diajukan dan diperiksa kembali.`:`Versi ${v.number} sedang diperiksa PF.`}</p>{/if}
   {#if v.note&&v.note!=='Data dummy'}<p class="mt-2 whitespace-pre-wrap"><b>Catatan:</b> {v.note}</p>{/if}
  </div>
  <div class="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3" aria-label="Ringkasan pembagian RAB" aria-live="polite">
   <div><p class="text-xs text-slate-500">RAB 100% · nilai SK</p><strong>{formatSen(v.totalSen)}</strong></div>
   <div><p class="text-xs text-slate-500">Tahap 1 · maksimal 70%</p><strong>{invalid?'—':formatSen(first)}</strong><p class="text-xs">Batas {formatSen(data.summary.limitSen)}{!invalid&&first<=data.summary.limitSen?` · tersedia ${formatSen(data.summary.limitSen-first)}`:''}</p></div>
   <div><p class="text-xs text-slate-500">Tahap 2 · sisa alokasi</p><strong>{invalid?'—':formatSen(second)}</strong><p class="text-xs">{legacy&&!editable?'Data lama: nominal tersimpan; jumlah pembagian belum tercatat':`${allocated} dari ${items.length} item terbagi`}{dirty?' · belum disimpan':''}</p></div>
  </div>
  {#if !admin&&v.totalSen!==data.summary.amountSen}<p class="rounded-lg bg-amber-50 p-3 text-amber-900" role="alert">Total RAB {formatSen(v.totalSen)} belum sesuai nilai SK {formatSen(data.summary.amountSen)}. Koreksi item hingga total sesuai sebelum menyetujui atau mengajukan.</p>{/if}
  {#if !admin&&first>data.summary.limitSen}<p class="rounded-lg bg-amber-50 p-3 text-amber-900" role="alert">Total Tahap 1 melebihi batas 70% SK sebesar {formatSen(first-data.summary.limitSen)}. Perbaiki pembagian sebelum menyetujui atau mengajukan.</p>{/if}
  <div bind:this={itemsTop} class="scroll-mt-28"></div>
  {#if editingAllocation}
   <div><h2 class="text-lg font-bold text-slate-900">Tentukan jumlah untuk setiap tahap</h2><p class="mt-1 text-slate-600">Isi jumlah Tahap 1; sisanya otomatis masuk Tahap 2. Contoh: 10 unit → 7 unit + 3 unit. Batas 70% berlaku untuk total dana, bukan jumlah setiap item.</p></div>
   <div class="grid gap-3" aria-label="Pembagian jumlah item RAB">
    {#each pagedItems as line (line.id)}
     {@const q=quantities[line.id]}
     {@const valid=validQuantity(q,line.volume)}
     <article class="rounded-xl border p-4 {q!=null&&!valid?'border-red-300 bg-red-50/30':'border-slate-200'}">
      <div class="flex flex-wrap items-start justify-between gap-2"><div><h3 class="font-bold text-slate-900">{line.title}</h3><p class="text-xs text-slate-500">{line.code} · {formatSen(line.unitPriceSen)} / {line.unit}</p></div><p class="rounded-lg bg-slate-100 px-3 py-1 text-sm">Jumlah awal: <b>{formatVolume(line.volume)} {line.unit}</b></p></div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
       <label class="grid gap-1 font-semibold">Jumlah Tahap 1 ({line.unit})<input class="min-h-11 w-full rounded-lg border bg-white p-2 font-normal {q!=null&&!valid?'border-red-400':'border-slate-300'}" type="number" min="0" max={line.volume} step={Number.isInteger(line.volume)?1:0.0001} aria-invalid={q!=null&&!valid} aria-describedby={`help-${line.id}`} value={q??''} placeholder="Isi jumlah, termasuk 0" aria-label={`Jumlah Tahap 1: ${line.title}`} disabled={busy&&!autosaving} oninput={e=>setQuantity(line.id,e.currentTarget.value===''?null:e.currentTarget.valueAsNumber)}/><span class="text-xs font-normal text-slate-500">{valid?formatSen(Math.round(q!*line.unitPriceSen)):'Belum ada nominal valid'}</span></label>
       <div class="grid content-start gap-1 rounded-lg bg-blue-50 p-3"><p class="font-semibold">Jumlah Tahap 2 · otomatis</p><strong class="text-lg text-blue-900">{remaining(line)}</strong><p class="text-xs">{valid?formatSen(line.amountSen-Math.round(q!*line.unitPriceSen)):'Diisi dari sisa jumlah Tahap 1'}</p></div>
      </div>
      <div class="mt-3 flex flex-wrap gap-2"><button class={q===line.volume?blue:btn} aria-pressed={q===line.volume} disabled={busy&&!autosaving} onclick={()=>setQuantity(line.id,line.volume)} aria-label={`Semua ke Tahap 1: ${line.title}`}>{q===line.volume?'✓ ':''}Semua ke Tahap 1</button><button class={q===0?blue:btn} aria-pressed={q===0} disabled={busy&&!autosaving} onclick={()=>setQuantity(line.id,0)} aria-label={`Semua ke Tahap 2: ${line.title}`}>{q===0?'✓ ':''}Semua ke Tahap 2</button></div>
      <p id={`help-${line.id}`} class="mt-2 text-xs {q!=null&&!valid?'font-semibold text-red-700':'text-slate-500'}" aria-live="polite">{q==null?'Belum dibagi. Isi jumlah atau pilih semua ke salah satu tahap.':!valid?`Isi 0 sampai ${formatVolume(line.volume)} ${line.unit}${Number.isInteger(line.volume)?' dalam bilangan bulat.':' dengan maksimal 4 desimal.'}`:q===line.volume?'Seluruh item masuk Tahap 1.':q===0?'Seluruh item masuk Tahap 2.':`Dibagi: ${formatVolume(q!)} ${line.unit} + ${remaining(line)}.`}</p>
     </article>
    {/each}
   </div>
  {:else if journey&&journeyStep==='full'}
   <h2 class="text-lg font-bold text-slate-900">Periksa RAB 100% dari Excel</h2>
   <p class="text-slate-600">Pastikan semua kebutuhan, jumlah, dan harga sudah benar. Setelah ini Anda memilih item untuk Termin 1.</p>
     <div class="flex flex-wrap items-end gap-3"><label class="grid min-w-0 flex-1 gap-1 font-semibold">Cari item atau kode<input type="search" class="min-h-11 rounded-lg border border-slate-300 p-2 font-normal" bind:value={search} placeholder="Contoh: panel atau A.1.a.1" /></label><label class="flex min-h-11 items-center gap-2"><input type="checkbox" bind:checked={showGroups} disabled={Boolean(search.trim())} />Tampilkan kelompok kegiatan</label></div>
     <p class="text-xs text-slate-500" role="status">{visibleLines.filter(line=>line.level===4).length} dari {items.length} item ditampilkan. Total tetap mencakup seluruh RAB 100%.</p>
     <div class="max-h-[50vh] overflow-auto rounded-xl border border-slate-200" tabindex="0" role="region" aria-label="Rincian sumber RAB 100%">
      <table class="w-full min-w-[600px] border-separate border-spacing-0 text-sm tabular-nums">
       <caption class="sr-only">Rincian RAB 100% dari Excel</caption>
       <thead class="sticky top-0 z-10 bg-slate-100 text-xs text-slate-700"><tr><th scope="col" class="border-b p-3 text-left">Kode dan item</th><th scope="col" class="border-b p-3 text-right">Jumlah</th><th scope="col" class="border-b p-3 text-right">Harga satuan</th><th scope="col" class="border-b p-3 text-right">Total RAB 100%</th></tr></thead>
       <tbody>{#each visibleLines as line (line.id)}<tr class="{line.level<4?'bg-slate-100 font-semibold':'bg-white hover:bg-blue-50/50'}"><th scope="row" class="min-w-[220px] border-b border-slate-100 p-2 text-left font-normal"><span class="text-xs font-semibold text-slate-500">{line.code}</span><p class={line.level<4?'font-semibold':'font-medium'}>{line.title}</p></th><td class="border-b border-slate-100 p-2 text-right">{line.level===4?formatVolume(line.volume)+' '+line.unit:'-'}</td><td class="whitespace-nowrap border-b border-slate-100 p-2 text-right">{line.level===4?formatSen(line.unitPriceSen):'-'}</td><td class="whitespace-nowrap border-b border-slate-100 p-2 text-right font-semibold">{formatSen(line.amountSen)}</td></tr>{:else}<tr><td colspan="4" class="p-6 text-center text-slate-500">Tidak ada item yang cocok. Coba nama atau kode lain.</td></tr>{/each}</tbody>
       <tfoot class="sticky bottom-0 bg-slate-100 font-bold"><tr><th scope="row" colspan="3" class="border-t p-3 text-left">Total seluruh RAB 100%</th><td class="whitespace-nowrap border-t p-3 text-right">{formatSen(v.totalSen)}</td></tr></tfoot>
      </table>
     </div>
  {:else if admin}
   <div class="grid gap-2"><h2 class="text-lg font-bold text-slate-900">Crosscheck RAB 100%, 70%, dan 30%</h2><label class="grid gap-1 font-semibold">Cari pada perbandingan RAB<input type="search" class="min-h-11 rounded-lg border border-slate-300 p-2 font-normal" bind:value={comparisonSearch} placeholder="Nama item atau kode" /></label><p class="text-xs text-slate-500">{reviewItems.length} dari {items.length} item. Semua item termasuk alokasi 0 dapat dibandingkan; total tetap mencakup seluruh RAB.</p></div>
   {#if !historical&&!data.disbursement.paidAt}
    {#if editingAdmin}<div class="flex flex-wrap justify-end gap-2"><button class={btn} disabled={busy} onclick={startEdit}>Reset ke awal</button><button class={btn} disabled={busy} onclick={()=>{editingAdmin=false;error='';}}>Batal</button><button class={blue} disabled={busy||!editsValid} onclick={saveCorrection}>{busy?'Menyimpan...':'Simpan perubahan'}</button></div>{:else}<button class={btn+' justify-self-start'} disabled={busy} onclick={startEdit}><span class="inline-flex items-center gap-2"><Icon name="edit" size={16}/>Edit RAB</span></button>{/if}
   {/if}
   <div class="max-h-[60vh] overflow-auto rounded-xl border border-slate-200" tabindex="0" role="region" aria-label="Tabel perbandingan tiga RAB">
    <table use:reviewColumns class="w-full min-w-[720px] border-separate border-spacing-0 text-sm tabular-nums">
     <caption class="sr-only">Jumlah dan nominal sumber serta kedua tahap per item</caption>
     <thead class="sticky top-0 z-10 bg-slate-100 text-left text-xs"><tr><th scope="col" class="border-b p-3">Kode, item, dan harga satuan</th>{#each [['rab_penuh','RAB 100%','Seluruh anggaran'],['rab','RAB 70%','Tahap 1 - maksimal 70% SK'],['rab_tahap2','RAB 30%','Tahap 2 - sisa']] as column}<th scope="col" data-review-column={column[0]} class="cursor-pointer border-b p-0 text-right {kind===column[0]||hoveredReview===column[0]?'bg-blue-100 text-blue-950':''}" aria-current={kind===column[0]?'true':undefined}><button type="button" class="min-h-11 w-full cursor-pointer p-3 text-right focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0066B2] disabled:cursor-wait" aria-label={`Periksa ${column[1]}`} aria-pressed={kind===column[0]} disabled={busy} onclick={()=>selectReview(column[0])} onkeydown={event=>{if(event.key==='Enter')event.stopPropagation();}}><span class="block font-bold">{column[1]}</span><span class="mt-1 block font-normal">{column[2]}</span>{#if kind===column[0]}<span class="mt-1 inline-block rounded bg-[#0066B2] px-2 py-1 text-white">Sedang diperiksa</span>{/if}</button></th>{/each}</tr></thead>
     <tbody>{#each reviewItems as line (line.id)}
      {@const q=quantities[line.id]}
      {@const valid=validQuantity(q,line.volume)}
      <tr class="bg-white hover:bg-slate-50"><th scope="row" class="min-w-[220px] border-b border-slate-100 p-3 text-left font-normal"><p class="text-xs font-semibold text-slate-500">{line.code}</p><p class="font-semibold">{line.title}</p>{#if editingAdmin}<label class="mt-2 grid gap-1 text-xs">Harga satuan (Rp)<input class="min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2" type="number" min="0.01" step="0.01" aria-label={`Harga satuan: ${line.title}`} bind:value={edits[line.id].price} disabled={busy||kind!=='rab_penuh'}/></label>{:else}<p class="text-xs text-slate-500">{formatSen(line.unitPriceSen)} / {line.unit}</p>{/if}</th>
       <td data-review-column="rab_penuh" class="cursor-pointer border-b border-slate-100 p-3 text-right {kind==='rab_penuh'||hoveredReview==='rab_penuh'?'bg-blue-100':''}">{#if editingAdmin}<b>{formatSen(Math.round((edits[line.id].volume||0)*(edits[line.id].price||0)*100))}</b><label class="mt-2 grid gap-1 text-xs text-left">Jumlah awal ({line.unit})<input class="min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2" type="number" min={Number.isInteger(line.volume)?1:0.0001} step={Number.isInteger(line.volume)?1:0.0001} aria-invalid={!validEditedVolume(edits[line.id].volume,line.volume)} aria-label={`Jumlah awal: ${line.title}`} bind:value={edits[line.id].volume} disabled={busy||kind!=='rab_penuh'}/>{#if !validEditedVolume(edits[line.id].volume,line.volume)}<span class="text-red-700" role="alert">{Number.isInteger(line.volume)?'Jumlah awal harus bilangan bulat positif.':'Isi jumlah positif dengan maksimal 4 desimal.'}</span>{/if}</label>{:else}<b>{formatSen(line.amountSen)}</b><p class="mt-1 text-xs">{formatVolume(line.volume)} {line.unit}</p>{/if}</td>
       <td data-review-column="rab" class="cursor-pointer border-b border-slate-100 p-3 text-right {kind==='rab'||hoveredReview==='rab'?'bg-blue-100':''}">{#if editingAdmin}<b>{formatSen(Math.round((edits[line.id].first||0)*(edits[line.id].price||0)*100))}</b><label class="mt-2 grid gap-1 text-xs text-left">Jumlah Tahap 1 ({line.unit})<input class="min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2" type="number" min="0" max={edits[line.id].volume} step={Number.isInteger(edits[line.id].volume)?1:0.0001} aria-label={`Jumlah Tahap 1: ${line.title}`} bind:value={edits[line.id].first} disabled={busy||kind!=='rab'}/></label>{:else}<b>{legacy?formatSen(line.term1Sen):valid?formatSen(Math.round(q!*line.unitPriceSen)):'-'}</b><p class="mt-1 text-xs">{valid?formatVolume(q!)+' '+line.unit:legacy?'Jumlah belum tercatat':'Belum dibagi'}</p>{/if}</td>
       <td data-review-column="rab_tahap2" class="cursor-pointer border-b border-slate-100 p-3 text-right {kind==='rab_tahap2'||hoveredReview==='rab_tahap2'?'bg-blue-100':''}">{#if editingAdmin&&(validQuantity(edits[line.id].first,edits[line.id].volume)||kind==='rab_tahap2')}<b>{formatSen(Math.round(edits[line.id].volume*edits[line.id].price*100)-Math.round(edits[line.id].first*edits[line.id].price*100))}</b><p class="mt-1 text-xs">{formatVolume(Math.round((edits[line.id].volume-edits[line.id].first)*10000)/10000)} {line.unit}</p>{#if kind==='rab_tahap2'}<label class="mt-2 grid gap-1 text-xs text-left">Jumlah Tahap 2 ({line.unit})<input class="min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2" type="number" min="0" max={edits[line.id].volume} step={Number.isInteger(edits[line.id].volume)?1:0.0001} aria-invalid={!validQuantity(edits[line.id].first,edits[line.id].volume)} aria-label={`Jumlah Tahap 2: ${line.title}`} value={Math.round((edits[line.id].volume-edits[line.id].first)*10000)/10000} disabled={busy} oninput={e=>{edits[line.id].first=Math.round((edits[line.id].volume-e.currentTarget.valueAsNumber)*10000)/10000;}}/>{#if !validQuantity(edits[line.id].first,edits[line.id].volume)}<span class="text-red-700" role="alert">Jumlah Tahap 2 harus antara 0 dan jumlah awal, mengikuti aturan jumlah bulat.</span>{/if}</label>{:else}<p class="mt-1 text-xs text-slate-500">Otomatis dari sisa</p>{/if}{:else if editingAdmin}<span class="text-red-700">Pembagian tidak valid</span>{:else}<b>{legacy?formatSen(line.term2Sen):valid?formatSen(line.amountSen-Math.round(q!*line.unitPriceSen)):'-'}</b><p class="mt-1 text-xs">{legacy?'Jumlah belum tercatat':remaining(line)}</p>{/if}</td></tr>
     {:else}<tr><td colspan="4" class="p-6 text-center text-slate-500">Tidak ada item yang cocok.</td></tr>{/each}</tbody>
     <tfoot class="sticky bottom-0 bg-slate-100 font-bold"><tr><th scope="row" class="border-t p-3 text-left">Total seluruh RAB</th><td data-review-column="rab_penuh" class="cursor-pointer whitespace-nowrap border-t p-3 text-right {kind==='rab_penuh'||hoveredReview==='rab_penuh'?'bg-blue-100':''}">{formatSen(editingAdmin?editedTotal:v.totalSen)}</td><td data-review-column="rab" class="cursor-pointer whitespace-nowrap border-t p-3 text-right {kind==='rab'||hoveredReview==='rab'?'bg-blue-100':''}">{formatSen(editingAdmin?editedFirst:first)}</td><td data-review-column="rab_tahap2" class="cursor-pointer whitespace-nowrap border-t p-3 text-right {kind==='rab_tahap2'||hoveredReview==='rab_tahap2'?'bg-blue-100':''}">{formatSen(editingAdmin?editedTotal-editedFirst:second)}</td></tr></tfoot>
    </table>
   </div>
  {:else}
   <h2 class="text-lg font-bold text-slate-900">{admin?'Perbandingan untuk pemeriksaan '+reviewLabel:!editable?'Perbandingan RAB 100% dan pembagian':kind==='rab'?'Periksa jumlah dan nominal Tahap 1':'Periksa sisa Tahap 2 sebelum mengajukan'}</h2>
   <p class="text-slate-600">Setiap item ditampilkan, termasuk jumlah 0. Jumlah Tahap 1 + Tahap 2 harus sama dengan jumlah awal.</p>
   <div class="grid gap-3" aria-label="Perbandingan tiga RAB">
    {#each pagedItems as line (line.id)}
     {@const q=quantities[line.id]}
     {@const valid=validQuantity(q,line.volume)}
     <article class="rounded-xl border border-slate-200 p-3"><h3 class="font-bold">{line.code} {line.title}</h3><p class="mb-3 text-xs text-slate-500">Harga satuan {formatSen(line.unitPriceSen)} / {line.unit}</p><div class="grid grid-cols-1 gap-2 sm:grid-cols-3"><div class="rounded-lg p-2 {admin&&kind==='rab_penuh'?'bg-blue-50 ring-2 ring-blue-300':'bg-slate-50'}"><p class="text-xs font-semibold">RAB 100%</p>{#if admin&&kind==='rab_penuh'}<span class="mb-1 inline-block rounded bg-[#0066B2] px-2 py-0.5 text-xs font-semibold text-white">Sedang diperiksa</span>{/if}<b>{formatVolume(line.volume)} {line.unit}</b><p>{formatSen(line.amountSen)}</p></div><div class="rounded-lg p-2 {kind==='rab'?'bg-blue-50 ring-1 ring-blue-200':'bg-slate-50'}"><p class="text-xs">Tahap 1 · maks. 70%</p><b>{valid?formatVolume(q!)+' '+line.unit:legacy&&!editable?'Jumlah belum tercatat':'Belum dibagi'}</b><p>{legacy&&!editable?formatSen(line.term1Sen):valid?formatSen(Math.round(q!*line.unitPriceSen)):'—'}</p></div><div class="rounded-lg p-2 {kind==='rab_tahap2'?'bg-blue-50 ring-1 ring-blue-200':'bg-slate-50'}"><p class="text-xs">Tahap 2 · sisa</p><b>{legacy&&!editable?'Jumlah belum tercatat':remaining(line)}</b><p>{legacy&&!editable?formatSen(line.term2Sen):valid?formatSen(line.amountSen-Math.round(q!*line.unitPriceSen)):'—'}</p></div></div></article>
    {/each}
   </div>
  {/if}
  {#if !admin&&!(journey&&journeyStep==='full')&&pageCount>1}{@render itemPagination('bawah')}{/if}
  {#if admin||!journey||journeyStep!=='full'}
   <details class="rounded-xl border border-slate-200 p-3">
    <summary class="cursor-pointer font-semibold text-[#0066B2]">Lihat rincian RAB 100% dari Excel</summary>
    <div class="mt-3 grid gap-3">
     <div class="flex flex-wrap items-end gap-3"><label class="grid min-w-0 flex-1 gap-1 font-semibold">Cari item atau kode<input type="search" class="min-h-11 rounded-lg border border-slate-300 p-2 font-normal" bind:value={search} placeholder="Contoh: panel atau A.1.a.1" /></label><label class="flex min-h-11 items-center gap-2"><input type="checkbox" bind:checked={showGroups} disabled={Boolean(search.trim())} />Tampilkan kelompok kegiatan</label></div>
     <p class="text-xs text-slate-500" role="status">{visibleLines.filter(line=>line.level===4).length} dari {items.length} item ditampilkan. Total tetap mencakup seluruh RAB 100%.</p>
     <div class="max-h-[50vh] overflow-auto rounded-xl border border-slate-200" tabindex="0" role="region" aria-label="Rincian sumber RAB 100%">
      <table class="w-full min-w-[760px] border-separate border-spacing-0 text-sm tabular-nums">
       <caption class="sr-only">Rincian RAB 100% dari Excel</caption>
       <thead class="sticky top-0 z-10 bg-slate-100 text-xs text-slate-700"><tr><th scope="col" class="border-b p-3 text-left">Kode</th><th scope="col" class="border-b p-3 text-left">Uraian</th><th scope="col" class="border-b p-3 text-right">Jumlah</th><th scope="col" class="border-b p-3 text-left">Satuan</th><th scope="col" class="border-b p-3 text-right">Harga satuan</th><th scope="col" class="border-b p-3 text-right">Total</th></tr></thead>
       <tbody>{#each visibleLines as line (line.id)}<tr class="{line.level<4?'bg-slate-100 font-semibold':'bg-white hover:bg-blue-50/50'}"><td class="whitespace-nowrap border-b border-slate-100 p-3 text-xs text-slate-500">{line.code}</td><th scope="row" class="min-w-[220px] border-b border-slate-100 p-3 text-left font-medium">{line.title}</th><td class="border-b border-slate-100 p-3 text-right">{line.level===4?formatVolume(line.volume):'-'}</td><td class="border-b border-slate-100 p-3">{line.level===4?line.unit:'-'}</td><td class="whitespace-nowrap border-b border-slate-100 p-3 text-right">{line.level===4?formatSen(line.unitPriceSen):'-'}</td><td class="whitespace-nowrap border-b border-slate-100 p-3 text-right font-semibold">{formatSen(line.amountSen)}</td></tr>{:else}<tr><td colspan="6" class="p-6 text-center text-slate-500">Tidak ada item yang cocok. Coba nama atau kode lain.</td></tr>{/each}</tbody>
       <tfoot class="sticky bottom-0 bg-slate-100 font-bold"><tr><th scope="row" colspan="5" class="border-t p-3 text-left">Total seluruh RAB 100%</th><td class="whitespace-nowrap border-t p-3 text-right">{formatSen(v.totalSen)}</td></tr></tfoot>
      </table>
     </div>
    </div>
   </details>
  {/if}
  {#if journey}
   <div class="flex flex-wrap justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Tindakan RAB">
    {#if journeyStep==='full'}
     {#if v.status==='disetujui'&&!locked&&!data.disbursement.paidAt}<button class={btn} disabled={busy} onclick={revise}>Buat draf perbaikan dari versi ini</button>{/if}
     <button class={btn} disabled={busy||!editable} onclick={()=>leave(()=>{sync();replace=true;void goto(journeyUrl('upload'));})}>Kembali</button>
     <button class={blue} disabled={busy||v.totalSen!==data.summary.amountSen} onclick={continueFull}>Lanjut</button>
    {:else if journeyStep==='term1'}
     <button class={btn} disabled={busy} onclick={()=>leave(()=>{sync();void goto(journeyUrl('full'));})}>Kembali</button>
     {#if editable}<button class={blue} disabled={busy||!ready} onclick={()=>save(true)}>Lanjut</button>{#if saveFailed}<p class="w-full text-xs text-red-700" role="alert">Draf gagal disimpan. Isian Anda tetap tersedia.<button type="button" class="ml-2 min-h-9 font-semibold text-[#0066B2] underline" disabled={busy||invalid} onclick={()=>save()}>Coba simpan lagi</button></p>{/if}{:else}<button class={blue} onclick={()=>goto(journeyUrl('term2'))}>Lanjut</button>{/if}
     {#if !ready&&editable}<p class="w-full text-sm text-amber-900">{invalid?'Perbaiki jumlah yang ditandai merah.':first>data.summary.limitSen?'Total Termin 1 melebihi batas 70% SK. Kurangi jumlah item.':allocated<items.length?'Isi jumlah setiap item. Gunakan 0 jika seluruhnya masuk Termin 2.':'Total Termin 1 harus lebih dari Rp0.'}</p>{/if}
    {:else if journeyStep==='term2'}
     <button class={btn} disabled={busy} onclick={()=>goto(journeyUrl('term1'))}>Kembali</button>
     <button class={blue} disabled={busy||!ready||dirty} onclick={oncontinue}>Lanjut</button>
     <p class="w-full text-xs text-slate-600">Termin 2 mengikuti sisa pembagian. Pengajuan dikirim sekali setelah administrasi dan PKS lengkap.</p>
    {/if}
   </div>
  {:else if editable}
   <div class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Tindakan RAB">
    {#if invalid}<p class="text-red-700" role="alert">Perbaiki jumlah pada item yang ditandai merah.</p>
    {:else if first>data.summary.limitSen}<p class="text-red-700" role="alert">Tahap 1 melebihi batas sebesar {formatSen(first-data.summary.limitSen)}. Kurangi jumlah pada tahap ini.</p>
    {:else if allocated<items.length}<p class="text-amber-900">Masih ada {items.length-allocated} item belum dibagi. Isi 0 jika seluruh item masuk Tahap 2.</p>
    {:else if first===0}<p class="text-amber-900">Total Tahap 1 harus lebih dari Rp0 sebelum mengajukan.</p>{/if}
    {#if dirty}<p class="font-semibold text-amber-900" role="status">Perubahan belum disimpan. Simpan sebelum memeriksa atau mengajukan.</p>{:else}<p class="text-slate-600">Draf tersimpan. Pengajuan dikirim setelah konfirmasi pada langkah terakhir.</p>{/if}
    {#if editingAllocation}
     <div class="flex flex-wrap gap-2"><button class={btn} disabled={busy||invalid||!dirty} onclick={()=>save()}>Simpan draf pembagian</button><button class={blue} disabled={busy||!ready} onclick={()=>save(true)}>Simpan & periksa Tahap 1</button></div>
     <button class={btn+' justify-self-start'} disabled={busy} onclick={()=>leave(()=>{sync();replace=true;})}>Ganti file RAB 100%</button>
    {:else if kind==='rab'}
     <button class={blue+' justify-self-start'} disabled={busy||!ready||dirty} onclick={()=>goto('/campus/pencairan?butir=rab_tahap2')}>Lanjut: periksa Tahap 2 & ajukan</button>
    {:else}
     <label class="flex items-start gap-2"><input class="mt-1" type="checkbox" bind:checked={confirmed} disabled={!ready||dirty||busy}/>Saya sudah memeriksa RAB 100% dan pembagian kedua tahap. Setelah diajukan, pembagian terkunci sampai keputusan PF.</label><button class={blue+' justify-self-start'} disabled={!confirmed||!ready||dirty||busy} onclick={submit}>{busy?'Mengirim…':'Ajukan seluruh RAB ke PF'}</button>
    {/if}
    {#if !editingAllocation}<a class="justify-self-start font-semibold text-[#0066B2] underline" href="/campus/pencairan?butir=rab_penuh">Kembali untuk mengubah pembagian</a>{/if}
   </div>
  {:else if !admin&&historical}<p class="text-slate-600">Ini arsip versi lama. Gunakan pilihan riwayat di atas untuk melanjutkan sebagai draf terbaru.</p>
  {:else if !admin&&v.status==='disetujui'}<p class="text-green-900">Pembagian ini telah disetujui PF. Pantau proses pencairan pada progres di atas.</p><button class={btn+' justify-self-start'} disabled={busy} onclick={revise}>Buat draf perbaikan dari versi ini</button>
  {:else if !admin}<p class="text-blue-900">Pengajuan sedang diperiksa PF. Tidak perlu mengunggah atau mengajukan ulang.</p>{/if}
 {:else}<p>Belum ada RAB. Kampus mengunggah satu file RAB 100% terlebih dahulu.</p>{/if}
</section>


{#if savedNotice}
 <div class="fixed bottom-6 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg" role="status" aria-live="polite"><span aria-hidden="true">&#10003;</span><span>Draf RAB tersimpan</span><button type="button" class="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white" aria-label="Tutup notifikasi" onclick={()=>savedNotice=false}>&#215;</button></div>
{/if}

{#if pendingLeave}
 <Modal title="Perubahan RAB belum disimpan" onclose={()=>pendingLeave=null}>
  <p class="text-slate-600">Perubahan RAB belum tersimpan. Jika dilanjutkan, perubahan ini akan dibuang. Draf yang sudah disimpan tetap tersedia.</p>
  <div class="mt-5 flex flex-wrap justify-end gap-2">
   <button type="button" class={btn} onclick={()=>pendingLeave=null}>Tetap di sini</button>
   <button type="button" class="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" onclick={discard}>Buang perubahan</button>
  </div>
 </Modal>
{/if}

