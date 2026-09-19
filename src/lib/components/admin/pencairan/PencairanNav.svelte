<script lang="ts">
  /** The three entries of menu Pencairan: the dashboard overview, the Tahap 1 checklist per campus, Tahap 2 for the remainder. */
  let { active }: { active: 'dashboard' | 'tahap-1' | 'tahap-2' } = $props();
  const tabs = [
    { key: 'dashboard', href: '/admin/pencairan', label: 'Dashboard', hint: 'Semua kampus' },
    { key: 'tahap-1', href: '/admin/pencairan/tahap-1', label: 'Tahap 1', hint: 'Paling banyak 70%' },
    { key: 'tahap-2', href: '/admin/pencairan/tahap-2', label: 'Tahap 2', hint: 'Sisanya' }
  ] as const;
</script>

<nav class="flex min-w-0 max-w-full gap-2 overflow-x-auto py-1" aria-label="Bagian pencairan">
  {#each tabs as tab}
    {@const here = tab.key === active}
    <a href={tab.href} aria-current={here ? 'page' : undefined}
      class="flex shrink-0 items-baseline gap-2 rounded-xl border px-3.5 py-2 text-sm transition active:scale-[0.98] {here ? 'border-[#0066B2] bg-[#0066B2] text-white shadow-[0_6px_16px_#0066b233]' : 'border-slate-200/70 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'}">
      <span class="font-semibold">{tab.label}</span>
      <span class="text-xs {here ? 'text-blue-100' : 'text-slate-500'}">{tab.hint}</span>
    </a>
  {/each}
</nav>
