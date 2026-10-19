<script lang="ts">
  import SelectedFilePreview from '$lib/components/shared/SelectedFilePreview.svelte';
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { formatSen, parseSen } from '$lib/pencairan';
  import FileViewer from './FileViewer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';

  interface Entry { id: string; date: string; reference: string; payee: string; amountSen: number; memo: string; rabLineId: string; rabCode: string; rabTitle: string; originalName: string; status: string; created: string; createdByName: string; note: string; revision: number; history: { revision: number; originalName: string }[] }
  interface Node { id: string; code: string; title: string; level: number; amountSen: number }
  interface Data { campus: { id: string; name: string; code: string; fillMode: string }; amountSen: number; receivedSen: number; reportedSen: number; remainingSen: number; paid: boolean; entries: Entry[]; rabNodes: Node[]; hasApprovedRab: boolean; acceptedSen: number; canComplete: boolean; t2Ready: boolean; completion: null | { completedAt: string; completedBy: string } }

  let { campusId, mode = 'admin' }: { campusId: string; mode?: 'admin' | 'campus' } = $props();
  let data = $state<Data | null>(null);
  let error = $state('');
  let notice = $state('');
  let busy = $state(false);
  let adding = $state(false);
  let form = $state({ date: '', reference: '', payee: '', amount: '', memo: '', rabLine: '' });
  let file = $state<File | null>(null);
  let revising = $state<Entry | null>(null);
  let note = $state('');
  let replacing = $state<Entry | null>(null);
  let reopenReason = $state('');
  let operationId = $state('');
  let refresh = $state(0);
  const admin = $derived(mode === 'admin');
  const canAdd = $derived(Boolean(data?.paid) && !data?.completion);
  const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const statusLabel: Record<string, string> = { menunggu_review: 'Menunggu review', sesuai: 'Sesuai', perlu_revisi: 'Perlu revisi' };
  const statusTone: Record<string, 'blue' | 'green' | 'amber'> = { menunggu_review: 'blue', sesuai: 'green', perlu_revisi: 'amber' };
  const rollup = $derived.by(() => {
    if (!data) return [] as { node: Node; spentSen: number }[];
    return data.rabNodes.filter(n => n.level === 3).map(node => ({ node, spentSen: data!.entries.filter(e => e.rabLineId === node.id && e.status !== 'perlu_revisi').reduce((s, e) => s + e.amountSen, 0) })).filter(r => r.spentSen > 0);
  });

  async function load() {
    try { data = await dataService.api.get<Data>(`/api/pencairan/${campusId}/lpj`); error = ''; }
    catch (e) { error = e instanceof Error ? e.message : 'LPJ belum dapat dimuat.'; }
  }
  $effect(() => { campusId; untrack(() => { data = null; void load(); }); });
  async function run(action: () => Promise<Data>, message: string) {
    if (busy) return false;
    busy = true; error = '';
    try { data = await action(); notice = message; refresh++; setTimeout(() => (notice = ''), 4000); return true; }
    catch (e) { error = e instanceof Error ? e.message : 'Perubahan belum tersimpan.'; return false; }
    finally { busy = false; }
  }
  const add = async () => {
    const ok = await run(async () => {
      if (!file) throw new Error('Unggah pindaian bukti.');
      if (parseSen(form.amount) === null) throw new Error('Isi jumlah pada bukti, misalnya 250.000.');
      const body = new FormData();
      for (const [k, v] of Object.entries(form)) body.set(k, v);
      operationId ||= crypto.randomUUID();
      body.set('operationId', operationId);
      body.set('file', file);
      if (replacing) { body.set('entryId', replacing.id); body.set('revision', String(replacing.revision)); }
      return dataService.api.post<Data>(`/api/pencairan/${campusId}/lpj`, body);
    }, 'Bukti tersimpan.');
    if (ok) { operationId = ''; replacing = null; adding = false; form = { date: '', reference: '', payee: '', amount: '', memo: '', rabLine: '' }; file = null; }
  };
  const decide = async (entry: Entry, status: 'sesuai' | 'perlu_revisi') => {
    const ok = await run(() => dataService.api.patch<Data>(`/api/pencairan/${campusId}/lpj/${entry.id}`, { status, note, expectedRevision: entry.revision }), status === 'sesuai' ? 'Bukti ditandai Sesuai.' : 'Catatan revisi tersimpan.');
    if (ok) { revising = null; note = ''; }
  };
</script>

{#if error && !data}
  <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">{error}</div>
{:else if !data}
  <p class="text-sm text-slate-500">Memuat LPJ…</p>
{:else}
  <div class="grid gap-2 [&>*]:min-w-0">
    <div class="grid gap-2 [&>*]:min-w-0">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div><h1 class="text-lg font-bold text-slate-900">LPJ penggunaan dana · Tahap 1</h1><p class="mt-1 text-sm text-slate-500">Satu bukti untuk setiap invois atau kuitansi, tanpa mengetik ulang rincian barang.</p></div>
        {#if canAdd}<Button size="sm" icon="plus" onclick={() => { operationId = ''; replacing = null; adding = !adding; }}>Tambah bukti</Button>{/if}
      </div>
    </div>

    {#if notice}<div class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{notice}</div>{/if}
    {#if error}<div class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</div>{/if}
    {#if !data.paid}<div class="rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-[#015a9a]">Dana Termin 1 belum tercatat diterima. Bukti dapat mulai dicatat setelah dana masuk; angka di bawah memakai Termin 1 yang diajukan.</div>{/if}

    <dl class="grid divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div class="flex items-center justify-between gap-2 px-3 py-2.5 sm:block"><dt class="text-xs text-slate-500">Dana Tahap 1</dt><dd class="text-base font-bold tabular-nums text-slate-900 sm:mt-1">{formatSen(data.receivedSen)}</dd></div>
      <div class="flex items-center justify-between gap-2 px-3 py-2.5 sm:block"><dt class="text-xs text-slate-500">Disetujui admin · {data.entries.filter(e => e.status === 'sesuai').length} bukti</dt><dd class="text-base font-bold tabular-nums text-slate-900 sm:mt-1">{formatSen(data.acceptedSen)}</dd></div>
      <div class="flex items-center justify-between gap-2 px-3 py-2.5 sm:block"><dt class="text-xs text-slate-500">{data.remainingSen >= 0 ? 'Belum dipertanggungjawabkan' : 'Melebihi dana'}</dt><dd class="text-base font-bold tabular-nums {data.remainingSen >= 0 ? 'text-slate-900' : 'text-red-700'} sm:mt-1">{formatSen(Math.abs(data.remainingSen))}</dd></div>
    </dl>

    {#if adding && canAdd}
      <form class="grid gap-3 rounded-xl border border-blue-200 bg-white p-4" oninput={() => { operationId = ''; }} onsubmit={(e) => { e.preventDefault(); void add(); }}>
        <h2 class="text-base font-bold text-slate-900">{replacing ? 'Perbaiki bukti' : 'Bukti baru'}</h2>
        <fieldset disabled={busy} class="contents">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="grid gap-1 text-xs font-semibold text-slate-600"><span class="field-caption">Tanggal pada bukti</span><input type="date" class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.date} required /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600"><span class="field-caption">Nomor bukti</span><input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.reference} required placeholder="Nomor invois atau kuitansi" /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600"><span class="field-caption">Penerima</span><input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.payee} required placeholder="Toko atau penyedia" /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600"><span class="field-caption">Jumlah pada bukti</span><input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-right text-sm font-normal tabular-nums" bind:value={form.amount} required inputmode="numeric" placeholder="250.000" /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600">Bagian RAB
            <select class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.rabLine} disabled={!data.hasApprovedRab}>
              <option value="">{data.hasApprovedRab ? 'Pilih bagian RAB' : 'RAB belum disetujui'}</option>
              {#each data.rabNodes as n}<option value={n.id}>{' '.repeat((n.level - 1) * 2)}{n.code} {n.title}</option>{/each}
            </select>
          </label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600"><span class="field-caption">Pindaian bukti</span><input type="file" class="w-full min-w-0 rounded-lg border border-slate-200 text-xs font-normal file:mr-2 file:min-h-[38px] file:border-0 file:border-r file:border-slate-200 file:bg-slate-50 file:px-3 file:font-semibold file:text-slate-700" accept=".pdf,.png,.jpg,.jpeg,.webp" required onchange={(e) => (file = (e.currentTarget as HTMLInputElement).files?.[0] || null)} /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-3">Memo<input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.memo} placeholder="Untuk apa, singkat" /></label>
        </div>
        </fieldset>
        <SelectedFilePreview {file} />
        <div class="flex gap-2"><Button size="sm" type="submit" loading={busy}>Simpan bukti</Button><Button size="sm" disabled={busy} variant="ghost" onclick={() => (adding = false)}>Batal</Button></div>
      </form>
    {/if}

    {#if !data.entries.length}
      <div class="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm"><p class="font-semibold text-slate-700">Belum ada bukti</p><p class="mt-1 text-xs text-slate-500">{canAdd ? 'Tambahkan invois atau kuitansi beserta pindaiannya.' : 'Bukti akan tampil setelah dicatat.'}</p></div>
    {:else}
      <div class="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
        <p class="border-b border-slate-100 px-3 py-2 text-xs text-slate-500 sm:hidden">Geser tabel untuk melihat jumlah, pindaian, dan status →</p>
        <table class="w-full min-w-[760px] text-xs">
          <thead class="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500"><tr><th class="px-3 py-2.5">Tanggal</th><th class="px-3 py-2.5">Nomor bukti</th><th class="px-3 py-2.5">Penerima</th><th class="px-3 py-2.5">Bagian RAB</th><th class="px-3 py-2.5 text-right">Jumlah</th><th class="px-3 py-2.5">Memo</th><th class="px-3 py-2.5">Pindaian</th><th class="px-3 py-2.5">Status</th>{#if admin}<th class="px-3 py-2.5"></th>{/if}</tr></thead>
          <tbody>
            {#each data.entries as e (e.id)}
              <tr class="border-t border-slate-100 align-top">
                <td class="whitespace-nowrap px-3 py-2.5 text-slate-700">{e.date ? date.format(new Date(e.date)) : ''}</td>
                <td class="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-800">{e.reference}</td>
                <td class="px-3 py-2.5 text-slate-700">{e.payee}</td>
                <td class="px-3 py-2.5 text-slate-600">{e.rabCode ? `${e.rabCode} ${e.rabTitle}` : 'Belum ditautkan'}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-slate-900">{formatSen(e.amountSen)}</td>
                <td class="px-3 py-2.5 text-slate-600">{e.memo}</td>
                <td class="px-3 py-2.5">
                  <a class="inline-flex max-w-48 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-[#0066B2] hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" href={`/api/pencairan/${campusId}/lpj/${e.id}`} title={e.originalName} target="_blank" rel="noopener"><span class="shrink-0"><Icon name="file" size={14} /></span><span class="truncate">{e.originalName}</span></a>
                  <div class="mt-2 w-64"><FileViewer src={`/api/pencairan/${campusId}/lpj/${e.id}`} name={e.originalName} height={240} showDownload={false} /></div>
                  {#if e.history?.length}<details class="mt-2 max-w-48 text-slate-500"><summary class="cursor-pointer text-xs hover:text-blue-700">Riwayat bukti</summary><div class="mt-1 grid gap-1">{#each e.history as h}<a class="truncate rounded px-1 py-1 text-blue-700 hover:bg-blue-50" title={`Versi ${h.revision}: ${h.originalName}`} target="_blank" rel="noopener" href={`/api/pencairan/${campusId}/lpj/${e.id}?revision=${h.revision}`}>Versi {h.revision}: {h.originalName}</a>{/each}</div></details>{/if}
                </td>
                <td class="px-3 py-2.5">
                  <div class="grid justify-items-start gap-2">
                    <div class="flex items-center gap-2">
  <Badge tone={statusTone[e.status] || 'blue'}>{statusLabel[e.status] || e.status}</Badge>
  {#if canAdd && e.status === 'perlu_revisi'}<span title="Perbaiki bukti"><Button size="sm" variant="secondary" icon="edit" label="Perbaiki bukti" disabled={busy} onclick={() => { operationId = ''; replacing = e; adding = true; file = null; form = { date: e.date.slice(0,10), reference: e.reference, payee: e.payee, amount: (e.amountSen / 100).toFixed(2).replace('.', ','), memo: e.memo, rabLine: e.rabLineId }; }} /></span>{/if}
                    </div>
                    {#if e.note}<p class="max-w-56 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{e.note}</p>{/if}

                  </div>
                </td>
                {#if admin}
                  <td class="px-3 py-2.5">
                    {#if data.completion}<span class="text-xs">LPJ selesai</span>{:else if revising?.id === e.id}
                      <div class="grid gap-2"><textarea class="min-h-[60px] rounded-lg border border-slate-300 px-2 py-1 text-sm" bind:value={note} placeholder="Yang harus diperbaiki"></textarea><div class="flex gap-1"><Button size="sm" onclick={() => decide(e, 'perlu_revisi')} loading={busy} disabled={!note.trim()}>Kirim</Button><Button size="sm" variant="ghost" onclick={() => (revising = null)}>Batal</Button></div></div>
                    {:else if e.status !== 'sesuai'}
                      <div class="flex gap-1"><Button size="sm" onclick={() => decide(e, 'sesuai')} disabled={busy}>Sesuai</Button><Button size="sm" variant="ghost" onclick={() => { revising = e; note = ''; }}>Revisi</Button></div>
                    {:else}
                      <Button size="sm" variant="ghost" onclick={() => { revising = e; note = ''; }}>Ubah</Button>
                    {/if}
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if rollup.length}
      <section class="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
        <h2 class="text-sm font-bold text-slate-900">Realisasi per bagian RAB</h2>
        <ul class="mt-2 grid gap-1 text-sm">
          {#each rollup as r}<li class="flex justify-between gap-3"><span class="text-slate-700">{r.node.code} {r.node.title}</span><span class="tabular-nums text-slate-900">{formatSen(r.spentSen)} dari {formatSen(r.node.amountSen)}</span></li>{/each}
        </ul>
      </section>
    {/if}

    <section class="grid gap-2 border-t border-slate-200 pt-3 text-sm">
      <h2 class="text-sm font-bold text-slate-900">Penyelesaian LPJ</h2>
      <p class="text-xs leading-5 text-slate-600">{data.t2Ready ? `LPJ selesai oleh ${data.completion?.completedBy}. Prasyarat LPJ menuju Tahap 2 terpenuhi.` : 'Admin menyatakan LPJ selesai setelah seluruh bukti dinilai Sesuai.'}</p>
      {#if admin}
      <div class="flex flex-wrap items-end gap-2">
        {#if data.completion}
          <label class="grid min-w-0 gap-1 text-xs font-semibold text-slate-600">Alasan membuka kembali<input class="min-h-9 rounded-lg border border-slate-300 px-2.5 text-sm font-normal" maxlength="2000" bind:value={reopenReason} /></label>
          <Button size="sm" disabled={busy || !reopenReason.trim()} onclick={() => run(() => dataService.api.patch<Data>(`/api/pencairan/${campusId}/lpj`, { action: 'reopen', reason: reopenReason }), 'LPJ dibuka kembali.')}>Buka kembali LPJ</Button>
        {:else}<Button size="sm" disabled={busy || !data.canComplete} onclick={() => run(() => dataService.api.patch<Data>(`/api/pencairan/${campusId}/lpj`, { action: 'complete' }), 'LPJ dinyatakan selesai.')}>Selesaikan LPJ</Button>{/if}
      </div>
      {/if}
      <p class="text-xs text-slate-500">Pengajuan dan pembayaran Tahap 2 penuh belum tersedia.</p>
    </section>
    <RiwayatPerubahan context={`kampus:${campusId}/pencairan/t1`} title="Riwayat perubahan kampus ini" {refresh} />
  </div>
{/if}
