<script lang="ts">
  // Directory of payment cases for admin and finance: summary, filters, and one card per case.
  import { untrack, type Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date } from '$lib/domain';
  import { DOCUMENT_TYPES, STAGES, type PaymentCase, type PaymentStage } from '$lib/payments';
  import Button from '$lib/components/ui/Button.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';

  let { notice }: { notice?: Snippet } = $props();

  type SortKey = 'updated' | 'stage' | 'amount' | 'name';
  type Actor = 'admin' | 'campus' | 'finance';
  interface Row {
    payment: PaymentCase;
    href: string;
    name: string;
    haystack: string;
    initials: string;
    versionLabel: string;
    index: number;
    updatedAt: string;
    validDocs: number;
    revision: boolean;
    paid: boolean;
  }

  const stages = Object.entries(STAGES) as [PaymentStage, string][];
  const SORTS: [SortKey, string][] = [
    ['updated', 'Terbaru diperbarui'],
    ['stage', 'Tahap'],
    ['amount', 'Nominal'],
    ['name', 'Nama kampus']
  ];
  // Who acts next at each stage. Display only: the stage rules stay in $lib/payments.
  const WAITING: Record<PaymentStage, { actor: Actor | null; label: string }> = {
    kpi: { actor: 'admin', label: 'Admin PF' },
    documents: { actor: 'admin', label: 'Admin PF' },
    pf: { actor: 'admin', label: 'Admin PF' },
    campus: { actor: 'campus', label: 'Kampus' },
    finance: { actor: 'finance', label: 'Keuangan' },
    ready: { actor: 'admin', label: 'Admin PF' },
    sent: { actor: 'finance', label: 'Keuangan' },
    paid: { actor: null, label: 'Selesai' }
  };
  // History label written by advancePayment when a case is sent back.
  const REVISION_ACTION = 'Dikembalikan untuk revisi';
  const TONES = {
    blue: 'bg-[#e9f3ff] text-[#075fc7]',
    amber: 'bg-[#fff4d6] text-[#8a5a00]',
    green: 'bg-[#dcfce7] text-[#15803d]'
  };
  const CARD = 'rounded-xl border border-[#dce7f7] bg-white shadow-[0_10px_30px_#1a4d8f08]';
  const FIELD =
    'h-[42px] w-full rounded-lg border border-[#cfe0f5] bg-white px-3 text-sm font-normal text-[#0d234c] placeholder:text-[#64748b] focus:border-[#075fc7] focus:outline-none focus:ring-2 focus:ring-[#55a9f2]/40 disabled:opacity-60';
  const LABEL = 'grid gap-1.5 text-[13px] font-semibold text-[#17365f]';

  const readStage = (value: string | null): PaymentStage | '' =>
    stages.some(([key]) => key === value) ? (value as PaymentStage) : '';
  const readSort = (value: string | null): SortKey =>
    SORTS.some(([key]) => key === value) ? (value as SortKey) : 'updated';
  const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;
  const compact = (value: number) =>
    value >= 1e9
      ? `Rp ${(value / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`
      : value >= 1e6
        ? `Rp ${(value / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
        : rupiah(value);
  const normalize = (text: string) => text.trim().toLocaleLowerCase('id');

  // Filters live in local state and are mirrored to the URL, so Back restores them.
  const initial = page.url.searchParams;
  let query = $state(initial.get('q') || '');
  let stage = $state<PaymentStage | ''>(readStage(initial.get('stage')));
  let sort = $state<SortKey>(readSort(initial.get('sort')));
  let campus = $state(initial.get('campus') || '');
  let writing = 0;
  let target = page.url.search;

  // Follow the URL when it changes from outside (Back, sidebar link, shared link).
  $effect(() => {
    const params = page.url.searchParams;
    const search = page.url.search;
    const next = {
      q: params.get('q') || '',
      stage: readStage(params.get('stage')),
      sort: readSort(params.get('sort')),
      campus: params.get('campus') || ''
    };
    untrack(() => {
      if (writing) return;
      target = search;
      query = next.q;
      stage = next.stage;
      sort = next.sort;
      campus = next.campus;
    });
  });

  function commit() {
    const url = new URL(page.url);
    url.search = '';
    if (campus) url.searchParams.set('campus', campus);
    if (query) url.searchParams.set('q', query);
    if (stage) url.searchParams.set('stage', stage);
    if (sort !== 'updated') url.searchParams.set('sort', sort);
    if (url.search === target) return;
    target = url.search;
    writing++;
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
      .catch((error) => console.warn('Payment filters were not written to the URL.', error))
      .finally(() => writing--);
  }
  function setStage(next: PaymentStage | '') {
    stage = stage === next ? '' : next;
    commit();
  }
  function clearFilters() {
    query = '';
    stage = '';
    campus = '';
    commit();
  }

  const role = $derived(app.session?.role);
  const isAdmin = $derived(role === 'admin');
  const campuses = $derived(app.data?.campuses || []);
  const proposals = $derived(app.data?.proposals || []);
  const payments = $derived(app.data?.payments || []);
  const campusById = $derived(new Map(campuses.map((item) => [item.id, item])));
  const versionById = $derived(new Map(proposals.map((item) => [item.id, item.version])));

  function lastUpdate(p: PaymentCase) {
    const stamps = [
      ...p.history.map((item) => item.at),
      ...p.documents.map((item) => item.uploadedAt),
      ...p.approvals.map((item) => item.at),
      ...(p.feedback || []).map((item) => item.createdAt),
      p.paidAt || ''
    ];
    return stamps.reduce((latest, at) => (at > latest ? at : latest), '');
  }
  const rows = $derived(
    payments.map((payment): Row => {
      const owner = campusById.get(payment.campusId);
      const name = owner?.name || 'Kampus';
      return {
        payment,
        href: `?campus=${encodeURIComponent(payment.campusId)}&payment=${encodeURIComponent(payment.id)}`,
        name,
        haystack: normalize(`${name} ${owner?.acronym || ''}`),
        initials: owner?.initials || name.slice(0, 2).toUpperCase(),
        versionLabel: versionById.has(payment.proposalId)
          ? `Proposal versi ${versionById.get(payment.proposalId)}`
          : 'Proposal',
        index: stages.findIndex(([key]) => key === payment.stage),
        updatedAt: lastUpdate(payment),
        validDocs: payment.documents.filter((item) => item.status === 'accepted').length,
        revision:
          payment.stage !== 'paid' &&
          (payment.documents.some((item) => item.status === 'revision') ||
            (payment.stage === 'kpi' &&
              payment.history.some((item) => item.action === REVISION_ACTION))),
        paid: payment.stage === 'paid'
      };
    })
  );
  const matches = (campusId: string, haystack: string) =>
    (!campus || campusId === campus) && haystack.includes(normalize(query));
  // Summary and graph follow the search and campus filter, never the stage filter.
  const scoped = $derived(rows.filter((row) => matches(row.payment.campusId, row.haystack)));
  const visible = $derived.by(() => {
    const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, 'id');
    const order: Record<SortKey, (a: Row, b: Row) => number> = {
      updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || byName(a, b),
      stage: (a, b) => a.index - b.index || byName(a, b),
      amount: (a, b) => b.payment.amount - a.payment.amount || byName(a, b),
      name: byName
    };
    return scoped.filter((row) => !stage || row.payment.stage === stage).sort(order[sort]);
  });
  const filtered = $derived(Boolean(query.trim() || stage || campus));
  const counts = $derived(
    stages.map(([key]) => scoped.filter((row) => row.payment.stage === key).length)
  );
  const maxCount = $derived(Math.max(1, ...counts));
  const tiles = $derived.by(() => {
    const total = scoped.reduce((sum, row) => sum + row.payment.amount, 0);
    const paid = scoped.filter((row) => row.paid);
    const paidTotal = paid.reduce((sum, row) => sum + row.payment.amount, 0);
    return [
      {
        label: 'Pengajuan',
        value: String(scoped.length),
        note: `${new Set(scoped.map((row) => row.payment.campusId)).size} kampus`,
        icon: 'file',
        tone: TONES.blue
      },
      {
        label: 'Total nominal',
        value: compact(total),
        note: total >= 1e6 ? rupiah(total) : 'Seluruh pengajuan',
        icon: 'payments',
        tone: TONES.blue
      },
      {
        label: isAdmin ? 'Menunggu Admin PF' : 'Menunggu Keuangan',
        value: String(scoped.filter((row) => WAITING[row.payment.stage].actor === role).length),
        note: 'Perlu tindakan Anda',
        icon: 'clock',
        tone: TONES.amber
      },
      {
        label: 'Sudah dicairkan',
        value: String(paid.length),
        note: paid.length ? `Senilai ${compact(paidTotal)}` : 'Belum ada pencairan',
        icon: 'check',
        tone: TONES.green
      }
    ];
  });

  // Create flow (admin only). Same service call and version choice as before.
  const openVersions = $derived(
    proposals.filter((item) => !payments.some((p) => p.proposalId === item.id))
  );
  const creatable = $derived(
    campuses
      .filter((item) => openVersions.some((p) => p.campusId === item.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'))
  );
  const withoutCase = $derived(
    creatable
      .filter(
        (item) =>
          !payments.some((p) => p.campusId === item.id) &&
          matches(item.id, normalize(`${item.name} ${item.acronym || ''}`))
      )
      .map((item) => ({
        campus: item,
        version: Math.max(...openVersions.filter((p) => p.campusId === item.id).map((p) => p.version))
      }))
  );
  let creating = $state(false);
  let createCampus = $state('');
  let proposalId = $state('');
  let amount = $state(50000000);
  const available = $derived(
    openVersions.filter((p) => p.campusId === createCampus).sort((a, b) => b.version - a.version)
  );
  function openCreate(campusId = '') {
    const preferred = campusId || campus;
    createCampus = creatable.some((item) => item.id === preferred)
      ? preferred
      : creatable[0]?.id || '';
    proposalId = '';
    app.error = '';
    creating = true;
  }
  function closeCreate() {
    creating = false;
    app.error = '';
  }
  async function create() {
    const id = available.find((p) => p.id === proposalId)?.id || available[0]?.id;
    if (!id) return;
    if (
      await app.mutate(() => dataService.createPayment(id, amount), 'Pengajuan pencairan dibuat.')
    ) {
      creating = false;
      const created = app.data?.payments?.find((p) => p.proposalId === id);
      if (created)
        await goto(
          `${page.url.pathname}?campus=${encodeURIComponent(created.campusId)}&payment=${encodeURIComponent(created.id)}`
        );
    }
  }
</script>

<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
  <div class="min-w-0">
    <p class="text-xs font-semibold tracking-[0.06em] text-[#075fc7]">PROPOSAL & PEMBAYARAN</p>
    <h1 class="mt-2 text-[28px] leading-tight font-semibold tracking-[-0.01em] text-[#0d234c]">
      Pencairan program
    </h1>
    <p class="mt-2 text-sm leading-relaxed text-[#475569]">
      Pilih kartu pengajuan untuk membuka berkas, persetujuan, dan riwayatnya.
    </p>
  </div>
  {#if isAdmin && creatable.length}
    <Button icon="plus" onclick={() => openCreate()}>Buat pengajuan</Button>
  {/if}
</header>
{@render notice?.()}

<section class="mb-5 grid gap-4" aria-label="Ringkasan pencairan">
  <dl class="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4">
    {#each tiles as tile (tile.label)}
      <div class={[CARD, 'flex min-w-0 items-center gap-3 p-3 min-[700px]:p-4']}>
        <span
          class={['hidden size-10 shrink-0 place-items-center rounded-lg min-[700px]:grid', tile.tone]}
          aria-hidden="true"><Icon name={tile.icon} size={18} /></span
        >
        <div class="min-w-0">
          <dt class="text-[13px] font-medium text-[#475569]">{tile.label}</dt>
          <dd class="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span class="text-2xl font-bold tracking-[-0.01em] text-[#0d234c] tabular-nums"
              >{tile.value}</span
            >
            <span class="text-[13px] text-[#64748b]">{tile.note}</span>
          </dd>
        </div>
      </div>
    {/each}
  </dl>
  <div class={[CARD, 'p-4']}>
    <div class="flex flex-wrap items-baseline justify-between gap-x-3">
      <h2 class="text-[15px] font-semibold text-[#0d234c]">Pengajuan per tahap</h2>
      <p class="text-[13px] text-[#64748b]">Pilih tahap untuk menyaring daftar.</p>
    </div>
    <ol
      class="mt-3 grid gap-x-8 gap-y-0.5 min-[700px]:grid-flow-col min-[700px]:grid-cols-2 min-[700px]:grid-rows-4"
    >
      {#each stages as [key, label], i (key)}
        <li>
          <button
            type="button"
            aria-pressed={stage === key}
            aria-label={`${label}: ${counts[i]} pengajuan`}
            onclick={() => setStage(key)}
            class={[
              'grid min-h-8 w-full cursor-pointer grid-cols-[10.5rem_minmax(0,1fr)_1.75rem] items-center gap-3 rounded-lg px-2 text-left text-[13px] transition hover:bg-[#f5f9ff] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#55a9f2]',
              stage === key ? 'bg-[#e9f3ff] font-semibold text-[#0d234c]' : 'font-medium text-[#475569]'
            ]}
          >
            <span class="truncate">{i + 1}. {label}</span>
            <span class="h-2 rounded-r-[4px] bg-[#eef3fa]">
              <span
                class={[
                  'block h-2 rounded-r-[4px] transition-[width]',
                  counts[i] ? 'min-w-1' : '',
                  stage && stage !== key ? 'bg-[#9cc3ef]' : 'bg-[#075fc7]'
                ]}
                style={`width:${(counts[i] / maxCount) * 100}%`}
              ></span>
            </span>
            <span class="text-right font-semibold text-[#0d234c] tabular-nums">{counts[i]}</span>
          </button>
        </li>
      {/each}
    </ol>
  </div>
</section>

<section
  class={[CARD, 'mb-4 grid gap-3 p-4 min-[700px]:grid-cols-[minmax(0,1fr)_13rem_13rem]']}
  aria-label="Cari dan saring pengajuan"
>
  <label class={LABEL}
    >Cari kampus
    <span class="relative block">
      <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#64748b]"
        ><Icon name="search" size={16} /></span
      >
      <input
        type="search"
        aria-label="Cari kampus pencairan"
        placeholder="Ketik nama kampus"
        value={query}
        oninput={(e) => {
          query = e.currentTarget.value;
          commit();
        }}
        class={[FIELD, 'pl-9']}
      />
    </span>
  </label>
  <label class={LABEL}
    >Tahap
    <select
      aria-label="Filter tahap pencairan"
      value={stage}
      onchange={(e) => {
        stage = readStage(e.currentTarget.value);
        commit();
      }}
      class={FIELD}
    >
      <option value="">Semua tahap</option>
      {#each stages as [key, label] (key)}<option value={key}>{label}</option>{/each}
    </select>
  </label>
  <label class={LABEL}
    >Urutkan
    <select
      aria-label="Urutkan pengajuan"
      value={sort}
      onchange={(e) => {
        sort = readSort(e.currentTarget.value);
        commit();
      }}
      class={FIELD}
    >
      {#each SORTS as [key, label] (key)}<option value={key}>{label}</option>{/each}
    </select>
  </label>
</section>

<div class="mb-3 flex min-h-9 flex-wrap items-center gap-2">
  <p class="mr-auto text-[13px] font-medium text-[#475569]" role="status">
    {visible.length} pengajuan{filtered ? ' sesuai filter' : ''}
  </p>
  {#if campus}
    <span
      class="inline-flex max-w-full items-center gap-1 rounded-full border border-[#cfe0f5] bg-white py-0.5 pr-1 pl-3 text-[13px] font-semibold text-[#075fc7]"
    >
      <span class="truncate">{campusById.get(campus)?.name || 'Kampus'}</span>
      <button
        type="button"
        aria-label="Hapus filter kampus"
        class="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[#e9f3ff]"
        onclick={() => {
          campus = '';
          commit();
        }}><Icon name="close" size={13} /></button
      >
    </span>
  {/if}
  {#if filtered && visible.length}
    <Button variant="ghost" size="sm" icon="close" onclick={clearFilters}>Hapus filter</Button>
  {/if}
</div>

{#if visible.length}
  <ul
    class="grid gap-4 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3"
    aria-label="Daftar pengajuan pencairan"
  >
    {#each visible as row (row.payment.id)}
      <li class="flex min-w-0">
        <article
          class={[
            'relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-[0_10px_30px_#1a4d8f08] transition hover:shadow-md active:scale-[0.99] has-[a:focus-visible]:outline has-[a:focus-visible]:outline-[3px] has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[#55a9f2]',
            row.paid
              ? 'border-[#bfe6cd] hover:border-[#86cfa3]'
              : row.revision
                ? 'border-[#f1dca6] hover:border-[#e0b95a]'
                : 'border-[#dce7f7] hover:border-[#9cc3ef]'
          ]}
        >
          {#if row.paid || row.revision}
            <span
              aria-hidden="true"
              class={['absolute inset-x-0 top-0 h-1', row.paid ? 'bg-[#22a35a]' : 'bg-[#e0a526]']}
            ></span>
          {/if}
          <div class="flex items-start gap-3">
            <span
              aria-hidden="true"
              class="grid h-11 min-w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#0877d8,#1559d6)] px-2 text-xs font-bold text-white"
              >{row.initials}</span
            >
            <div class="min-w-0 flex-1">
              <h3 class="text-[15px] leading-snug font-semibold text-[#0d234c]">
                <a
                  href={row.href}
                  class="no-underline outline-none after:absolute after:inset-0 after:content-['']"
                  >{row.name}<span class="sr-only">, {row.versionLabel}</span></a
                >
              </h3>
              <p class="mt-0.5 text-[13px] text-[#64748b]">
                {row.versionLabel}
              </p>
            </div>
            {#if row.paid}
              <span
                class={['inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', TONES.green]}
                ><Icon name="check" size={12} />Selesai</span
              >
            {:else if row.revision}
              <span class={['shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold', TONES.amber]}
                >Perlu revisi</span
              >
            {/if}
          </div>
          <p class="mt-4 text-xl font-bold tracking-[-0.01em] text-[#0d234c] tabular-nums">
            {rupiah(row.payment.amount)}
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class={['rounded-md px-2 py-0.5 text-xs font-semibold', row.paid ? TONES.green : TONES.blue]}
              >Tahap {row.index + 1} dari {stages.length}</span
            >
            <span class="text-sm font-semibold text-[#17365f]">{STAGES[row.payment.stage]}</span>
          </div>
          <div
            class="mt-2.5 flex h-2.5 items-center gap-1"
            role="img"
            aria-label={`Tahap ${row.index + 1} dari ${stages.length}: ${STAGES[row.payment.stage]}`}
          >
            {#each stages as [key], i (key)}
              <span
                class={[
                  'flex-1 rounded-full',
                  row.paid || i < row.index
                    ? 'h-1.5 bg-[#22a35a]'
                    : i === row.index
                      ? row.revision
                        ? 'h-2.5 bg-[#e0a526]'
                        : 'h-2.5 bg-[#075fc7]'
                      : 'h-1.5 bg-[#e2e8f0]'
                ]}
              ></span>
            {/each}
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 border-t border-[#eaf1fb] pt-3 text-[13px]">
            <div class="min-w-0">
              <dt class="text-[#64748b]">Dokumen valid</dt>
              <dd class="mt-0.5 font-semibold text-[#17365f]">
                {row.validDocs} dari {DOCUMENT_TYPES.length}
              </dd>
            </div>
            <div class="min-w-0">
              {#if row.paid}
                <dt class="text-[#64748b]">Dicairkan</dt>
                <dd class="mt-0.5 font-semibold text-[#15803d]">
                  {row.payment.paidAt ? date(row.payment.paidAt) : 'Selesai'}
                </dd>
              {:else}
                <dt class="text-[#64748b]">Menunggu</dt>
                <dd
                  class={[
                    'mt-0.5 font-semibold',
                    WAITING[row.payment.stage].actor === role ? 'text-[#075fc7]' : 'text-[#17365f]'
                  ]}
                >
                  {WAITING[row.payment.stage].label}{WAITING[row.payment.stage].actor === role
                    ? ' (Anda)'
                    : ''}
                </dd>
              {/if}
            </div>
          </dl>
          <div class="mt-auto flex items-center justify-between gap-2 pt-3 text-[13px]">
            <span class="flex min-w-0 items-center gap-1.5 text-[#64748b]"
              ><Icon name="clock" size={14} /><span class="truncate"
                >{row.updatedAt ? `Diperbarui ${date(row.updatedAt)}` : 'Belum ada pembaruan'}</span
              ></span
            >
            <span class="flex shrink-0 items-center gap-0.5 font-semibold text-[#075fc7]"
              >Buka<Icon name="chevron" size={14} /></span
            >
          </div>
        </article>
      </li>
    {/each}
  </ul>
{:else if filtered}
  <div class={[CARD, 'pb-8']}>
    <Empty
      title="Pengajuan tidak ditemukan"
      description="Ubah kata pencarian atau pilih tahap lain."
      icon="search"
    />
    <div class="-mt-8 flex justify-center">
      <Button variant="secondary" size="sm" icon="close" onclick={clearFilters}>Hapus filter</Button>
    </div>
  </div>
{:else}
  <div class={CARD}>
    <Empty
      title="Belum ada pengajuan pencairan"
      description={isAdmin
        ? 'Buat pengajuan untuk kampus yang sudah memiliki proposal.'
        : 'Pengajuan tampil di sini setelah dibuat Admin PF.'}
      icon="payments"
    />
  </div>
{/if}

{#if isAdmin && !stage && withoutCase.length}
  <section class="mt-8" aria-labelledby="without-case-title">
    <h2 id="without-case-title" class="text-base font-semibold text-[#0d234c]">
      Belum ada pengajuan
    </h2>
    <p class="mt-1 text-[13px] text-[#64748b]">
      Kampus berikut sudah memiliki proposal. Buat pengajuan untuk memulai pencairan.
    </p>
    <ul class={[CARD, 'mt-3 divide-y divide-[#eaf1fb]']}>
      {#each withoutCase as item (item.campus.id)}
        <li class="flex flex-wrap items-center gap-3 px-4 py-3">
          <span
            aria-hidden="true"
            class="grid h-9 w-14 shrink-0 place-items-center rounded-lg bg-[#e9f3ff] text-[11px] font-bold text-[#075fc7]"
            >{item.campus.initials}</span
          >
          <div class="min-w-0 flex-1 basis-40">
            <p class="truncate text-sm font-semibold text-[#17365f]">{item.campus.name}</p>
            <p class="text-[13px] text-[#64748b]">Proposal versi {item.version} siap diajukan</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onclick={() => openCreate(item.campus.id)}>Buat pengajuan</Button
          >
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if creating}
  <Modal title="Buat pengajuan pencairan" onclose={closeCreate}>
    <p class="text-sm leading-relaxed text-[#475569]">
      Pilih kampus, versi proposal, dan nominal. Pengajuan baru dimulai dari tahap Penilaian KPI.
    </p>
    <form
      class="grid gap-4"
      onsubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <label class={LABEL}
        >Kampus
        <select
          aria-label="Kampus pengajuan baru"
          value={createCampus}
          onchange={(e) => {
            createCampus = e.currentTarget.value;
            proposalId = '';
          }}
          class={FIELD}
        >
          {#each creatable as item (item.id)}<option value={item.id}>{item.name}</option>{/each}
        </select>
      </label>
      <label class={LABEL}
        >Versi proposal
        <select aria-label="Versi untuk pencairan" bind:value={proposalId} class={FIELD}>
          <option value="">Versi terbaru tersedia</option>
          {#each available as p (p.id)}<option value={p.id}>Versi {p.version} · {p.filename}</option
            >{/each}
        </select>
      </label>
      <label class={LABEL}
        >Nominal (Rp)
        <input
          aria-label="Nominal pengajuan baru"
          type="number"
          min="1"
          max="1000000000000"
          step="1"
          required
          bind:value={amount}
          class={FIELD}
        />
        <span class="font-normal text-[#64748b]"
          >{Number.isFinite(amount) && amount > 0 ? rupiah(amount) : 'Isi nominal dalam rupiah.'}</span
        >
      </label>
      <div class="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onclick={closeCreate}>Batal</Button>
        <Button type="submit" loading={app.busy} disabled={app.loading || !available.length}
          >Buat pengajuan</Button
        >
      </div>
    </form>
  </Modal>
{/if}
