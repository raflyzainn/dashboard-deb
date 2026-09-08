<script lang="ts">
  import type { Snippet } from 'svelte';
  let { tone = 'neutral', children }: { tone?: 'green' | 'amber' | 'neutral' | 'blue'; children: Snippet } = $props();
</script>
<span class={`badge ${tone}`}><span class="badge-dot"></span>{@render children()}</span>
