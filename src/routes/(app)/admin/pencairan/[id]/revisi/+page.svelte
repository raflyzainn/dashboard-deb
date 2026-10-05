<script lang="ts">
  import { page } from '$app/state';
  import Revisi from '$lib/components/admin/pencairan/Revisi.svelte';
</script>

<svelte:head><title>Ringkasan revisi · Desa Energi Berdikari</title></svelte:head>
{#key page.params.id}<Revisi campusId={page.params.id!} />{/key}
