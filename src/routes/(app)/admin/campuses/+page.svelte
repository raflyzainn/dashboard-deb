<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Campuses from '$lib/components/admin/campuses/Campuses.svelte';
  // Account management moved to the Pengguna page; old links keep working.
  $effect(() => {
    if (page.url.searchParams.get('tab') === 'accounts') goto('/admin/users', { replaceState: true });
  });
</script>

<svelte:head><title>Kampus mitra · Dashboard DEB</title></svelte:head>
<Campuses />
