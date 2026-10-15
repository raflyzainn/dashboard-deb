<script lang="ts">
  import { reportError } from '$lib/feedback';
 import {documentGuides} from '$lib/pengajuan/journey';
 let {kind,checklist={},kuasa=false,disabled=false,onchange}:{kind:string;checklist?:Record<string,boolean>;kuasa?:boolean;disabled?:boolean;onchange:(key:string,value:boolean)=>Promise<void>}=$props();
 let saving=$state(false),error=$state('');
 async function check(event:Event,key:string){
  const input=event.currentTarget as HTMLInputElement,next=input.checked;saving=true;error='';
  try{await onchange(key,next);}catch(e){input.checked=Boolean(checklist[key]);error = reportError(e instanceof Error?e.message:String(e));}finally{saving=false;}
 }
</script>
<details class="w-full rounded-lg border border-slate-200 bg-slate-50 p-3">
 <summary class="cursor-pointer text-sm font-semibold text-[#0066B2]">Panduan dan checklist {kind==='pks'?'PKS':kind==='invois'?'invoice':kind==='surat_kuasa'?'surat kuasa':kind}</summary>
 <p class="mt-2 text-xs text-slate-500">Tandai setelah diperiksa. Checklist ini membantu persiapan cetak dan unggah, bukan persetujuan PF.</p>
 {#if kind==='pks'}<p class="mt-3 text-sm">Untuk pengajuan baru dengan alur Legal, kampus mengisi nomor PKS kampus dan PF menyiapkan PDF PKS. Permintaan nomor PF otomatis dibuat saat nomor kampus tersimpan dan nomor PF belum tersedia. Kedua nomor serta PDF terbaru wajib lengkap sebelum pengajuan. Tunggu pemeriksaan PF dan persetujuan Legal sebelum mencetak dokumen final untuk ditandatangani.</p>{/if}
 <p class="mt-3 text-sm">Unggah pindaian bertanda tangan dalam format {kind==='surat_kuasa'?'PDF, PNG atau JPG':'PDF, PNG, JPG atau WebP'} yang jelas dan lengkap. DOCX merupakan dokumen sumber. PF memeriksa pindaian dan menyusun lampiran gabungan.</p>
 <div class="mt-3 grid gap-3">{#each documentGuides[kind]||[] as text,i}<label class="flex items-start gap-2 text-sm"><input class="mt-1" type="checkbox" checked={Boolean(checklist[kind+'-'+i])} disabled={disabled||saving} onchange={event=>check(event,kind+'-'+i)}/><span>{text}</span></label>{/each}</div>
 {#if kind==='pks'||kind==='permohonan'}<p class="mt-3 text-sm">{kuasa?'Lampirkan surat kuasa bertanda tangan karena rekening penerima merupakan rekening pihak yang diberi kuasa.':'Rekening universitas: surat kuasa tidak diperlukan dan tidak dicantumkan sebagai lampiran.'}</p>{/if}
 {#if error}<p class="mt-2 text-sm text-red-700" role="alert">{error}</p>{/if}
</details>
