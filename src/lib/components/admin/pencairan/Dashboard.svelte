<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { KINDS, KIND_SHORT, ITEM_STATE_LABEL, CAMPUS_STATE_LABEL, formatSen, joinNames, type Kind } from '$lib/pencairan';
  import type { DirectoryRow } from './kartu-types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import PencairanNav from './PencairanNav.svelte';
  import StatusMarker from './StatusMarker.svelte';
  import StatusLegend from './StatusLegend.svelte';

  /** Dashboard Pencairan: the overview of every funded campus, with the same grid as the review sheet. Picking a campus opens its Tahap 1 checklist. */
  let rows = $state<DirectoryRow[] | null>(null);
  let error = $state('');
  let search = $state('');
  let filter = $state<'semua' | 'admin' | 'kampus' | 'hampir' | 'lengkap' | 'siap' | 'dibayar'>('semua');
  let year = $state<'semua' | 'kedua' | 'ketiga'>('semua');
  let sort = $state<'keadaan' | 'nama'>('keadaan');

  $effect(() => { untrack(() => { dataService.api.get<{ rows: DirectoryRow[] }>('/api/pencairan').then(r => (rows = r.rows)).catch(e => (error = e instanceof Error ? e.message : 'Dashboard belum dapat dimuat.')); }); });

  const pill: Record<string, string> = { belum_ada: 'bg-slate-100 text-slate-600', menunggu_kampus: 'bg-amber-100 text-amber-900', menunggu_admin: 'bg-blue-100 text-[#015a9a]', lengkap: 'bg-green-100 text-green-800', siap_dibayar: 'bg-green-100 text-green-800', dibayar: 'bg-green-600 text-white' };
  const filters = $derived.by(() => {
    const all = rows || [];
    return [
      ['semua', 'Semua', all.length], ['admin', 'Menunggu admin', all.filter(r => r.assessment.adminWait > 0).length], ['kampus', 'Menunggu kampus', all.filter(r => r.assessment.campusWait > 0).length],
      ['hampir', 'Hampir lengkap', all.filter(r => r.assessment.hampirLengkap).length], ['lengkap', 'Lengkap', all.filter(r => r.assessment.lengkap).length], ['siap', 'Siap dibayar', all.filter(r => r.assessment.state === 'siap_dibayar').length], ['dibayar', 'Dibayar', all.filter(r => r.assessment.state === 'dibayar').length]
    ] as const;
  });
  const visible = $derived.by(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter(r => {
      const a = r.assessment;
      if (q && !`${r.campus.name} ${r.campus.code}`.toLowerCase().includes(q)) return false;
      if (year !== 'semua' && r.campus.programYear !== year) return false;
      if (filter === 'admin') return a.adminWait > 0;
      if (filter === 'kampus') return a.campusWait > 0;
      if (filter === 'hampir') return a.hampirLengkap;
      if (filter === 'lengkap') return a.lengkap;
      if (filter === 'siap') return a.state === 'siap_dibayar';
      if (filter === 'dibayar') return a.state === 'dibayar';
      return true;
    }).sort((x, y) => sort === 'nama' ? x.campus.name.localeCompare(y.campus.name) : (y.assessment.done - x.assessment.done) || (y.assessment.adminWait - x.assessment.adminWait) || x.campus.name.localeCompare(y.campus.name));
  });
  const stats = $derived.by(() => {
    const all = rows || [];
    return { lengkap: all.filter(r => r.assessment.lengkap).length, admin: all.filter(r => r.assessment.adminWait > 0).length, kampus: all.filter(r => r.assessment.campusWait > 0).length, limit: all.reduce((n, r) => n + r.limitSen, 0), dibayar: all.filter(r => r.assessment.state === 'dibayar').length };
  });
  const phrase = $derived.by(() => {
    const all = rows || [];
    if (!all.length) return '';
    const waiting = all.filter(r => r.assessment.adminWait > 0).sort((x, y) => y.assessment.done - x.assessment.done);
    if (waiting.length) return `${waiting.length} kampus menunggu pemeriksaan admin. Mulai dari yang paling dekat Lengkap: ${joinNames(waiting.slice(0, 2).map(r => r.campus.name))}.`;
    const lengkap = all.filter(r => r.assessment.state === 'lengkap');
    if (lengkap.length) return `${lengkap.length} kampus Lengkap, tinggal tanda tangan basah dan lampiran.`;
    const siap = all.filter(r => r.assessment.state === 'siap_dibayar');
    if (siap.length) return `${siap.length} kampus siap dibayar.`;
    return 'Semua kampus menunggu berkas dari kampus.';
  });
  const firstOpen = (r: DirectoryRow): Kind | '' => KINDS.find(k => !['sesuai', 'tidak_perlu'].includes(r.assessment.items[k])) || '';
</script>

<div class="grid gap-5 [&>*]:min-w-0">
  <div class="grid gap-2">
    <h1 class="text-2xl font-bold text-slate-900">Pencairan</h1>
    <p class="text-sm text-slate-500">{KINDS.length} butir per kampus, seperti di lembar review, dengan RAB dalam tiga butir. Klik nama kampus untuk membuka daftar periksa Tahap 1, klik sel untuk membuka butirnya.</p>
    <PencairanNav active="dashboard" />
  </div>

  {#if error}
    <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
  {:else if !rows}
    <p class="text-sm text-slate-500">Memuat dashboard…</p>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-slate-200/70 bg-white p-3.5"><p class="text-2xl font-bold tabular-nums text-slate-900">{stats.lengkap} <span class="text-base font-semibold text-slate-500">dari {rows.length}</span></p><p class="text-xs text-slate-500">Lengkap</p></div>
      <div class="rounded-xl border border-slate-200/70 bg-white p-3.5"><p class="text-2xl font-bold tabular-nums text-slate-900">{stats.admin}</p><p class="text-xs text-slate-500">menunggu admin</p></div>
      <div class="rounded-xl border border-slate-200/70 bg-white p-3.5"><p class="text-2xl font-bold tabular-nums text-slate-900">{stats.kampus}</p><p class="text-xs text-slate-500">menunggu kampus</p></div>
      <div class="rounded-xl border border-slate-200/70 bg-white p-3.5"><p class="text-lg font-bold tabular-nums text-slate-900">{formatSen(stats.limit)}</p><p class="text-xs text-slate-500">batas Tahap 1 seluruh kampus · {stats.dibayar} dibayar</p></div>
    </div>
    <p class="text-lg font-bold text-slate-900">{phrase}</p>

    <div class="grid gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-[200px] flex-1 sm:max-w-xs"><span class="sr-only">Cari kampus</span><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={14} /></span><input class="min-h-[38px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" bind:value={search} placeholder="Cari kampus" /></label>
        <div class="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          {#each [['semua', 'Semua tahun'], ['kedua', 'Kedua'], ['ketiga', 'Ketiga']] as [key, label]}
            <button type="button" class="rounded-lg px-2.5 py-1.5 {year === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}" onclick={() => (year = key as typeof year)}>{label}</button>
          {/each}
        </div>
        <div class="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button type="button" class="rounded-lg px-2.5 py-1.5 {sort === 'keadaan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}" onclick={() => (sort = 'keadaan')}>Urut keadaan</button>
          <button type="button" class="rounded-lg px-2.5 py-1.5 {sort === 'nama' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}" onclick={() => (sort = 'nama')}>Urut nama</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5">
        {#each filters as [key, label, count]}
          <button type="button" class="rounded-full border px-3 py-1 text-xs font-semibold transition {filter === key ? 'border-[#0066B2] bg-[#0066B2] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}" onclick={() => (filter = key)}>{label} <span class="tabular-nums opacity-80">{count}</span></button>
        {/each}
      </div>
      <StatusLegend />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200/70 bg-white">
      <table aria-label="Status pencairan per kampus" class="w-full min-w-[900px] text-sm">
        <thead><tr class="bg-slate-50 text-[11px] uppercase tracking-[0.05em] text-slate-500">
          <th class="px-3 py-2.5 text-left font-bold">Kampus</th>
          {#each KINDS as k}<th class="px-1 py-2.5 text-center font-bold" title={KIND_SHORT[k]}>{KIND_SHORT[k]}</th>{/each}
          <th class="px-3 py-2.5 text-left font-bold">Keadaan</th>
          <th class="px-3 py-2.5 text-left font-bold">Menunggu</th>
        </tr></thead>
        <tbody>
          {#each visible as r (r.campus.id)}
            {@const first = firstOpen(r)}
            <tr class="border-t border-slate-100 hover:bg-blue-50/40">
              <td class="px-3 py-2"><a href={`/admin/pencairan/${r.campus.id}${first ? `?butir=${first}` : ''}`} class="font-semibold text-slate-900 hover:text-[#0066B2] hover:underline">{r.campus.name}</a><span class="block text-[11px] text-slate-400">{r.campus.programYear === 'kedua' ? 'Tahun Kedua' : 'Tahun Ketiga'} · batas {formatSen(r.limitSen)}</span></td>
              {#each KINDS as k}
                {@const s = r.assessment.items[k]}
                <td class="px-1 py-2 text-center"><a href={`/admin/pencairan/${r.campus.id}?butir=${k}`} class="inline-flex size-8 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" title={`${r.campus.name} · ${KIND_SHORT[k]}: ${ITEM_STATE_LABEL[s]}`} aria-label={`${r.campus.name} · ${KIND_SHORT[k]}: ${ITEM_STATE_LABEL[s]}`}><StatusMarker state={s} /></a></td>
              {/each}
              <td class="px-3 py-2 tabular-nums text-slate-700">{r.assessment.done} dari {r.assessment.total}</td>
              <td class="px-3 py-2"><span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold {pill[r.assessment.state]}" title={CAMPUS_STATE_LABEL[r.assessment.state]}>{r.assessment.waiting}</span>{#if r.assessment.revisi > 0}<a href={`/admin/pencairan/${r.campus.id}/revisi`} class="ml-1.5 whitespace-nowrap text-[11.5px] font-semibold text-amber-800 hover:underline" title="Ringkasan revisi">Ringkasan revisi</a>{/if}</td>
            </tr>
          {/each}
          {#if !visible.length}<tr><td colspan={KINDS.length + 3} class="px-3 py-8 text-center text-sm text-slate-500">Tidak ada kampus yang cocok. Ubah saringan atau kata pencarian.</td></tr>{/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

