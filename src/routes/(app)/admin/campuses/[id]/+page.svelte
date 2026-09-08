<script lang="ts">
  import { page } from '$app/state';
  import Campuses from '../../../_components/Campuses.svelte';
</script>

<svelte:head><title>Kampus mitra · Digitalisasi DEB</title></svelte:head>
{#key page.params.id}
  <Campuses id={page.params.id} />
{/key}
