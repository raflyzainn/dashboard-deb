<script lang="ts">
  let { value, label = 'Progres', showValue = false }: { value: number; label?: string; showValue?: boolean } = $props();
</script>
<div class="progress-row"><div class="progress-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={`width:${Math.max(0, Math.min(100, value))}%`}></span></div>{#if showValue}<strong>{Math.round(value)}%</strong>{/if}</div>
