<script lang="ts">
  let { value }: { value?: string | null } = $props();
  const points = $derived(
    (value || '')
      .split(/\n+|(?<=[.!?])\s+(?=[A-Z])/u)
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter(Boolean)
  );
</script>
{#if points.length}<ul
    aria-label="Poin deskripsi program"
    class="my-3 list-disc space-y-2 pl-5 text-xs leading-7 text-[#617a9a]"
  >
    {#each points as point}<li>{point}</li>{/each}
  </ul>
{:else}<p class="text-xs text-slate-500">
    Deskripsi program belum tersedia pada rencana aksi.
  </p>{/if}
