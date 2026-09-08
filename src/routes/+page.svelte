<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  $effect(() => { if (app.ready) goto(app.session ? `/${app.session.role}/dashboard` : '/login', { replaceState: true }); });
</script>
<main id="main-content" class="loading-screen"><span class="spinner"></span>Menyiapkan ruang kerja…</main>
