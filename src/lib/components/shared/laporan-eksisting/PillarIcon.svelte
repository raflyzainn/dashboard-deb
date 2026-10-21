<script lang="ts">
  import type { PillarKey } from '$lib/laporan-eksisting';
  let { pillar, size = 18 }: { pillar: PillarKey | 'foto' | 'video'; size?: number } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if pillar === 'energi'}<path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  {:else if pillar === 'ekonomi'}<ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  {:else if pillar === 'sosial'}<circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5.5" />
  {:else if pillar === 'kelembagaan'}<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
  {:else if pillar === 'foto'}<path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
  {:else}<rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" />{/if}
</svg>
