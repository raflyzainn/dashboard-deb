<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    tone = 'neutral',
    children
  }: { tone?: 'green' | 'amber' | 'neutral' | 'blue'; children: Snippet } = $props();
</script>
<span
  class={[
    `badge ${tone}`,
    'inline-flex items-center gap-y-[5px] gap-x-[5px] text-[10px] leading-[1.6] font-[600] [background-image:initial] [background-color:rgb(241,_243,_238)] text-[#8a9580] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[4px] rounded-[5px] [&.green]:[background-image:initial] [&.green]:[background-color:rgb(229,_242,_255)] [&.green]:text-[#176cc4] [&.amber]:[background-image:initial] [&.amber]:[background-color:rgb(255,_244,_220)] [&.amber]:text-[#9a6b17] [&.blue]:[background-image:initial] [&.blue]:[background-color:rgb(229,_242,_255)] [&.blue]:text-[#176cc4] [&.neutral]:[background-image:initial] [&.neutral]:[background-color:rgb(239,_244,_250)] [&.neutral]:text-[#617693] max-[700.01px]:text-[9px]'
  ]}
  ><span
    class="h-[4px] w-[4px] [background-image:initial] [background-color:currentcolor] rounded-[50%] badge-dot"
  ></span>{@render children()}</span
>
