<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { formatSen } from '$lib/pencairan';

  interface Entry { id: string; actorName: string; action: string; before: unknown; after: unknown; note: string; created: string }
  let { context, title = 'Riwayat perubahan', refresh = 0, open: openAtStart = false }: { context: string; title?: string; refresh?: number; open?: boolean } = $props();

  let open = $state(untrack(() => openAtStart));
  let items = $state<Entry[]>([]);
  let total = $state(0);
  let page = $state(1);
  let loading = $state(false);
  let error = $state('');
  let loadedFor = $state('');

  const time = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  async function load(reset = false) {
    if (loading) return;
    loading = true; error = '';
    try {
      const next = reset ? 1 : page;
      const result = await dataService.api.get<{ items: Entry[]; total: number }>(`/api/audit?context=${encodeURIComponent(context)}&page=${next}`);
      items = reset ? result.items : [...items, ...result.items];
      total = result.total; page = next + 1; loadedFor = context + ':' + refresh;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Riwayat belum dapat dimuat.';
    } finally { loading = false; }
  }
  $effect(() => {
    const key = context + ':' + refresh;
    if (open && loadedFor !== key) untrack(() => { void load(true); });
  });

  const label = (value: unknown, key = ''): string => {
    if (value === null || value === undefined || value === '') return 'kosong';
    if (typeof value === 'number' && /Sen$/.test(key)) return formatSen(value);
    if (typeof value === 'boolean') return value ? 'ya' : 'tidak';
    if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${label(v)}`).join(', ');
    return String(value);
  };
  function changes(entry: Entry): string[] {
    const before = entry.before as Record<string, unknown> | null;
    const after = entry.after as Record<string, unknown> | null;
    if (before && after && typeof before === 'object' && typeof after === 'object') {
      const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
      return keys.filter(k => label(before[k], k) !== label(after[k], k)).map(k => `${k}: ${label(before[k], k)} menjadi ${label(after[k], k)}`);
    }
    if (after && typeof after === 'object') return Object.entries(after).map(([k, v]) => `${k}: ${label(v, k)}`);
    if (after !== null && after !== undefined) return [label(after)];
    return [];
  }
</script>

<details class="mt-8 rounded-xl border border-slate-200/70 bg-white/80" bind:open>
  <summary class="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
    <Icon name="clock" size={16} />
    <span>{title}</span>
    {#if total}<span class="text-xs font-medium text-slate-500">{total} perubahan</span>{/if}
    <span class="ml-auto text-slate-400"><Icon name={open ? 'up' : 'down'} size={14} /></span>
  </summary>
  <div class="border-t border-slate-100 px-4 py-3">
    {#if error}
      <p class="text-sm text-red-700">{error}</p>
    {:else if !items.length && !loading}
      <p class="text-sm text-slate-500">Belum ada perubahan yang tercatat di halaman ini.</p>
    {/if}
    <ol class="grid gap-3">
      {#each items as entry (entry.id)}
        <li class="grid gap-0.5 text-sm sm:grid-cols-[150px_1fr] sm:gap-3">
          <time class="text-xs text-slate-500" datetime={entry.created}>{time.format(new Date(entry.created))}</time>
          <div>
            <span class="font-semibold text-slate-800">{entry.actorName}</span>
            <span class="text-slate-700"> {entry.action}</span>
            {#each changes(entry) as change}<span class="block text-xs text-slate-500">{change}</span>{/each}
            {#if entry.note}<span class="block text-xs text-slate-500">{entry.note}</span>{/if}
          </div>
        </li>
      {/each}
    </ol>
    {#if loading}<p class="mt-2 text-xs text-slate-500">Memuat riwayat…</p>{/if}
    {#if !loading && items.length < total}
      <button type="button" class="mt-3 text-sm font-semibold text-[#0066B2] hover:underline" onclick={() => load()}>Lihat lebih banyak</button>
    {/if}
  </div>
</details>
