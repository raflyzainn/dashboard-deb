<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { latestSubmission, changedSinceSubmission, verificationLabel } from '$lib/verification';
  import { date } from '$lib/domain';
  import Badge from './Badge.svelte';
  import Modal from './Modal.svelte';
  const latest = $derived(latestSubmission(app.data!, app.session!.campusId!));
  const changed = $derived(latest ? changedSinceSubmission(app.data!, latest) : false);
  const pending = $derived(latest?.status === 'pending');
  const canSubmit = $derived(!pending && (!latest || latest.status === 'revision' || changed));
  let confirm = $state(false);
</script>
<section class="panel submission-status" aria-label="Status pengajuan DEB">
  <div class="row-between"><h2>Verifikasi data DEB</h2><Badge tone={pending ? 'blue' : latest?.status === 'approved' && !changed ? 'green' : 'amber'}>{pending ? verificationLabel.pending : changed ? 'Perubahan belum dikirim' : latest ? verificationLabel[latest.status] : 'Belum dikirim'}</Badge></div>
  <p>{pending ? 'Data yang dikirim sedang diperiksa Admin PF. Nilai indikator dikunci sampai ada keputusan.' : latest?.status === 'approved' && !changed ? 'Admin PF telah mengonfirmasi data pengajuan ini. Pembaruan berikutnya perlu dikirim kembali untuk diverifikasi.' : 'Lengkapi indikator, lalu kirim data untuk ditinjau. Admin dapat menyetujui atau mengembalikan data dengan catatan revisi.'}</p>
  {#if latest}<small>Pengajuan #{latest.version} · Dikirim {date(latest.submittedAt)}{#if latest.reviewedAt} · Ditinjau {date(latest.reviewedAt)}{/if}</small>{/if}
  {#if latest?.decisionNote}<div class="decision-note"><strong>Catatan Admin PF</strong><p class="pre-wrap">{latest.decisionNote}</p></div>{/if}
  {#if canSubmit}<button title="Hanya baca pada P2; penyimpanan menyusul P3" class="button" disabled={app.readOnly || (app.busy)} onclick={() => confirm = true}>{latest ? 'Kirim ulang untuk verifikasi' : 'Kirim untuk verifikasi'}</button>{/if}
</section>
{#if confirm}<Modal title="Kirim data DEB untuk verifikasi?" onclose={() => { if (!app.busy) confirm = false; }}><p>Seluruh nilai indikator saat ini akan disimpan sebagai satu pengajuan. Anda dapat mengubahnya kembali setelah Admin PF memberikan keputusan.</p><div class="dialog-actions"><button class="button secondary" disabled={app.busy} onclick={() => confirm = false}>Batal</button><button title="Hanya baca pada P2; penyimpanan menyusul P3" class="button" disabled={app.readOnly || (app.busy)} onclick={async () => { if (await app.mutate(() => dataService.submitDeb(app.session!), 'Data DEB dikirim untuk verifikasi.')) confirm = false; }}>Kirim data DEB</button></div></Modal>{/if}
<style>.submission-status{padding:22px;margin-bottom:22px}.submission-status h2{font-size:16px}.submission-status p{font-size:13px;line-height:1.8;margin:12px 0;color:#61715f}.submission-status small{display:block;color:#61715f}.submission-status>.button{margin-top:18px}.decision-note{border-left:3px solid #96ad7c;padding-left:14px;margin-top:16px}.decision-note strong{font-size:12px}.row-between{gap:12px;flex-wrap:wrap}</style>
