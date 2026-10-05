<script lang="ts">
  // Small outlined link that opens another site in a new tab.
  import type { Snippet } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  let {
    href,
    icon = 'external',
    label = '',
    children
  }: { href: string; icon?: string; label?: string; children: Snippet } = $props();
</script>

<a
  {href}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={label || undefined}
  class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#cfe0f5] bg-white px-3 text-[13px] font-semibold whitespace-nowrap text-[#075fc7] no-underline transition hover:border-[#9cc3ef] hover:bg-[#f5f9ff] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#55a9f2] active:scale-[0.98]"
>
  <Icon name={icon} size={15} />{@render children()}
</a>
