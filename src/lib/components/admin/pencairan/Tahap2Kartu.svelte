<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { formatSen, formatPercent, percentOf } from '$lib/pencairan';
  import Icon from '$lib/components/ui/Icon.svelte';

  /** The Tahap 2 card of one campus: the remainder from the SK and what Tahap 1 paid, and the six items that will fill later. Read only for now. */
  interface Data {
    campus: { id: string; name: string; code: string; programYear: string };
    summary: { skNumber: string; amountSen: number; limitSen: number; requestedSen: number };
    payment: { requestedSen: number; paidSen: number; paidAt: string; paidRef: string; paidByName: string };
  }

  let { campusId }: { campusId: string } = $props();
  let data = $state<Data | null>(null);
  let error = $state('');

  const dateOnly = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const day = (iso: string) => { const d = new Date(iso.includes('T') || iso.includes(' ') ? iso : iso + 'T00:00:00'); return Number.isNaN(d.getTime()) ? iso : dateOnly.format(d); };
  const paid = $derived(Boolean(data?.payment.paidAt) && Number(data?.payment.paidSen || 0) > 0);
  const remainderSen = $derived(data ? data.summary.amountSen - (paid ? data.payment.paidSen : 0) : 0);
  const remainderPercent = $derived(data && paid ? percentOf(remainderSen, data.summary.amountSen) : 0);
  const aboveThirty = $derived(data ? (paid ? data.payment.paidSen < data.summary.limitSen : Boolean(data.summary.requestedSen) && data.summary.requestedSen < data.summary.limitSen) : false);

  const items = $derived([
    { title: 'Laporan realisasi Tahap 1 (LPJ)', hint: 'Satu invois, satu pindaian, satu entri per pengeluaran', href: `/admin/pencairan/${campusId}/lpj` },
    { title: 'RAB Tahap 2', hint: 'Total sama dengan sisa Tahap 2', href: '' },
    { title: 'Permohonan pencairan Tahap 2', hint: 'Nominal sama dengan sisa', href: '' },
    { title: 'Kuitansi Tahap 2', hint: 'Nominal dan terbilang', href: '' },
    { title: 'Invoice Tahap 2', hint: 'Rekening sama dengan Tahap 1', href: '' }
  ]);

  async function load() {
    try { data = await dataService.api.get<Data>(`/api/pencairan/${campusId}/lampiran`); error = ''; }
    catch (e) { error = e instanceof Error ? e.message : 'Halaman belum dapat dimuat.'; }
  }
  $effect(() => { untrack(() => { void load(); }); });
</script>

{#if error && !data}
  <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
{:else if !data}
  <p class="text-sm text-slate-500">Memuat kartu Tahap 2…</p>
{:else}
  <div class="grid gap-5">
    <a href="/admin/pencairan/tahap-2" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#0066B2] hover:underline"><Icon name="back" size={14} />Kembali ke daftar Tahap 2</a>
    <header>
      <p class="text-sm font-semibold text-[#015a9a]">{data.campus.name} · Kode {data.campus.code}</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900">Pencairan Tahap 2</h1>
      <p class="mt-1 text-sm text-slate-600">Belum ada yang bisa diubah di halaman ini.</p>
    </header>

    <section class="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-[#015a9a]">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span>Nilai SK <strong class="tabular-nums text-slate-900">{formatSen(data.summary.amountSen)}</strong></span>
        <span>Dibayar Tahap 1 <strong class="tabular-nums text-slate-900">{paid ? `${formatSen(data.payment.paidSen)} (${day(data.payment.paidAt)})` : 'Belum dibayar'}</strong></span>
        <span>Sisa Tahap 2 <strong class="tabular-nums text-slate-900">{paid ? formatSen(remainderSen) : 'Setelah Tahap 1 dibayar'}</strong></span>
        {#if paid}<span class="text-xs">Sisa ini {formatPercent(remainderPercent)} dari Nilai SK.</span>{/if}
      </div>
      {#if aboveThirty}
        <p class="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"><Icon name="alert" size={14} />Sisa di atas 30% karena Tahap 1 di bawah batas; periksa pasal Bantuan Dana.</p>
      {/if}
    </section>

    <p class="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800">Tahap 2 dibuka setelah laporan realisasi Tahap 1 diterima.</p>

    <ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3" aria-label="Butir Tahap 2">
      {#each items as item (item.title)}
        <li class="grid gap-2 rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_#0b254508]">
          <span class="text-sm font-semibold text-slate-900">{item.title}</span>
          <span class="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Belum ada</span>
          <span class="text-xs text-slate-500">{item.hint}</span>
          {#if item.href}<a href={item.href} class="text-xs font-semibold text-[#0066B2] hover:underline">Buka laporan realisasi Tahap 1</a>{/if}
        </li>
      {/each}
      <li class="grid gap-2 rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_#0b254508]">
        <span class="text-sm font-semibold text-slate-900">Buku rekening dan surat kuasa</span>
        <span class="inline-flex w-fit rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">Dibawa dari Tahap 1</span>
        <span class="text-xs text-slate-500">Diperiksa ulang hanya bila berubah</span>
      </li>
    </ul>
  </div>
{/if}
