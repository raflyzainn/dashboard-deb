<script lang="ts">
  import type { ItemState } from '$lib/pencairan';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { state }: { state: ItemState } = $props();
  const appearance: Record<ItemState, { symbol: string; color: string }> = {
    sesuai: { symbol: '✓', color: 'bg-green-700 text-white' },
    perlu_revisi: { symbol: '×', color: 'bg-amber-400 text-slate-950' },
    perlu_konfirmasi: { symbol: '?', color: 'bg-[#0066B2] text-white' },
    menunggu_review: { symbol: '', color: 'bg-sky-200 text-slate-950' },
    tidak_perlu: { symbol: '—', color: 'bg-green-200 text-slate-950' },
    belum_ada: { symbol: '○', color: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-400' }
  };
</script>

<span aria-hidden="true" class="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-lg font-bold leading-none {appearance[state].color}">
  {#if state === 'menunggu_review'}<Icon name="clock" size={17} />{:else}{appearance[state].symbol}{/if}
</span>
