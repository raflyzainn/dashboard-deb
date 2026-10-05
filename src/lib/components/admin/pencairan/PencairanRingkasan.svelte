<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { KINDS, type ItemState } from '$lib/pencairan';
  import type { DirectoryRow } from './kartu-types';
  import Icon from '$lib/components/ui/Icon.svelte';

  /** Small summary of Pencairan Tahap 1 for the admin home page, read from the same rows as the dashboard. */
  let rows = $state<DirectoryRow[] | null>(null);
  let error = $state('');
  $effect(() => {
    untrack(() => {
      dataService.api.get<{ rows: DirectoryRow[] }>('/api/pencairan').then(r => (rows = r.rows)).catch(e => (error = e instanceof Error ? e.message : 'Ringkasan pencairan belum dapat dimuat.'));
    });
  });
  const total = $derived.by(() => {
    const acc: Record<ItemState, number> = { sesuai: 0, tidak_perlu: 0, perlu_konfirmasi: 0, menunggu_review: 0, perlu_revisi: 0, belum_ada: 0 };
    for (const r of rows || []) for (const k of KINDS) acc[r.assessment.items[k]]++;
    return acc;
  });
  const slots = $derived(rows ? rows.length * KINDS.length : 0);
  const admin = $derived(rows ? rows.filter(r => r.assessment.adminWait > 0).length : 0);
  const kampus = $derived(rows ? rows.filter(r => r.assessment.campusWait > 0).length : 0);
  const lengkap = $derived(rows ? rows.filter(r => r.assessment.lengkap).length : 0);
  const dibayar = $derived(rows ? rows.filter(r => r.assessment.state === 'dibayar').length : 0);
</script>

<section class="mb-6 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_10px_30px_#0b254508]">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <span class="block text-[12px] font-bold uppercase tracking-[0.06em] text-[#3975b7]">Pencairan Tahap 1</span>
      <h2 class="mt-1 text-lg font-bold text-slate-900">{rows ? `${rows.length} kampus penerima gelombang pertama` : 'Memuat ringkasan…'}</h2>
      {#if error}<p class="mt-1 text-sm text-red-700">{error}</p>{/if}
    </div>
    <a href="/admin/pencairan" class="inline-flex items-center gap-1 rounded-xl bg-[#0066B2] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_#0066b233] hover:bg-[#015a9a]">Buka dashboard <Icon name="arrow" size={14} /></a>
  </div>
  {#if rows && slots}
    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl bg-blue-50/70 p-3"><p class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Menunggu admin</p><p class="mt-1 text-2xl font-bold text-slate-900">{admin}</p><p class="text-xs text-slate-500">kampus dengan butir yang menunggu pemeriksaan</p></div>
      <div class="rounded-xl bg-amber-50/70 p-3"><p class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Menunggu kampus</p><p class="mt-1 text-2xl font-bold text-slate-900">{kampus}</p><p class="text-xs text-slate-500">kampus yang masih harus mengirim atau memperbaiki</p></div>
      <div class="rounded-xl bg-green-50/70 p-3"><p class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Lengkap</p><p class="mt-1 text-2xl font-bold text-slate-900">{lengkap}</p><p class="text-xs text-slate-500">{dibayar} sudah dibayar</p></div>
    </div>
    <div class="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Sebaran keadaan butir">
      <i class="block bg-green-600" style={`width:${((total.sesuai + total.tidak_perlu) / slots) * 100}%`}></i>
      <i class="block bg-sky-400" style={`width:${(total.menunggu_review / slots) * 100}%`}></i>
      <i class="block bg-[#0066B2]" style={`width:${(total.perlu_konfirmasi / slots) * 100}%`}></i>
      <i class="block bg-amber-500" style={`width:${(total.perlu_revisi / slots) * 100}%`}></i>
    </div>
    <p class="mt-2 text-xs text-slate-500">{total.sesuai + total.tidak_perlu} sesuai · {total.menunggu_review} menunggu pemeriksaan · {total.perlu_konfirmasi} perlu konfirmasi · {total.perlu_revisi} perlu revisi · {total.belum_ada} belum ada, dari {slots} butir.</p>
  {/if}
</section>
