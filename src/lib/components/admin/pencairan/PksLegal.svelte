<script lang="ts">
 import Button from '$lib/components/ui/Button.svelte';
 import { dataService } from '$lib/data/service';
 import { browserDocumentPdf } from '$lib/pengajuan/browser-document-pdf';
 let {campusId,onchanged}:{campusId:string;onchanged:()=>void}=$props();
 let data=$state<any>(null),busy=$state(false),error=$state('');
 const base=$derived(`/api/pencairan/${campusId}/pengajuan`);
 const labels:Record<string,string>={draft:'PDF siap diperiksa PF',pf:'Pemeriksaan PF',legal:'Menunggu Legal',revision:'Legal meminta revisi kepada PF',approved:'Disetujui Legal'};
 async function load(){try{data=await dataService.api.get(base);}catch(e){error=e instanceof Error?e.message:'Data belum tersedia.';}}
 $effect(()=>{void campusId;void load();});
 async function prepare(){
  busy=true;error='';try{
   await load();if(error)throw Error(error);
   const source:any=await dataService.api.post(base+'/dokumen/pks',{expectedRevision:data.serverRevision});
   const document=source.documents.find((d:any)=>d.kind==='pks'),version=document.versions.at(-1);
   const docx=await dataService.api.blob(`/api/pencairan/${campusId}/documents/pks/versions/${version.id}/file`);
   const pdf=await browserDocumentPdf(docx),body=new FormData();body.set('file',new File([pdf],'PKS.pdf',{type:'application/pdf'}));body.set('sourceVersionId',version.id);body.set('expectedRevision',String(source.serverRevision));
   data=await dataService.api.post(base+'/pks-pdf',body);onchanged();
  }catch(e){error=e instanceof Error?e.message:'PDF belum dapat disiapkan.';await load();}finally{busy=false;}
 }
 async function send(){busy=true;error='';try{await load();const review=data.journey.pksReview;await dataService.api.post(base+'/legal',{decision:'send',versionId:review.versionId,hash:review.hash,expectedRevision:data.serverRevision});await load();onchanged();}catch(e){error=e instanceof Error?e.message:'PKS belum dapat dikirim.';}finally{busy=false;}}
</script>
{#if data?.journey.datePolicy==='chronology'}<section class="space-y-3 border-b border-blue-100 bg-blue-50/50 p-5 sm:p-6" aria-label="PDF dan pemeriksaan Legal">
 <h3 class="font-bold">PDF PKS dan pemeriksaan Legal</h3><p class="text-sm text-slate-600">Siapkan PDF agar kampus dapat memeriksa draf dan mengisi nomor PKS. Setelah kedua nomor lengkap, siapkan ulang PDF sebelum kampus mengajukan paket. Setujui pemeriksaan PF, lalu kirim versi yang sama ke Legal.</p>
 {#if error}<p role="alert" class="text-sm text-red-700">{error}</p>{/if}
 {#if data.journey.pksReview}<p class="text-sm">{labels[data.journey.pksReview.state]}</p>{#if data.journey.pksReview.note}<p class="rounded-lg bg-amber-50 p-3 text-sm">Catatan Legal: {data.journey.pksReview.note}. Gunakan pemeriksaan PF untuk membuka bagian revisi kampus yang diperlukan.</p>{/if}<a class="inline-block min-h-11 py-2 text-blue-700 underline" href={base+'/pks-pdf'} target="_blank" rel="noreferrer">Lihat PDF PKS</a>{/if}
 <div class="flex flex-wrap gap-3 pt-2">
  <Button icon="file" loading={busy} disabled={busy||data.paid||data.journey.status==='selesai'} onclick={prepare}>Siapkan PDF PKS</Button>
  <Button icon="arrow" disabled={busy||data.paid||!data.journey.pksReview?.complete||data.journey.status!=='menunggu'||data.journey.pksReview?.state==='legal'||data.journey.pksReview?.state==='approved'} onclick={send}>Kirim ke Legal</Button>
  <Button icon="reset" variant="ghost" disabled={busy} onclick={load}>Muat status terbaru</Button>
 </div>
</section>{/if}
