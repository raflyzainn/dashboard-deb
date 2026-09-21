<script lang="ts">
  import { page } from '$app/state';
  import Campuses from '$lib/components/admin/campuses/Campuses.svelte';
</script>

<svelte:head><title>Kampus mitra · Desa Energi Berdikari</title></svelte:head>
{#key page.params.id}
  <Campuses id={page.params.id} />
{/key}
