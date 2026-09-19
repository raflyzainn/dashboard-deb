<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { onChange } from '$lib/realtime.svelte';
  import { KINDS, KIND_SHORT, ITEM_STATE_LABEL, type Kind } from '$lib/pencairan';
  import type { DirectoryRow } from './kartu-types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import PencairanNav from './PencairanNav.svelte';
  import StatusMarker from './StatusMarker.svelte';
  import StatusLegend from './StatusLegend.svelte';

  /** Tahap 1: pick a campus. One row per campus, one cell per item; a row opens the checklist screen on its first unfinished item, a cell opens that item. */
  let rows = $state<DirectoryRow[] | null>(null);
  let error = $state('');
  let search = $state('');
  let filter = $state<'semua' | 'admin' | 'kampus' | 'lengkap' | 'dibayar' | 'rab100' | 'rab70' | 'rab30'>('semua');
  /** Which evidence mark belongs to which RAB column. */
  const BUKTI: Partial<Record<Kind, 'r100' | 'r70' | 'r30'>> = { rab_penuh: 'r100', rab: 'r70', rab_tahap2: 'r30' };
  async function load() {
    try { rows = (await dataService.api.get<{ rows: DirectoryRow[] }>('/api/pencairan')).rows; }
    catch (e) { error = e instanceof Error ? e.message : 'Dashboard belum dapat dimuat.'; }
  }
  $effect(() => { untrack(() => { void load(); }); });
  $effect(() => onChange(() => void load(), { delay: 1000 }));

  const filters = $derived.by(() => {
    const all = rows || [];
    return [['semua', 'Semua', all.length], ['admin', 'Menunggu admin', all.filter(r => r.assessment.adminWait > 0).length], ['kampus', 'Menunggu kampus', all.filter(r => r.assessment.campusWait > 0).length], ['rab100', 'RAB 100% ada', all.filter(r => r.bukti?.r100 === 'ada').length], ['rab70', 'RAB 70% ada', all.filter(r => r.bukti?.r70 === 'ada').length], ['rab30', 'RAB 30% ada', all.filter(r => r.bukti?.r30 === 'ada').length], ['lengkap', 'Lengkap', all.filter(r => r.assessment.lengkap).length], ['dibayar', 'Dibayar', all.filter(r => r.assessment.state === 'dibayar').length]] as const;
  });
  const visible = $derived.by(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter(r => {
      const a = r.assessment;
      if (q && !`${r.campus.name} ${r.campus.code}`.toLowerCase().includes(q)) return false;
      if (filter === 'admin') return a.adminWait > 0;
      if (filter === 'kampus') return a.campusWait > 0;
      if (filter === 'rab100') return r.bukti?.r100 === 'ada';
      if (filter === 'rab70') return r.bukti?.r70 === 'ada';
      if (filter === 'rab30') return r.bukti?.r30 === 'ada';
      if (filter === 'lengkap') return a.lengkap;
      if (filter === 'dibayar') return a.state === 'dibayar';
      return true;
    }).sort((x, y) => (y.assessment.done - x.assessment.done) || x.campus.name.localeCompare(y.campus.name));
  });
  const firstOpen = (r: DirectoryRow): Kind | '' => KINDS.find(k => !['sesuai', 'tidak_perlu'].includes(r.assessment.items[k])) || '';
</script>

<div class="grid gap-3 [&>*]:min-w-0">
  <div class="grid gap-2">
    <h1 class="text-2xl font-bold text-slate-900">Pencairan Tahap 1</h1>
    <PencairanNav active="tahap-1" />
  </div>
  <div class="flex flex-wrap items-center gap-2">
    {#each filters as [key, label, count]}
      <button type="button" class="rounded-full border px-3 py-1 text-xs font-semibold transition {filter === key ? 'border-[#0066B2] bg-[#0066B2] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}" onclick={() => (filter = key)}>{label} <span class="tabular-nums opacity-80">{count}</span></button>
    {/each}
    <label class="relative ml-auto w-full sm:w-56"><span class="sr-only">Cari kampus</span><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={14} /></span><input class="min-h-[34px] w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm" bind:value={search} placeholder="Cari kampus" /></label>
  </div>

  {#if error}
    <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
  {:else if !rows}
    <p class="text-sm text-slate-500">Memuat…</p>
  {:else}
    <StatusLegend />
    <div class="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-[0_10px_30px_#0b254508]">
      <table aria-label="Status pencairan Tahap 1 per kampus" class="w-full min-w-[820px] text-sm">
        <thead><tr class="bg-slate-50 text-[11px] uppercase tracking-[0.05em] text-slate-500">
          <th class="px-3 py-2.5 text-left font-bold">Kampus</th>
          {#each KINDS as k}<th class="px-1 py-2.5 text-center font-bold">{KIND_SHORT[k]}</th>{/each}
          <th class="px-3 py-2.5 text-right font-bold">Keadaan</th>
        </tr></thead>
        <tbody>
          {#each visible as r (r.campus.id)}
            {@const first = firstOpen(r)}
            <tr class="border-t border-slate-100 hover:bg-blue-50/40">
              <td class="px-3 py-2"><a href={`/admin/pencairan/${r.campus.id}${first ? `?butir=${first}` : ''}`} class="font-semibold text-slate-900 hover:text-[#0066B2] hover:underline">{r.campus.name}</a></td>
              {#each KINDS as k}
                {@const s = r.assessment.items[k]}
                <td class="px-1 py-2 text-center"><a href={`/admin/pencairan/${r.campus.id}?butir=${k}`} class="inline-flex size-8 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" title={`${r.campus.name} · ${KIND_SHORT[k]}: ${ITEM_STATE_LABEL[s]}`} aria-label={`${r.campus.name} · ${KIND_SHORT[k]}: ${ITEM_STATE_LABEL[s]}`}><StatusMarker state={s} /></a>{#if BUKTI[k] && r.bukti?.[BUKTI[k]]}{@const ada = r.bukti[BUKTI[k]] === 'ada'}<span class="block text-[10.5px] font-semibold leading-tight {ada ? 'text-green-700' : 'text-slate-400'}" title={ada ? 'Lembar ini ada di berkas kampus' : 'Lembar ini tidak ada di berkas kampus'}>{ada ? 'ada' : 'tidak'}</span>{/if}</td>
              {/each}
              <td class="px-3 py-2 text-right tabular-nums text-slate-600">{r.assessment.state === 'dibayar' ? 'Dibayar' : `${r.assessment.done} dari ${r.assessment.total}`}</td>
            </tr>
          {/each}
          {#if !visible.length}<tr><td colspan={KINDS.length + 2} class="px-3 py-8 text-center text-sm text-slate-500">Tidak ada kampus yang cocok.</td></tr>{/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>
