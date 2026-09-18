<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date } from '$lib/domain';
  import {
    DEMO_KPIS,
    DOCUMENT_TYPES,
    DOCUMENT_LABELS,
    evaluateKpi,
    type PaymentCase,
    type PaymentAction,
    type DocumentKind
  } from '$lib/payments';
  import PaymentProgress from './PaymentProgress.svelte';
  import PaymentFile from './PaymentFile.svelte';
  let { payment: p }: { payment: PaymentCase } = $props();
  let kpis = $state(untrack(() => p.kpis.map((k) => ({ ...k }))));
  let amount = $state(untrack(() => p.amount));
  let note = $state('');
  let documentNotes = $state<Record<string, string>>({});
  let preview = $state(untrack(() => p.proposalId));
  const proposal = $derived(app.data?.proposals.find((v) => v.id === p.proposalId));
  const role = $derived(app.session?.role);
  const canEditKpi = $derived(role === 'admin' && p.stage === 'kpi');
  const result = $derived(evaluateKpi(kpis));
  const canApprove = $derived(role === 'admin' && ['pf', 'campus', 'finance'].includes(p.stage));
  const busy = $derived(app.busy || app.loading || app.stale);
  const fileName = $derived(
    preview === p.proposalId
      ? proposal?.filename || 'proposal.pdf'
      : p.documents.find((d) => d.fileId === preview)?.filename ||
          p.archives.find((a) => a.id === preview)?.filename ||
          'dokumen.pdf'
  );
  async function action(kind: PaymentAction) {
    await app.mutate(
      () => dataService.paymentAction(p.id, p.revision, kind, note),
      'Tahap pencairan diperbarui.'
    );
  }
  async function upload(kind: DocumentKind, event: Event) {
    const input = event.currentTarget as HTMLInputElement,
      file = input.files?.[0];
    if (file)
      await app.mutate(
        () => dataService.uploadPaymentDocument(p.id, p.revision, kind, file),
        'Berkas tersimpan dan menunggu pemeriksaan.'
      );
    input.value = '';
  }
  async function exportPackage() {
    await app.mutate(async () => {
      const result = await dataService.exportPayment(p.id, p.revision);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, 'PDF diarsipkan dan dikirim ke ruang kerja keuangan demo.');
  }
</script>
<PaymentProgress payment={p} showAmount />
<div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
  <div class="grid min-w-0 gap-5">
    <section class="panel-block" aria-label="Penilaian KPI">
      <h2>Penilaian KPI contoh</h2>
      <p class="hint">
        Isian bukti terstruktur dinilai terhadap ambang contoh. Admin memeriksa kesesuaiannya dengan
        PDF; aplikasi tidak membaca isi PDF secara otomatis.
      </p>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void app.mutate(
            () => dataService.savePaymentKpi(p.id, p.revision, amount, kpis),
            'Bukti KPI tersimpan.'
          );
        }}
      >
        <label
          >Nominal pencairan (Rp)<input
            aria-label="Nominal pencairan"
            type="number"
            min="1"
            max="1000000000000"
            step="1"
            required
            bind:value={amount}
            disabled={!canEditKpi || busy}
          /></label
        >
        {#each kpis as k, i}
          <fieldset
            class="mt-4 rounded-lg border border-slate-200 p-3"
            disabled={!canEditKpi || busy}
          >
            <legend class="px-1 text-sm font-semibold">{DEMO_KPIS[i].label}</legend>
            <p class="hint">Minimum contoh: {DEMO_KPIS[i].minimum} {DEMO_KPIS[i].unit}</p>
            <div class="grid grid-cols-2 gap-3">
              <label
                >Target ({DEMO_KPIS[i].unit})<input
                  aria-label={`Target ${DEMO_KPIS[i].label}`}
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="any"
                  required
                  bind:value={k.target}
                /></label
              ><label
                >Halaman PDF<input
                  aria-label={`Halaman ${DEMO_KPIS[i].label}`}
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  required
                  bind:value={k.page}
                /></label
              >
            </div>
            <label
              >Bukti/rencana pada proposal<textarea
                aria-label={`Bukti ${DEMO_KPIS[i].label}`}
                rows="3"
                maxlength="3000"
                bind:value={k.evidence}></textarea></label
            >
          </fieldset>
          <p class={`mt-1 text-xs ${result.checks[i].met ? 'text-emerald-700' : 'text-amber-800'}`}>
            {result.checks[i].met
              ? 'Memenuhi isian dan target contoh'
              : 'Belum memenuhi target atau bukti minimal 20 karakter'}
          </p>
        {/each}
        {#if canEditKpi}<button class="primary mt-4" disabled={busy}>Simpan bukti KPI</button>{/if}
      </form>
      {#if p.assessedAt}<p class="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
          Diperiksa {p.assessedBy} · {date(p.assessedAt)}<br />{p.assessmentNote}
        </p>{/if}
    </section>
    <section class="panel-block" aria-label="Kelengkapan dokumen pembayaran">
      <h2>Dokumen pembayaran</h2>
      <p class="hint">Unggah PDF maksimal 10 MiB per berkas setelah KPI dinyatakan sesuai.</p>
      {#each DOCUMENT_TYPES as kind}
        {@const d = p.documents.find((d) => d.kind === kind)}
        <article class="mt-3 rounded-lg border border-slate-200 p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-semibold">{DOCUMENT_LABELS[kind]}</h3>
            <span class="text-xs text-slate-600"
              >{d
                ? { pending: 'Menunggu pemeriksaan', accepted: 'Valid', revision: 'Perlu revisi' }[
                    d.status
                  ]
                : 'Belum diunggah'}</span
            >
          </div>
          {#if d}<button
              class="mt-2 break-all text-left text-xs text-blue-700 underline"
              onclick={() => (preview = d.fileId)}>Periksa berkas {DOCUMENT_LABELS[kind]}</button
            >
            <p class="hint break-all">{d.filename}{d.note ? ` · ${d.note}` : ''}</p>{/if}
          {#if role === 'admin' && p.stage === 'documents'}<label class="mt-2"
              >{d ? 'Ganti' : 'Unggah'}
              {DOCUMENT_LABELS[kind]}<input
                type="file"
                accept="application/pdf,.pdf"
                aria-label={`Unggah ${DOCUMENT_LABELS[kind]}`}
                disabled={busy}
                onchange={(e) => upload(kind, e)}
              /></label
            >{/if}
          {#if role === 'admin' && p.stage === 'documents' && d}
            <label
              >Catatan berkas<input
                aria-label={`Catatan ${DOCUMENT_LABELS[kind]}`}
                maxlength="3000"
                bind:value={documentNotes[kind]}
              /></label
            >
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                class="secondary"
                disabled={busy}
                onclick={() =>
                  app.mutate(
                    () =>
                      dataService.reviewPaymentDocument(
                        p.id,
                        p.revision,
                        kind,
                        true,
                        documentNotes[kind] || ''
                      ),
                    'Dokumen dinyatakan valid.'
                  )}>Validkan {DOCUMENT_LABELS[kind]}</button
              ><button
                class="secondary"
                disabled={busy || !documentNotes[kind]?.trim()}
                onclick={() =>
                  app.mutate(
                    () =>
                      dataService.reviewPaymentDocument(
                        p.id,
                        p.revision,
                        kind,
                        false,
                        documentNotes[kind] || ''
                      ),
                    'Revisi berkas diminta.'
                  )}>Minta revisi {DOCUMENT_LABELS[kind]}</button
              >
            </div>
          {/if}
        </article>
      {/each}
    </section>
  </div>
  <div class="grid min-w-0 gap-5">
    <section class="panel-block" aria-label="Pratinjau berkas pencairan">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2>Berkas yang diperiksa</h2>
        <button class="text-xs text-blue-700 underline" onclick={() => (preview = p.proposalId)}
          >Lihat proposal</button
        >
      </div>
      <PaymentFile paymentId={p.id} fileId={preview} filename={fileName} />
    </section>
    <section class="panel-block" aria-label="Persetujuan pencairan">
      <h2>Persetujuan & tindak lanjut</h2>
      <p class="hint">Admin PF mencatat persetujuan setiap pihak.</p>
      {#each ['admin', 'campus', 'finance'] as r}{@const a = p.approvals.find((a) => a.role === r)}
        <div class="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <strong
            >{r === 'admin'
              ? 'Pertamina Foundation'
              : r === 'campus'
                ? 'Pihak kampus'
                : 'Keuangan'}</strong
          >
          <p class="hint">{a ? `${a.actorName} · ${date(a.at)}` : 'Menunggu persetujuan'}</p>
          {#if a?.note}<p class="text-xs">{a.note}</p>{/if}
        </div>{/each}
      {#if (role === 'admin' && ['kpi', 'documents'].includes(p.stage)) || canApprove || (role === 'admin' && p.stage === 'sent')}
        <label class="mt-4"
          >{p.stage === 'sent'
            ? 'Referensi pencairan simulasi'
            : 'Catatan pemeriksaan / persetujuan'}<textarea
            aria-label="Catatan tindakan pencairan"
            rows="3"
            maxlength="3000"
            bind:value={note}></textarea></label
        >
        <div class="mt-3 flex flex-wrap gap-2">
          {#if role === 'admin' && p.stage === 'kpi'}<button
              class="primary"
              disabled={busy || !result.passed || !note.trim()}
              onclick={() => action('assess')}>Nyatakan KPI sesuai</button
            >{/if}
          {#if role === 'admin' && p.stage === 'documents'}<button
              class="primary"
              disabled={busy ||
                !DOCUMENT_TYPES.every((k) =>
                  p.documents.some((d) => d.kind === k && d.status === 'accepted')
                )}
              onclick={() => action('submit-documents')}>Selesaikan pemeriksaan berkas</button
            >{/if}
          {#if canApprove}<button class="primary" disabled={busy} onclick={() => action('approve')}
              >Catat persetujuan</button
            >{/if}
          {#if canApprove || (role === 'admin' && p.stage === 'documents')}<button
              class="secondary"
              disabled={busy || !note.trim()}
              onclick={() => action('revise')}>Kembalikan untuk revisi</button
            >{/if}
          {#if role === 'admin' && p.stage === 'sent'}<button
              class="primary"
              disabled={busy || !note.trim()}
              onclick={() => action('paid')}>Tandai sudah dicairkan</button
            >{/if}
        </div>
      {/if}
      {#if p.stage === 'ready' && role === 'admin'}<button
          class="primary mt-4"
          disabled={busy}
          onclick={exportPackage}>Ekspor PDF & kirim ke keuangan</button
        >
        <p class="hint">
          Proposal, hasil KPI, empat dokumen, dan persetujuan digabung menjadi satu PDF. Salinan
          tetap tersedia di arsip.
        </p>{/if}
    </section>
    <section class="panel-block" aria-label="Arsip pencairan">
      <h2>Arsip keuangan</h2>
      {#if p.archives.length}{#each p.archives as a}<button
            class="mt-3 block break-all text-left text-sm text-blue-700 underline"
            onclick={() => (preview = a.id)}>{a.filename}</button
          >
          <p class="hint">{a.createdBy} · {date(a.createdAt)}</p>{/each}{:else}<p class="hint">
          Paket tersedia setelah seluruh pihak menyetujui dan PDF dikirim.
        </p>{/if}
    </section>
    <section class="panel-block" aria-label="Riwayat pencairan">
      <h2>Riwayat proses</h2>
      <ol class="mt-3 space-y-3">
        {#each [...p.history].reverse() as h}<li class="border-l-2 border-blue-200 pl-3">
            <strong class="text-xs">{h.action}</strong>
            <p class="hint">{h.actor} · {date(h.at)}</p>
            {#if h.note}<p class="break-words text-xs text-slate-700">{h.note}</p>{/if}
          </li>{/each}
      </ol>
    </section>
  </div>
</div>
<style>
  .panel-block {
    min-width: 0;
    border: 1px solid #dce7f7;
    border-radius: 12px;
    padding: 20px;
    background: white;
  }
  h2 {
    margin: 0;
    color: #0d234c;
    font-size: 16px;
    font-weight: 650;
  }
  .hint {
    margin: 7px 0;
    color: #61738b;
    font-size: 12px;
    line-height: 1.7;
  }
  label {
    display: grid;
    gap: 7px;
    margin-top: 10px;
    font-size: 12px;
    font-weight: 600;
  }
  input,
  textarea {
    width: 100%;
    min-width: 0;
    padding: 10px;
    border: 1px solid #cdd8e5;
    border-radius: 7px;
    font: inherit;
    background: white;
  }
  input:disabled,
  textarea:disabled {
    background: #f8fafc;
    color: #475569;
  }
  .primary,
  .secondary {
    min-height: 40px;
    padding: 10px 14px;
    border: 1px solid #bfd2e9;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  .primary {
    background: #1260c5;
    color: white;
  }
  .secondary {
    background: white;
    color: #125ab8;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 3px solid #83baff;
    outline-offset: 3px;
  }
</style>
