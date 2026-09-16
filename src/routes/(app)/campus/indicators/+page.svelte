<script lang="ts">
  import { app } from '$lib/state.svelte';
  import CampusIndicators from '../../_components/CampusIndicators.svelte';
</script>

<svelte:head><title>Indikator · Digitalisasi DEB</title></svelte:head>
{#key app.data?.period?.id}<CampusIndicators />{/key}
