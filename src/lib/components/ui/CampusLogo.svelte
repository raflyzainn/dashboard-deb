<script lang="ts">
  // Campus mark: the official logo when static/logo-kampus has one for the code, otherwise the initials tile.
  import { campusLogo } from '$lib/campus-logos';

  let {
    code = '',
    initials = '',
    size = 40,
    rounded = 'rounded-[8px]',
    class: extra = ''
  }: { code?: string | null; initials?: string | null; size?: number; rounded?: string; class?: string } = $props();

  const src = $derived(campusLogo(code));
  const text = $derived((initials || code || '').trim());
  const fontSize = $derived(size >= 56 ? (text.length > 4 ? 14 : 20) : 11);
</script>

{#if src}
  <span class={['grid shrink-0 place-items-center overflow-hidden border border-solid border-[#d3e6fb] bg-white', rounded, extra]} style="width:{size}px;height:{size}px" aria-hidden="true">
    <img {src} alt="" loading="lazy" decoding="async" class="h-full w-full object-contain" style="padding:{Math.round(size * 0.1)}px" />
  </span>
{:else}
  <span class={['grid shrink-0 place-items-center border border-solid border-[#d3e6fb] bg-[#e9f3ff] font-bold text-[#176ac3]', rounded, extra]} style="width:{size}px;height:{size}px;font-size:{fontSize}px" aria-hidden="true">{text}</span>
{/if}
