<script lang="ts">
  import Icon from './Icon.svelte';
  let {
    title = 'Belum ada data',
    description = 'Data akan tampil di sini saat tersedia.',
    icon = 'search'
  } = $props();
</script>
<div
  class="text-center px-[20px] py-[55px] [&_h3]:text-[#224f84] [&_p]:text-[#6f83a0] [&_p]:text-[12px] [&_p]:mt-[8px] [&_p]:mb-[0px] [&_p]:max-w-[420px] [&_p]:mx-[auto] empty"
>
  <div
    class="grid items-center [justify-items:center] w-[60px] h-[60px] [background-image:initial] [background-color:rgb(234,_244,_255)] text-[#4c8fce] mt-[0px] mb-[18px] mx-[auto] rounded-[16px] empty-icon"
  >
    <Icon name={icon} size={28} />
  </div>
  <h3 class="font-[650] text-[color:var(--navy)] text-[15px] leading-[1.5] m-[0px]">{title}</h3>
  <p class="leading-[1.8] m-[0px]">{description}</p>
</div>
