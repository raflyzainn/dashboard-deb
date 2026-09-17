<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { app } from '$lib/state.svelte';
  let {
    title,
    onclose,
    children,
    wide = false
  }: { title: string; onclose: () => void; children: Snippet; wide?: boolean } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => {
    dialog.showModal();
    app.dialogs++;
    return () => {
      dialog.close();
      app.dialogs--;
    };
  });
</script>
<dialog
  class="[box-shadow:0_25px_100px_#0a2c6440] w-[min(540px,_calc(100%_-_32px))] max-h-[90dvh] text-[#294d76] [background-image:initial] [background-color:white] p-[0px] m-[auto] border-[1px] border-solid border-[color:rgb(214,_229,_246)] rounded-[15px] [&::backdrop]:[background-image:initial] [&::backdrop]:[background-color:rgba(10,_36,_90,_0.4)] [&::backdrop]:[backdrop-filter:blur(3px)] [&.wide]:w-[min(790px,_calc(100%_-_32px))]"
  bind:this={dialog!}
  class:wide
  oncancel={(e) => {
    e.preventDefault();
    onclose();
  }}
>
  <div
    class="flex items-center justify-between [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--line)] sticky top-[0] [background-image:initial] [background-color:rgb(255,_255,_255)] z-[2] gap-y-[16px] gap-x-[16px] px-[25px] py-[19px] [&_h2]:text-[17px] max-[700.01px]:px-[18px] max-[700.01px]:py-[15px] max-[700.01px]:[&_h2]:text-[15px] modal-header"
  >
    <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
      {title}
    </h2>
    <button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
      aria-label="Tutup dialog"
      onclick={onclose}><Icon name="close" /></button
    >
  </div>
  <div
    class="p-[25px] [&>p]:text-[12px] [&_form]:mt-[18px] max-[700.01px]:p-[19px] max-[700.01px]:[&_.row-between]:flex-wrap modal-body"
  >
    {#if app.error}<div
        class="flex items-start gap-y-[10px] gap-x-[10px] [background-image:initial] [background-color:rgb(255,_244,_239)] text-[#a14431] mb-[20px] p-[12px] border-[1px] border-solid border-[color:rgb(228,_184,_169)] rounded-[8px] [&_p]:text-[12px] [&_p]:grow [&_p]:shrink [&_p]:[flex-basis:0%] [&_p]:leading-[1.7] [&>svg]:mt-[3px] [&_.icon-button]:h-[24px] [&_.icon-button]:w-[24px] modal-error"
        role="alert"
      >
        <Icon name="alert" size={18} />
        <p class="leading-[1.8] m-[0px]">{app.error}</p>
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
          aria-label="Tutup pesan kesalahan"
          onclick={() => (app.error = '')}><Icon name="close" size={16} /></button
        >
      </div>{/if}{@render children()}{#if app.toast}<p
        class="mt-[17px] mb-[0px] leading-[1.8] flex items-center gap-y-[9px] gap-x-[9px] text-[12px] text-[#1765b6] [background-image:initial] [background-color:rgb(234,_244,_255)] p-[12px] mx-[0px] rounded-[7px] modal-success"
        role="status"
      >
        <Icon name="check" size={16} />{app.toast}
      </p>{/if}
  </div>
</dialog>
