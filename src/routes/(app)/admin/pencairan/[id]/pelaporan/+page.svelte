<script lang="ts">
  import { page } from '$app/state';
  import Pelaporan from '$lib/components/shared/pelaporan/Pelaporan.svelte';
</script>
<svelte:head><title>Review Pelaporan · Desa Energi Berdikari</title></svelte:head>
{#key page.params.id}<Pelaporan campusId={page.params.id!} mode="admin" />{/key}
