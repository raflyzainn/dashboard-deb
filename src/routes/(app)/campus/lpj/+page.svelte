<script lang="ts">
  import { app } from '$lib/state.svelte';
  import Lpj from '$lib/components/admin/pencairan/Lpj.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
</script>

<svelte:head><title>LPJ · Desa Energi Berdikari</title></svelte:head>
{#if app.session?.campusId}
  <Lpj campusId={app.session.campusId} mode="campus" />
{:else}
  <Empty title="Akun ini belum terhubung ke kampus" description="Hubungi admin program agar akun Anda dihubungkan ke kampus." />
{/if}
