<script lang="ts">
  import { reportError } from '$lib/feedback';
  import { dataService } from '$lib/data/service';
  import { formatSen } from '$lib/pencairan';
  import type { KartuData } from './kartu-types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BuktiTransfer from './BuktiTransfer.svelte';

  /** Closing row "Pembayaran": one card with the Tahap 1 transfer, and while unpaid one bar with three values and one button. */
  let { campusId, data, onchange }: { campusId: string; data: KartuData; onchange: (next: KartuData, message?: string) => void } = $props();

  let paidAt = $state('');
  let paidRef = $state('');
  let busy = $state(false);
  let error = $state('');

  const dateOnly = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const dayOf = (iso: string) => { const d = new Date(iso.includes('T') || iso.includes(' ') ? iso : iso + 'T00:00:00'); return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : dateOnly.format(d); };
  const field = 'grid gap-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500';
  const input = 'min-h-[34px] rounded-lg border border-slate-300 px-2 text-[13px] font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-[#0066B2] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';
  const btnGreen = 'inline-flex min-h-[36px] items-center justify-center gap-2 rounded-lg bg-green-700 px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_#15803d33] transition hover:bg-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';

  const paid = $derived(Boolean(data.disbursement.paidAt));
  const requested = $derived(data.disbursement.requestedSen || data.summary.requestedSen || 0);
  const reason = $derived(!requested ? 'Setujui RAB 70% dulu.' : (data as any).journey&&!paid&&(data as any).journey.status!=='selesai'?'Selesaikan revisi dan pemeriksaan pengajuan terlebih dahulu.':(data as any).journey&&!paid&&data.readiness.state!=='siap_dibayar'?'Lengkapi dokumen bertanda tangan/asli dan simpan lampiran terlebih dahulu.':'');
  const ready = $derived(!reason && Boolean(paidAt) && Boolean(paidRef.trim()));
  const hint = $derived(reason || (!paidAt ? 'Isi tanggal bayar.' : !paidRef.trim() ? 'Isi referensi transfer.' : 'Catat transfer Tahap 1'));

  async function save() {
    if (busy || !ready) return;
    busy = true; error = '';
    try {
      const next = await dataService.api.patch<KartuData>(`/api/pencairan/${campusId}/pembayaran`, { paidAt, paidSen: requested, paidRef: paidRef.trim(), paidNote: '', expectedRevision:data.disbursement.revision });
      paidAt = ''; paidRef = '';
      onchange(next, 'Pembayaran Tahap 1 tercatat.');
    } catch (e) { error = reportError(e instanceof Error ? e.message : 'Pembayaran belum tercatat.'); }
    finally { busy = false; }
  }
</script>

<div class="flex h-full min-h-0 flex-1 flex-col">
  <div class="min-h-0 flex-1 overflow-auto bg-white p-4">
    <div class="grid w-full gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="grid gap-2"><h3 class="text-base font-bold text-slate-900">Transfer Tahap 1</h3><p class="text-xs text-slate-500">Nominal diajukan</p><p class="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{requested ? formatSen(requested) : 'Belum ditetapkan'}</p></div>
        <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold {paid ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}">{#if paid}<Icon name="check" size={14} />{/if}{paid ? 'Sudah dibayar' : 'Belum dibayar'}</span>
      </div>
      {#if paid}
        <dl class="grid gap-4 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div class="grid content-start gap-1.5"><dt class="text-xs text-slate-500">Tanggal pembayaran</dt><dd class="font-semibold text-slate-900">{dayOf(data.disbursement.paidAt)}</dd></div>
          <div class="grid content-start gap-1.5"><dt class="text-xs text-slate-500">Jumlah dibayar</dt><dd class="font-semibold tabular-nums text-slate-900">{formatSen(data.disbursement.paidSen)}</dd></div>
          <div class="grid min-w-0 content-start gap-1.5"><dt class="text-xs text-slate-500">Referensi transfer</dt><dd class="break-words font-semibold text-slate-900">{data.disbursement.paidRef}</dd></div>
          <div class="grid content-start gap-1.5"><dt class="text-xs text-slate-500">Dicatat oleh</dt><dd class="font-semibold text-slate-900">{data.disbursement.paidByName || 'Sistem'}</dd></div>
        </dl>
      {:else}
        <p class="text-xs text-slate-500">Jumlah yang dibayar harus sama dengan yang diajukan.</p>{#if reason}<p class="text-sm text-amber-900" role="status">{reason}</p><div class="flex flex-wrap gap-3 text-sm font-semibold text-[#0066B2]"><a href={`/admin/pencairan/${campusId}?butir=ttd`}>Buka tanda tangan</a><a href={`/admin/pencairan/${campusId}?butir=lampiran`}>Buka lampiran</a></div>{/if}
      {/if}
      <section class="grid gap-3 border-t border-slate-200 pt-5" aria-label="Lampiran bukti transfer"><h4 class="text-sm font-semibold text-slate-900">Bukti transfer</h4><BuktiTransfer {campusId} {data} editable {onchange}/></section>
    </div>
  </div>

  {#if !paid}
    <form class="flex flex-wrap items-end gap-2 border-t border-slate-200 bg-white px-4 py-2.5" onsubmit={(e) => { e.preventDefault(); void save(); }}>
      <label class={field}>Tanggal bayar<input type="date" class={input} bind:value={paidAt} disabled={Boolean(reason) || busy} required /></label>
      <div class={field}>Jumlah<span class="flex min-h-[34px] items-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-[13px] font-medium normal-case tracking-normal text-slate-900 tabular-nums">{requested ? formatSen(requested) : 'Belum ditetapkan'}</span></div>
      <label class="{field} min-w-[200px] flex-1">Referensi transfer<input type="text" class={input} bind:value={paidRef} maxlength="120" disabled={Boolean(reason) || busy} required /></label>
      <span class="ml-auto flex flex-wrap items-center gap-2">
        {#if error}<span class="text-xs font-medium text-red-700" role="alert">{error}</span>{:else if reason}<span class="text-xs font-medium text-amber-900">{reason}</span>{/if}
        <button type="submit" class={btnGreen} title={hint} disabled={!ready || busy}>
          {#if busy}<span class="size-4 rounded-full border-2 border-current border-t-transparent [animation:spin_0.8s_linear_infinite]" aria-hidden="true"></span>{:else}<Icon name="check" size={15} />{/if}Catat pembayaran
        </button>
      </span>
    </form>
  {/if}
</div>
