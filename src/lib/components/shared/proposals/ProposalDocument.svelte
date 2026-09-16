<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import type { ProposalVersion } from '$lib/types';
  let { proposal }: { proposal: ProposalVersion } = $props();
  let url = $state('');
  let loading = $state(true);
  let error = $state('');
  let retry = $state(0);
  $effect(() => {
    const id = proposal.id;
    const actor = app.session?.id;
    retry;
    let cancelled = false;
    let objectUrl = '';
    url = '';
    error = '';
    loading = true;
    if (actor)
      dataService
        .proposalFile(id)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          url = objectUrl;
        })
        .catch((e) => {
          if (!cancelled) error = e instanceof Error ? e.message : 'PDF tidak dapat dimuat.';
        })
        .finally(() => {
          if (!cancelled) loading = false;
        });
    else loading = false;
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  });
</script>
<section aria-label={`Dokumen proposal versi ${proposal.version}`} class="min-w-0">
  {#if loading}
    <p role="status" class="p-[24px] text-[#647699]">Memuat PDF…</p>
  {:else if error}
    <div role="alert" class="rounded-[8px] bg-red-50 p-[20px] text-red-800">
      <p>{error}</p>
      <button
        type="button"
        class="mt-[12px] rounded-[6px] border px-[14px] py-[8px]"
        onclick={() => retry++}>Coba lagi</button
      >
    </div>
  {:else if url}
    <iframe
      src={url + '#view=Fit&navpanes=0'}
      title={`Pratinjau ${proposal.filename}`}
      class="h-[300px] max-[700px]:h-[260px] w-full rounded-[8px] border border-[#dce7f7] bg-[#f3f7ff]"
    ></iframe>
    <div class="mt-[12px] flex flex-wrap items-center justify-between gap-[12px] text-[12px]">
      <p class="text-[#647699]">
        Jika pratinjau tidak didukung browser, unduh PDF untuk membacanya.
      </p>
      <a
        href={url}
        download={proposal.filename}
        class="rounded-[8px] border border-[#dce7f7] px-[16px] py-[10px] font-semibold text-[#075fc7]"
        >Unduh PDF</a
      >
    </div>
  {/if}
</section>
