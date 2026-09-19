<script lang="ts">
  import { app } from '$lib/state.svelte';
  import CampusIndicators from '$lib/components/campus/indicators/CampusIndicators.svelte';
</script>

<svelte:head><title>Indikator · Desa Energi Berdikari</title></svelte:head>
{#key app.data?.period?.id}<CampusIndicators />{/key}
