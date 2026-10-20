<script lang="ts">
 import Icon from '$lib/components/ui/Icon.svelte';
 import Modal from '$lib/components/ui/Modal.svelte';
 import { linesToRows } from '$lib/rab-excel';
 import { linesToTemplateRows, type RabShare } from '$lib/rab-template-excel';
 import type { RabLine } from '$lib/rab';
 type Format='resmi'|'template';
 let {share,lines,version,campus,program='',signing,onchoose,onclose}:{share:RabShare;lines:RabLine[];version:number;campus:string;program?:string;signing?:{place:string;mentor:string;coordinator:string};onchoose:(format:Format)=>void;onclose:()=>void}=$props();
 const PREVIEW_ROWS=6;
 const label=$derived({penuh:'100%',tahap1:'70%',tahap2:'30%'}[share]);
 const sheet=$derived(`RAB ${label}`);
 // The previews use the same rows as the two files, cut to the first lines.
 const official=$derived(linesToRows(lines,share));
 const template=$derived(linesToTemplateRows(lines,share));
 const money=(value:number|null|undefined)=>value==null?'':new Intl.NumberFormat('id-ID').format(value);
 const today=new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date());
 /** The official form shows only the last part of a code: A, 1, a., and nothing on an item. */
 const shortNo=(no:string)=>{const parts=no.split('.');return parts.length===1?parts[0]:parts.length===2?parts[1]:parts.length===3?parts[2]+'.':'';};
 const depth=(no:string)=>no.split('.').length-1;
 const cell='border border-slate-300 px-1.5 py-0.5 whitespace-nowrap';
 const options=$derived([
  {format:'resmi' as Format,title:'Format resmi Pertamina Foundation',use:'Untuk ditandatangani dan diserahkan.',points:['Bertingkat: kelompok, kegiatan, lalu uraian','Kolom Perhitungan, Volume, Harga Satuan, dan Jumlah','Ada blok tanda tangan: kota, tanggal, Mentor, dan Koordinator'],tabs:[sheet]},
  {format:'template' as Format,title:'Format template aplikasi',use:'Untuk diperiksa atau diubah di Excel.',points:['Sama dengan Template Excel di aplikasi: satu item per baris','Kolom Kategori sampai Total Harga, dihitung otomatis',share==='penuh'?'Tanpa tanda tangan. Bisa diunggah lagi sebagai RAB 100%':'Tanpa blok tanda tangan'],tabs:['Petunjuk',sheet,'Contoh Pengisian','Ringkasan']}
 ]);
</script>

<Modal title={`Unduh RAB ${label}`} wide {onclose}>
 <p class="text-slate-600">Pilih format file Excel. Isi kedua format sama, yaitu RAB {label} versi {version}. Pratinjau menampilkan baris pertama.</p>
 <div class="mt-4 grid gap-3">
  {#each options as option}
   <div class="group relative grid gap-3 rounded-xl border border-slate-200 bg-white p-4 transition has-[button:hover]:border-[#0066B2] has-[button:hover]:bg-blue-50/40 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-[#0066B2] md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
    <div class="grid content-start gap-2">
     <!-- The button stretches over the card; the preview sits above it so it can scroll sideways. -->
     <button type="button" class="flex cursor-pointer items-start justify-between gap-3 text-left outline-none after:absolute after:inset-0 after:rounded-xl" onclick={()=>onchoose(option.format)}><strong class="text-slate-900">{option.title}</strong><span class="grid size-7 shrink-0 place-items-center rounded-full bg-[#0066B2] text-white group-has-[button:hover]:bg-[#005493]"><Icon name="download" size={14}/></span></button>
     <p class="text-sm font-semibold text-[#0066B2]">{option.use}</p>
     <ul class="grid list-disc gap-1 pl-5 text-sm text-slate-600">{#each option.points as point}<li>{point}</li>{/each}</ul>
    </div>
    <div class="relative z-10 grid min-w-0 content-start overflow-hidden rounded-lg border border-slate-300 bg-white" aria-label={`Pratinjau ${option.title}`} role="img">
     <span class="block min-w-0 overflow-x-auto">
      {#if option.format==='resmi'}
       <span class="block min-w-max p-2 text-[10px] leading-4 text-slate-900" style="font-family:Arial,sans-serif">
        <span class="block font-bold">RAB PROGRAM DESA ENERGI BERDIKARI</span>
        <span class="block font-bold uppercase">{campus}</span>
        <span class="mb-1 block text-slate-500">Lembar {sheet}</span>
        <table class="border-collapse">
         <thead><tr class="bg-[#DFF0FF] font-bold">{#each ['No','Uraian kegiatan / program','Perhitungan','Volume','Harga satuan','Jumlah'] as head}<th class="{cell} text-left">{head}</th>{/each}</tr></thead>
         <tbody>
          {#each official.slice(0,PREVIEW_ROWS) as row}
           {@const heading=row.jumlah==null}
           <tr class={heading&&depth(row.no)===0?'bg-[#EEF3FA] font-bold':heading?'font-semibold':''}>
            <td class={cell}>{shortNo(row.no)}</td>
            <td class={cell} style={`padding-left:${0.375+depth(row.no)*0.6}rem`}>{row.uraian}</td>
            <td class={cell}>{row.calculation||''}</td>
            <td class="{cell} text-right">{heading?'':`${row.volume??''} ${row.satuan??''}`}</td>
            <td class="{cell} text-right">{money(row.hargaSatuan)}</td>
            <td class="{cell} text-right">{money(row.jumlah)}</td>
           </tr>
          {/each}
         </tbody>
        </table>
        {#if official.length>PREVIEW_ROWS}<span class="mt-1 block text-slate-500">… {official.length-PREVIEW_ROWS} baris lainnya, lalu Sub total dan Total</span>{/if}
        <span class="mt-2 grid grid-cols-2 gap-x-8 text-center">
         <span></span><span>{signing?.place||'……………'}, {today}</span>
         <span class="mt-1">Tandatangan</span><span class="mt-1">Tandatangan</span>
         <span class="mt-3 font-semibold">{signing?.mentor||'(Nama Mentor)'}</span><span class="mt-3 font-semibold">{signing?.coordinator||'(Nama Koordinator)'}</span>
        </span>
       </span>
      {:else}
       <span class="block min-w-max text-[10px] leading-4 text-[#172B4D]" style="font-family:Arial,sans-serif">
        <span class="block bg-[#17365D] px-2 py-1 text-xs font-bold text-white">{sheet} • FORMULIR PENGISIAN</span>
        <span class="flex gap-2 px-2 pt-1.5"><span>Nama kampus</span><span class="min-w-32 bg-[#C6D9EF] px-1">{campus}</span><span>Nama program</span><span class="min-w-32 bg-[#C6D9EF] px-1">{program}</span></span>
        <span class="flex justify-end gap-2 px-2 py-1"><span>Total Keseluruhan</span><span class="bg-[#D9D9D9] px-1 font-semibold">Rp {money(template.reduce((sum,[,,,qty,,volume,,price])=>sum+qty*volume*price,0))}</span></span>
        <table class="m-2 mt-0 border-collapse">
         <thead><tr class="bg-[#A6A6A6] font-bold text-black">{#each ['Kategori','Sub Kategori','Nama','Qty','Satuan','Volume','Satuan Volume','Harga Satuan','Total Harga'] as head}<th class="{cell} text-left">{head}</th>{/each}</tr></thead>
         <tbody>
          {#each template.slice(0,PREVIEW_ROWS) as row}
           <tr>
            {#each row as value, i}<td class="{cell} bg-[#C6D9EF] {typeof value==='number'?'text-right':''}">{i===7?`Rp ${money(value as number)}`:value}</td>{/each}
            <td class="{cell} bg-[#D9D9D9] text-right">Rp {money(row[3]*row[5]*row[7])}</td>
           </tr>
          {/each}
         </tbody>
        </table>
        {#if template.length>PREVIEW_ROWS}<span class="mb-1 block px-2 text-slate-500">… {template.length-PREVIEW_ROWS} item lainnya</span>{/if}
       </span>
      {/if}
     </span>
     <span class="flex gap-px overflow-x-auto border-t border-slate-300 bg-slate-100 px-1 text-[10px] leading-5 text-slate-600">{#each option.tabs as tab}<span class="shrink-0 px-2 {tab===sheet?'border-b-2 border-[#1D6F42] bg-white font-semibold text-[#1D6F42]':''}">{tab}</span>{/each}</span>
    </div>
   </div>
  {/each}
 </div>
 <div class="mt-5 flex justify-end"><button type="button" class="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0066B2]" onclick={onclose}>Batal</button></div>
</Modal>
