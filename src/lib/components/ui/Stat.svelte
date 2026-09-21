<script lang="ts">
  import Icon from './Icon.svelte';
  let {
    label,
    value,
    note,
    icon,
    tone = 'green'
  }: { label: string; value: string; note: string; icon: string; tone?: string } = $props();
</script>
<article
  class="pt-[20px] pb-[18px] [background-image:initial] [background-color:white] [box-shadow:0_10px_30px_#1a4d8f08] px-[20px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&_p]:text-[13px] [&_p]:text-[#475569] [&_p]:mt-[3px] max-[1200.01px]:p-[17px] max-[1200.01px]:[&_p]:text-[13px] max-[700.01px]:p-[15px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.6] stat-card"
>
  <div
    class="flex items-center justify-between gap-y-[5px] gap-x-[5px] text-[#475569] text-[14px] max-[700.01px]:text-[13px] stat-top"
  >
    <span>{label}</span><span
      class={[
        `stat-icon ${tone}`,
        'grid items-center [justify-items:center] w-[30px] h-[30px] [background-image:initial] [background-color:rgb(232,_243,_255)] text-[#1977cf] rounded-[8px] [&.amber]:[background-image:initial] [&.amber]:[background-color:rgb(252,_243,_221)] [&.amber]:text-[#8e6d2f] max-[700.01px]:w-[26px] max-[700.01px]:h-[26px] max-[700.01px]:[&>svg]:w-[17px] max-[700.01px]:[&>svg]:h-[17px] [&.green]:[background-image:initial]! [&.green]:[background-color:rgb(231,_243,_255)]! [&.green]:text-[#1671ce]! [&.blue]:[background-image:initial]! [&.blue]:[background-color:rgb(231,_243,_255)]! [&.blue]:text-[#1671ce]! [&.mint]:[background-image:initial]! [&.mint]:[background-color:rgb(231,_243,_255)]! [&.mint]:text-[#1671ce]!'
      ]}><Icon name={icon} /></span
    >
  </div>
  <strong
    class="font-[700] block text-[29px] tracking-[-0.01em] text-[#102b58] leading-[1.5] mt-[5px] [font-variant-numeric:tabular-nums] max-[700.01px]:text-[27px] stat-value"
    >{value}</strong
  >
  <p class="leading-[1.6] m-[0px]">{note}</p>
</article>
