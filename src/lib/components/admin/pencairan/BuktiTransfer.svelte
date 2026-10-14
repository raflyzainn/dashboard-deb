<script lang="ts">
  import { reportError } from '$lib/feedback';
 import { formatSen } from '$lib/pencairan';
 import { dataService } from '$lib/data/service';
 import type { KartuData } from './kartu-types';
 let {campusId,data,editable=false,details=false,onchange=()=>{}}:{campusId:string;data:KartuData;editable?:boolean;details?:boolean;onchange?:(next:KartuData,message?:string)=>void}=$props();
 let input=$state<HTMLInputElement>();
 let file=$state<File|null>(null),busy=$state(false),error=$state('');
 const proof=$derived(data.disbursement.properties?.paymentProof as {name:string}|undefined);
 const base=$derived(`/api/pencairan/${campusId}/pembayaran/bukti`);
 async function upload(){if(!file||busy)return;busy=true;error='';try{const body=new FormData();body.set('file',file);body.set('expectedRevision',String((data as any).serverRevision||((data.disbursement as any).revision)));await dataService.api.post(base,body);onchange(await dataService.api.get<KartuData>(`/api/pencairan/${campusId}`),'Bukti transfer tersimpan.');file=null;if(input)input.value='' ;}catch(e){error = reportError(e instanceof Error?e.message:'Bukti belum tersimpan.');}finally{busy=false;}}
</script>
<div class="grid gap-2 text-sm" aria-label="Bukti transfer">
 {#if details&&data.disbursement.paidAt}<section aria-label="Rincian pembayaran Tahap 1" class="rounded-lg bg-white p-3"><h3 class="font-semibold">Pembayaran Tahap 1</h3><dl class="mt-2 grid gap-2 sm:grid-cols-3"><div><dt>Tanggal pembayaran</dt><dd class="font-semibold">{new Intl.DateTimeFormat('id-ID',{dateStyle:'long',timeZone:'Asia/Jakarta'}).format(new Date(data.disbursement.paidAt))}</dd></div><div><dt>Jumlah dibayar</dt><dd class="font-semibold">{formatSen(data.disbursement.paidSen)}</dd></div><div><dt>Referensi transfer</dt><dd class="break-all font-semibold">{data.disbursement.paidRef||'Belum dicantumkan'}</dd></div></dl></section>{/if}
 {#if proof}<a href={base} target="_blank" rel="noopener" class="w-fit font-semibold text-[#0066B2] hover:underline">Lihat bukti transfer · {proof.name}</a>{:else}<p class="text-slate-500">Bukti transfer belum dilampirkan (opsional).</p>{/if}
 {#if editable}<div class="flex flex-wrap items-end gap-2"><label class="grid min-w-0 gap-1 text-xs font-semibold text-slate-600">Bukti transfer (opsional)<input bind:this={input} aria-label="Bukti transfer (opsional)" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} class="max-w-full text-sm" onchange={e=>{file=e.currentTarget.files?.[0]||null;error='';}}/><span class="font-normal">PDF/PNG/JPG · maksimal 2 MB</span></label><button type="button" class="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold text-[#0066B2] disabled:opacity-40" disabled={!file||busy} onclick={upload}>{busy?'Menyimpan…':'Simpan bukti transfer'}</button></div>{/if}
 {#if error}<p class="text-red-700" role="alert">{error}</p>{/if}
</div>
