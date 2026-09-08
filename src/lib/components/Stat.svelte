<script lang="ts">
  import Icon from './Icon.svelte';
  let { label, value, note, icon, tone = 'green' }: { label: string; value: string; note: string; icon: string; tone?: string } = $props();
</script>
<article class="stat-card"><div class="stat-top"><span>{label}</span><span class={`stat-icon ${tone}`}><Icon name={icon}/></span></div><strong class="stat-value">{value}</strong><p>{note}</p></article>
