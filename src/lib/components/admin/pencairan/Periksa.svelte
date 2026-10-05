<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { onChange } from '$lib/realtime.svelte';
  import { KINDS, KIND_LABEL, KIND_SHORT, type Kind } from '$lib/pencairan';
  import PencairanNav from './PencairanNav.svelte';
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';

  /**
   * Antrean periksa: one row per item that waits for an admin, across every funded campus, newest arrival first.
   * Each row says what arrived and why it is here; the decision on the item screen is what clears it (decision 50).
   */
  interface QueueRow {
    campus: { id: string; name: string; code: string; initials: string; team: string };
    kind: Kind; status: string; reason: 'baru' | 'revisi_ulang' | 'bukti'; arrivedAt: string;
    arrival: { number: number; originalName: string; uploadedByName: string; created: string; note: string } | null;
    request: { note: string; actorName: string; created: string } | null;
  }
  let rows = $state<QueueRow[] | null>(null);
  let error = $state('');
  let reason = $state<'semua' | 'baru' | 'revisi_ulang' | 'bukti'>('semua');
  let kind = $state<'semua' | Kind>('semua');
  let team = $state('semua');
  const full = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const REASON: Record<QueueRow['reason'], { label: string; tone: string }> = {
    baru: { label: 'Kiriman baru', tone: 'bg-sky-100 text-sky-900' },
    revisi_ulang: { label: 'Revisi ulang', tone: 'bg-amber-100 text-amber-900' },
    bukti: { label: 'Bukti di berkas', tone: 'bg-blue-100 text-[#015a9a]' }
  };

  async function load() {
    try { rows = (await dataService.api.get<{ rows: QueueRow[] }>('/api/pencairan/periksa')).rows; error = ''; }
    catch (e) { error = e instanceof Error ? e.message : 'Antrean belum dapat dimuat.'; }
  }
  $effect(() => { untrack(() => { void load(); }); });
  $effect(() => onChange(() => void load(), { delay: 1000 }));

  const teams = $derived([...new Set((rows || []).map(r => r.campus.team).filter(Boolean))].sort());
  const visible = $derived((rows || []).filter(r => (reason === 'semua' || r.reason === reason) && (kind === 'semua' || r.kind === kind) && (team === 'semua' || r.campus.team === team)));
  const count = (r: QueueRow['reason']) => (rows || []).filter(x => x.reason === r).length;
</script>

<div class="grid gap-5 [&>*]:min-w-0">
  <div class="grid gap-2">
    <h1 class="text-2xl font-bold text-slate-900">Antrean periksa</h1>
    <p class="text-sm text-slate-500">Semua butir yang menunggu admin, yang paling baru masuk di atas. Keputusan di layar butir yang mengeluarkannya dari antrean.</p>
    <PencairanNav active="periksa" />
  </div>

  {#if error}
    <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
  {:else if !rows}
    <p class="text-sm text-slate-500">Memuat antrean…</p>
  {:else}
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex flex-wrap gap-1.5">
        {#each [['semua', 'Semua', rows.length], ['baru', 'Kiriman baru', count('baru')], ['revisi_ulang', 'Revisi ulang', count('revisi_ulang')], ['bukti', 'Bukti di berkas', count('bukti')]] as [key, label, n]}
          <button type="button" class="rounded-full border px-3 py-1 text-xs font-semibold transition {reason === key ? 'border-[#0066B2] bg-[#0066B2] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}" onclick={() => (reason = key as typeof reason)}>{label} <span class={reason === key ? 'text-blue-100' : 'text-slate-400'}>{n}</span></button>
        {/each}
      </div>
      <label class="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-600">Butir
        <select class="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800" bind:value={kind}>
          <option value="semua">Semua butir</option>
          {#each KINDS as k}<option value={k}>{KIND_SHORT[k]}</option>{/each}
        </select>
      </label>
      {#if teams.length}
        <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">Tim
          <select class="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800" bind:value={team}>
            <option value="semua">Semua tim</option>
            {#each teams as t}<option value={t}>{t}</option>{/each}
          </select>
        </label>
      {/if}
    </div>

    {#if !visible.length}
      <p class="rounded-2xl border border-green-200 bg-green-50/60 px-4 py-3 text-[14px] text-green-900">Tidak ada yang menunggu pemeriksaan{rows.length ? ' pada saringan ini' : ''}. Semua kiriman sudah diputuskan.</p>
    {:else}
      <ol class="grid gap-2">
        {#each visible as r (r.campus.id + r.kind)}
          <li class="grid gap-2 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-[0_10px_30px_#0b254508] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div class="grid gap-1.5 [&>*]:min-w-0">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CampusLogo code={r.campus.code} initials={r.campus.initials} size={28} />
                <span class="text-[14px] font-bold text-slate-900">{r.campus.name}</span>
                {#if r.campus.team}<span class="text-[12px] text-slate-500">Tim {r.campus.team}</span>{/if}
                <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12.5px] font-semibold text-slate-800">{KIND_LABEL[r.kind]}</span>
                <span class="rounded-full px-2.5 py-0.5 text-[12px] font-semibold {REASON[r.reason].tone}">{REASON[r.reason].label}</span>
                <span class="text-[12px] text-slate-500">{full.format(new Date(r.arrivedAt))}</span>
              </div>
              {#if r.arrival}
                <p class="text-[13.5px] text-slate-700">Versi {r.arrival.number} <span class="[overflow-wrap:anywhere]">{r.arrival.originalName}</span>{r.arrival.uploadedByName ? ` · diunggah ${r.arrival.uploadedByName}` : ''}{r.arrival.note ? ` · "${r.arrival.note}"` : ''}</p>
              {:else}
                <p class="text-[13.5px] text-slate-700">{r.reason === 'bukti' ? 'Lembar ini ada di berkas kampus dan belum diputuskan.' : 'Menunggu keputusan.'}</p>
              {/if}
              {#if r.request}
                <p class="rounded-lg bg-amber-50 px-3 py-1.5 text-[13.5px] text-amber-900"><span class="font-semibold">Yang diminta {r.request.actorName ? `oleh ${r.request.actorName}` : ''} · {full.format(new Date(r.request.created))}:</span> {r.request.note || 'tanpa catatan'}</p>
              {/if}
            </div>
            <a href={`/admin/pencairan/${r.campus.id}?butir=${r.kind}`} class="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-[#0066B2] px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_#0066b233] hover:bg-[#015a9a]">Periksa</a>
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
</div>
