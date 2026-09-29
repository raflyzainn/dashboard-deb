<script lang="ts">
 import { onMount } from 'svelte';
 import { goto } from '$app/navigation';
 import { dataService } from '$lib/data/service';
 import { onChange } from '$lib/realtime.svelte';
 import { formatSen } from '$lib/pencairan';
 import type { RabOverview } from '$lib/rab';
 import { formatVolume } from '$lib/rab';
 let {campusId,kind,admin,onloaded}:{campusId:string;kind:string;admin:boolean;onloaded:()=>void}=$props();
 let data=$state<RabOverview|null>(null),error=$state(''),busy=$state(false),replace=$state(false),confirmed=$state(false),success=$state(false);
 const v=$derived(data?.version),editable=$derived(!admin&&(!v||v.status==='draf'));
 let quantities=$state<Record<string,number|null>>({}),dirty=$state(false);
 const items=$derived(v?.lines.filter(l=>l.level===4)||[]);
 const allocated=$derived(items.filter(l=>quantities[l.id]!==null&&quantities[l.id]!==undefined).length);
 const first=$derived(items.reduce((sum,l)=>sum+Math.round((quantities[l.id]??0)*l.unitPriceSen),0));
 const second=$derived(items.reduce((sum,l)=>sum+(quantities[l.id]==null?0:l.amountSen-Math.round(quantities[l.id]!*l.unitPriceSen)),0));
 const invalid=$derived(items.some(l=>quantities[l.id]!=null&&(!Number.isFinite(quantities[l.id])||quantities[l.id]!<0||quantities[l.id]!>l.volume)));
 const ready=$derived(allocated===items.length&&items.length>0&&!invalid&&first>0&&first<=(data?.summary.limitSen||0));
 function sync(){quantities=Object.fromEntries((data?.version?.lines||[]).filter(l=>l.level===4).map(l=>[l.id,typeof l.flags?.term1Volume==='number'?l.flags.term1Volume:null]));dirty=false;}
 function setQuantity(id:string,q:number|null){quantities[id]=q;dirty=true;confirmed=false;error='';}
 const btn='rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0066B2] disabled:opacity-40';
 const blue='rounded-lg bg-[#0066B2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
 const base=$derived(`/api/pencairan/${campusId}/rab`);
 async function load(){try{if(dirty)return;data=await dataService.api.get<RabOverview>(base);sync();}catch(e){error=String(e);}}
 onMount(()=>{void load();return onChange(()=>void load(),{campus:campusId});});
 async function upload(file?:File){if(!file||busy)return;busy=true;error='';try{const body=new FormData();body.set('file',file);data=await dataService.api.post<RabOverview>(base+'/import',body);sync();success=true;replace=false;confirmed=false;onloaded();}catch(e){error=e instanceof Error?e.message:'Unggahan gagal.';}finally{busy=false;}}
 async function save(next=false){if(!v||invalid)return;busy=true;error='';try{data=await dataService.api.patch<RabOverview>(`${base}/versions/${v.id}/allocation`,{quantities:$state.snapshot(quantities)});sync();onloaded();if(next)await goto('/campus/pencairan?butir=rab');}catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}}
 async function submit(){if(!v||!confirmed)return;busy=true;success=false;try{data=await dataService.api.post<RabOverview>(`${base}/versions/${v.id}/submit`);onloaded();}catch(e){error=String(e);}finally{busy=false;}}
 async function revise(){if(!v||busy)return;busy=true;error='';try{data=await dataService.api.post<RabOverview>(base+'/versions',{from:v.id});sync();success=false;confirmed=false;onloaded();}catch(e){error=String(e);}finally{busy=false;}}
</script>
<section class="grid gap-3 border-b border-slate-200 bg-white p-3 text-sm" aria-label="Pengajuan RAB kampus">
 {#if error}<p class="rounded-lg bg-red-50 p-3 text-red-800" role="alert">{error}</p>{/if}
 {#if editable&&kind==='rab_penuh'&&(!v||replace)}
  <h2 class="font-semibold">1. Unggah RAB 100%, lalu tentukan pembagian jumlah item</h2>
  <div class="grid gap-3 sm:grid-cols-2"><div class="grid gap-2 rounded-lg border border-slate-200 p-3"><strong>1. Unduh Excel contoh</strong><p class="text-xs text-slate-500">Sudah terisi 6 baris, total Rp20.000.000.</p><a class={btn+' justify-self-start'} href="/contoh-rab.xlsx" download="Contoh_RAB_100_Persen.xlsx">Unduh Excel contoh (.xlsx)</a></div><div class="grid gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3"><strong>2. Unggah file tersebut</strong><p class="text-xs text-slate-500">Hasil pembacaan langsung tampil di tabel bawah.</p><label class={blue+' cursor-pointer justify-self-start'}>{busy?'Membaca...':'Pilih & unggah Excel'}<input class="sr-only" type="file" aria-label="Unggah Excel RAB 100%" accept=".xlsx" disabled={busy} onchange={e=>void upload(e.currentTarget.files?.[0])}/></label></div></div>
 {:else if v}
  <div class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900"><strong>{success?'Excel berhasil dibaca. Tentukan alokasi item di bawah.':v.status==='menunggu'?'Menunggu pemeriksaan PF':v.status==='disetujui'?'RAB disetujui':'Draf RAB'} - versi {v.number}</strong><p class="break-all">{v.sourceFile} | {v.lines.filter(l=>l.level===4).length} baris | {data?.campus.name}</p>{#if v.note}<p>{v.note}</p>{/if}</div>
  <div class="flex flex-wrap gap-4 text-xs"><span>100% <b>{formatSen(v.totalSen)}</b></span><span>70% <b>{formatSen(v.term1Sen)}</b></span><span>30% <b>{formatSen(v.term2Sen)}</b></span></div>
  {#if editable}
   {#if kind==='rab_penuh'}
    <h2 class="font-semibold">2. Pilih jumlah item untuk tahap 70% dan 30%</h2>
    <p>Isi jumlah untuk tahap 70%; sisanya masuk tahap 30%. Contoh: 10 unit dapat dibagi menjadi 7 unit dan 3 unit. Persentase berlaku untuk total dana, bukan wajib untuk setiap item.</p>
    <div class="overflow-x-auto rounded-lg border border-slate-200"><table class="w-full min-w-[850px] text-left text-sm" aria-label="Pembagian jumlah item RAB"><thead class="bg-slate-50 text-xs text-slate-500"><tr><th class="p-2">Item / harga satuan</th><th class="p-2">Jumlah 100%</th><th class="p-2">Pilihan tahap</th><th class="p-2">Jumlah 70%</th><th class="p-2">Jumlah 30%</th><th class="p-2">Nominal 70% / 30%</th></tr></thead><tbody>
    {#each items as line (line.id)}
     {@const q=quantities[line.id]}
     <tr class="border-t border-slate-200"><td class="p-2"><b>{line.code} {line.title}</b><small class="block text-slate-500">{formatSen(line.unitPriceSen)} / {line.unit}</small></td><td class="p-2">{formatVolume(line.volume)} {line.unit}</td><td class="p-2"><div class="flex gap-1"><button class={btn} disabled={busy} onclick={()=>setQuantity(line.id,line.volume)} aria-label={`Semua ke 70%: ${line.title}`}>70%</button><button class={btn} disabled={busy} onclick={()=>setQuantity(line.id,0)} aria-label={`Semua ke 30%: ${line.title}`}>30%</button></div></td><td class="p-2"><input class="w-24 rounded border border-slate-300 p-2" type="number" min="0" max={line.volume} step="0.0001" value={q??''} placeholder="Isi jumlah" aria-label={`Jumlah 70%: ${line.title}`} disabled={busy} oninput={e=>setQuantity(line.id,e.currentTarget.value===''?null:e.currentTarget.valueAsNumber)}/></td><td class="p-2">{q==null?'Belum dipilih':formatVolume(Math.round((line.volume-q)*10000)/10000)} {q==null?'':line.unit}</td><td class="p-2 tabular-nums">{q==null?'Belum dipilih':formatSen(Math.round(q*line.unitPriceSen))}<span class="block text-slate-500">{q==null?'':formatSen(line.amountSen-Math.round(q*line.unitPriceSen))}</span></td></tr>
    {/each}
    </tbody></table></div>
    <div class="rounded-lg bg-slate-50 p-3" aria-live="polite">{allocated} dari {items.length} item dialokasikan · Tahap 70%: <b>{formatSen(first)}</b> / batas {formatSen(data?.summary.limitSen||0)} · Tahap 30%: <b>{formatSen(second)}</b>{#if dirty}<p>Perubahan belum disimpan.</p>{/if}</div>
    {#if invalid}<p class="text-red-700" role="alert">Jumlah harus antara 0 dan jumlah asli item.</p>{:else if first>(data?.summary.limitSen||0)}<p class="text-red-700" role="alert">Total tahap 70% melebihi batas sebesar {formatSen(first-(data?.summary.limitSen||0))}. Kurangi jumlah item pada tahap ini.</p>{/if}
    <div class="flex flex-wrap gap-3"><button class={btn} disabled={busy||invalid||!dirty} onclick={()=>save()}>Simpan pembagian</button><button class={blue} disabled={busy||!ready} onclick={()=>save(true)}>Simpan & periksa RAB 70%</button><button class={btn} disabled={busy} onclick={()=>replace=true}>Ganti file</button></div>
   {:else if kind==='rab'}<button class={blue+' justify-self-start'} onclick={()=>goto('/campus/pencairan?butir=rab_tahap2')}>Lanjut: periksa RAB 30%</button>
   {:else}<label class="flex items-center gap-2"><input type="checkbox" bind:checked={confirmed}/>Saya sudah memeriksa ketiga RAB.</label><button class={blue+' justify-self-start'} disabled={!confirmed||busy} onclick={submit}>Ajukan RAB ke PF</button>{/if}
   {#if kind!=='rab_penuh'}<a class="text-[#0066B2] underline" href="/campus/pencairan?butir=rab_penuh">Kembali ke pembagian jumlah item</a>{/if}
  {:else if !admin&&v.status==='disetujui'}<button class={btn+' justify-self-start'} onclick={revise}>Buat versi perbaikan</button>{/if}
 {:else}<p>Belum ada RAB. Kampus mengunggah RAB 100% terlebih dahulu.</p>{/if}
</section>
