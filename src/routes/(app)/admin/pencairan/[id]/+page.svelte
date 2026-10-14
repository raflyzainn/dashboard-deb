<script lang="ts">
  import { page } from '$app/state';
  import Layar from '$lib/components/admin/pencairan/Layar.svelte';
</script>

<svelte:head><title>Pencairan · Desa Energi Berdikari</title></svelte:head>
<a class="mb-4 inline-flex rounded-lg border border-blue-200 bg-white px-4 py-2 font-semibold text-blue-700" href={`/admin/pencairan/${page.params.id}/pelaporan`}>Buka Pelaporan dan LPJ</a>
{#key page.params.id}<Layar campusId={page.params.id!} />{/key}
