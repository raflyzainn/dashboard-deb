<script lang="ts">
  import { app } from '$lib/state.svelte';
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';
  import { dataService } from '$lib/data/service';
  import { REPORT_KINDS, type ReportWorkspace } from '$lib/pelaporan';
  import Lpj from '$lib/components/admin/pencairan/Lpj.svelte';
  import ReportCard from './ReportCard.svelte';
  let { campusId, mode = 'campus' }: { campusId: string; mode?: 'campus' | 'admin' } = $props();
  let data = $state<ReportWorkspace | null>(null), error = $state('');
  const campus = $derived(mode === 'campus' ? app.navigation.campus : app.data?.campuses.find(c => c.id === campusId));
  let generation = 0;
  async function load() {
    const id = campusId, current = ++generation;
    try { const next = await dataService.api.get<ReportWorkspace>(`/api/pencairan/${id}/pelaporan`); if (current === generation) { data = next; error = ''; } }
    catch (e) { if (current === generation) error = e instanceof Error ? e.message : 'Pelaporan belum dapat dimuat.'; }
  }
  $effect(() => { campusId; data = null; void load(); return () => { generation++; }; });
</script>
<div class="mx-auto grid w-full max-w-[1200px] gap-5 [&>*]:min-w-0">
  <header class="mb-2 flex items-center gap-5 max-[700px]:gap-3">
    {#if campus}<CampusLogo code={campus.code || campus.acronym} initials={campus.initials} size={64} rounded="rounded-[14px]" />{/if}
    <div class="min-w-0">
      <span class="mb-[9px] block text-xs font-bold tracking-[0.06em] text-[#3975b7] max-[700px]:text-[10px]">KAMPUS MITRA{#if campus?.region} &middot; {campus.region.toUpperCase()}{/if}</span>
      <h1 class="m-0 text-[29px] font-bold leading-[1.3] tracking-[-0.01em] text-[var(--navy)] max-[700px]:text-[21px]">{campus?.name || data?.campusName || 'Pelaporan Program'}</h1>
      <p class="mb-0 mt-2 text-sm leading-[1.6] text-[#637796]">Pelaporan program: keluaran program dan LPJ penggunaan dana.</p>
    </div>
  </header>
  {#if mode === 'admin'}<a class="w-fit text-sm font-semibold text-blue-700 hover:underline" href={`/admin/pencairan/${campusId}`}>← Kembali ke pencairan</a>{/if}
  {#if error}<p role="alert" class="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>{/if}
  {#if !data && !error}<p>Memuat pelaporan…</p>{:else if data && !data.paid}<p class="rounded-xl border border-blue-100 bg-white p-5">Pelaporan tersedia setelah pembayaran Tahap 1 tercatat. Tanggal dan nominal pembayaran dapat dilihat di Pencairan Dana.</p>
  {:else if data}
    <section id="keluaran" aria-label="Keluaran program" class="scroll-mt-28 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="text-base font-bold text-slate-900">Keluaran program</h2><p role="status" class="text-xs text-slate-600">{data.annualComplete ? 'Pelaporan tahunan lengkap · 4 dari 4 Sesuai' : `${REPORT_KINDS.filter(kind => data!.latest[kind]?.status === 'sesuai').length} dari 4 keluaran Sesuai`}</p></div>
      <div class="grid items-stretch gap-3 lg:grid-cols-2">{#each REPORT_KINDS as kind}{#key `${campusId}:${kind}`}<ReportCard {campusId} {kind} {mode} latest={data.latest[kind]} history={data.history.filter(v => v.kind === kind)} onChanged={load} />{/key}{/each}</div>
    </section>
    <section id="lpj" aria-label="LPJ penggunaan dana" class="min-w-0 scroll-mt-28 border-t border-[var(--line)] pt-5">{#key campusId}<Lpj {campusId} {mode} />{/key}</section>
  {/if}
</div>
