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
  const complete = $derived(
    app.data!.definitions.length > 0 &&
      app.data!.indicators.filter((i) => i.campusId === app.session!.campusId).length ===
        app.data!.definitions.length
  );
  const canSubmit = $derived(
    complete && !pending && (!latest || latest.status === 'revision' || changed)
  );
  let confirm = $state(false);
</script>
<section class="panel submission-status" class:compact aria-label="Status pengajuan DEB">
  <div class="row-between">
    <h2>Verifikasi data DEB</h2>
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
  <p>
    {blocked
      ? 'Simpan atau batalkan perubahan indikator sebelum mengirim verifikasi.'
      : pending
        ? 'Data yang dikirim sedang diperiksa Admin PF. Nilai indikator dikunci sampai ada keputusan.'
        : latest?.status === 'approved' && !changed
          ? 'Admin PF telah mengonfirmasi data pengajuan ini. Pembaruan berikutnya perlu dikirim kembali untuk diverifikasi.'
          : 'Lengkapi indikator, lalu kirim data untuk ditinjau. Admin dapat menyetujui atau mengembalikan data dengan catatan revisi.'}
  </p>
  {#if latest && !compact}<small
      >Pengajuan #{latest.version} · Dikirim {date(latest.submittedAt)}{#if latest.reviewedAt}
        · Ditinjau {date(latest.reviewedAt)}{/if}</small
    >{/if}
  {#if latest?.decisionNote && !compact}<div class="decision-note">
      <strong>Catatan Admin PF</strong>
      <p class="pre-wrap">{latest.decisionNote}</p>
    </div>{/if}
  {#if !complete}<p role="status">
      Konfigurasi indikator belum lengkap. Hubungi Admin sebelum mengirim pengajuan.
    </p>{/if}
  {#if canSubmit}<button
      class="button"
      disabled={blocked || app.readOnly || app.loading || app.busy || app.stale}
      onclick={() => (confirm = true)}
      >{latest ? 'Kirim ulang untuk verifikasi' : 'Kirim untuk verifikasi'}</button
    >{/if}
</section>
{#if confirm}<Modal
    title="Kirim data DEB untuk verifikasi?"
    onclose={() => {
      if (!app.busy) confirm = false;
    }}
    ><p>
      Seluruh nilai indikator saat ini akan disimpan sebagai satu pengajuan. Anda dapat mengubahnya
      kembali setelah Admin PF memberikan keputusan.
    </p>
    <div class="dialog-actions">
      <button class="button secondary" disabled={app.busy} onclick={() => (confirm = false)}
        >Batal</button
      ><button
        class="button"
        disabled={blocked || !canSubmit || app.readOnly || app.loading || app.busy || app.stale}
        onclick={async () => {
          if (await app.mutate(() => dataService.submitDeb(), 'Data DEB dikirim untuk verifikasi.'))
            confirm = false;
        }}>Kirim data DEB</button
      >
    </div></Modal
  >{/if}
<style>
  .submission-status {
    padding: 22px;
    margin-bottom: 22px;
  }
  .submission-status h2 {
    font-size: 16px;
  }
  .submission-status p {
    font-size: 13px;
    line-height: 1.8;
    margin: 12px 0;
    color: #61715f;
  }
  .submission-status small {
    display: block;
    color: #61715f;
  }
  .submission-status > .button {
    margin-top: 18px;
  }
  .decision-note {
    border-left: 3px solid #96ad7c;
    padding-left: 14px;
    margin-top: 16px;
  }
  .decision-note strong {
    font-size: 12px;
  }
  .row-between {
    gap: 12px;
    flex-wrap: wrap;
  }
  .compact {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 24px;
    padding: 16px 20px;
    margin: 0;
    border-color: #cce7f8;
    box-shadow: 0 4px 20px #0c4a6e12;
  }
  .compact .row-between {
    justify-content: flex-start;
    grid-column: 1;
  }
  .compact h2 {
    color: #153e56;
    font-size: 13px;
  }
  .compact p {
    grid-column: 1;
    margin: 5px 0 0;
    color: #607d90;
    font-size: 11px;
    line-height: 1.6;
  }
  .compact > .button {
    grid-column: 2;
    grid-row: 1 / 4;
    margin: 0;
    background: #0284c7;
    border-color: #0284c7;
  }
  @media (max-width: 700px) {
    .compact {
      grid-template-columns: 1fr;
      padding: 12px 14px;
      gap: 4px;
    }
    .compact > .button {
      grid-column: 1;
      grid-row: auto;
      width: 100%;
      margin-top: 6px;
    }
    .compact .row-between {
      gap: 8px;
    }
  }
</style>
