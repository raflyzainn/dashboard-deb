<script lang="ts">
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';
  // Admin directory of campus proposals. Search, filter and sort live in the URL (q, status, sort)
  // so the browser Back button returns here with the same view.
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { app } from '$lib/state.svelte';
  import { date, size } from '$lib/domain';
  import type { Campus, ProposalVersion } from '$lib/types';
  import Button from '$lib/components/ui/Button.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  type Status = 'waiting' | 'responded' | 'missing';
  type Filter = 'all' | Status;
  type Sort = 'recent' | 'name' | 'versions';
  interface Row {
    campus: Campus;
    place: string;
    versions: ProposalVersion[];
    latest?: ProposalVersion;
    status: Status;
    comments: number | null;
  }

  const STATUSES: Status[] = ['waiting', 'responded', 'missing'];
  const STATUS: Record<Status, { label: string; pill: string; mark: string }> = {
    waiting: { label: 'Menunggu tanggapan', pill: 'bg-[#fff4d6] text-[#8a5a00]', mark: 'bg-[#e0a100]' },
    responded: { label: 'Sudah ditanggapi', pill: 'bg-[#dcfce7] text-[#15803d]', mark: 'bg-[#15803d]' },
    missing: { label: 'Belum mengunggah', pill: 'bg-[#f1f5f9] text-[#475569]', mark: 'bg-[#94a3b8]' }
  };
  const SORTS: { value: Sort; label: string }[] = [
    { value: 'recent', label: 'Terbaru diunggah' },
    { value: 'name', label: 'Nama kampus' },
    { value: 'versions', label: 'Jumlah versi' }
  ];
  const MAX_DOTS = 8;

  const isResponded = (p: ProposalVersion) => Boolean(p.reviewNote?.trim());
  const asFilter = (value: string | null): Filter =>
    STATUSES.includes(value as Status) ? (value as Status) : 'all';
  const asSort = (value: string | null): Sort =>
    SORTS.some((s) => s.value === value) ? (value as Sort) : 'recent';
  const fromUrl = () => {
    const params = page.url.searchParams;
    return { q: params.get('q') || '', status: asFilter(params.get('status')), sort: asSort(params.get('sort')) };
  };
  const stamp = (view: { q: string; status: Filter; sort: Sort }) =>
    JSON.stringify([view.q, view.status, view.sort]);

  const initial = fromUrl();
  let q = $state(initial.q);
  let status = $state<Filter>(initial.status);
  let sort = $state<Sort>(initial.sort);
  // The view this component last wrote to (or read from) the URL.
  let synced = stamp(initial);
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Adopt the URL only when it changed from outside (sidebar link, back or forward).
  $effect(() => {
    const next = fromUrl();
    if (stamp(next) === synced) return;
    synced = stamp(next);
    q = next.q;
    status = next.status;
    sort = next.sort;
  });
  $effect(() => () => clearTimeout(timer));

  function writeUrl() {
    clearTimeout(timer);
    const view = { q, status, sort };
    if (stamp(view) === synced) return;
    synced = stamp(view);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status !== 'all') params.set('status', status);
    if (sort !== 'recent') params.set('sort', sort);
    const query = params.toString();
    void goto(page.url.pathname + (query ? `?${query}` : ''), {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }
  function typed() {
    clearTimeout(timer);
    timer = setTimeout(writeUrl, 200);
  }
  function setStatus(next: Filter) {
    status = next;
    writeUrl();
  }
  function clearFilters() {
    q = '';
    status = 'all';
    writeUrl();
  }

  const rows = $derived.by<Row[]>(() => {
    const data = app.data;
    if (!data) return [];
    const versionsOf = new Map<string, ProposalVersion[]>();
    for (const p of data.proposals) {
      const list = versionsOf.get(p.campusId);
      if (list) list.push(p);
      else versionsOf.set(p.campusId, [p]);
    }
    const commentsOf = new Map<string, number>();
    for (const c of data.proposalComments || [])
      commentsOf.set(c.campusId, (commentsOf.get(c.campusId) || 0) + 1);
    return data.campuses.map((campus) => {
      const versions = [...(versionsOf.get(campus.id) || [])].sort((a, b) => a.version - b.version);
      const latest = versions.at(-1);
      return {
        campus,
        place: campus.city ? `${campus.city}, ${campus.region}` : campus.region,
        versions,
        latest,
        status: !latest ? 'missing' : isResponded(latest) ? 'responded' : 'waiting',
        comments: data.proposalComments ? commentsOf.get(campus.id) || 0 : null
      };
    });
  });

  const tally = (list: Row[]) => {
    const count = { all: list.length, waiting: 0, responded: 0, missing: 0 };
    for (const row of list) count[row.status]++;
    return count;
  };
  const totals = $derived(tally(rows));
  const segments = $derived(
    STATUSES.map((key) => ({
      key,
      ...STATUS[key],
      count: totals[key],
      share: totals.all ? Math.round((totals[key] / totals.all) * 100) : 0
    }))
  );
  const tiles = $derived([
    { label: 'Total kampus', value: totals.all, icon: 'campus', tone: 'bg-[#e9f3ff] text-[#075fc7]' },
    {
      label: 'Sudah mengunggah',
      value: totals.waiting + totals.responded,
      icon: 'upload',
      tone: 'bg-[#e9f3ff] text-[#075fc7]'
    },
    { label: STATUS.waiting.label, value: totals.waiting, icon: 'clock', tone: STATUS.waiting.pill },
    { label: STATUS.responded.label, value: totals.responded, icon: 'check', tone: STATUS.responded.pill },
    { label: STATUS.missing.label, value: totals.missing, icon: 'file', tone: STATUS.missing.pill }
  ]);

  const needle = $derived(q.trim().toLowerCase());
  const matched = $derived(
    needle
      ? rows.filter((row) =>
          [row.campus.name, row.campus.acronym, row.place].some((text) =>
            text?.toLowerCase().includes(needle)
          )
        )
      : rows
  );
  const counts = $derived(tally(matched));
  const chips = $derived<{ value: Filter; label: string; count: number }[]>([
    { value: 'all', label: 'Semua', count: counts.all },
    ...STATUSES.map((key) => ({ value: key, label: STATUS[key].label, count: counts[key] }))
  ]);

  const byName = (a: Row, b: Row) => a.campus.name.localeCompare(b.campus.name, 'id');
  const visible = $derived(
    matched
      .filter((row) => status === 'all' || row.status === status)
      .sort((a, b) => {
        // Campuses without a proposal always come last.
        if (!a.latest || !b.latest) return a.latest ? -1 : b.latest ? 1 : byName(a, b);
        if (sort === 'name') return byName(a, b);
        if (sort === 'versions' && a.versions.length !== b.versions.length)
          return b.versions.length - a.versions.length;
        return Date.parse(b.latest.createdAt) - Date.parse(a.latest.createdAt) || byName(a, b);
      })
  );

  const avatar = (campus: Campus) =>
    campus.initials.length <= 5
      ? campus.initials
      : campus.name
          .split(/\s+/)
          .map((word) => word[0])
          .join('')
          .slice(0, 3)
          .toUpperCase();
  const dotClass = (row: Row, p: ProposalVersion) =>
    [
      'rounded-full',
      p.id === row.latest?.id ? 'size-3.5 ring-2 ring-offset-2 ring-offset-white' : 'size-2.5',
      isResponded(p)
        ? 'bg-[#15803d] ring-[#15803d]/30'
        : p.id === row.latest?.id
          ? 'bg-[#e0a100] ring-[#e0a100]/35'
          : 'bg-[#9cc3ef]'
    ].join(' ');
  const historyLabel = (row: Row) =>
    `${row.versions.length} versi, ${row.versions.filter(isResponded).length} sudah ditanggapi`;
</script>

<section
  aria-label="Ringkasan proposal"
  class="mb-5 rounded-xl border border-[#dce7f7] bg-white p-4 shadow-[0_10px_30px_#1a4d8f08] min-[700px]:p-5"
>
  <ul
    class="m-0 grid list-none grid-cols-2 gap-3 p-0 min-[700px]:grid-cols-3 min-[1100px]:grid-cols-5"
  >
    {#each tiles as tile, index (tile.label)}
      <li
        class={[
          'flex items-center gap-3 rounded-lg border border-[#eaf1fb] bg-[#f5f9ff] p-3',
          index === 0 ? 'col-span-2 min-[700px]:col-span-1' : ''
        ]}
      >
        <span
          class={[
            'hidden size-9 shrink-0 place-items-center rounded-lg min-[700px]:grid',
            tile.tone
          ]}
        >
          <Icon name={tile.icon} size={18} />
        </span>
        <span class="flex min-w-0 flex-col">
          <span class="text-[12px] leading-snug font-medium text-[#475569]">{tile.label}</span>
          <strong class="text-[22px] leading-tight font-bold text-[#0d234c]">{tile.value}</strong>
        </span>
      </li>
    {/each}
  </ul>

  <div class="mt-5">
    <h2 class="m-0 text-[13px] font-semibold text-[#17365f]">Sebaran status proposal</h2>
    <div
      role="img"
      aria-label={segments.map((s) => `${s.label} ${s.count} kampus`).join(', ')}
      class="mt-2.5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-[#eaf1fb]"
    >
      {#each segments as segment (segment.key)}
        {#if segment.count}
          <span
            class={['min-w-1.5 rounded-[2px]', segment.mark]}
            style:flex={`${segment.count} 1 0%`}
            title={`${segment.label}: ${segment.count} kampus (${segment.share}%)`}
          ></span>
        {/if}
      {/each}
    </div>
    <ul class="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0">
      {#each segments as segment (segment.key)}
        <li class="flex items-center gap-2 text-[13px] text-[#475569]">
          <span class={['size-2.5 shrink-0 rounded-full', segment.mark]}></span>
          {segment.label}
          <strong class="font-semibold text-[#0d234c]">{segment.count}</strong>
          <span class="text-[12px] text-[#64748b]">{segment.share}%</span>
        </li>
      {/each}
    </ul>
  </div>
</section>

<section aria-label="Daftar proposal kampus">
  <div class="mb-4 flex flex-col gap-3">
    <div class="flex flex-col gap-3 min-[700px]:flex-row min-[700px]:items-center">
      <label
        class="flex min-h-[42px] flex-1 items-center gap-2 rounded-lg border border-[#dce7f7] bg-white px-3 text-[#64748b] focus-within:border-[#2790e8] focus-within:outline focus-within:outline-2 focus-within:outline-[#7fc1ff]"
      >
        <Icon name="search" size={17} />
        <span class="sr-only">Cari kampus</span>
        <input
          type="search"
          bind:value={q}
          oninput={typed}
          placeholder="Cari nama kampus"
          class="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-[#17365f] placeholder:text-[#64748b] focus:ring-0 focus:outline-none"
        />
      </label>
      <label class="flex items-center gap-2 text-[13px] font-medium text-[#475569]">
        Urutkan
        <select
          bind:value={sort}
          onchange={writeUrl}
          class="min-h-[42px] min-w-0 flex-1 rounded-lg border border-[#dce7f7] bg-white py-0 pr-9 pl-3 text-sm text-[#17365f] focus:border-[#2790e8] focus:ring-0 focus:outline focus:outline-2 focus:outline-[#7fc1ff] min-[700px]:flex-none"
        >
          {#each SORTS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
    </div>

    <div role="group" aria-label="Filter status proposal" class="flex flex-wrap gap-2">
      {#each chips as chip (chip.value)}
        <button
          type="button"
          aria-pressed={status === chip.value}
          onclick={() => setStatus(chip.value)}
          class={[
            'inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition active:scale-[0.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#55a9f2]',
            status === chip.value
              ? 'border-[#075fc7] bg-[#075fc7] text-white'
              : 'border-[#dce7f7] bg-white text-[#17365f] hover:border-[#9cc3ef] hover:bg-[#f5f9ff]'
          ]}
        >
          {chip.label}
          <span
            class={[
              'rounded-full px-1.5 text-[12px] leading-5 font-semibold',
              status === chip.value ? 'bg-white/20 text-white' : 'bg-[#e9f3ff] text-[#075fc7]'
            ]}>{chip.count}</span
          >
        </button>
      {/each}
    </div>

    <p class="m-0 text-[13px] text-[#64748b]" aria-live="polite">
      {visible.length} dari {totals.all} kampus ditampilkan.{visible.length
        ? ' Pilih kartu untuk membuka proposal.'
        : ''}
    </p>
  </div>

  {#if visible.length}
    <ul class="m-0 grid list-none grid-cols-1 gap-4 p-0 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
      {#each visible as row (row.campus.id)}
        <li class="min-w-0">
          <a
            href={`?campus=${encodeURIComponent(row.campus.id)}`}
            data-campus={row.campus.id}
            class="group flex h-full flex-col rounded-xl border border-[#dce7f7] bg-white p-4 text-inherit no-underline shadow-[0_10px_30px_#1a4d8f08] transition hover:border-[#9cc3ef] hover:shadow-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#55a9f2] active:scale-[0.99]"
          >
            <div class="flex items-start gap-3 min-[700px]:min-h-[62px]">
              <CampusLogo code={row.campus.code || row.campus.acronym} initials={avatar(row.campus)} size={44} rounded="rounded-xl" />
              <div class="min-w-0 flex-1">
                <h3 class="m-0 line-clamp-2 text-[15px] leading-snug font-semibold text-[#0d234c]">
                  {row.campus.name}
                </h3>
                <p class="m-0 mt-0.5 truncate text-[13px] text-[#64748b]">{row.place}</p>
              </div>
            </div>

            <span
              class={[
                'mt-3 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[12px] leading-4 font-semibold',
                STATUS[row.status].pill
              ]}
            >
              <span class="size-1.5 rounded-full bg-current"></span>{STATUS[row.status].label}
            </span>

            {#if row.latest}
              <div class="mt-3 flex-1">
                <div class="rounded-lg bg-[#f5f9ff] p-3">
                  <div class="flex items-center justify-between gap-2">
                    <strong class="flex items-center gap-1.5 text-sm font-semibold text-[#0d234c]">
                      <Icon name="file" size={16} />Versi {row.latest.version}
                    </strong>
                    <span class="text-[12px] font-medium text-[#64748b]">Versi terbaru</span>
                  </div>
                  <p class="m-0 mt-1 text-[13px] text-[#475569]">
                    Diunggah {date(row.latest.createdAt)} · {size(row.latest.size)}
                  </p>
                </div>

                <p
                  class={[
                    'm-0 mt-3 flex items-center gap-1.5 text-[13px] font-medium',
                    row.status === 'responded' ? 'text-[#15803d]' : 'text-[#8a5a00]'
                  ]}
                >
                  <Icon name={row.status === 'responded' ? 'check' : 'clock'} size={15} />
                  {row.status === 'responded'
                    ? `Ditanggapi admin${row.latest.reviewedAt ? ' ' + date(row.latest.reviewedAt) : ''}`
                    : 'Versi terbaru belum ditanggapi'}
                </p>

                <div class="mt-3 flex items-center justify-between gap-3">
                  <span class="text-[12px] font-medium text-[#64748b]">Riwayat versi</span>
                  <span role="img" aria-label={historyLabel(row)} class="flex items-center gap-1.5 pr-1">
                    {#if row.versions.length > MAX_DOTS}
                      <span class="text-[12px] font-medium text-[#64748b]"
                        >+{row.versions.length - MAX_DOTS}</span
                      >
                    {/if}
                    {#each row.versions.slice(-MAX_DOTS) as version, index (version.id)}
                      {#if index > 0}<span class="h-px w-2.5 bg-[#c9dcf3]"></span>{/if}
                      <span
                        class={dotClass(row, version)}
                        title={`Versi ${version.version}, ${date(version.createdAt)}`}
                      ></span>
                    {/each}
                  </span>
                </div>
              </div>

              <div
                class="mt-3 flex items-center justify-between gap-3 border-t border-[#eaf1fb] pt-3 text-[13px]"
              >
                <span class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[#475569]">
                  <span class="inline-flex items-center gap-1"
                    ><Icon name="proposal" size={14} />{row.versions.length} versi</span
                  >
                  {#if row.comments !== null}
                    <span class="inline-flex items-center gap-1"
                      ><Icon name="questions" size={14} />{row.comments} komentar</span
                    >
                  {/if}
                </span>
                <span class="inline-flex shrink-0 items-center gap-1 font-semibold text-[#075fc7]">
                  Buka<span class="transition group-hover:translate-x-0.5"
                    ><Icon name="arrow" size={14} /></span
                  >
                </span>
              </div>
            {:else}
              <div
                class="mt-3 grid flex-1 place-items-center rounded-lg border border-dashed border-[#dce7f7] bg-[#f5f9ff] px-3 py-5 text-center"
              >
                <div>
                  <span class="mx-auto grid size-9 place-items-center rounded-lg bg-white text-[#64748b]">
                    <Icon name="proposal" size={18} />
                  </span>
                  <p class="m-0 mt-2 text-sm font-semibold text-[#475569]">Belum mengunggah proposal</p>
                  <p class="m-0 mt-0.5 text-[13px] text-[#64748b]">
                    Proposal tampil di sini setelah kampus mengunggahnya.
                  </p>
                </div>
              </div>
              <div
                class="mt-3 flex items-center justify-end border-t border-[#eaf1fb] pt-3 text-[13px] font-semibold text-[#075fc7]"
              >
                <span class="inline-flex items-center gap-1">
                  Buka<span class="transition group-hover:translate-x-0.5"
                    ><Icon name="arrow" size={14} /></span
                  >
                </span>
              </div>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="rounded-xl border border-[#dce7f7] bg-white pb-8 shadow-[0_10px_30px_#1a4d8f08]">
      <Empty
        title="Tidak ada kampus yang cocok"
        description="Ubah kata pencarian atau hapus filter untuk melihat semua kampus."
      />
      <div class="-mt-7 flex justify-center">
        <Button variant="secondary" icon="reset" onclick={clearFilters}>Hapus filter</Button>
      </div>
    </div>
  {/if}
</section>
