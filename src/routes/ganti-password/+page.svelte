<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import ChangePassword from '$lib/components/auth/ChangePassword.svelte';

  $effect(() => {
    if (!app.ready) return;
    if (!app.session) void goto('/login', { replaceState: true });
    else if (!app.session.passwordChangeRequired) void goto(app.home(), { replaceState: true });
  });
  async function logout() {
    await app.logout();
    void goto('/login', { replaceState: true });
  }
</script>

<svelte:head><title>Ganti kata sandi sementara · Desa Energi Berdikari</title></svelte:head>
<main id="main-content" class="min-h-screen bg-slate-50 p-6">
  {#if app.ready && app.session?.passwordChangeRequired}
    <ChangePassword required onclose={logout} />
  {:else}<p role="status">Menyiapkan akun...</p>{/if}
</main>
