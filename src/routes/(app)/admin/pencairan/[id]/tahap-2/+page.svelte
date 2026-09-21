<script lang="ts">
  import { page } from '$app/state';
  import Tahap2Kartu from '$lib/components/admin/pencairan/Tahap2Kartu.svelte';
</script>

<svelte:head><title>Pencairan Tahap 2 · Desa Energi Berdikari</title></svelte:head>
{#key page.params.id}<Tahap2Kartu campusId={page.params.id} />{/key}
