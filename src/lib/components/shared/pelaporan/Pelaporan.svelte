<script lang="ts">
  import { page } from '$app/state';
  import Button from '$lib/components/ui/Button.svelte';
  import { dataService } from '$lib/data/service';
  import { REPORT_KINDS, type ReportWorkspace } from '$lib/pelaporan';
  import Lpj from '$lib/components/admin/pencairan/Lpj.svelte';
  import ReportCard from './ReportCard.svelte';
  let { campusId, mode = 'campus' }: { campusId: string; mode?: 'campus' | 'admin' } = $props();
  let data = $state<ReportWorkspace | null>(null), error = $state('');
  let generation = 0;
  async function load() {
    const id = campusId, current = ++generation;
    try { const next = await dataService.api.get<ReportWorkspace>(`/api/pencairan/${id}/pelaporan`); if (current === generation) { data = next; error = ''; } }
    catch (e) { if (current === generation) error = e instanceof Error ? e.message : 'Pelaporan belum dapat dimuat.'; }
  }
  $effect(() => { campusId; data = null; void load(); return () => { generation++; }; });
</script>
<div class="mx-auto grid w-full max-w-6xl gap-4 [&>*]:min-w-0">
  <header><h1 class="text-2xl font-bold text-slate-900">Pelaporan Program</h1><p class="mt-1 text-sm text-slate-600">LPJ penggunaan dana dan keluaran program{data ? ` · ${data.campusName}` : ''}.</p></header>
  {#if mode === 'admin'}<a class="w-fit text-sm font-semibold text-blue-700 hover:underline" href={`/admin/pencairan/${campusId}`}>← Kembali ke pencairan</a>{/if}
  {#if error}<p role="alert" class="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>{/if}
  {#if !data && !error}<p>Memuat pelaporan…</p>{:else if data && !data.paid}<p class="rounded-xl border border-blue-100 bg-white p-5">Pelaporan tersedia setelah pembayaran Tahap 1 tercatat. Tanggal dan nominal pembayaran dapat dilihat di Pencairan Dana.</p>
  {:else if data}
    <nav aria-label="Bagian pelaporan" class="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      <Button href="#keluaran" size="sm" icon="file" variant={page.url.hash === '#lpj' ? 'secondary' : 'primary'}>Keluaran program</Button>
      <Button href="#lpj" size="sm" icon="payments" variant={page.url.hash === '#lpj' ? 'primary' : 'secondary'}>LPJ penggunaan dana</Button>
    </nav>
    <div id="keluaran" class="grid scroll-mt-28 gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="text-base font-bold text-slate-900">Keluaran program</h2><p role="status" class="text-xs text-slate-600">{data.annualComplete ? 'Pelaporan tahunan lengkap · 4 dari 4 Sesuai' : `${REPORT_KINDS.filter(kind => data!.latest[kind]?.status === 'sesuai').length} dari 4 keluaran Sesuai`}</p></div>
      <div class="grid items-start gap-3 lg:grid-cols-2">{#each REPORT_KINDS as kind}{#key `${campusId}:${kind}`}<ReportCard {campusId} {kind} {mode} latest={data.latest[kind]} history={data.history.filter(v => v.kind === kind)} onChanged={load} />{/key}{/each}</div>
    </div>
    <section id="lpj" class="min-w-0 scroll-mt-28 border-t border-slate-200 pt-4">{#key campusId}<Lpj {campusId} {mode} />{/key}</section>
  {/if}
</div>
