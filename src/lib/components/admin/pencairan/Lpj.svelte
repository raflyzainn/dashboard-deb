<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { formatSen, parseSen } from '$lib/pencairan';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';

  interface Entry { id: string; date: string; reference: string; payee: string; amountSen: number; memo: string; rabLineId: string; rabCode: string; rabTitle: string; originalName: string; status: string; created: string; createdByName: string }
  interface Node { id: string; code: string; title: string; level: number; amountSen: number }
  interface Data { campus: { id: string; name: string; code: string; fillMode: string }; amountSen: number; receivedSen: number; reportedSen: number; remainingSen: number; paid: boolean; entries: Entry[]; rabNodes: Node[]; hasApprovedRab: boolean }

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
  let refresh = $state(0);
  const admin = $derived(mode === 'admin');
  const canAdd = $derived(Boolean(data?.paid) && (admin || data?.campus.fillMode === 'campus'));
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
  $effect(() => { untrack(() => { void load(); }); });
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
      body.set('file', file);
      return dataService.api.post<Data>(`/api/pencairan/${campusId}/lpj`, body);
    }, 'Bukti tersimpan.');
    if (ok) { adding = false; form = { date: '', reference: '', payee: '', amount: '', memo: '', rabLine: '' }; file = null; }
  };
  const decide = async (entry: Entry, status: 'sesuai' | 'perlu_revisi') => {
    const ok = await run(() => dataService.api.patch<Data>(`/api/pencairan/${campusId}/lpj/${entry.id}`, { status, note }), status === 'sesuai' ? 'Bukti ditandai Sesuai.' : 'Catatan revisi tersimpan.');
    if (ok) { revising = null; note = ''; }
  };
</script>

{#if error && !data}
  <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
{:else if !data}
  <p class="text-sm text-slate-500">Memuat LPJ…</p>
{:else}
  <div class="grid gap-6 [&>*]:min-w-0">
    <div class="grid gap-3 [&>*]:min-w-0">
      {#if admin}<a href={`/admin/pencairan/${campusId}`} class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#0066B2] hover:underline"><Icon name="back" size={14} />Ruang kerja</a>{/if}
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div><h1 class="text-2xl font-bold text-slate-900">LPJ Termin 1</h1><p class="mt-1 text-sm text-slate-500">{data.campus.name}. Satu invois, satu pindaian, satu entri. Barang di dalam invois tidak diketik ulang.</p></div>
        {#if canAdd}<Button icon="plus" onclick={() => (adding = !adding)}>Tambah bukti</Button>{/if}
      </div>
      {#if admin}<a href={`/admin/pencairan/${campusId}`} class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#0066B2] hover:underline">Kembali ke kartu pemeriksaan</a>{/if}
    </div>

    {#if notice}<div class="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{notice}</div>{/if}
    {#if error}<div class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>{/if}
    {#if !data.paid}<div class="rounded-xl bg-blue-50 px-4 py-3 text-sm text-[#015a9a]">Dana Termin 1 belum tercatat diterima. Bukti dapat mulai dicatat setelah dana masuk; angka di bawah memakai Termin 1 yang diajukan.</div>{/if}

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl bg-white p-4 shadow-[0_10px_30px_#0b254508]"><p class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">Dana Termin 1</p><p class="mt-1 text-xl font-bold tabular-nums text-slate-900">{formatSen(data.receivedSen)}</p></div>
      <div class="rounded-xl bg-white p-4 shadow-[0_10px_30px_#0b254508]"><p class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">Sudah dipertanggungjawabkan</p><p class="mt-1 text-xl font-bold tabular-nums text-slate-900">{formatSen(data.reportedSen)}</p><p class="text-xs text-slate-500">{data.entries.filter(e => e.status !== 'perlu_revisi').length} bukti</p></div>
      <div class="rounded-xl bg-white p-4 shadow-[0_10px_30px_#0b254508]"><p class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">{data.remainingSen >= 0 ? 'Belum dipertanggungjawabkan' : 'Melebihi dana'}</p><p class="mt-1 text-xl font-bold tabular-nums {data.remainingSen >= 0 ? 'text-slate-900' : 'text-red-700'}">{formatSen(Math.abs(data.remainingSen))}</p></div>
    </div>

    {#if adding && canAdd}
      <form class="grid gap-3 rounded-xl border border-[#0066B2]/30 bg-white p-4 shadow-[0_8px_24px_#0b254510]" onsubmit={(e) => { e.preventDefault(); void add(); }}>
        <h2 class="text-base font-bold text-slate-900">Bukti baru</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="grid gap-1 text-xs font-semibold text-slate-600">Tanggal pada bukti<input type="date" class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.date} required /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600">Nomor bukti<input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.reference} required placeholder="Nomor invois atau kuitansi" /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600">Penerima<input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.payee} required placeholder="Toko atau penyedia" /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600">Jumlah pada bukti<input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-right text-sm font-normal tabular-nums" bind:value={form.amount} required inputmode="numeric" placeholder="250.000" /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600">Bagian RAB
            <select class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.rabLine} disabled={!data.hasApprovedRab}>
              <option value="">{data.hasApprovedRab ? 'Pilih bagian RAB' : 'RAB belum disetujui'}</option>
              {#each data.rabNodes as n}<option value={n.id}>{' '.repeat((n.level - 1) * 2)}{n.code} {n.title}</option>{/each}
            </select>
          </label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600">Pindaian bukti<input type="file" class="text-sm font-normal" accept=".pdf,.png,.jpg,.jpeg,.webp" required onchange={(e) => (file = (e.currentTarget as HTMLInputElement).files?.[0] || null)} /></label>
          <label class="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-3">Memo<input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal" bind:value={form.memo} placeholder="Untuk apa, singkat" /></label>
        </div>
        <div class="flex gap-2"><Button type="submit" loading={busy}>Simpan bukti</Button><Button variant="ghost" onclick={() => (adding = false)}>Batal</Button></div>
      </form>
    {/if}

    {#if !data.entries.length}
      <Empty title="Belum ada bukti" description={canAdd ? 'Tekan Tambah bukti untuk mencatat invois atau kuitansi pertama beserta pindaiannya.' : 'Bukti akan tampil di sini setelah dicatat.'} />
    {:else}
      <div class="overflow-x-auto rounded-xl bg-white shadow-[0_10px_30px_#0b254508]">
        <table class="w-full min-w-[760px] text-sm">
          <thead class="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500"><tr><th class="px-4 py-3">Tanggal</th><th class="px-4 py-3">Nomor bukti</th><th class="px-4 py-3">Penerima</th><th class="px-4 py-3">Bagian RAB</th><th class="px-4 py-3 text-right">Jumlah</th><th class="px-4 py-3">Memo</th><th class="px-4 py-3">Pindaian</th><th class="px-4 py-3">Status</th>{#if admin}<th class="px-4 py-3"></th>{/if}</tr></thead>
          <tbody>
            {#each data.entries as e (e.id)}
              <tr class="border-t border-slate-100 align-top">
                <td class="px-4 py-3 text-slate-700">{e.date ? date.format(new Date(e.date)) : ''}</td>
                <td class="px-4 py-3 font-semibold text-slate-800">{e.reference}</td>
                <td class="px-4 py-3 text-slate-700">{e.payee}</td>
                <td class="px-4 py-3 text-slate-600">{e.rabCode ? `${e.rabCode} ${e.rabTitle}` : 'Belum ditautkan'}</td>
                <td class="px-4 py-3 text-right tabular-nums text-slate-900">{formatSen(e.amountSen)}</td>
                <td class="px-4 py-3 text-slate-600">{e.memo}</td>
                <td class="px-4 py-3"><a class="text-[#0066B2] hover:underline" href={`/api/pencairan/${campusId}/lpj/${e.id}`} target="_blank" rel="noopener">{e.originalName}</a></td>
                <td class="px-4 py-3"><Badge tone={statusTone[e.status] || 'blue'}>{statusLabel[e.status] || e.status}</Badge></td>
                {#if admin}
                  <td class="px-4 py-3">
                    {#if revising?.id === e.id}
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
      <section class="rounded-xl bg-white p-4 shadow-[0_10px_30px_#0b254508]">
        <h2 class="text-sm font-bold text-slate-900">Realisasi per bagian RAB</h2>
        <ul class="mt-2 grid gap-1 text-sm">
          {#each rollup as r}<li class="flex justify-between gap-3"><span class="text-slate-700">{r.node.code} {r.node.title}</span><span class="tabular-nums text-slate-900">{formatSen(r.spentSen)} dari {formatSen(r.node.amountSen)}</span></li>{/each}
        </ul>
      </section>
    {/if}

    <RiwayatPerubahan context={`kampus:${campusId}/pencairan/t1`} title="Riwayat perubahan kampus ini" {refresh} />
  </div>
{/if}
