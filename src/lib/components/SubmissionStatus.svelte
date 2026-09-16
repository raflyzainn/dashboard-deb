<script lang="ts">
  import type { Snippet } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { latestSubmission, changedSinceSubmission, verificationLabel } from '$lib/verification';
  import { date } from '$lib/domain';
  import Badge from './Badge.svelte';
  import Modal from './Modal.svelte';
  let {
    compact = false,
    blocked = false,
    statusIcon
  }: { compact?: boolean; blocked?: boolean; statusIcon?: Snippet } = $props();
  const latest = $derived(latestSubmission(app.data!, app.session!.campusId!));
  const changed = $derived(latest ? changedSinceSubmission(app.data!, latest) : false);
  const pending = $derived(latest?.status === 'pending');
  const unfilledCount = $derived(
    app.data!.indicators.filter((i) => i.campusId === app.session!.campusId && i.unfilled).length
  );
  const complete = $derived(
    app.data!.definitions.length > 0 &&
      app.data!.indicators.filter((i) => i.campusId === app.session!.campusId).length ===
        app.data!.definitions.length
  );
  const canSubmit = $derived(
    complete &&
      app.data?.period?.state !== 'archived' &&
      !pending &&
      (!latest || latest.status === 'revision' || changed)
  );
  let confirm = $state(false);
</script>
<section
  class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:mb-[22px] [&&]:p-[22px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] [&_p]:text-[#5d7595]! [&_small]:text-[#5d7595]! [&.compact]:[box-shadow:0_4px_20px_#0c4a6e12] [&.compact]:grid [&.compact]:grid-cols-[minmax(0,_1fr)_auto] [&.compact]:items-center [&.compact]:gap-x-[24px] [&.compact]:px-[20px] [&.compact]:py-[16px] [&.compact]:m-[0px] [&.compact]:border-[color:rgb(204,_231,_248)] max-[700.01px]:[&.compact]:grid-cols-[1fr] max-[700.01px]:[&.compact]:gap-x-[4px] max-[700.01px]:[&.compact]:gap-y-[4px] max-[700.01px]:[&.compact]:px-[14px] max-[700.01px]:[&.compact]:py-[12px] panel submission-status"
  class:compact
  aria-label="Status pengajuan DEB"
>
  <div
    class="flex items-center justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:flex-wrap [.compact_&]:justify-start [.compact_&]:[grid-column-start:1] [.compact_&]:[grid-column-end:auto] max-[700.01px]:[.compact_&]:gap-y-[8px] max-[700.01px]:[.compact_&]:gap-x-[8px] row-between"
  >
    <h2
      class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] m-[0px] [.compact_&]:text-[#153e56] [.compact_&]:text-[13px]"
    >
      Verifikasi data DEB
    </h2>
    <Badge tone={pending ? 'blue' : latest?.status === 'approved' && !changed ? 'green' : 'amber'}
      >{pending
        ? verificationLabel.pending
        : changed
          ? 'Perubahan belum dikirim'
          : latest
            ? verificationLabel[latest.status]
            : 'Belum dikirim'}</Badge
    >
    {@render statusIcon?.()}
  </div>
  <p
    class="[&&]:leading-[1.8] [&&]:text-[13px] [&&]:text-[#61715f] [&&]:mx-[0px] [&&]:my-[12px] [.compact_&]:mt-[5px] [.compact_&]:mb-[0px] [.compact_&]:leading-[1.6] [.compact_&]:text-[11px] [.compact_&]:text-[#607d90] [.compact_&]:[grid-column-start:1] [.compact_&]:[grid-column-end:auto] [.compact_&]:mx-[0px]"
  >
    {app.data?.period?.state === 'archived'
      ? 'Arsip periode ini hanya dapat dibaca. Pilih periode aktif untuk mengisi data.'
      : unfilledCount
        ? `Lengkapi ${unfilledCount} indikator yang belum diisi. Angka nol tetap harus diisikan jika belum ada capaian.`
        : blocked
          ? 'Simpan atau batalkan perubahan indikator sebelum mengirim verifikasi.'
          : pending
            ? 'Data yang dikirim sedang diperiksa Admin PF. Nilai indikator dikunci sampai ada keputusan.'
            : latest?.status === 'approved' && !changed
              ? 'Admin PF telah mengonfirmasi data pengajuan ini. Pembaruan berikutnya perlu dikirim kembali untuk diverifikasi.'
              : 'Lengkapi indikator, lalu kirim data untuk ditinjau. Admin dapat menyetujui atau mengembalikan data dengan catatan revisi.'}
  </p>
  {#if latest && !compact}<small class="text-[11px] [&&]:text-[#61715f] leading-[1.7] [&&]:block"
      >Pengajuan #{latest.version} · Dikirim {date(latest.submittedAt)}{#if latest.reviewedAt}
        · Ditinjau {date(latest.reviewedAt)}{/if}</small
    >{/if}
  {#if latest?.decisionNote && !compact}<div
      class="[&&]:[border-left-width:3px] [&&]:[border-left-style:solid] [border-left-color:#1681df]! [&&]:pl-[14px] [&&]:mt-[16px] decision-note"
    >
      <strong class="font-[650] [&&]:text-[12px]">Catatan Admin PF</strong>
      <p
        class="[&&]:leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere [&&]:text-[13px] [&&]:text-[#61715f] [&&]:mx-[0px] [&&]:my-[12px] [.compact_&]:mt-[5px] [.compact_&]:mb-[0px] [.compact_&]:leading-[1.6] [.compact_&]:text-[11px] [.compact_&]:text-[#607d90] [.compact_&]:[grid-column-start:1] [.compact_&]:[grid-column-end:auto] [.compact_&]:mx-[0px] pre-wrap"
      >
        {latest.decisionNote}
      </p>
    </div>{/if}
  {#if !complete}<p
      class="[&&]:leading-[1.8] [&&]:text-[13px] [&&]:text-[#61715f] [&&]:mx-[0px] [&&]:my-[12px] [.compact_&]:mt-[5px] [.compact_&]:mb-[0px] [.compact_&]:leading-[1.6] [.compact_&]:text-[11px] [.compact_&]:text-[#607d90] [.compact_&]:[grid-column-start:1] [.compact_&]:[grid-column-end:auto] [.compact_&]:mx-[0px]"
      role="status"
    >
      Konfigurasi indikator belum lengkap. Hubungi Admin sebelum mengirim pengajuan.
    </p>{/if}
  {#if canSubmit}<button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] [&:not(.compact>*)]:mt-[18px] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] [.compact>&]:[background-image:initial] [.compact>&]:[background-color:rgb(2,_132,_199)] [.compact>&]:[grid-column-start:2] [.compact>&]:[grid-column-end:auto] [.compact>&]:[grid-row-start:1] [.compact>&]:[grid-row-end:4] [.compact>&]:m-[0px] [.compact>&]:border-[color:rgb(2,_132,_199)] max-[700.01px]:[.compact>&]:mt-[6px] max-[700.01px]:[.compact>&]:[grid-column-start:1] max-[700.01px]:[.compact>&]:[grid-column-end:auto] max-[700.01px]:[.compact>&]:[grid-row-start:auto] max-[700.01px]:[.compact>&]:[grid-row-end:auto] max-[700.01px]:[.compact>&]:w-[100%] button"
      disabled={blocked ||
        unfilledCount > 0 ||
        app.readOnly ||
        app.loading ||
        app.busy ||
        app.stale}
      onclick={() => (confirm = true)}
      >{latest ? 'Kirim ulang untuk verifikasi' : 'Kirim untuk verifikasi'}</button
    >{/if}
</section>
{#if confirm}<Modal
    title="Kirim data DEB untuk verifikasi?"
    onclose={() => {
      if (!app.busy) confirm = false;
    }}
    ><p class="leading-[1.8] m-[0px]">
      Seluruh nilai indikator saat ini akan disimpan sebagai satu pengajuan. Anda dapat mengubahnya
      kembali setelah Admin PF memberikan keputusan.
    </p>
    <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
        disabled={app.busy}
        onclick={() => (confirm = false)}>Batal</button
      ><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
        disabled={blocked ||
          unfilledCount > 0 ||
          !canSubmit ||
          app.readOnly ||
          app.loading ||
          app.busy ||
          app.stale}
        onclick={async () => {
          if (await app.mutate(() => dataService.submitDeb(), 'Data DEB dikirim untuk verifikasi.'))
            confirm = false;
        }}>Kirim data DEB</button
      >
    </div></Modal
  >{/if}
