<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date } from '$lib/domain';
  import type { ProposalVersion } from '$lib/types';
  let { proposal }: { proposal: ProposalVersion } = $props();
  let note = $state(untrack(() => proposal.reviewNote || ''));
  let revision = $state(untrack(() => proposal.reviewRevision || 0));
  let comment = $state('');
  const comments = $derived(
    (app.data?.proposalComments || []).filter((c) => c.proposalId === proposal.id)
  );
  async function postComment() {
    if (
      await app.mutate(
        () => dataService.commentProposal(proposal.id, comment),
        'Komentar tersimpan.'
      )
    )
      comment = '';
  }
  async function save() {
    const id = proposal.id;
    if (
      await app.mutate(
        () => dataService.reviewProposal(id, note, revision),
        'Tanggapan proposal tersimpan.'
      )
    ) {
      const saved = app.data?.proposals.find((p) => p.id === id);
      if (saved) {
        note = saved.reviewNote || '';
        revision = saved.reviewRevision || 0;
      }
    }
  }
</script>
<section aria-label="Tanggapan admin" class="mt-[20px] border-t border-[#dce7f7] pt-[18px]">
  <h2 class="text-[16px] font-semibold text-[#0d234c]">
    Tanggapan admin · Versi {proposal.version}
  </h2>
  {#if proposal.reviewNote}
    <p class="mt-[12px] whitespace-pre-wrap break-words text-[13px] leading-[1.8] text-[#17365f]">
      {proposal.reviewNote}
    </p>
    {#if proposal.reviewedAt}<p class="mt-[8px] text-[11px] text-[#647699]">
        Admin PF · {date(proposal.reviewedAt)}
      </p>{/if}
  {:else}<p class="mt-[12px] text-[13px] text-[#647699]">
      Belum ada tanggapan untuk versi ini.
    </p>{/if}
  {#if app.session?.role === 'admin'}
    <form
      class="mt-[18px] grid gap-[12px]"
      onsubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label class="grid gap-[8px] text-[12px] font-semibold text-[#17365f]">
        {proposal.reviewNote ? 'Perbarui tanggapan' : 'Tulis tanggapan'}
        <textarea
          aria-label="Isi tanggapan admin"
          rows="3"
          required
          maxlength="5000"
          bind:value={note}
          disabled={app.readOnly || app.busy || app.loading}
          class="w-full rounded-[8px] border border-[#dce7f7] p-[12px] text-[13px] font-normal focus:outline-2 focus:outline-[#7fc1ff]"
        ></textarea>
      </label>
      <p class="text-[11px] text-[#647699]">
        Tanggapan ini dapat dibaca kampus pada versi yang dipilih. Menyimpan kembali akan
        memperbarui tanggapan tersebut.
      </p>
      <button
        disabled={!note.trim() || app.readOnly || app.busy || app.loading || app.stale}
        class="justify-self-start rounded-[8px] bg-[#075fc7] px-[18px] py-[11px] text-[12px] font-semibold text-white disabled:opacity-50"
        >{app.busy ? 'Menyimpan…' : 'Simpan tanggapan'}</button
      >
    </form>
  {/if}
</section>
<section aria-label="Diskusi proposal" class="mt-5 border-t border-slate-200 pt-5">
  <h2 class="text-base font-semibold text-[#0d234c]">Diskusi · Versi {proposal.version}</h2>
  <p class="mt-2 text-xs text-slate-500">
    Mentor, SoBI, dan Admin PF dapat menanggapi versi ini. Komentar terdahulu tetap tersimpan.
  </p>
  <ol class="mt-4 space-y-3">
    {#each comments as c}<li class="rounded-lg bg-slate-50 p-3">
        <strong class="text-xs">{c.authorName}</strong>
        <p class="mt-2 whitespace-pre-wrap break-words text-sm">{c.body}</p>
        <p class="mt-2 text-xs text-slate-500">{date(c.createdAt)}</p>
      </li>{/each}
  </ol>
  <form
    class="mt-4"
    onsubmit={(e) => {
      e.preventDefault();
      void postComment();
    }}
  >
    <label class="grid gap-2 text-sm"
      >Tulis komentar<textarea
        aria-label="Komentar proposal"
        class="w-full rounded-lg border border-slate-300 p-3"
        rows="3"
        maxlength="3000"
        required
        bind:value={comment}
        disabled={app.busy || app.loading}></textarea></label
    ><button
      class="mt-3 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      disabled={!comment.trim() || app.busy || app.loading || app.stale}>Kirim komentar</button
    >
  </form>
</section>
