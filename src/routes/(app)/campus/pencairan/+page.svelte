<script lang="ts">
  import { app } from '$lib/state.svelte';
  import Layar from '$lib/components/admin/pencairan/Layar.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
</script>

<svelte:head><title>Pencairan · Dashboard DEB</title></svelte:head>
{#if app.session?.campusId}
  <Layar campusId={app.session.campusId} mode="campus" />
{:else}
  <Empty title="Akun ini belum terhubung ke kampus" description="Hubungi admin program agar akun Anda dihubungkan ke kampus." />
{/if}
