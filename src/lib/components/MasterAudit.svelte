<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { auditOperations, auditFields } from '$lib/master-audit';
  import type { MasterAuditPage } from '$lib/types';
  import Empty from './Empty.svelte';
  let query=$state(''), pageNumber=$state(1), retry=$state(0);
  let loading=$state(true), error=$state('');
  let result=$state<MasterAuditPage>({items:[],page:1,totalItems:0,totalPages:0});
  let generation=0;
  const display=(value:unknown)=>value===null||value===undefined?'—':typeof value==='boolean'?value?'Ya':'Tidak':String(value);
  async function load(term:string,page:number,version:number){
    try{
      const response=await dataService.masterAudit(term,page);
      if(version!==generation)return;
      const lastPage=Math.max(1,response.totalPages);
      if(page>lastPage){pageNumber=lastPage;return;}
      result=response;
    }catch(e){if(version===generation)error=e instanceof Error?e.message:'Riwayat belum dapat dimuat.';}
    finally{if(version===generation)loading=false;}
  }
  $effect(()=>{
    const term=query.trim(), page=pageNumber;
    app.loadedAt; retry;
    const version=++generation;
    loading=true;error='';
    const timer=setTimeout(()=>void load(term,page,version),250);
    return ()=>{clearTimeout(timer);generation++;};
  });
</script>

<section class="panel master-panel" aria-label="Riwayat perubahan master">
  <div class="panel-heading"><div><h2>Riwayat perubahan master</h2><p>Telusuri seluruh riwayat, termasuk perubahan yang sudah lama.</p></div>
    <label class="search-label audit-search">Cari perubahan master<input type="search" maxlength="200" bind:value={query} oninput={()=>pageNumber=1} placeholder="Nama, kode, isi, atau jenis perubahan"/></label>
  </div>
  <div aria-busy={loading}>
    {#if loading}<p class="master-padding" role="status">Mencari riwayat perubahan…</p>
    {:else if error}<div class="master-error" role="alert">{error} <button class="button secondary small" onclick={()=>retry++}>Coba lagi</button></div>
    {:else if !result.items.length}<Empty title={query.trim()?'Tidak ada perubahan yang cocok':'Belum ada perubahan master'} description={query.trim()?'Coba nama, kode, isi perubahan, atau kata seperti hapus indikator.':'Perubahan oleh Admin akan tercatat di sini.'}/>
    {:else}
      <p class="audit-count" role="status">{result.totalItems} perubahan{query.trim()?` untuk “${query.trim()}”`:''} · Halaman {result.page} dari {Math.max(1,result.totalPages)}</p>
      <div class="audit-list">{#each result.items as item (item.id)}<details>
        <summary><strong>{String(item.after?.name||item.before?.name||item.entityId)}</strong><span>{auditOperations[item.operation]||'Perubahan master'} · {new Date(item.created).toLocaleString('id-ID')}</span></summary>
        <p>Pelaku: {item.actor===app.session?.id?'Anda':'Admin lain'}</p>
        <div class="master-table-wrap"><table class="master-table"><thead><tr><th>Field</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>{#each Object.keys(auditFields).filter(key=>item.before?.[key]!==item.after?.[key]) as key}<tr><td>{auditFields[key]}</td><td>{display(item.before?.[key])}</td><td>{display(item.after?.[key])}</td></tr>{/each}</tbody></table></div>
      </details>{/each}</div>
    {/if}
  </div>
  {#if !error && result.totalPages>1}<nav class="audit-pagination" aria-label="Halaman riwayat master"><button class="button secondary small" disabled={loading||pageNumber<=1} onclick={()=>pageNumber--}>Sebelumnya</button><button class="button secondary small" disabled={loading||pageNumber>=result.totalPages} onclick={()=>pageNumber++}>Berikutnya</button></nav>{/if}
</section>
<style>.audit-search{width:min(100%,340px)}.audit-count{padding:0 24px 14px;color:#627691;font-size:12px;overflow-wrap:anywhere}.audit-pagination{display:flex;justify-content:flex-end;gap:10px;padding:0 24px 20px}</style>
