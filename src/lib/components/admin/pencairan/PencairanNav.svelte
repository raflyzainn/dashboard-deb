<script lang="ts">
  /** The three entries of menu Pencairan: the dashboard overview, the Tahap 1 checklist per campus, Tahap 2 for the remainder. */
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { live, onChange } from '$lib/realtime.svelte';
  let { active }: { active: 'dashboard' | 'tahap-1' | 'tahap-2' | 'periksa' } = $props();
  /** How many items wait for an admin, kept fresh by the live feed. */
  let waiting = $state<number | null>(null);
  async function count() { try { waiting = (await dataService.api.get<{ rows: unknown[] }>('/api/pencairan/periksa')).rows.length; } catch { waiting = null; } }
  $effect(() => { untrack(() => { void count(); }); });
  $effect(() => onChange(() => void count(), { delay: 1500 }));
  const tabs = [
    { key: 'dashboard', href: '/admin/pencairan', label: 'Dashboard', hint: 'Semua kampus' },
    { key: 'tahap-1', href: '/admin/pencairan/tahap-1', label: 'Tahap 1', hint: 'Paling banyak 70%' },
    { key: 'periksa', href: '/admin/pencairan/periksa', label: 'Periksa', hint: 'Antrean admin' }
  ] as const;
</script>

<nav class="flex min-w-0 max-w-full gap-2 overflow-x-auto py-1" aria-label="Bagian pencairan">
  {#each tabs as tab}
    {@const here = tab.key === active}
    <a href={tab.href} aria-current={here ? 'page' : undefined}
      class="flex shrink-0 items-baseline gap-2 rounded-xl border px-3.5 py-2 text-sm transition active:scale-[0.98] {here ? 'border-[#0066B2] bg-[#0066B2] text-white shadow-[0_6px_16px_#0066b233]' : 'border-slate-200/70 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'}">
      <span class="font-semibold">{tab.label}</span>
      <span class="text-xs {here ? 'text-blue-100' : 'text-slate-500'}">{tab.hint}</span>
      {#if tab.key === 'periksa' && waiting}<span class="rounded-full px-1.5 text-[11px] font-bold {here ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}">{waiting}</span>{/if}
    </a>
  {/each}
  <span class="ml-auto flex shrink-0 items-center gap-2 self-center pl-2 text-xs text-slate-600" role="status" title={live.connected ? 'Pembaruan langsung aktif: layar diperbarui saat ada perubahan.' : 'Pembaruan langsung belum aktif. Muat ulang halaman untuk data terbaru.'}>
    {#if live.flash}<span class="hidden truncate sm:inline">{live.flash}</span>{/if}
    <span class="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold {live.connected ? 'text-green-800' : 'text-slate-500'}"><span class="h-2 w-2 rounded-full {live.connected ? 'bg-green-600' : 'bg-slate-300'}"></span>{live.connected ? 'Langsung' : 'Tidak langsung'}</span>
  </span>
</nav>
