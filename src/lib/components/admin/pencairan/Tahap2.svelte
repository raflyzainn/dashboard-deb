<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { onChange } from '$lib/realtime.svelte';
  import { formatSen } from '$lib/pencairan';
  import Empty from '$lib/components/ui/Empty.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import PencairanNav from './PencairanNav.svelte';

  /** Tahap 2: the remainder per campus. Opens once Tahap 1 is paid and the realisation report is in; until then the list only reads the numbers. */
  interface Row { campus: { id: string; name: string; code: string; programYear: string }; amountSen: number; limitSen: number; requestedSen: number; paidSen?: number; paidAt?: string }

  let rows = $state<Row[]>([]);
  let loading = $state(true);
  let error = $state('');
  let query = $state('');

  const dateOnly = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const day = (iso: string) => { const d = new Date(iso.includes('T') || iso.includes(' ') ? iso : iso + 'T00:00:00'); return Number.isNaN(d.getTime()) ? iso : dateOnly.format(d); };
  const isPaid = (r: Row) => Boolean(r.paidAt) && Number(r.paidSen || 0) > 0;
  const remainder = (r: Row) => r.amountSen - Number(r.paidSen || 0);
  const paidCount = $derived(rows.filter(isPaid).length);
  const visible = $derived(rows.filter(r => { const q = query.trim().toLowerCase(); return !q || r.campus.name.toLowerCase().includes(q) || r.campus.code.toLowerCase().includes(q); }));

  async function load() {
    loading = true; error = '';
    try { rows = (await dataService.api.get<{ rows: Row[] }>('/api/pencairan')).rows; }
    catch (e) { error = e instanceof Error ? e.message : 'Daftar belum dapat dimuat.'; }
    finally { loading = false; }
  }
  $effect(() => { untrack(() => { void load(); }); });
  $effect(() => onChange(() => void load(), { delay: 1000 }));
</script>

<div class="grid gap-5">
  <PencairanNav active="tahap-2" />
  <header>
    <h1 class="text-2xl font-bold text-slate-900">Pencairan Tahap 2</h1>
    <p class="mt-1 text-sm text-slate-600">Sisa Nilai SK setelah Tahap 1 dibayar. {paidCount} dari {rows.length} kampus sudah dibayar Tahap 1.</p>
  </header>

  {#if error}<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>{/if}

  <label class="relative block md:max-w-md">
    <span class="sr-only">Cari kampus</span>
    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={16} /></span>
    <input class="min-h-[42px] w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#0066B2] focus:ring-2 focus:ring-blue-100" type="search" placeholder="Cari nama atau kode kampus" bind:value={query} />
  </label>

  {#if loading}
    <p class="text-sm text-slate-500">Memuat daftar kampus…</p>
  {:else if !visible.length}
    <Empty title="Tidak ada kampus yang cocok" description="Ubah kata kuncinya." />
  {:else}
    <ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {#each visible as r (r.campus.id)}
        {@const paid = isPaid(r)}
        <li>
          <a href={`/admin/pencairan/${r.campus.id}/tahap-2`} class="grid h-full gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_#0b254508] transition hover:border-[#0066B2]/60 hover:shadow-[0_12px_32px_#0066b21a] active:scale-[0.99]">
            <div class="flex items-center gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-bold text-[#015a9a]">{r.campus.code.slice(0, 6)}</span>
              <span class="min-w-0"><span class="block truncate text-sm font-semibold text-slate-900">{r.campus.name}</span><span class="block text-xs text-slate-500">Tahun {r.campus.programYear === 'kedua' ? 'Kedua' : 'Ketiga'}</span></span>
            </div>
            <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt class="text-slate-500">Nilai SK</dt><dd class="m-0 text-right tabular-nums font-semibold text-slate-900">{formatSen(r.amountSen)}</dd>
              <dt class="text-slate-500">Dibayar Tahap 1</dt><dd class="m-0 text-right tabular-nums {paid ? 'font-semibold text-slate-900' : 'text-slate-500'}">{paid ? `${formatSen(r.paidSen)} · ${day(r.paidAt || '')}` : 'Belum dibayar'}</dd>
              <dt class="text-slate-500">Sisa Tahap 2</dt><dd class="m-0 text-right tabular-nums {paid ? 'font-semibold text-[#015a9a]' : 'text-slate-500'}">{paid ? formatSen(remainder(r)) : 'Setelah Tahap 1 dibayar'}</dd>
            </dl>
            <span class="inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold {paid ? 'bg-blue-50 text-[#015a9a]' : 'bg-slate-100 text-slate-600'}">{paid ? 'Dibuka setelah laporan realisasi Tahap 1 diterima' : 'Menunggu Tahap 1 dibayar'}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
