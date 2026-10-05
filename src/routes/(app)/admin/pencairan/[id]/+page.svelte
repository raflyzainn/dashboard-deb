<script lang="ts">
  import { page } from '$app/state';
  import Layar from '$lib/components/admin/pencairan/Layar.svelte';
</script>

<svelte:head><title>Pencairan · Desa Energi Berdikari</title></svelte:head>
{#key page.params.id}<Layar campusId={page.params.id!} />{/key}
