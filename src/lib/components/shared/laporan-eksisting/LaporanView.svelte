<script lang="ts">
  import { PILLARS, PHOTOS, type LaporanWorkspace } from '$lib/laporan-eksisting';
  import PillarIcon from './PillarIcon.svelte';
  /** Read only view of a sent report, for admins. */
  let { ws }: { ws: LaporanWorkspace } = $props();
  const url = (id: string) => `/api/laporan-eksisting/${ws.campusId}/files/${id}`;
</script>
<div class="flex flex-wrap items-start gap-4">
  <section aria-label="Infografis 4 Pilar" class="flex min-w-0 flex-[1_1_440px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
    <h3 class="text-base font-bold text-slate-900">Infografis 4 Pilar</h3>
    {#each PILLARS as p}
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2.5"><span class="grid size-8 place-items-center rounded-full bg-blue-50 text-[#0066B2]"><PillarIcon pillar={p.key} size={16} /></span><span><strong class="block text-sm text-slate-900">{p.label}</strong><span class="text-xs text-slate-600">{p.hint}</span></span></div>
        <p class="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">{ws.laporan[p.key] || 'Belum diisi.'}</p>
      </div>
    {/each}
  </section>
  <section aria-label="Foto dan Video DEB Eksisting" class="flex min-w-0 flex-[1_1_380px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
    <h3 class="text-base font-bold text-slate-900">Foto dan Video DEB Eksisting</h3>
    {#each PHOTOS as p}
      <div class="flex flex-col gap-1.5">
        <strong class="text-sm text-slate-900">{p.label} <span class="font-normal text-slate-600">({ws.laporan.foto[p.key].length} foto)</span></strong>
        {#if ws.laporan.foto[p.key].length}
          <ul class="grid grid-cols-3 gap-2">{#each ws.laporan.foto[p.key] as id, i}<li><a href={url(id)} target="_blank" rel="noopener" class="block"><img src={url(id)} alt={`${p.label} ${i + 1}`} loading="lazy" class="aspect-[4/3] w-full rounded-lg bg-slate-100 object-cover" /></a></li>{/each}</ul>
        {:else}<p class="text-sm text-slate-600">Belum ada foto.</p>{/if}
      </div>
    {/each}
    <div class="flex flex-col gap-1.5">
      <strong class="text-sm text-slate-900">Video</strong>
      {#if ws.laporan.video}
        <!-- svelte-ignore a11y_media_has_caption: video kondisi lapangan dari kampus tidak memiliki berkas subtitle. -->
        <video class="aspect-video w-full rounded-lg bg-slate-900" controls preload="metadata" src={url(ws.laporan.video)} aria-label="Video kondisi lapangan DEB"></video>
      {:else}<p class="text-sm text-slate-600">Belum ada video.</p>{/if}
    </div>
  </section>
</div>
