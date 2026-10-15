<script lang="ts">
  import { reportError } from '$lib/feedback';
 import { formatSen } from '$lib/pencairan';
 import { dataService } from '$lib/data/service';
 import FileViewer from './FileViewer.svelte';
 import Icon from '$lib/components/ui/Icon.svelte';
 import type { KartuData } from './kartu-types';
 let {campusId,data,editable=false,details=false,onchange=()=>{}}:{campusId:string;data:KartuData;editable?:boolean;details?:boolean;onchange?:(next:KartuData,message?:string)=>void}=$props();
 let input=$state<HTMLInputElement>();
 let file=$state<File|null>(null),busy=$state(false),error=$state('');
 const proof=$derived(data.disbursement.properties?.paymentProof as {name:string;mime?:string;uploadedAt?:string}|undefined);
 const base=$derived(`/api/pencairan/${campusId}/pembayaran/bukti`);
 async function upload(){if(!file||busy)return;busy=true;error='';try{const body=new FormData();body.set('file',file);body.set('expectedRevision',String((data as any).serverRevision||((data.disbursement as any).revision)));await dataService.api.post(base,body);onchange(await dataService.api.get<KartuData>(`/api/pencairan/${campusId}`),'Bukti transfer tersimpan.');file=null;if(input)input.value='' ;}catch(e){error = reportError(e instanceof Error?e.message:'Bukti belum tersimpan.');}finally{busy=false;}}
</script>
<div class="grid gap-2 text-sm" aria-label="Bukti transfer">
 {#if details&&data.disbursement.paidAt}<section aria-label="Rincian pembayaran Tahap 1" class="rounded-xl border border-green-200 bg-green-50 p-4 sm:p-5"><h3 class="flex items-center gap-2 font-semibold text-green-800"><Icon name="check" size={20}/>Pembayaran Tahap 1 berhasil</h3><dl class="mt-2 grid gap-2 sm:grid-cols-3"><div><dt>Tanggal pembayaran</dt><dd class="font-semibold">{new Intl.DateTimeFormat('id-ID',{dateStyle:'long',timeZone:'Asia/Jakarta'}).format(new Date(data.disbursement.paidAt))}</dd></div><div><dt>Jumlah dibayar</dt><dd class="font-semibold">{formatSen(data.disbursement.paidSen)}</dd></div><div><dt>Referensi transfer</dt><dd class="break-all font-semibold">{data.disbursement.paidRef||'Belum dicantumkan'}</dd></div></dl></section>{/if}
 {#if proof}
  <section class="min-w-0 space-y-3 rounded-xl border border-blue-100 bg-white p-3 sm:p-4" aria-label="Pratinjau bukti transfer">
   <div class="flex flex-wrap items-center justify-between gap-3"><h4 class="flex items-center gap-2 font-semibold text-slate-900"><Icon name="file" size={18}/>Bukti transfer</h4><a href={base} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-[#0066B2] hover:bg-blue-50"><Icon name="external" size={16}/>Buka berkas</a></div>
   <FileViewer src={base+'?v='+encodeURIComponent(proof.uploadedAt||proof.name)} mime={proof.mime||''} name={proof.name} height={420}/>
  </section>
 {:else}<p class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-slate-500">Bukti transfer belum dilampirkan (opsional).</p>{/if}
 {#if editable}
 <div class="flex flex-wrap items-center gap-2">
  <label class="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-[#0066B2] hover:bg-blue-50 focus-within:outline-2 focus-within:outline-blue-400">
   <span>Pilih file</span>
   <input bind:this={input} aria-label="Pilih file bukti transfer" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} class="sr-only" onchange={e=>{file=e.currentTarget.files?.[0]||null;error='';}}/>
  </label>
  <span class="max-w-56 truncate text-xs text-slate-500" title={file?.name}>{file?.name || 'Belum ada file dipilih'}</span>
  <button type="button" class="min-h-9 rounded-lg bg-[#0066B2] px-3 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40" disabled={!file||busy} onclick={upload}>{busy?'Menyimpan...':'Simpan bukti transfer'}</button>
 </div>
 <p class="text-xs text-slate-500">PDF/PNG/JPG &middot; maksimal 2 MB</p>
 {/if}
 {#if error}<p class="text-red-700" role="alert">{error}</p>{/if}
</div>
