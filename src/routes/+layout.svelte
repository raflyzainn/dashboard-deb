<script lang="ts">
  import '../app.css';
  import '@fontsource-variable/plus-jakarta-sans';
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let { children } = $props();
  $effect(() => { untrack(() => { void app.init(); }); });
</script>
<svelte:head><title>DEB · Ruang tumbuh bersama</title></svelte:head>
<a href="#main-content" class="skip-link">Langsung ke konten</a>
{@render children()}
{#if app.error && !app.dialogs}<div class="global-error" role="alert"><Icon name="alert"/><div><strong>Tindakan belum berhasil</strong><p>{app.error}</p></div><button class="icon-button" aria-label="Tutup pesan kesalahan" onclick={() => app.error = ''}><Icon name="close"/></button></div>{/if}
{#if app.toast && !app.dialogs}<div class="toast" role="status"><Icon name="check"/>{app.toast}</div>{/if}
