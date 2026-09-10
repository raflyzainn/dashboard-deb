<script lang="ts">
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { pageRequest, pageKey } from '$lib/page-data';
  import { page } from '$app/state';
  import { app } from '$lib/state.svelte';
  import Shell from '$lib/components/Shell.svelte';
  import Empty from '$lib/components/Empty.svelte';
  let { children } = $props();
  const routeRole = $derived(page.url.pathname.split('/')[1]);
  const authorized = $derived(app.ready && app.session && routeRole === app.session.role);
  const request = $derived(pageRequest(page.url));
  const requestKey = $derived(pageKey(request));
  $effect(() => { if (authorized) { const next = request; untrack(() => { void app.openPage(next); }); } });
  $effect(() => {
    if (!app.ready) return;
    if (!app.session) goto('/login', { replaceState: true });
    else if (routeRole !== app.session.role) goto(`/${app.session.role}/dashboard`, { replaceState: true });
  });
</script>
{#if authorized}<Shell>{#if app.data && app.pageId === requestKey}{#key app.session?.id}{@render children()}{/key}{:else if app.loading || app.pageId !== requestKey}<div class="loading-screen"><span class="spinner"></span>Memuat data kampus…</div>{:else}<section class="panel"><Empty title="Data belum dapat dimuat" description="Periksa koneksi PocketBase lalu coba kembali."/><div class="center-actions"><button class="button" onclick={() => app.reload()}>Coba muat ulang</button></div></section>{/if}</Shell>{:else}<main id="main-content" class="loading-screen"><span class="spinner"></span>Menyiapkan ruang kerja…</main>{/if}
