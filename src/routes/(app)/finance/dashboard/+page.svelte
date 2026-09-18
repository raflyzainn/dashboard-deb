<script lang="ts">
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Stat from '$lib/components/ui/Stat.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import { STAGES, type PaymentStage } from '$lib/payments';

  const stages = Object.entries(STAGES) as [PaymentStage, string][];
  const payments = $derived(app.data?.payments || []);
  const total = $derived(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const paid = $derived(
    payments.filter((payment) => payment.stage === 'paid').reduce((sum, payment) => sum + payment.amount, 0)
  );
  const priorityStages: PaymentStage[] = ['sent', 'ready', 'finance'];
  const priorities = $derived(
    payments
      .filter((payment) => priorityStages.includes(payment.stage))
      .sort((a, b) => priorityStages.indexOf(a.stage) - priorityStages.indexOf(b.stage))
      .slice(0, 6)
  );
  const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;
  const count = (stage: PaymentStage) => payments.filter((payment) => payment.stage === stage).length;
  const campusName = (id: string) => app.data?.campuses.find((campus) => campus.id === id)?.name || 'Kampus';
  const proposalVersion = (id: string) => app.data?.proposals.find((proposal) => proposal.id === id)?.version;
</script>

<svelte:head><title>Dashboard keuangan · Digitalisasi DEB</title></svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
  <div>
    <p class="text-xs font-semibold tracking-[0.16em] text-blue-600">RUANG KERJA KEUANGAN</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#0d234c]">Dashboard keuangan</h1>
    <p class="mt-2 text-sm text-slate-600">Pantau antrean dan progres pencairan seluruh kampus.</p>
  </div>
  <a
    class="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
    href="/finance/payments"
  >Lihat semua pencairan <Icon name="arrow" size={17} /></a>
</header>

<section
  class="mb-5 grid gap-4 rounded-2xl bg-gradient-to-br from-[#0d43a7] to-[#157bd4] p-6 text-white shadow-lg shadow-blue-900/10 sm:grid-cols-[1fr_auto] sm:items-center"
  aria-label="Nilai pencairan"
>
  <div>
    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">Total nilai pengajuan</p>
    <strong class="mt-2 block text-3xl font-semibold tracking-tight sm:text-4xl">{rupiah(total)}</strong>
    <p class="mt-2 text-sm text-blue-100">Akumulasi nominal seluruh pengajuan pencairan simulasi.</p>
  </div>
  <div class="rounded-xl border border-white/20 bg-white/10 px-5 py-4 sm:min-w-56">
    <span class="text-xs text-blue-100">Sudah dicairkan</span>
    <strong class="mt-1 block text-xl">{rupiah(paid)}</strong>
    <span class="mt-1 block text-xs text-blue-100">{count('paid')} pengajuan selesai</span>
  </div>
</section>

<section class="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan pencairan">
  <Stat label="Total pengajuan" value={String(payments.length)} note="Seluruh kampus" icon="payments" />
  <Stat label="Siap dikirim" value={String(count('ready'))} note="Menunggu pengiriman paket" icon="upload" tone="blue" />
  <Stat label="Diproses keuangan" value={String(count('sent'))} note="Paket sudah diterima" icon="clock" tone="amber" />
  <Stat label="Sudah dicairkan" value={String(count('paid'))} note="Pencairan tercatat" icon="check" tone="mint" />
</section>

<div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Prioritas keuangan">
    <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 class="font-semibold text-[#0d234c]">Prioritas keuangan</h2>
        <p class="mt-1 text-xs text-slate-500">Pengajuan terdekat dengan proses pencairan.</p>
      </div>
      <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{priorities.length} antrean</span>
    </div>
    {#if priorities.length}
      <div class="divide-y divide-slate-100">
        {#each priorities as payment}
          <article class="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <div class="min-w-0">
              <h3 class="truncate text-sm font-semibold text-[#0d234c]">{campusName(payment.campusId)}</h3>
              <p class="mt-1 text-xs text-slate-500">Proposal versi {proposalVersion(payment.proposalId) || '–'} · {rupiah(payment.amount)}</p>
            </div>
            <span class={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${payment.stage === 'sent' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{STAGES[payment.stage]}</span>
            <a
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
              aria-label="Buka detail pencairan"
              href={`/finance/payments?campus=${payment.campusId}&payment=${payment.id}`}
            >Buka detail <Icon name="chevron" size={14} /></a>
          </article>
        {/each}
      </div>
    {:else}
      <Empty title="Tidak ada antrean prioritas" description="Pengajuan siap kirim atau sedang diproses akan tampil di sini." icon="check" />
    {/if}
  </section>

  <section class="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Distribusi tahap pencairan">
    <h2 class="font-semibold text-[#0d234c]">Distribusi tahap</h2>
    <p class="mt-1 text-xs text-slate-500">Posisi seluruh pengajuan saat ini.</p>
    <div class="mt-5 grid gap-3">
      {#each stages as [key, label]}
        <div>
          <div class="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span class="text-slate-600">{label}</span>
            <strong class="text-[#0d234c]">{count(key)}</strong>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full bg-blue-600" style={`width: ${payments.length ? (count(key) / payments.length) * 100 : 0}%`}></div>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>
