<script lang="ts">
  import Campuses from '$lib/components/admin/campuses/Campuses.svelte';
  import AccountBackend from '$lib/components/admin/accounts/AccountBackend.svelte';
  import { page } from '$app/state';
  const accounts = $derived(page.url.searchParams.get('tab') === 'accounts');
</script>

<svelte:head><title>Kampus mitra · Digitalisasi DEB</title></svelte:head>
<nav
  class="[&&]:flex [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(212,_226,_244)] [&&]:mb-[25px] campus-tabs"
  aria-label="Pengelolaan kampus"
>
  <a
    class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#6b809c] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&&]:text-[12px] [&&]:[border-bottom-width:2px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:transparent] [&&]:px-[18px] [&&]:py-[12px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&.active]:text-[#1467c5] [&.active]:[border-bottom-color:#1467c5] [&.active]:font-[650] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(237,_245,_255)]"
    href="/admin/campuses"
    class:active={!accounts}
    aria-current={!accounts ? 'page' : undefined}>Kampus mitra</a
  >
  <a
    class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#6b809c] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&&]:text-[12px] [&&]:[border-bottom-width:2px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:transparent] [&&]:px-[18px] [&&]:py-[12px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&.active]:text-[#1467c5] [&.active]:[border-bottom-color:#1467c5] [&.active]:font-[650] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(237,_245,_255)]"
    href="/admin/campuses?tab=accounts"
    class:active={accounts}
    aria-current={accounts ? 'page' : undefined}>Akun kampus</a
  >
</nav>
{#if accounts}<AccountBackend />{:else}<Campuses />{/if}
