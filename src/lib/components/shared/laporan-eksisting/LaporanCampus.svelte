<script lang="ts">
  import { dataService } from '$lib/data/service';
  import { laporanStatusLabel, type LaporanWorkspace } from '$lib/laporan-eksisting';
  import LaporanView from './LaporanView.svelte';
  /** One campus's Laporan Eksisting for the admin campus page; read only, like the Monitoring Kampus tab. */
  let { campusId }: { campusId: string } = $props();
  let ws = $state<LaporanWorkspace | null>(null), error = $state('');
  $effect(() => {
    const id = campusId; let canceled = false;
    ws = null; error = '';
    dataService.api.get<LaporanWorkspace>(`/api/laporan-eksisting/${id}`).then(next => { if (!canceled) ws = next; }).catch(e => { if (!canceled) error = e instanceof Error ? e.message : 'Laporan belum dapat dimuat.'; });
    return () => { canceled = true; };
  });
  const when = (iso: string) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const started = $derived(ws ? Boolean(ws.laporan.revision) : false);
</script>
<section class="flex flex-col gap-4" aria-label="Laporan Eksisting">
  {#if error}<p class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>
  {:else if !ws}<div class="h-64 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" aria-label="Memuat laporan"></div>
  {:else if !started}
    <p class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Kampus belum mengisi Laporan Eksisting.</p>
  {:else}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div><h2 class="text-lg font-bold text-slate-900">Laporan Eksisting</h2><p class="text-sm text-slate-600">Pra-coaching: deskripsi 4 pilar serta foto dan video kondisi DEB.</p></div>
      <span class="text-sm text-slate-600">{laporanStatusLabel(ws.laporan.status)}{ws.laporan.submittedAt ? ` · terakhir dikirim ${when(ws.laporan.submittedAt)}` : ''}</span>
    </div>
    {#if ws.laporan.status === 'draft' && ws.laporan.submittedAt}<p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Kampus sedang memperbarui laporan. Isian di bawah adalah versi terbaru yang tersimpan.</p>
    {:else if ws.laporan.status === 'draft'}<p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Masih draf, belum dikirim kampus.</p>{/if}
    <LaporanView {ws} />
  {/if}
</section>
