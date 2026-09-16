<script lang="ts">
  import '../app.css';
  import '@fontsource-variable/plus-jakarta-sans';
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let { children } = $props();
  $effect(() => {
    if (!app.toast) return;
    const timer = setTimeout(() => (app.toast = ''), 4000);
    return () => clearTimeout(timer);
  });
  $effect(() => {
    untrack(() => {
      void app.init();
    });
  });
</script>
<svelte:head><title>DEB · Ruang tumbuh bersama</title></svelte:head>
<a
  href="#main-content"
  class="[-webkit-tap-highlight-color:transparent] text-[white] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] fixed top-[-80px] left-[16px] z-[200] [background-image:initial] [background-color:var(--dark)] px-[20px] py-[12px] rounded-[8px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:focus]:top-[12px] skip-link"
  >Langsung ke konten</a
>
{@render children()}
{#if app.error && !app.dialogs}<div
    class="fixed bottom-[22px] left-[50%] [transform:translateX(-50%)] z-[150] flex gap-y-[13px] gap-x-[13px] items-start w-[max-content] max-w-[calc(100%_-_32px)] [background-image:initial] [background-color:rgb(255,_245,_241)] text-[#aa4d38] [box-shadow:0_8px_40px_#45251820] px-[18px] py-[15px] border-[1px] border-solid border-[color:rgb(230,_182,_170)] rounded-[10px] [&:has(+.toast)]:bottom-[90px] [&_strong]:text-[12px] [&_p]:text-[11px] [&_p]:max-w-[490px] max-[700.01px]:bottom-[12px] max-[700.01px]:w-[calc(100%_-_24px)] max-[700.01px]:p-[12px] global-error"
    role="alert"
  >
    <Icon name="alert" />
    <div>
      <strong class="font-[650]">Tindakan belum berhasil</strong>
      <p class="leading-[1.8] m-[0px]">{app.error}</p>
    </div>
    <button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
      aria-label="Tutup pesan kesalahan"
      onclick={() => (app.error = '')}><Icon name="close" /></button
    >
  </div>{/if}
{#if app.toast && !app.dialogs}<div
    class="fixed bottom-[24px] left-[50%] [transform:translateX(-50%)] z-[150] [background-image:initial] [background-color:rgb(25,_63,_40)] text-[#e7f5d9] flex items-center gap-y-[12px] gap-x-[12px] [box-shadow:0_7px_30px_#16352325] text-[12px] max-w-[calc(100%_-_32px)] w-[max-content] px-[22px] py-[15px] rounded-[10px] max-[700.01px]:bottom-[14px] max-[700.01px]:text-[11px] max-[700.01px]:px-[17px] max-[700.01px]:py-[14px] toast"
    role="status"
  >
    <Icon name="check" />{app.toast}
  </div>{/if}
