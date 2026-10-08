<script lang="ts">
 import { untrack, onDestroy } from 'svelte';
 import { reportError } from '$lib/feedback';
 import { formatSen } from '$lib/pencairan';
 import type { RabOverview } from '$lib/rab';
 import { RAB_TEMPLATE_HEADERS, mergeRabRows, validRabUnit, rabSubcategory, type TemplateQuantity } from '$lib/rab-template';
 import { readExcel, readRabRows } from '$lib/pengajuan/rab-model';
 let {version,draft,busy=false,amountSen,onsave,ondirty}:{version:RabOverview['version'];draft?:RabOverview['itemDraft'];busy?:boolean;amountSen:number;onsave:(rows:unknown[][],lineIds:string[],draft:boolean)=>Promise<boolean>;ondirty:(value:boolean)=>void}=$props();
 type Row={id:string;cells:(string|number|null|undefined)[]};
 const blank=():Row=>({id:'',cells:['','','',1,'',1,'kali',undefined]});
 let rows=$state<Row[]>([]),saved=$state(''),error=$state(''),message=$state(''),reading=$state(false);
 let saving=$state(false),automaticSave=$state(false),failed=$state('');
 let disposed=false;
 onDestroy(()=>{disposed=true;});
 let inFlight:Promise<boolean>|undefined;
 const dirty=$derived(JSON.stringify(rows)!==saved);
 const rowTotal=(row:Row)=>Math.round(Number(row.cells[3])*Number(row.cells[5])*Number(row.cells[7])*100);
 const total=$derived(rows.reduce((sum,row)=>sum+(Number.isFinite(rowTotal(row))?rowTotal(row):0),0));
 function initial():Row[]{
  if(draft)return draft.rows.map((cells,i)=>({id:draft.lineIds[i],cells:[...cells]}));
  const lines=version?.lines||[],byId=new Map(lines.map(line=>[line.id,line]));
  return lines.filter(line=>line.level===4).map(line=>{
   const section=byId.get(line.parentId),activity=section&&byId.get(section.parentId),group=activity&&byId.get(activity.parentId);
   const stored=line.flags?.templateQuantity as TemplateQuantity|undefined;
   const t=stored&&Math.round(stored.qty*stored.volume*10000)/10000===line.volume?stored:undefined;
   return {id:line.id,cells:[group?.title||'Lainnya',rabSubcategory(activity?.title||'Kegiatan',section?.title),line.title,t?.qty??line.volume,t?.unit??line.unit,t?.volume??1,t?.volumeUnit??'kali',line.unitPriceSen/100]};
  });
 }
 export function discardChanges(){if(disposed)return;rows=initial();if(!rows.length&&!draft)rows=[blank()];saved=JSON.stringify(rows);error='';message='';failed='';ondirty(false);}
 $effect(()=>{void version?.id;untrack(discardChanges);});
 $effect(()=>{void draft;untrack(()=>{if(!saving&&!dirty)discardChanges();});});
 $effect(()=>ondirty(dirty));
 $effect(()=>{
  const snapshot=JSON.stringify(rows);
  if(!dirty||busy||reading||saving||snapshot===failed)return;
  const timer=setTimeout(()=>void save(),800);
  return ()=>clearTimeout(timer);
 });
 async function append(file?:File){
  if(disposed||!file||busy||reading)return;reading=true;error='';message='';
  try{
   const imported=await readExcel(file);if(disposed)return;
   const empty=(row:Row)=>!row.id&&![0,1,2,4,7].some(c=>String(row.cells[c]??'').trim());
   const existing=rows.filter(row=>!empty(row));
   const merged=mergeRabRows(existing,imported.map(item=>{const t=item.templateQuantity;return {id:'',cells:[item.group,rabSubcategory(item.activity,item.section),item.title,t?.qty??item.volume,t?.unit??item.unit,t?.volume??1,t?.volumeUnit??'kali',item.priceSen/100]};}));
   rows=merged.rows;
   message=`${merged.added} item ditambahkan, ${merged.updated} item diperbarui. Draf disimpan otomatis.`;
  }catch(e){if(!disposed)error=reportError(e instanceof Error?e.message:'Excel tidak dapat dibaca.');}finally{reading=false;}
 }
 function save(automatic=true):Promise<boolean>{
  if(disposed)return Promise.resolve(false);
  if(inFlight)return inFlight;
  const snapshot=JSON.stringify(rows),submitted=JSON.parse(snapshot) as Row[];
  saving=true;automaticSave=automatic;error='';
  inFlight=(async()=>{
   try{
    const cells=submitted.map(row=>row.cells);
    if(!automatic){const parsed=readRabRows([RAB_TEMPLATE_HEADERS,...cells]);if(parsed.length!==submitted.length)throw Error('Lengkapi setiap baris atau hapus baris kosong.');}
    const accepted=await onsave(cells,submitted.map(row=>row.id),automatic);if(disposed)return false;
    if(!accepted){failed=snapshot;return false;}
    if(automatic){saved=snapshot;failed='';ondirty(JSON.stringify(rows)!==snapshot);}else discardChanges();return true;
   }catch(e){if(disposed)return false;failed=snapshot;error=reportError(e instanceof Error?e.message:'Draf tidak dapat disimpan.');return false;}
  })().finally(()=>{saving=false;automaticSave=false;inFlight=undefined;});
  return inFlight;
 }
 export async function flush(){if(disposed||inFlight&&!await inFlight)return false;while(!disposed&&dirty){if(!await save())return false;}return !disposed;}
 export async function prepare(){if(disposed)return false;if(!dirty&&!draft&&version)return true;if(!await flush())return false;return save(false);}
 const input='min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:bg-slate-50';
</script>

<section class="grid min-w-0 gap-3" aria-label="Tabel input RAB">
 <div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
  <label class="grid gap-2 font-semibold">Tambah item dari Excel<input type="file" class="w-full min-w-0 rounded-lg border bg-white p-2 font-normal" aria-label="Tambah item dari Excel" accept=".xlsx" disabled={busy||reading} onchange={e=>{void append(e.currentTarget.files?.[0]);e.currentTarget.value='';}}/></label>
  <p class="mt-2 text-xs text-slate-600">.xlsx · maksimal 2 MB dan total 500 item. Kategori, sub kategori, dan nama yang sama memperbarui item lama; item baru ditambahkan. Autosave.</p>
 </div>
 <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="font-bold">Isi RAB langsung atau tambahkan Excel</h3><button type="button" class="min-h-11 rounded-lg border border-blue-300 px-3 font-semibold text-[#0066B2] disabled:opacity-40" disabled={busy||reading||rows.length>=500} onclick={()=>rows=[...rows,blank()]}>Tambah item</button></div>
 <p class="text-xs text-slate-600">Kolom sama dengan template. Total Harga dihitung dari Qty × Volume × Harga Satuan. Draf tersimpan otomatis meskipun belum lengkap; lengkapi setiap baris sebelum memeriksa RAB.</p>
 <!-- svelte-ignore a11y_no_noninteractive_tabindex (Tabel dapat digeser dengan keyboard.) -->
 <div class="min-w-0 overflow-x-auto rounded-lg border border-slate-200" role="region" aria-label="Isian item RAB" tabindex="0">
  <table class="w-full min-w-[1300px] border-separate border-spacing-0 text-sm">
   <caption class="sr-only">Tabel dengan kolom yang sama seperti template Excel RAB</caption>
   <thead class="bg-slate-50"><tr>{#each RAB_TEMPLATE_HEADERS as title}<th scope="col" class="p-2 text-left">{title}{#if title!=='Total Harga'}<span class="text-red-600"> *</span>{/if}</th>{/each}<th scope="col" class="p-2">Aksi</th></tr></thead>
   <tbody>{#each rows as row,i}<tr>
    {#each RAB_TEMPLATE_HEADERS.slice(0,8) as title,c}<td class="border-t p-2 {c===2?'min-w-[200px]':c===3||c===5?'w-[90px]':'min-w-[120px]'}">
     {#if [3,5,7].includes(c)}{@const invalid=row.cells[c]!=null&&(!Number.isSafeInteger(row.cells[c])||Number(row.cells[c])<1)}<input class={input} type="number" required min="1" step="1" aria-invalid={invalid} aria-describedby={invalid?`integer-${i}-${c}`:undefined} bind:value={row.cells[c]} aria-label={`${title} baris ${i+1}`} disabled={busy&&!automaticSave||reading}/>{#if invalid}<p id={`integer-${i}-${c}`} class="mt-1 text-xs text-red-700">Gunakan bilangan bulat minimal 1.</p>{/if}
     {:else}{@const invalid=[4,6].includes(c)&&Boolean(row.cells[c])&&!validRabUnit(row.cells[c])}<input class={input} required maxlength={c===4||c===6?60:500} aria-invalid={invalid} bind:value={row.cells[c]} aria-label={`${title} baris ${i+1}`} disabled={busy&&!automaticSave||reading}/>{#if invalid}<p class="mt-1 text-xs text-red-700">Isi satuan, misalnya unit atau hari.</p>{/if}{/if}
    </td>{/each}
    <td class="whitespace-nowrap border-t p-2 font-semibold">{Number.isFinite(rowTotal(row))&&rowTotal(row)>0?formatSen(rowTotal(row)):'—'}</td>
    <td class="border-t p-2"><button type="button" class="min-h-11 rounded-md px-2 text-red-700 hover:bg-red-50" aria-label={`Hapus item baris ${i+1}`} disabled={busy||reading} onclick={()=>rows=rows.filter((_,index)=>index!==i)}>Hapus</button></td>
   </tr>{/each}</tbody>
  </table>
 </div>
 <div class="flex flex-wrap justify-between gap-3 rounded-lg bg-slate-50 p-3"><span>{rows.length} dari 500 item</span><strong>Total: {formatSen(total)} / SK {formatSen(amountSen)}</strong></div>
 {#if total!==amountSen}<p class="text-sm text-amber-900">Draf boleh disimpan. Total RAB harus sama dengan nilai SK sebelum melanjutkan pembagian dan pengajuan.</p>{/if}
 {#if error}<p role="alert" class="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>{/if}
 {#if message}<p role="status" class="rounded-lg bg-blue-50 p-3 text-blue-900">{message}</p>{/if}
 <div class="flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-slate-500" role="status">{reading?'Membaca Excel…':saving?'Menyimpan draf…':dirty?'Perubahan belum tersimpan.':'Draf tersimpan otomatis. Belum dikirim ke PF.'}</p>{#if failed&&dirty}<button type="button" class="min-h-11 px-3 font-semibold text-[#0066B2] underline" disabled={busy||reading||saving} onclick={()=>save()}>Coba simpan lagi</button>{/if}</div>
</section>
