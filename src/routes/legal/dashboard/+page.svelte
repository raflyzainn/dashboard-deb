<script lang="ts">
 import { goto } from '$app/navigation';
 import { app } from '$lib/state.svelte';
 import { dataService } from '$lib/data/service';
 import Shell from '$lib/components/layout/Shell.svelte';
 import Button from '$lib/components/ui/Button.svelte';
 import FileViewer from '$lib/components/admin/pencairan/FileViewer.svelte';
 let rows=$state<{campusId:string;name:string;state:string}[]>([]),selected=$state(''),detail=$state<any>(null),note=$state(''),error=$state(''),busy=$state(false);
 const labels:Record<string,string>={legal:'Menunggu pemeriksaan',approved:'Disetujui Legal',revision:'Dikembalikan ke PF'};
 let filter=$state('all');
 const visibleRows=$derived(rows.filter(row=>filter==='all'||row.state===filter));
 const date=(value:string)=>value?new Date(value.slice(0,10)+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'Belum diisi';
 async function load(){try{rows=await dataService.api.get('/api/legal/pks');}catch(e){error=e instanceof Error?e.message:'Daftar belum tersedia.';}}
 async function select(id:string){busy=true;error='';try{detail=await dataService.api.get('/api/legal/pks/'+id);selected=id;note='';}catch(e){error=e instanceof Error?e.message:'PKS belum tersedia.';}finally{busy=false;}}
 async function decide(decision:'approved'|'revision'){
  busy=true;error='';try{await dataService.api.post('/api/legal/pks/'+selected,{decision,note,versionId:detail.review.versionId,hash:detail.review.hash,expectedRevision:detail.serverRevision});await select(selected);await load();}catch(e){error=e instanceof Error?e.message:'Keputusan belum tersimpan.';}finally{busy=false;}
 }
 $effect(()=>{if(!app.ready)return;if(app.session?.role!=='legal'||app.session.passwordChangeRequired)void goto(app.home());else void load();});
</script>
<svelte:head><title>Pemeriksaan PKS Legal &middot; Desa Energi Berdikari</title></svelte:head>
{#if app.ready&&app.session?.role==='legal'&&!app.session.passwordChangeRequired}
<Shell><div class="space-y-6">
 <header class="flex flex-wrap items-start justify-between gap-4"><div><h1 class="text-2xl font-bold text-[#17365f]">Pemeriksaan PKS</h1><p class="mt-2 text-sm text-slate-600">Periksa dokumen dari Admin PF, lalu berikan persetujuan atau catatan revisi.</p></div><Button variant="secondary" disabled={busy} onclick={async()=>{await load();if(selected)await select(selected);}}>Muat ulang</Button></header>
 {#if error}<p role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>{/if}
 {#if !detail}
 <div class="grid gap-3 sm:grid-cols-3">{#each Object.entries(labels) as [state,label]}<div class="rounded-xl border border-[#dce7f7] bg-white p-5"><p class="text-sm text-slate-600">{label}</p><p class="mt-2 text-3xl font-bold text-[#17365f]">{rows.filter(row=>row.state===state).length}</p></div>{/each}</div>
 <section class="overflow-hidden rounded-xl border border-[#dce7f7] bg-white">
 <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><h2 class="font-semibold text-[#17365f]">Daftar PKS kampus</h2><label class="flex items-center gap-2 text-sm text-slate-600">Status<select class="min-h-10 rounded-lg border border-[#cfe0f5] bg-white px-3" bind:value={filter}><option value="all">Semua status</option>{#each Object.entries(labels) as [state,label]}<option value={state}>{label}</option>{/each}</select></label></div>
 <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-slate-50 text-slate-600"><tr><th class="px-5 py-3 font-medium">Kampus</th><th class="px-5 py-3 font-medium">Status pemeriksaan</th><th class="px-5 py-3"><span class="sr-only">Tindakan</span></th></tr></thead><tbody>
 {#each visibleRows as row}<tr class="border-t border-slate-100"><td class="px-5 py-4 font-medium text-[#17365f]">{row.name}</td><td class="px-5 py-4"><span class="inline-flex rounded-full px-3 py-1 text-xs font-medium {row.state==='approved'?'bg-emerald-50 text-emerald-800':row.state==='legal'?'bg-amber-50 text-amber-800':'bg-blue-50 text-blue-800'}">{labels[row.state]}</span></td><td class="px-5 py-4 text-right"><Button size="sm" variant="secondary" disabled={busy} onclick={()=>select(row.campusId)}>{row.state==='legal'?'Periksa PKS':'Lihat PKS'}</Button></td></tr>{:else}<tr><td colspan="3" class="p-10 text-center text-slate-500">{rows.length?'Tidak ada PKS dengan status ini.':'Belum ada PKS yang dikirim Admin PF.'}</td></tr>{/each}
 </tbody></table></div></section>
 {:else}
 <Button variant="ghost" disabled={busy} onclick={()=>{detail=null;selected='';note='';}}>Kembali ke daftar PKS</Button>
 <section class="space-y-5 rounded-xl border border-[#dce7f7] bg-white p-5 sm:p-6"><div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl font-bold text-[#17365f]">{detail.campus.name}</h2><span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">{labels[detail.review.state]}</span></div>
 <dl class="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">{#each [['Program',detail.fields.judulProgram],['Penandatangan',detail.fields.penandatanganNama+' - '+detail.fields.penandatanganJabatan],['Surat Keputusan',detail.sk.number+' / '+date(detail.sk.date)],['Tanggal PKS',date(detail.fields.tanggalPerjanjian)],['Nomor PKS PF',detail.pf.nomorPksPf],['Nomor PKS kampus',detail.fields.nomorPksKampus],['Masa perjanjian',date(detail.agreement.agreementStart)+' - '+date(detail.agreement.agreementEnd)]] as [label,value]}<div><dt class="mb-1 text-slate-500">{label}</dt><dd class="break-words font-medium text-[#17365f]">{value}</dd></div>{/each}</dl></section>
 <section class="space-y-4 rounded-xl border border-[#dce7f7] bg-white p-4 sm:p-6"><div><h2 class="font-semibold text-[#17365f]">Dokumen PKS</h2><p class="mt-1 text-sm text-slate-500">Periksa seluruh halaman PDF sebelum memberikan keputusan.</p></div>
 {#key detail.review.versionId}<FileViewer src={'/api/legal/pks/'+selected+'/pdf'} mime="application/pdf" name="PKS.pdf" height={680}/>{/key}
 <details class="text-xs text-slate-500"><summary class="cursor-pointer py-2">Identitas versi dokumen</summary><p class="break-all py-1">Versi: {detail.review.versionId}</p><p class="break-all py-1">SHA-256: {detail.review.hash}</p></details></section>
 <section class="space-y-4 rounded-xl border border-[#dce7f7] bg-white p-5 sm:p-6"><h2 class="font-semibold text-[#17365f]">Hasil pemeriksaan Legal</h2>
 {#if detail.review.note}<p class="whitespace-pre-wrap rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Catatan Legal: {detail.review.note}</p>{/if}
 {#if detail.review.state==='legal'}<label class="grid gap-2 text-sm font-medium text-[#17365f]">Catatan pemeriksaan<textarea class="min-h-28 rounded-lg border border-[#cfe0f5] p-3 font-normal focus:outline-blue-500" placeholder="Tuliskan bagian yang perlu diperbaiki Admin PF." maxlength="2000" bind:value={note} disabled={busy}></textarea><span class="font-normal text-slate-500">Wajib diisi jika PKS dikembalikan untuk revisi.</span></label><div class="flex flex-wrap gap-3"><Button disabled={busy} onclick={()=>decide('approved')}>Setujui PKS ini</Button><Button variant="secondary" disabled={busy||!note.trim()} onclick={()=>decide('revision')}>Kembalikan ke PF</Button></div>
 {:else}<p class="text-sm text-slate-600">{detail.review.state==='approved'?'PKS telah disetujui Legal. Admin PF melanjutkan proses tanda tangan dan pencairan.':'Catatan revisi telah dikirim ke Admin PF. PKS dapat diperiksa kembali setelah PF mengirim versi perbaikan.'}</p>{/if}
 </section>{/if}
</div></Shell>{/if}
