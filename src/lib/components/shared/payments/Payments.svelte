<script module lang="ts">
  // Query string of the last directory view, so the back link returns to the same filters.
  let directorySearch = '';
</script>

<script lang="ts">
  import { page } from '$app/state';
  import { app } from '$lib/state.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import PaymentProgress from './PaymentProgress.svelte';
  import PaymentDetail from './PaymentDetail.svelte';
  import PaymentDirectory from './PaymentDirectory.svelte';

  const isCampus = $derived(app.session?.role === 'campus');
  const paymentId = $derived(page.url.searchParams.get('payment') || '');
  const payments = $derived(app.data?.payments || []);

  // Campus role: own cases only, the linked one or else the latest.
  const ownCases = $derived(payments.filter((p) => p.campusId === app.session?.campusId));
  const ownSelected = $derived(ownCases.find((p) => p.id === paymentId) || ownCases.at(-1));

  // Admin and finance: a case opens only through its id in the URL.
  const selected = $derived(paymentId ? payments.find((p) => p.id === paymentId) : undefined);
  const campus = $derived(app.data?.campuses.find((item) => item.id === selected?.campusId));
  const version = $derived(app.data?.proposals.find((item) => item.id === selected?.proposalId)?.version);
  const backHref = $derived(page.url.pathname + (paymentId ? directorySearch : ''));
  $effect(() => {
    if (!isCampus && !page.url.searchParams.has('payment')) directorySearch = page.url.search;
  });
</script>

<svelte:head><title>Pencairan · Digitalisasi DEB</title></svelte:head>

{#snippet notice()}
  <p
    class="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"
  >
    Mode simulasi · KPI dan nominal adalah contoh, bukan ketentuan resmi Pertamina Holding.
    Pengiriman ke keuangan berlangsung di aplikasi demo; tidak ada transfer uang atau email nyata.
  </p>
{/snippet}

{#if isCampus}
  <h1 class="sr-only">Pencairan program</h1>
  {#if ownSelected}<PaymentProgress payment={ownSelected} />
  {:else}<p class="rounded-xl border bg-white p-5">Belum ada pengajuan pencairan.</p>{/if}
{:else if paymentId}
  <div class="mb-3 -ml-3">
    <Button variant="ghost" size="sm" icon="back" href={backHref}>Semua pengajuan</Button>
  </div>
  {#if selected}
    <header class="mb-5 flex items-center gap-3">
      <span
        aria-hidden="true"
        class="grid h-12 min-w-12 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#0877d8,#1559d6)] px-2 text-[13px] font-bold text-white"
        >{campus?.initials || 'K'}</span
      >
      <div class="min-w-0">
        <p class="text-xs font-semibold tracking-[0.06em] text-[#075fc7]">PENCAIRAN PROGRAM</p>
        <h1
          class="mt-1 text-[22px] leading-tight font-semibold tracking-[-0.01em] text-[#0d234c] min-[700px]:text-2xl"
        >
          {campus?.name || 'Kampus'}
          <span class="mt-1 block text-sm font-medium tracking-normal text-[#475569]"
            >{version ? `Proposal versi ${version}` : 'Proposal'}</span
          >
        </h1>
      </div>
    </header>
    {@render notice()}
    {#key selected.id + ':' + selected.revision}<PaymentDetail payment={selected} />{/key}
  {:else}
    <h1 class="sr-only">Pencairan program</h1>
    <div class="rounded-xl border border-[#dce7f7] bg-white pb-8 shadow-[0_10px_30px_#1a4d8f08]">
      <Empty
        title="Pengajuan tidak ditemukan"
        description="Buka daftar pengajuan lalu pilih kartu kampus yang dituju."
        icon="payments"
      />
      <div class="-mt-8 flex justify-center">
        <Button variant="secondary" size="sm" icon="back" href={backHref}>Semua pengajuan</Button>
      </div>
    </div>
  {/if}
{:else}
  <PaymentDirectory {notice} />
{/if}
