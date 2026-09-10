<script lang="ts">
  import Campuses from '../../_components/Campuses.svelte';
  import AccountBackend from '$lib/components/AccountBackend.svelte';
  import { page } from '$app/state';
  const accounts = $derived(page.url.searchParams.get('tab') === 'accounts');
</script>

<svelte:head><title>Kampus mitra · Digitalisasi DEB</title></svelte:head>
<nav class="campus-tabs" aria-label="Pengelolaan kampus">
    <a href="/admin/campuses" class:active={!accounts} aria-current={!accounts ? 'page' : undefined}>Kampus mitra</a>
    <a href="/admin/campuses?tab=accounts" class:active={accounts} aria-current={accounts ? 'page' : undefined}>Akun kampus</a>
  </nav>
{#if accounts}<AccountBackend/>{:else}<Campuses />{/if}

<style>
  .campus-tabs{display:flex;gap:6px;border-bottom:1px solid #d4e2f4;margin-bottom:25px}.campus-tabs a{padding:12px 18px;font-size:12px;color:#6b809c;border-bottom:2px solid transparent}.campus-tabs a.active{color:#1467c5;border-bottom-color:#1467c5;font-weight:650}.campus-tabs a:hover{background:#edf5ff}
</style>
