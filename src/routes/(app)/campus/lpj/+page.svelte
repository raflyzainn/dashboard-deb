<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  onMount(() => { void goto('/campus/pelaporan#lpj', { replaceState: true }); });
</script>
<a href="/campus/pelaporan#lpj">Buka LPJ pada Pelaporan</a>
