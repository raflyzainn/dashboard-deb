<script lang="ts">
  let {
    value,
    label = 'Progres',
    showValue = false
  }: { value: number; label?: string; showValue?: boolean } = $props();
</script>
<div
  class="flex items-center gap-y-[10px] gap-x-[10px] [&>strong]:text-[11px] [&>strong]:min-w-[33px] [&>strong]:text-right [&>strong]:[font-variant-numeric:tabular-nums] [&>strong]:text-[#25598f] progress-row"
>
  <div
    class="h-[6px] w-[100%] [background-image:initial] [background-color:rgb(228,_237,_248)] overflow-x-hidden overflow-y-hidden rounded-[6px] [&>span]:block [&>span]:h-[100%] [&>span]:[background-image:linear-gradient(90deg,_rgb(21,_151,_229),_rgb(20,_94,_232))] [&>span]:[background-color:initial] [&>span]:[transition-behavior:normal] [&>span]:[transition-duration:0.35s] [&>span]:[transition-timing-function:ease] [&>span]:[transition-delay:0s] [&>span]:[transition-property:width] [&>span]:rounded-[6px] progress-track"
    role="progressbar"
    aria-label={label}
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <span class="w-[var(--progress)]" style={`--progress:${Math.max(0, Math.min(100, value))}%`}
    ></span>
  </div>
  {#if showValue}<strong class="font-[650]">{Math.round(value)}%</strong>{/if}
</div>
