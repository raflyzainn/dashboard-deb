<script lang="ts">
  import { page } from '$app/state';
  import Rab from '$lib/components/admin/pencairan/Rab.svelte';
</script>

<svelte:head><title>RAB 70% (Tahap 1) · Dashboard DEB</title></svelte:head>
{#key page.params.id}<Rab campusId={page.params.id} />{/key}
