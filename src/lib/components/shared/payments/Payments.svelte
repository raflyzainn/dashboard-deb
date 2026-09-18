<script lang="ts">
  import { page } from '$app/state';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { STAGES } from '$lib/payments';
  import PaymentProgress from './PaymentProgress.svelte';
  import PaymentDetail from './PaymentDetail.svelte';
  let campus = $state('');
  let selectedId = $state('');
  let campusQuery = $state('');
  let stageFilter = $state('');
  $effect(() => {
    campus = page.url.searchParams.get('campus') || '';
    selectedId = page.url.searchParams.get('payment') || '';
  });
  let proposalId = $state('');
  let amount = $state(50000000);
  const isCampus = $derived(app.session?.role === 'campus');
  const filteredCampuses = $derived(
    (app.data?.campuses || []).filter(
      (item) =>
        (!campusQuery.trim() ||
          item.name
            .toLocaleLowerCase('id')
            .includes(campusQuery.trim().toLocaleLowerCase('id'))) &&
        (!stageFilter ||
          (app.data?.payments || []).some(
            (payment) => payment.campusId === item.id && payment.stage === stageFilter
          ))
    )
  );
  const activeCampus = $derived(
    isCampus
      ? app.session?.campusId
      : campus || page.url.searchParams.get('campus') || filteredCampuses[0]?.id
  );
  const cases = $derived((app.data?.payments || []).filter((p) => p.campusId === activeCampus));
  const selected = $derived(
    cases.find((p) => p.id === (selectedId || page.url.searchParams.get('payment'))) || cases.at(-1)
  );
  const available = $derived(
    (app.data?.proposals || [])
      .filter((p) => p.campusId === activeCampus && !cases.some((c) => c.proposalId === p.id))
      .sort((a, b) => b.version - a.version)
  );
  $effect(() => {
    if (!isCampus && campus && !filteredCampuses.some((item) => item.id === campus)) {
      campus = filteredCampuses[0]?.id || '';
      selectedId = '';
      proposalId = '';
    }
  });
  async function create() {
    const id = available.find((p) => p.id === proposalId)?.id || available[0]?.id;
    if (!id) return;
    if (
      await app.mutate(() => dataService.createPayment(id, amount), 'Pengajuan pencairan dibuat.')
    )
      selectedId = '';
  }
</script>
<svelte:head><title>Pencairan · Digitalisasi DEB</title></svelte:head>
{#if isCampus}
  <h1 class="sr-only">Pencairan program</h1>
  {#if selected}<PaymentProgress payment={selected} />
  {:else}<p class="rounded-xl border bg-white p-5">Belum ada pengajuan pencairan.</p>{/if}
{:else}
  <header class="mb-6">
    <p class="text-xs font-semibold tracking-widest text-blue-600">PROPOSAL & PEMBAYARAN</p>
    <h1 class="mt-2 text-3xl font-semibold text-[#0d234c]">Pencairan program</h1>
    <p class="mt-2 text-sm text-slate-600">
      Ikuti penilaian proposal, kelengkapan berkas, dan persetujuan sampai pencairan.
    </p>
  </header>
  <p
    class="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"
  >
    Mode simulasi · KPI dan nominal adalah contoh, bukan ketentuan resmi Pertamina Holding.
    Pengiriman ke keuangan berlangsung di aplikasi demo; tidak ada transfer uang atau email nyata.
  </p>
  <section
    class="mb-5 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
    aria-label="Pilih pengajuan pencairan"
  >
    <label class="grid gap-2 text-sm font-semibold"
      >Cari kampus<input
        aria-label="Cari kampus pencairan"
        type="search"
        placeholder="Ketik nama kampus..."
        bind:value={campusQuery}
        class="min-w-0 w-full rounded-lg border border-slate-300 p-3 font-normal"
      /></label
    >
    <label class="grid gap-2 text-sm font-semibold"
      >Tahap pencairan<select
        aria-label="Filter tahap pencairan"
        bind:value={stageFilter}
        class="min-w-0 w-full rounded-lg border border-slate-300 p-3 font-normal"
      >
        <option value="">Semua tahap</option>
        {#each Object.entries(STAGES) as [key, label]}<option value={key}>{label}</option>{/each}
      </select></label
    >
    {#if !isCampus}<label class="grid gap-2 text-sm font-semibold"
        >Kampus
        <select
          aria-label="Kampus pencairan"
          value={activeCampus}
          onchange={(e) => {
            campus = e.currentTarget.value;
            selectedId = '';
            proposalId = '';
          }}
          class="min-w-0 w-full rounded-lg border border-slate-300 p-3"
        >
          {#each filteredCampuses as c}<option value={c.id}>{c.name}</option>{/each}
          {#if !filteredCampuses.length}<option value="">Tidak ada kampus</option>{/if}
        </select></label
      >{/if}
    <label class="grid gap-2 text-sm font-semibold"
      >Pengajuan
      <select
        aria-label="Pengajuan pencairan"
        value={selected?.id || ''}
        onchange={(e) => (selectedId = e.currentTarget.value)}
        class="min-w-0 w-full rounded-lg border border-slate-300 p-3"
      >
        {#each cases as p}<option value={p.id}
            >Versi {app.data?.proposals.find((v) => v.id === p.proposalId)?.version} · {STAGES[
              p.stage
            ]}</option
          >{/each}
        {#if !cases.length}<option value="">Belum ada pengajuan</option>{/if}
      </select></label
    >
  </section>
  {#if app.session?.role === 'admin' && available.length}
    <details class="mb-5 rounded-xl border border-slate-200 bg-white p-5">
      <summary class="cursor-pointer text-sm font-semibold"
        >Ajukan pencairan untuk versi proposal lain</summary
      >
      <form
        class="mt-4 grid gap-4 sm:grid-cols-3"
        onsubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <label class="grid gap-2 text-sm"
          >Versi proposal<select
            aria-label="Versi untuk pencairan"
            bind:value={proposalId}
            class="w-full rounded-lg border p-3"
            ><option value="">Versi terbaru tersedia</option>{#each available as p}<option
                value={p.id}>Versi {p.version} · {p.filename}</option
              >{/each}</select
          ></label
        >
        <label class="grid gap-2 text-sm"
          >Nominal (Rp)<input
            aria-label="Nominal pengajuan baru"
            type="number"
            min="1"
            max="1000000000000"
            step="1"
            required
            bind:value={amount}
            class="w-full rounded-lg border p-3"
          /></label
        >
        <button
          disabled={app.busy || app.loading}
          class="self-end rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
          >Buat pengajuan</button
        >
      </form>
    </details>
  {/if}
  {#if selected}
    {#key selected.id + ':' + selected.revision}<PaymentDetail payment={selected} />{/key}
  {:else}<section class="rounded-xl border bg-white p-8 text-center">
      <p>Belum ada pengajuan pencairan.</p>
      <a class="mt-3 inline-block text-blue-700" href={`/${app.session?.role}/proposal`}
        >Buka proposal untuk mengunggah PDF</a
      >
    </section>{/if}
{/if}
