<script lang="ts">
  import { app } from '$lib/state.svelte';
  import Icon from './Icon.svelte';
</script>
{#if app.error}<div
    class="fixed bottom-[22px] left-[50%] [transform:translateX(-50%)] z-[150] flex gap-y-[13px] gap-x-[13px] items-start w-[max-content] max-w-[calc(100%_-_32px)] [background-image:initial] [background-color:rgb(255,_245,_241)] text-[#aa4d38] [box-shadow:0_8px_40px_#45251820] px-[18px] py-[15px] border-[1px] border-solid border-[color:rgb(230,_182,_170)] rounded-[10px] [&:has(+.toast)]:bottom-[90px] [&_strong]:text-[14px] [&_p]:text-[13px] [&_p]:max-w-[490px] max-[700.01px]:bottom-[12px] max-[700.01px]:w-[calc(100%_-_24px)] max-[700.01px]:p-[12px] global-error"
    role="alert"
  >
    <Icon name="alert" />
    <div>
      <strong class="font-[600]">Tindakan belum berhasil</strong>
      <p class="leading-[1.6] m-[0px]">{app.error}</p>
    </div>
    <button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
      aria-label="Tutup pesan kesalahan"
      onclick={() => (app.error = '')}><Icon name="close" /></button
    >
  </div>{/if}
