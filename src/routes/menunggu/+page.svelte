<script lang="ts">
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  $effect(() => {
    untrack(() => { void app.init(); });
  });
  $effect(() => {
    if (!app.ready) return;
    if (!app.session) goto('/login', { replaceState: true });
    else if (app.session.role !== 'baru') goto(app.home(), { replaceState: true });
  });
  async function leave() {
    if (await app.logout()) goto('/login');
  }
</script>

<svelte:head><title>Menunggu peran · Dashboard DEB</title></svelte:head>

<main class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-10">
  <section class="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white/90 p-8 shadow-[0_18px_45px_#0b254514] backdrop-blur">
    <img src="/logo-pf.png" alt="Pertamina Foundation" class="mb-6 h-10 w-auto" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
    <h1 class="text-xl font-bold text-slate-900">Akun Anda sudah terdaftar</h1>
    {#if app.session}
      <p class="mt-2 text-sm text-slate-600">Masuk sebagai <strong class="text-slate-800">{app.session.name}</strong>.</p>
    {/if}
    <p class="mt-3 text-sm leading-6 text-slate-600">Admin program akan memberi peran pada akun ini. Setelah itu Anda dapat masuk kembali dan mulai bekerja.</p>
    <div class="mt-6 flex gap-2">
      <Button variant="secondary" icon="logout" onclick={leave} disabled={app.busy}>Keluar</Button>
    </div>
  </section>
</main>
