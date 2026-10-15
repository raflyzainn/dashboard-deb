<script lang="ts">
 import { untrack } from 'svelte';
 import Button from '$lib/components/ui/Button.svelte';
 import { dataService } from '$lib/data/service';
 import { browserDocumentPdf } from '$lib/pengajuan/browser-document-pdf';
 let {campusId,onchanged,revision}:{campusId:string;onchanged:()=>void;revision?:number}=$props();
 let data=$state<any>(null),busy=$state(false),error=$state('');
 const base=$derived(`/api/pencairan/${campusId}/pengajuan`);
 const labels:Record<string,string>={draft:'PDF siap diperiksa PF',pf:'Pemeriksaan PF',legal:'Menunggu Legal',revision:'Legal meminta revisi kepada PF',approved:'Disetujui Legal'};
 async function load(){try{data=await dataService.api.get(base);error='';return true;}catch(e){error=e instanceof Error?e.message:'Data belum tersedia.';return false;}}
 $effect(()=>{void campusId;void revision;untrack(()=>{void load();});});
 const sendBlocker=$derived(!data?'Memuat data PKS.':data.paid?'Pengajuan sudah dibayar.':!data.journey.pksReview?'Siapkan PDF PKS dari data terbaru terlebih dahulu.':!data.journey.pksReview.complete?'Lengkapi nomor PKS PF dan kampus, lalu siapkan ulang PDF PKS.':data.journey.pksReview.state==='legal'?'PKS sudah dikirim dan sedang diperiksa Legal.':data.journey.pksReview.state==='approved'?'PKS sudah disetujui Legal.':data.journey.status!=='menunggu'?'Kampus perlu membuka Dokumen dan menekan Ajukan untuk diperiksa terlebih dahulu.':data.documents.find((d:any)=>d.kind==='pks')?.status!=='sesuai'?'Tandai hasil pemeriksaan PKS Sesuai pada panel pemeriksaan PF terlebih dahulu.':'');
 async function prepare(){
  busy=true;error='';try{
   if(!await load())return;
   const source:any=await dataService.api.post(base+'/dokumen/pks',{expectedRevision:data.serverRevision});
   const document=source.documents.find((d:any)=>d.kind==='pks'),version=document.versions.at(-1);
   const docx=await dataService.api.blob(`/api/pencairan/${campusId}/documents/pks/versions/${version.id}/file`);
   const pdf=await browserDocumentPdf(docx),body=new FormData();body.set('file',new File([pdf],'PKS.pdf',{type:'application/pdf'}));body.set('sourceVersionId',version.id);body.set('expectedRevision',String(source.serverRevision));
   data=await dataService.api.post(base+'/pks-pdf',body);onchanged();
  }catch(e){const reason=e instanceof Error?e.message:'PDF belum dapat disiapkan.';await load();error=reason;}finally{busy=false;}
 }
 async function send(){busy=true;error='';try{if(!await load())return;if(sendBlocker)throw Error(sendBlocker);const review=data.journey.pksReview;await dataService.api.post(base+'/legal',{decision:'send',versionId:review.versionId,hash:review.hash,expectedRevision:data.serverRevision});await load();onchanged();}catch(e){error=e instanceof Error?e.message:'PKS belum dapat dikirim.';}finally{busy=false;}}
</script>
{#if data?.journey.datePolicy==='chronology'}<section class="space-y-3 border-b border-blue-100 bg-blue-50/50 p-5 sm:p-6" aria-label="PDF dan pemeriksaan Legal">
 <h3 class="font-bold">PDF PKS dan pemeriksaan Legal</h3><p class="text-sm text-slate-600">Siapkan PDF agar kampus dapat memeriksa draf dan mengisi nomor PKS. Setelah kedua nomor lengkap, siapkan ulang PDF sebelum kampus mengajukan paket. Setujui pemeriksaan PF, lalu kirim versi yang sama ke Legal.</p>
 {#if error}<p role="alert" class="text-sm text-red-700">{error}</p>{/if}
 {#if data.journey.pksReview}<p class="text-sm">{labels[data.journey.pksReview.state]}</p>{#if data.journey.pksReview.note}<p class="rounded-lg bg-amber-50 p-3 text-sm">Catatan Legal: {data.journey.pksReview.note}. Gunakan pemeriksaan PF untuk membuka bagian revisi kampus yang diperlukan.</p>{/if}{/if}
 <div class="flex flex-wrap gap-3 pt-2">
  <Button icon="file" loading={busy} disabled={busy||data.paid||data.journey.status==='selesai'} onclick={prepare}>Siapkan PDF PKS</Button>
  <Button icon="arrow" disabled={busy||!!sendBlocker} onclick={send}>Kirim ke Legal</Button>
  <Button icon="reset" variant="ghost" disabled={busy} onclick={load}>Muat status terbaru</Button>
 </div>
 {#if sendBlocker}<p class="rounded-lg border border-blue-100 bg-white/70 p-3 text-sm text-[#17365f]">{sendBlocker}</p>{/if}
</section>{/if}
