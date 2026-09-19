<script lang="ts">
  import { page } from '$app/state';
  import Lpj from '$lib/components/admin/pencairan/Lpj.svelte';
</script>

<svelte:head><title>LPJ Termin 1 · Dashboard DEB</title></svelte:head>
{#key page.params.id}<Lpj campusId={page.params.id} />{/key}
