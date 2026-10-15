<script lang="ts">
  import { app } from '$lib/state.svelte';
  import Pelaporan from '$lib/components/shared/pelaporan/Pelaporan.svelte';
</script>
<svelte:head><title>Pelaporan · Desa Energi Berdikari</title></svelte:head>
{#if app.session?.campusId}{#key app.session.campusId}<Pelaporan campusId={app.session.campusId} />{/key}{:else}<p>Akun belum terhubung ke kampus. Hubungi admin program.</p>{/if}
