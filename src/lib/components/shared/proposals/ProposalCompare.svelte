<script lang="ts">
  import type { DemoSession, ProposalVersion } from '$lib/types';
  import { dataService } from '$lib/data/service';
  import {
    compareText,
    splitRows,
    type ProposalDiff,
    type ExtractedProposal
  } from '$lib/data/proposal-diff';
  import { date } from '$lib/domain';
  import Icon from '$lib/components/ui/Icon.svelte';

  let {
    versions,
    actor,
    onview
  }: {
    versions: ProposalVersion[];
    actor: DemoSession;
    onview: (version: ProposalVersion) => void;
  } = $props();
  let beforeId = $state('');
  let afterId = $state('');
  let mode = $state<'split' | 'unified'>('split');
  let onlyChanges = $state(false);
  let retry = $state(0);
  let busy = $state(false);
  let error = $state('');
  let result = $state<{
    diff: ProposalDiff;
    before: ExtractedProposal;
    after: ExtractedProposal;
  } | null>(null);
  const before = $derived(versions.find((v) => v.id === beforeId));
  const after = $derived(versions.find((v) => v.id === afterId));
  const rows = $derived(
    result?.diff.rows.filter((row) => !onlyChanges || row.kind !== 'same') || []
  );
  const paired = $derived(
    splitRows(result?.diff.rows || []).filter((row) => !onlyChanges || row.changed)
  );

  $effect(() => {
    if (!versions.some((v) => v.id === beforeId)) beforeId = versions[1]?.id || '';
    if (!versions.some((v) => v.id === afterId)) afterId = versions[0]?.id || '';
  });

  $effect(() => {
    const base = before,
      target = after,
      session = actor;
    void retry;
    const controller = new AbortController();
    result = null;
    error = '';
    busy = false;
    if (base && target && base.id !== target.id) {
      busy = true;
      void (async () => {
        try {
          const { extractPdfText } = await import('$lib/data/pdf-text');
          controller.signal.throwIfAborted();
          const original = await extractPdfText(
            await dataService.proposalFile(base.id),
            controller.signal
          );
          const revised = await extractPdfText(
            await dataService.proposalFile(target.id),
            controller.signal
          );
          if (!original.lines.length || !revised.lines.length)
            throw new Error(
              'Teks tidak ditemukan pada salah satu PDF. Dokumen mungkin hasil scan. Bandingkan melalui PDF asli; pembacaan teks dari gambar (OCR) belum tersedia.'
            );
          const diff = await compareText(original.lines, revised.lines);
          if (!controller.signal.aborted) result = { diff, before: original, after: revised };
        } catch (e) {
          if (!controller.signal.aborted)
            error = e instanceof Error ? e.message : 'Perbandingan gagal. Silakan coba kembali.';
        } finally {
          if (!controller.signal.aborted) busy = false;
        }
      })();
    }
    return () => controller.abort();
  });
</script>

<section
  class="[background-image:initial] [background-color:white] [&&]:min-w-[0] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:mt-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[700.01px]:[&&_.panel-heading]:px-[16px] panel comparison"
  aria-label="Perbandingan proposal"
>
  <div
    class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
  >
    <div>
      <span
        class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
        >REVIEW PERUBAHAN</span
      >
      <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
        Bandingkan versi proposal
      </h2>
      <p class="leading-[1.8] m-[0px]">Pilih dua versi untuk melihat perubahan isi dokumen.</p>
    </div>
    <Icon name="proposal" size={22} />
  </div>
  {#if versions.length < 2}
    <p
      class="leading-[1.8] [&&]:text-[#65736b] [&&]:text-[13px] [&&]:flex [&&]:items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:px-[24px] [&&]:py-[20px] m-[0px] compare-empty"
    >
      Perbandingan tersedia setelah ada minimal dua versi proposal.
    </p>
  {:else}
    <div
      class="[&&]:grid [&&]:grid-cols-[minmax(0,_1fr)_auto_minmax(0,_1fr)] [&&]:gap-y-[14px] [&&]:gap-x-[14px] [&&]:pt-[0px] [&&]:pb-[20px] [&&]:[align-items:end] [&&]:px-[24px] max-[700.01px]:[&&]:grid-cols-[minmax(0,_1fr)] max-[700.01px]:[&&]:gap-y-[10px] max-[700.01px]:[&&]:gap-x-[10px] max-[700.01px]:[&&]:pt-[0px] max-[700.01px]:[&&]:pb-[16px] max-[700.01px]:[&&]:px-[16px] compare-selectors"
    >
      <label
        class="[&&]:flex [&&]:flex-col [&&]:items-stretch [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:text-[12px] [&&]:font-[600] [&&]:min-w-[0] [&&]:m-[0px]"
        >Versi dasar<select
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] [&&]:max-w-[none] [&&]:min-h-[44px] [&&]:w-[100%] [&&]:min-w-[0] [&&]:[text-overflow:ellipsis] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
          aria-label="Versi dasar"
          bind:value={beforeId}
          >{#each versions as version}<option value={version.id}
              >Versi {version.version} · {version.filename}</option
            >{/each}</select
        ></label
      >
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[22px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[43px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[15px] [&&]:py-[6px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[22px] max-[700.01px]:[&&]:[justify-self:center] max-[700.01px]:[&&]:min-w-[44px] max-[700.01px]:[&&]:px-[15px] max-[700.01px]:[&&]:py-[6px] button secondary swap"
        aria-label="Tukar versi perbandingan"
        onclick={() => {
          [beforeId, afterId] = [afterId, beforeId];
        }}>⇄</button
      >
      <label
        class="[&&]:flex [&&]:flex-col [&&]:items-stretch [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:text-[12px] [&&]:font-[600] [&&]:min-w-[0] [&&]:m-[0px]"
        >Versi pembanding<select
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] [&&]:max-w-[none] [&&]:min-h-[44px] [&&]:w-[100%] [&&]:min-w-[0] [&&]:[text-overflow:ellipsis] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
          aria-label="Versi pembanding"
          bind:value={afterId}
          >{#each versions as version}<option value={version.id}
              >Versi {version.version} · {version.filename}</option
            >{/each}</select
        ></label
      >
    </div>
    {#if before && after}
      <div
        class="[&&]:grid [&&]:grid-cols-[1fr_1fr] [&&]:[border-top-width:1px] [&&]:[border-bottom-width:1px] [&&]:[border-top-style:solid] [&&]:[border-bottom-style:solid] [&&]:[border-top-color:rgb(220,_229,_223)] [&&]:[border-bottom-color:rgb(220,_229,_223)] [&&]:[background-image:initial] [&&]:[background-color:rgb(248,_250,_249)] compare-files"
      >
        <div
          class="[&&]:min-w-[0] [&&]:flex [&&]:flex-col [&&]:items-start [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:px-[24px] [&&]:py-[16px] max-[700.01px]:[&&]:p-[12px]"
        >
          <strong class="font-[650] [&&]:text-[12px]">Dasar: versi {before.version}</strong><span
            class="[&&]:text-[11px] [&&]:text-[#65736b] [&&]:wrap-anywhere"
            >{before.filename} · {date(before.createdAt)}</span
          ><button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
            onclick={() => onview(before)}>Buka PDF dasar</button
          >
        </div>
        <div
          class="[&&]:min-w-[0] [&&]:flex [&&]:flex-col [&&]:items-start [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:px-[24px] [&&]:py-[16px] max-[700.01px]:[&&]:p-[12px]"
        >
          <strong class="font-[650] [&&]:text-[12px]">Pembanding: versi {after.version}</strong
          ><span class="[&&]:text-[11px] [&&]:text-[#65736b] [&&]:wrap-anywhere"
            >{after.filename} · {date(after.createdAt)}</span
          ><button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
            onclick={() => onview(after)}>Buka PDF pembanding</button
          >
        </div>
      </div>
    {/if}
    <p
      class="[&&]:leading-[1.8] [&&]:text-[11px] [&&]:text-[#65736b] [&&]:mx-[24px] [&&]:my-[14px] max-[700.01px]:[&&]:mx-[16px] max-[700.01px]:[&&]:my-[12px] compare-note"
    >
      Perbandingan membaca teks PDF. Gambar, tata letak, dan format tidak dibandingkan; urutan teks
      tabel atau kolom dapat berbeda dari tampilan PDF.
    </p>
    {#if beforeId === afterId}
      <p
        class="leading-[1.8] [&&]:text-[#65736b] [&&]:text-[13px] [&&]:flex [&&]:items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:px-[24px] [&&]:py-[20px] m-[0px] compare-empty"
        role="status"
      >
        Pilih dua versi yang berbeda untuk dibandingkan.
      </p>
    {:else if busy}
      <p
        class="leading-[1.8] [&&]:text-[#65736b] [&&]:text-[13px] [&&]:flex [&&]:items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:px-[24px] [&&]:py-[20px] m-[0px] compare-empty"
        role="status"
      >
        <span
          class="w-[25px] h-[25px] [border-top-color:#69974d] [border-right-color:rgb(223,_233,_214)] [border-bottom-color:rgb(223,_233,_214)] [border-left-color:rgb(223,_233,_214)] [animation-duration:1s] [animation-timing-function:linear] [animation-delay:0s] [animation-iteration-count:infinite] [animation-direction:normal] [animation-fill-mode:none] [animation-play-state:running] [animation-name:spin] [animation-timeline:auto] [animation-range-start:normal] [animation-range-end:normal] border-[2px] border-solid rounded-[50%] spinner"
        ></span> Membaca dan membandingkan isi PDF…
      </p>
    {:else if error}
      <div
        class="[&&]:[background-image:initial] [&&]:[background-color:rgb(255,_248,_231)] [&&]:text-[12px] [&&]:leading-[1.8] [&&]:p-[15px] [&&]:mx-[24px] [&&]:my-[16px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(234,_203,_135)] [&&]:rounded-[8px] max-[700.01px]:[&&]:mx-[16px] max-[700.01px]:[&&]:my-[14px] compare-error"
        role="alert"
      >
        <p class="mt-[0px] [&&]:mb-[12px] leading-[1.8] mx-[0px]">{error}</p>
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
          onclick={() => retry++}>Coba lagi</button
        >
      </div>
    {:else if result}
      {#if result.before.emptyPages.length || result.after.emptyPages.length}
        <p
          class="[&&]:leading-[1.8] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_248,_231)] [&&]:text-[12px] [&&]:p-[15px] [&&]:mx-[24px] [&&]:my-[16px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(234,_203,_135)] [&&]:rounded-[8px] max-[700.01px]:[&&]:mx-[16px] max-[700.01px]:[&&]:my-[14px] compare-warning"
          role="status"
        >
          Sebagian halaman tidak memiliki teks terbaca. Dasar: {result.before.emptyPages.join(
            ', '
          ) || 'tidak ada'}; pembanding: {result.after.emptyPages.join(', ') || 'tidak ada'}.
          Halaman kosong atau gambar tidak tercakup dalam hasil ini.
        </p>
      {/if}
      <div
        class="[&&]:[border-top-width:1px] [&&]:[border-top-style:solid] [&&]:[border-top-color:rgb(220,_229,_223)] [&&]:flex [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:justify-between [&&]:flex-wrap [&&]:items-center [&&]:px-[24px] [&&]:py-[16px] max-[700.01px]:[&&]:px-[16px] max-[700.01px]:[&&]:py-[14px] compare-toolbar"
      >
        <div
          class="[&&]:flex [&&]:flex-wrap [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:text-[12px] [&&]:font-[700] diff-counts"
          aria-live="polite"
        >
          <span class="[&&]:text-[#116329] count-added">+{result.diff.added} baris ditambahkan</span
          ><span class="[&&]:text-[#a8202a] count-removed"
            >−{result.diff.removed} baris dihapus</span
          >
        </div>
        <div
          class="[&&]:flex [&&]:items-center [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:flex-wrap max-[700.01px]:[&&]:gap-y-[10px] max-[700.01px]:[&&]:gap-x-[10px] compare-options"
        >
          <div
            class="[&&]:flex [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(208,_217,_212)] [&&]:rounded-[7px] view-switch"
            aria-label="Tampilan perbedaan"
          >
            <button
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#53635a] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:px-[11px] [&&]:py-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&.active]:font-[700] [&.active]:text-[#173e2c] [&.active]:[background-image:initial] [&.active]:[background-color:rgb(231,_238,_233)]"
              class:active={mode === 'split'}
              aria-pressed={mode === 'split'}
              onclick={() => (mode = 'split')}>Berdampingan</button
            ><button
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#53635a] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:px-[11px] [&&]:py-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&.active]:font-[700] [&.active]:text-[#173e2c] [&.active]:[background-image:initial] [&.active]:[background-color:rgb(231,_238,_233)]"
              class:active={mode === 'unified'}
              aria-pressed={mode === 'unified'}
              onclick={() => (mode = 'unified')}>Gabungan</button
            >
          </div>
          <label
            class="flex-row [&&]:items-center [&&]:flex [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:text-[11px] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:nowrap] [&&]:m-[0px] [&_input]:w-[16px] [&_input]:h-[16px] [&_input]:[accent-color:#1265d8] checkbox-label"
            ><input
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [&&]:w-[16px] [&&]:h-[16px] [&&]:shrink-0 [&&]:[accent-color:#20643d] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
              type="checkbox"
              bind:checked={onlyChanges}
            />Hanya perubahan</label
          >
        </div>
      </div>
      {#if !result.diff.added && !result.diff.removed}<p
          class="leading-[1.8] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_248,_240)] [&&]:text-[#116329] [&&]:text-[12px] [&&]:px-[24px] [&&]:py-[14px] m-[0px] compare-identical"
          role="status"
        >
          Tidak ada perbedaan pada teks yang terbaca. Gambar dan format PDF mungkin tetap berbeda.
        </p>{/if}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll long comparisons.) -->
      <div
        class="[&&]:overflow-x-auto [&&]:overflow-y-auto [&&]:max-h-[650px] [&&]:outline-offset-[-3px] diff-scroll"
        tabindex="0"
        role="region"
        aria-label="Hasil perbedaan teks PDF"
      >
        {#if mode === 'split'}
          <table
            class="[&&]:border-collapse [&&]:w-[100%] text-left [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[table-layout:fixed] [&&]:[font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [&&]:text-[12px] max-[700.01px]:[&&&]:min-w-[650px] diff-table split"
          >
            <colgroup
              ><col class="[&&&]:w-[42px] number-column" /><col /><col
                class="[&&&]:w-[42px] number-column"
              /><col /></colgroup
            ><thead
              ><tr
                ><th
                  class="text-[9px] font-[650] tracking-[0.7px] [&&]:[background-image:initial] [&&]:[background-color:rgb(241,_245,_243)] [&&]:text-[#46584d] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] [&&]:sticky [&&]:top-[0] [&&]:text-left [&&]:z-[1] [&&]:p-[12px] border-[color:rgb(226,_236,_248)]"
                  colspan="2">Dasar · versi {before?.version}</th
                ><th
                  class="text-[9px] font-[650] tracking-[0.7px] [&&]:[background-image:initial] [&&]:[background-color:rgb(241,_245,_243)] [&&]:text-[#46584d] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] [&&]:sticky [&&]:top-[0] [&&]:text-left [&&]:z-[1] [&&]:p-[12px] border-[color:rgb(226,_236,_248)]"
                  colspan="2">Pembanding · versi {after?.version}</th
                ></tr
              ></thead
            ><tbody
              class="[&_tr:last-child_td]:[border-bottom-width:0px] [&_tr:last-child_td]:[border-bottom-style:none] [&_tr:last-child_td]:[border-bottom-color:currentcolor] [&_tr:hover]:[background-image:initial] [&_tr:hover]:[background-color:rgb(247,_251,_255)]"
              >{#each paired as row}<tr
                  ><td
                    class="[&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(228,_235,_230)] [&&&]:text-[10px] [&&&]:text-[#6e7e74] [border-top-color:rgb(232,_239,_248)] [border-right-color:rgb(232,_239,_248)] [border-left-color:rgb(232,_239,_248)] [&&]:[vertical-align:top] [&&]:leading-[1.8] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:wrap] [&&]:wrap-anywhere [&&&]:text-right [&&&]:w-[40px] [&&&]:px-[5px] [&&]:py-[7px] [&:nth-child(2)]:text-left [&:nth-child(4)]:text-left [&:nth-child(3)]:[border-left-color:rgb(220,_229,_223)] [&:nth-child(3)]:[border-left-width:1px] [&:nth-child(3)]:[border-left-style:solid] [&.deleted]:text-[#82071e] [&.deleted]:[background-image:initial] [&.deleted]:[background-color:rgb(255,_235,_233)] line-number"
                    class:deleted={row.changed && !!row.before}>{row.before?.number || ''}</td
                  ><td
                    class="[&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(228,_235,_230)] text-[12px] [&&]:text-[#24352b] [border-top-color:rgb(232,_239,_248)] [border-right-color:rgb(232,_239,_248)] [border-left-color:rgb(232,_239,_248)] [&&]:[vertical-align:top] [&&]:leading-[1.8] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:wrap] [&&]:wrap-anywhere [&&]:px-[10px] [&&]:py-[7px] [&:nth-child(2)]:text-left [&:nth-child(4)]:text-left [&:nth-child(3)]:[border-left-color:rgb(220,_229,_223)] [&:nth-child(3)]:[border-left-width:1px] [&:nth-child(3)]:[border-left-style:solid] [&.deleted]:text-[#82071e] [&.deleted]:[background-image:initial] [&.deleted]:[background-color:rgb(255,_235,_233)] [&.absent]:[background-image:repeating-linear-gradient(135deg,_rgb(247,_249,_248),_rgb(247,_249,_248)_5px,_rgb(238,_242,_239)_5px,_rgb(238,_242,_239)_6px)] [&.absent]:[background-color:initial]"
                    class:deleted={row.changed && !!row.before}
                    class:absent={!row.before}
                    ><span
                      class="[&&]:inline-block [&&]:w-[15px] [&&]:font-[700] [&&]:[user-select:none] diff-sign"
                      >{row.changed && row.before ? '−' : ' '}</span
                    >{#if row.before}<span
                        class="[&&]:[white-space-collapse:preserve] [&&]:[text-wrap-mode:wrap] line-text"
                        >{row.before.text}</span
                      ><small
                        class="[&&]:text-[9px] [&&]:text-[#637168] leading-[1.7] [&&]:block [&&]:ml-[15px] page-ref"
                        >Hlm. {row.before.page}</small
                      >{/if}</td
                  ><td
                    class="[&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(228,_235,_230)] [&&&]:text-[10px] [&&&]:text-[#6e7e74] [border-top-color:rgb(232,_239,_248)] [border-right-color:rgb(232,_239,_248)] [border-left-color:rgb(232,_239,_248)] [&&]:[vertical-align:top] [&&]:leading-[1.8] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:wrap] [&&]:wrap-anywhere [&&&]:text-right [&&&]:w-[40px] [&&&]:px-[5px] [&&]:py-[7px] [&:nth-child(2)]:text-left [&:nth-child(4)]:text-left [&:nth-child(3)]:[border-left-color:rgb(220,_229,_223)] [&:nth-child(3)]:[border-left-width:1px] [&:nth-child(3)]:[border-left-style:solid] [&.inserted]:text-[#116329] [&.inserted]:[background-image:initial] [&.inserted]:[background-color:rgb(218,_251,_225)] line-number"
                    class:inserted={row.changed && !!row.after}>{row.after?.number || ''}</td
                  ><td
                    class="[&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(228,_235,_230)] text-[12px] [&&]:text-[#24352b] [border-top-color:rgb(232,_239,_248)] [border-right-color:rgb(232,_239,_248)] [border-left-color:rgb(232,_239,_248)] [&&]:[vertical-align:top] [&&]:leading-[1.8] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:wrap] [&&]:wrap-anywhere [&&]:px-[10px] [&&]:py-[7px] [&:nth-child(2)]:text-left [&:nth-child(4)]:text-left [&:nth-child(3)]:[border-left-color:rgb(220,_229,_223)] [&:nth-child(3)]:[border-left-width:1px] [&:nth-child(3)]:[border-left-style:solid] [&.inserted]:text-[#116329] [&.inserted]:[background-image:initial] [&.inserted]:[background-color:rgb(218,_251,_225)] [&.absent]:[background-image:repeating-linear-gradient(135deg,_rgb(247,_249,_248),_rgb(247,_249,_248)_5px,_rgb(238,_242,_239)_5px,_rgb(238,_242,_239)_6px)] [&.absent]:[background-color:initial]"
                    class:inserted={row.changed && !!row.after}
                    class:absent={!row.after}
                    ><span
                      class="[&&]:inline-block [&&]:w-[15px] [&&]:font-[700] [&&]:[user-select:none] diff-sign"
                      >{row.changed && row.after ? '+' : ' '}</span
                    >{#if row.after}<span
                        class="[&&]:[white-space-collapse:preserve] [&&]:[text-wrap-mode:wrap] line-text"
                        >{row.after.text}</span
                      ><small
                        class="[&&]:text-[9px] [&&]:text-[#637168] leading-[1.7] [&&]:block [&&]:ml-[15px] page-ref"
                        >Hlm. {row.after.page}</small
                      >{/if}</td
                  ></tr
                >{/each}</tbody
            >
          </table>
        {:else}
          <table
            class="[&&]:border-collapse [&&]:w-[100%] text-left [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[table-layout:fixed] [&&]:[font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [&&]:text-[12px] max-[700.01px]:[&&&]:text-[11px] diff-table unified"
          >
            <thead
              ><tr
                ><th
                  class="text-[9px] font-[650] tracking-[0.7px] [&&]:[background-image:initial] [&&]:[background-color:rgb(241,_245,_243)] [&&]:text-[#46584d] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] [&&]:sticky [&&]:top-[0] [&&]:text-left [&&]:z-[1] [&&]:p-[12px] border-[color:rgb(226,_236,_248)] [&:nth-child(1)]:w-[44px] [&:nth-child(2)]:w-[44px]"
                  >Dasar</th
                ><th
                  class="text-[9px] font-[650] tracking-[0.7px] [&&]:[background-image:initial] [&&]:[background-color:rgb(241,_245,_243)] [&&]:text-[#46584d] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] [&&]:sticky [&&]:top-[0] [&&]:text-left [&&]:z-[1] [&&]:p-[12px] border-[color:rgb(226,_236,_248)] [&:nth-child(1)]:w-[44px] [&:nth-child(2)]:w-[44px]"
                  >Baru</th
                ><th
                  class="text-[9px] font-[650] tracking-[0.7px] [&&]:[background-image:initial] [&&]:[background-color:rgb(241,_245,_243)] [&&]:text-[#46584d] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] [&&]:sticky [&&]:top-[0] [&&]:text-left [&&]:z-[1] [&&]:p-[12px] border-[color:rgb(226,_236,_248)] [&:nth-child(1)]:w-[44px] [&:nth-child(2)]:w-[44px]"
                  >Isi teks</th
                ></tr
              ></thead
            ><tbody
              class="[&_tr:last-child_td]:[border-bottom-width:0px] [&_tr:last-child_td]:[border-bottom-style:none] [&_tr:last-child_td]:[border-bottom-color:currentcolor] [&_tr:hover]:[background-image:initial] [&_tr:hover]:[background-color:rgb(247,_251,_255)]"
              >{#each rows as row}<tr
                  class="[&.deleted]:[background-image:initial] [&.deleted]:[background-color:rgb(255,_235,_233)] [&.deleted]:text-[#82071e] [&.inserted]:[background-image:initial] [&.inserted]:[background-color:rgb(218,_251,_225)] [&.inserted]:text-[#116329]"
                  class:deleted={row.kind === 'removed'}
                  class:inserted={row.kind === 'added'}
                  ><td
                    class="[&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(228,_235,_230)] [&&&]:text-[10px] [&&&]:text-[#6e7e74] [border-top-color:rgb(232,_239,_248)] [border-right-color:rgb(232,_239,_248)] [border-left-color:rgb(232,_239,_248)] [&&]:[vertical-align:top] [&&]:leading-[1.8] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:wrap] [&&]:wrap-anywhere [&&&]:text-right [&&&]:w-[40px] [&&&]:px-[5px] [&&]:py-[7px] [.diff-table_tr.deleted_&]:text-[#82071e] [.diff-table_tr.deleted_&]:[background-image:initial] [.diff-table_tr.deleted_&]:[background-color:rgb(255,_235,_233)] [.diff-table_tr.inserted_&]:text-[#116329] [.diff-table_tr.inserted_&]:[background-image:initial] [.diff-table_tr.inserted_&]:[background-color:rgb(218,_251,_225)] line-number"
                    >{row.before?.number || ''}</td
                  ><td
                    class="[&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(228,_235,_230)] [&&&]:text-[10px] [&&&]:text-[#6e7e74] [border-top-color:rgb(232,_239,_248)] [border-right-color:rgb(232,_239,_248)] [border-left-color:rgb(232,_239,_248)] [&&]:[vertical-align:top] [&&]:leading-[1.8] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:wrap] [&&]:wrap-anywhere [&&&]:text-right [&&&]:w-[40px] [&&&]:px-[5px] [&&]:py-[7px] [.diff-table_tr.deleted_&]:text-[#82071e] [.diff-table_tr.deleted_&]:[background-image:initial] [.diff-table_tr.deleted_&]:[background-color:rgb(255,_235,_233)] [.diff-table_tr.inserted_&]:text-[#116329] [.diff-table_tr.inserted_&]:[background-image:initial] [.diff-table_tr.inserted_&]:[background-color:rgb(218,_251,_225)] line-number"
                    >{row.after?.number || ''}</td
                  ><td
                    class="[&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(228,_235,_230)] text-[12px] [&&]:text-[#24352b] [border-top-color:rgb(232,_239,_248)] [border-right-color:rgb(232,_239,_248)] [border-left-color:rgb(232,_239,_248)] [&&]:[vertical-align:top] [&&]:leading-[1.8] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:wrap] [&&]:wrap-anywhere [&&]:px-[10px] [&&]:py-[7px] [.diff-table_tr.deleted_&]:text-[#82071e] [.diff-table_tr.deleted_&]:[background-image:initial] [.diff-table_tr.deleted_&]:[background-color:rgb(255,_235,_233)] [.diff-table_tr.inserted_&]:text-[#116329] [.diff-table_tr.inserted_&]:[background-image:initial] [.diff-table_tr.inserted_&]:[background-color:rgb(218,_251,_225)]"
                    ><span
                      class="[&&]:inline-block [&&]:w-[15px] [&&]:font-[700] [&&]:[user-select:none] diff-sign"
                      >{row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' '}</span
                    ><span
                      class="[&&]:[white-space-collapse:preserve] [&&]:[text-wrap-mode:wrap] line-text"
                      >{row.after?.text ?? row.before?.text}</span
                    ><small
                      class="[&&]:text-[9px] [&&]:text-[#637168] leading-[1.7] [&&]:block [&&]:ml-[15px] page-ref"
                      >Hlm. {row.after?.page ?? row.before?.page}</small
                    ></td
                  ></tr
                >{/each}</tbody
            >
          </table>
        {/if}
      </div>
      <p
        class="[&&]:leading-[1.8] [&&]:text-[11px] [&&]:text-[#65736b] [&&]:mx-[24px] [&&]:my-[14px] max-[700.01px]:[&&]:mx-[16px] max-[700.01px]:[&&]:my-[12px] compare-note"
      >
        Nomor baris mengikuti teks hasil pembacaan. Perubahan dihitung dari versi dasar ke versi
        pembanding.
      </p>
    {/if}
  {/if}
</section>
