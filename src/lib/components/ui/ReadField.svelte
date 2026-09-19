<script lang="ts">
  // Read only label and value pair used inside EditableSection views.
  import type { Snippet } from 'svelte';
  let {
    label,
    value = '',
    empty = 'Belum diisi',
    multiline = false,
    children
  }: {
    label: string;
    value?: string | number | null;
    empty?: string;
    /** Keep line breaks of longer text. */
    multiline?: boolean;
    /** Custom value rendering (links, badges, lists). */
    children?: Snippet;
  } = $props();
  const text = $derived(value === null || value === undefined ? '' : String(value).trim());
</script>

<div class="min-w-0">
  <dt class="m-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">{label}</dt>
  <dd class="m-0 mt-1 text-sm leading-[1.6] text-[#17365f] [overflow-wrap:anywhere]">
    {#if children}{@render children()}
    {:else if text}<span class={multiline ? 'whitespace-pre-line' : ''}>{text}</span>
    {:else}<span class="text-[#94a3b8]">{empty}</span>{/if}
  </dd>
</div>
