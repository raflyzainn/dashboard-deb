<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { app } from '$lib/state.svelte';
  let { title, onclose, children, wide = false }: { title: string; onclose: () => void; children: Snippet; wide?: boolean } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => { dialog.showModal(); app.dialogs++; return () => { dialog.close(); app.dialogs--; }; });
</script>
<dialog bind:this={dialog!} class:wide oncancel={(e) => { e.preventDefault(); onclose(); }}>
  <div class="modal-header"><h2>{title}</h2><button class="icon-button" aria-label="Tutup dialog" onclick={onclose}><Icon name="close"/></button></div>
  <div class="modal-body">{#if app.error}<div class="modal-error" role="alert"><Icon name="alert" size={18}/><p>{app.error}</p><button class="icon-button" aria-label="Tutup pesan kesalahan" onclick={() => app.error = ''}><Icon name="close" size={16}/></button></div>{/if}{@render children()}{#if app.toast}<p class="modal-success" role="status"><Icon name="check" size={16}/>{app.toast}</p>{/if}</div>
</dialog>
