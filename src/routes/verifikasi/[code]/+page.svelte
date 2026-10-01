<script lang="ts">
  import { reportError } from '$lib/feedback';
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { formatSen } from '$lib/pencairan';

  /** Public verification page opened from the QR on a document. No sign in, no shell: campus, document, date, amount and hash. */
  interface Result { valid: boolean; unavailable?: boolean; message?: string; code?: string; kindLabel?: string; campusName?: string; term?: number; issuedAt?: string; amountSen?: number; sha256?: string; label?: string; local?: boolean; status?: string }
  let result = $state<Result | null>(null);
  let loading = $state(true);
  let copied = $state(false);
  const code = $derived((page.params.code || '').trim().toUpperCase());
  const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  async function load() {
    loading = true;
    try {
      const response = await fetch(`/api/verifikasi/${encodeURIComponent(code)}`, { cache: 'no-store' });
      result = (await response.json().catch(() => null)) || { valid: false, unavailable: true };
      if (!response.ok || result?.unavailable) reportError(result?.message || 'Verifikasi dokumen belum berhasil. Periksa kode dan koneksi, lalu coba lagi.');
      else if (!result?.valid) reportError(result?.message || 'Kode dokumen tidak ditemukan atau sudah tidak berlaku. Periksa kode pada dokumen Anda.');
    } catch { result = { valid: false, unavailable: true }; reportError('Verifikasi dokumen belum dapat dimuat. Periksa koneksi, lalu coba lagi.'); }
    finally { loading = false; }
  }
  $effect(() => { code; untrack(() => { void load(); }); });
  async function copy() {
    if (!result?.sha256) return;
    try { await navigator.clipboard.writeText(result.sha256); copied = true; setTimeout(() => (copied = false), 3000); } catch { copied = false; reportError('Kode pemeriksaan belum dapat disalin. Pilih teksnya lalu salin secara manual.'); }
  }
</script>

<svelte:head><title>Verifikasi dokumen · Desa Energi Berdikari</title></svelte:head>

<main class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
  <header class="bg-[#0066B2] text-white">
    <div class="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
      <img src="/logo-pf-white.png" alt="Pertamina Foundation" class="h-8 w-auto" />
      <span class="text-sm font-semibold sm:text-[15px]">MonevDEB · Verifikasi dokumen</span>
    </div>
  </header>

  <section class="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
    {#if loading}
      <div class="rounded-2xl border border-slate-200/70 bg-white/90 p-6 text-sm text-slate-600" role="status">Memeriksa kode <span class="font-mono font-semibold text-slate-800">{code}</span>…</div>
    {:else if result?.valid}
      <article class="rounded-2xl border border-green-200 bg-white/95 p-5 shadow-[0_18px_45px_#0b254514] sm:p-7">
        <div class="flex items-start gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700" aria-hidden="true">✓</span>
          <div class="min-w-0">
            <h1 class="text-lg font-bold leading-snug text-slate-900 sm:text-xl">Dokumen ini diterbitkan oleh sistem MonevDEB</h1>
            {#if result.label}<p class="mt-1 text-sm text-slate-600">{result.label.replace(/^Pengajuan lokal/, 'Pengajuan pencairan')}</p>{/if}
          </div>
        </div>
        {#if result.status}<p class="mt-3 text-sm font-semibold text-slate-800">Status: {result.status}</p>{/if}
        <dl class="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div><dt class="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Kampus</dt><dd class="mt-1 text-sm font-semibold text-slate-900">{result.campusName || 'Tidak tercatat'}</dd></div>
          <div><dt class="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Dokumen</dt><dd class="mt-1 text-sm font-semibold text-slate-900">{result.kindLabel}</dd></div>
          <div><dt class="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Tahap</dt><dd class="mt-1 text-sm font-semibold text-slate-900">Tahap {result.term}</dd></div>
          <div><dt class="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Tanggal terbit</dt><dd class="mt-1 text-sm font-semibold text-slate-900">{result.issuedAt ? date.format(new Date(result.issuedAt)) + ' WIB' : 'Tidak tercatat'}</dd></div>
          <div><dt class="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Nominal</dt><dd class="mt-1 text-sm font-semibold tabular-nums text-slate-900">{result.amountSen ? formatSen(result.amountSen) : 'Tidak tercatat'}</dd></div>
          <div><dt class="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Kode</dt><dd class="mt-1 font-mono text-sm font-semibold text-slate-900">{result.code}</dd></div>
          <div class="sm:col-span-2">
            <dt class="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">SHA-256 berkas</dt>
            <dd class="mt-1 flex flex-wrap items-start gap-2">
              <code class="min-w-0 flex-1 rounded-lg bg-slate-100 px-3 py-2 font-mono text-[13px] leading-6 text-slate-800 [overflow-wrap:anywhere]">{result.sha256 || 'Tidak tercatat'}</code>
              {#if result.sha256}
                <button type="button" class="min-h-9 rounded-lg border border-[#cfe0f5] bg-white px-3 text-[13px] font-semibold text-[#17365f] transition hover:bg-[#f5f9ff] active:scale-[0.98]" onclick={copy}>{copied ? 'Tersalin' : 'Salin'}</button>
              {/if}
            </dd>
          </div>
        </dl>
        <p class="mt-5 text-sm leading-6 text-slate-600">QR mencatat asal penerbitan dokumen. Bandingkan SHA-256 di atas dengan berkas yang Anda pegang untuk memastikan isinya sama. Tanda tangan dan persetujuan mengikuti status dokumen.</p>
      </article>
    {:else if result?.unavailable}
      <article class="rounded-2xl border border-amber-200 bg-white/95 p-5 shadow-[0_18px_45px_#0b254514] sm:p-7" role="alert">
        <h1 class="text-lg font-bold text-slate-900 sm:text-xl">Verifikasi belum dapat dilakukan</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">{result.message || 'Layanan verifikasi belum tersedia. Coba lagi beberapa saat.'}</p>
        <button type="button" class="mt-4 min-h-[42px] rounded-lg border border-[#086bc9] bg-[#0066B2] px-4 text-sm font-semibold text-white transition hover:bg-[#015a9a] active:scale-[0.98]" onclick={load}>Coba lagi</button>
      </article>
    {:else}
      <article class="rounded-2xl border border-red-200 bg-white/95 p-5 shadow-[0_18px_45px_#0b254514] sm:p-7" role="alert">
        <div class="flex items-start gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg font-bold text-red-700" aria-hidden="true">!</span>
          <div class="min-w-0">
            <h1 class="text-lg font-bold leading-snug text-slate-900 sm:text-xl">Kode tidak dikenal</h1>
            <p class="mt-1 font-mono text-sm text-slate-600 [overflow-wrap:anywhere]">{code}</p>
          </div>
        </div>
        <p class="mt-5 text-sm leading-6 text-slate-600">Periksa kembali kode pada dokumen atau hubungi Pertamina Foundation.</p>
      </article>
    {/if}
    <p class="mt-6 text-center text-xs text-slate-500">Pertamina Foundation · Desa Energi Berdikari</p>
  </section>
</main>
