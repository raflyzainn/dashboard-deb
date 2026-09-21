<script lang="ts">
  import { ITEM_STATE_LABEL, type ItemState } from '$lib/pencairan';
  import StatusMarker from './StatusMarker.svelte';
  const states: ItemState[] = ['sesuai', 'perlu_revisi', 'perlu_konfirmasi', 'menunggu_review', 'tidak_perlu', 'belum_ada'];
</script>

<ul aria-label="Keterangan simbol status" class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-700">
  {#each states as state}
    <li class="inline-flex items-center gap-1.5"><StatusMarker {state} />{ITEM_STATE_LABEL[state]}</li>
  {/each}
</ul>
