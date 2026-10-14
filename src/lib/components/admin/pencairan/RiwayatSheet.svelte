<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';

  /** A right side sheet with the change history of one context, opened from the "Riwayat" chip. Esc, the backdrop and the close button close it. */
  let { context, title = 'Riwayat perubahan', onclose }: { context: string; title?: string; onclose: () => void } = $props();

  let closeButton = $state<HTMLButtonElement | null>(null);
  onMount(() => { closeButton?.focus(); });
  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); onclose(); }
  }
</script>

<svelte:window {onkeydown} />

<button type="button" class="fixed inset-0 z-40 cursor-default bg-[#0a245a66] backdrop-blur-[2px]" aria-label="Tutup riwayat" onclick={onclose}></button>
<div class="fixed inset-y-0 right-0 z-50 flex w-[min(520px,100vw)] flex-col bg-white shadow-[-12px_0_40px_#0a2c6440]" role="dialog" aria-modal="true" aria-label={title}>
  <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
    <h2 class="flex items-center gap-2 text-base font-bold text-slate-900"><Icon name="clock" size={16} />{title}</h2>
    <button bind:this={closeButton} type="button" class="flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#55a9f2]" aria-label="Tutup" onclick={onclose}><Icon name="close" size={18} /></button>
  </header>
  <div class="min-h-0 flex-1 overflow-auto px-4 pb-6 [&>details]:mt-3">
    <RiwayatPerubahan {context} title="Perubahan tercatat" open />
  </div>
</div>
