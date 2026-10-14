<script lang="ts">
  import { dataService } from '$lib/data/service';
  import { reportLabels, reportStatusLabels, type ReportKind, type ReportVersion } from '$lib/pelaporan';
  import Button from '$lib/components/ui/Button.svelte';
  import FileViewer from '$lib/components/admin/pencairan/FileViewer.svelte';
  let { campusId, kind, latest, history, mode, onChanged }: { campusId: string; kind: ReportKind; latest?: ReportVersion; history: ReportVersion[]; mode: 'admin' | 'campus'; onChanged: () => Promise<void> } = $props();
  let format = $state('text'), title = $state(''), body = $state(''), note = $state(''), file = $state<File | null>(null);
  let busy = $state(false), error = $state(''), notice = $state(''), operationId = $state('');
  let previous = '';
  $effect(() => {
    const id = latest?.id || '';
    if (previous !== id) { previous = id; title = latest?.title || ''; body = latest?.body || ''; format = latest?.format === 'text' ? 'text' : latest?.originalName.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf'; operationId = ''; }
  });
  const editable = $derived(latest?.status !== 'menunggu_review');
  const unsaved = $derived(Boolean(latest && (file || title !== latest.title || (kind === 'artikel' && (format === 'text' ? latest.format !== 'text' || body !== latest.body : latest.format === 'text' || !latest.originalName.toLowerCase().endsWith(`.${format}`))))));
  const accept = $derived(kind === 'video' ? '.mp4' : kind === 'infografis' ? '.pdf' : kind === 'artikel' ? `.${format}` : '.pdf,.docx');
  async function run(action: () => Promise<unknown>, message: string) {
    if (busy) return; busy = true; error = ''; notice = '';
    try { await action(); await onChanged(); notice = message; }
    catch (e) { error = e instanceof Error ? e.message : 'Perubahan belum tersimpan.'; }
    finally { busy = false; }
  }
  async function save() {
    const text = kind === 'artikel' && format === 'text';
    if (!text && !file) { error = 'Pilih berkas untuk disimpan.'; return; }
    operationId ||= crypto.randomUUID();
    const form = new FormData();
    for (const [key, value] of Object.entries({ kind, format: text ? 'text' : 'file', title, body: text ? body : '', expectedVersion: String(latest?.version || 0), operationId })) form.set(key, value);
    if (!text && file) form.set('file', file);
    await run(async () => { await dataService.api.post(`/api/pencairan/${campusId}/pelaporan`, form); operationId = ''; file = null; }, 'Draf tersimpan. Kirim untuk diperiksa setelah isinya siap.');
  }
  const change = (action: string) => {
    if (action === 'submit' && unsaved) { error = 'Simpan perubahan sebagai versi baru sebelum mengirim.'; return; }
    return run(() => dataService.api.patch(`/api/pencairan/${campusId}/pelaporan/${latest!.id}`, { action, note }), action === 'submit' ? 'Kiriman menunggu pemeriksaan admin.' : 'Hasil pemeriksaan tersimpan.');
  };
</script>

<section class="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4" aria-label={reportLabels[kind]}>
  <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="text-sm font-bold text-slate-900">{reportLabels[kind]}</h2><span class="rounded-md px-2 py-0.5 text-xs font-semibold {latest?.status === 'sesuai' ? 'bg-green-50 text-green-800' : latest?.status === 'perlu_revisi' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'}">{latest ? reportStatusLabels[latest.status] : 'Belum diisi'}</span></div>
  <p class="mt-1 text-xs leading-5 text-slate-500">{kind === 'video' ? 'MP4 maksimal 40 MB, durasi paling lama 2 menit.' : kind === 'infografis' ? 'Unggah infografis PDF, maksimal 20 MB.' : kind === 'artikel' ? 'Tulis di web atau unggah Word/PDF, maksimal 20 MB.' : 'Unggah laporan PDF atau Word DOCX, maksimal 20 MB.'}</p>
  {#if latest}
    <div class="mt-3 border-t border-slate-100 pt-2 text-xs">
      <p class="font-medium text-slate-500">Versi {latest.version}{latest.title ? ` — ${latest.title}` : ''}</p>
      {#if latest.format === 'file'}<a class="mt-1 block break-all text-blue-700 underline" target="_blank" rel="noopener" href={`/api/pencairan/${campusId}/pelaporan/${latest.id}`}>{latest.originalName}</a>
      {:else if mode === 'admin'}<p class="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{latest.body}</p>
      {:else}<details class="mt-2"><summary>Baca artikel</summary><p class="mt-2 whitespace-pre-wrap break-words">{latest.body}</p></details>{/if}
      {#if latest.note}<p class="mt-2 whitespace-pre-wrap text-amber-900">Catatan admin: {latest.note}</p>{/if}
    </div>
  {/if}
  {#if mode === 'admin' && latest?.format === 'file'}
    <div class="mt-3 min-w-0">
      {#if kind === 'video'}
        <!-- svelte-ignore a11y_media_has_caption: video yang diunggah kampus belum memiliki berkas subtitle terpisah. -->
        <video class="max-h-80 w-full rounded-lg bg-slate-900" controls preload="metadata" aria-label={`Pratinjau ${latest.originalName}`} src={`/api/pencairan/${campusId}/pelaporan/${latest.id}`}></video>
      {:else}
        {#key latest.id}<FileViewer src={`/api/pencairan/${campusId}/pelaporan/${latest.id}`} mime={latest.mime} name={latest.originalName} height={360} />{/key}
      {/if}
    </div>
  {/if}
  {#if error}<p role="alert" class="my-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>{/if}
  {#if notice}<p role="status" class="my-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>{/if}
  {#if editable}
    <form class="mt-3 grid gap-2.5" onsubmit={e => { e.preventDefault(); void save(); }} oninput={() => { operationId = ''; }}>
      {#if kind === 'artikel'}
        <div class="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <label class="grid gap-1 text-xs font-semibold text-slate-600">Cara mengisi artikel<select class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal text-slate-900" bind:value={format} onchange={() => { file = null; operationId = ''; }} disabled={busy}><option value="text">Tulis di web</option><option value="docx">Unggah Word</option><option value="pdf">Unggah PDF</option></select></label>
        <label class="grid gap-1 text-xs font-semibold text-slate-600">Judul artikel<input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal text-slate-900" bind:value={title} maxlength="200" required={format === 'text'} disabled={busy} /></label>
        </div>
      {/if}
      {#if kind === 'artikel' && format === 'text'}<label class="grid gap-1 text-xs font-semibold text-slate-600">Isi artikel<textarea class="min-h-28 rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal leading-6 text-slate-900" bind:value={body} maxlength="50000" required disabled={busy}></textarea><span class="text-xs font-normal text-slate-500">{body.length.toLocaleString('id-ID')} / 50.000 karakter</span></label>
      {:else}{#key format}<label class="grid gap-1 text-xs font-semibold text-slate-600">{latest ? 'Berkas versi baru' : 'Pilih berkas'}<input type="file" class="w-full min-w-0 rounded-lg border border-slate-200 text-xs font-normal text-slate-600 file:mr-2 file:min-h-9 file:border-0 file:border-r file:border-slate-200 file:bg-slate-50 file:px-3 file:font-semibold file:text-slate-700 hover:file:bg-blue-50" {accept} required disabled={busy} onchange={e => { file = e.currentTarget.files?.[0] || null; operationId = ''; }} /></label>{/key}{/if}
      {#if latest?.status === 'draf' && unsaved}<p class="text-xs text-amber-800">Simpan perubahan sebelum mengirim.</p>{/if}
      <div class="flex flex-wrap gap-2 pt-1"><Button size="sm" variant="secondary" type="submit" loading={busy}>{latest ? 'Simpan versi baru' : 'Simpan draf'}</Button>{#if latest?.status === 'draf'}<Button size="sm" disabled={busy || unsaved} onclick={() => change('submit')}>Kirim untuk diperiksa</Button>{/if}</div>
    </form>
  {/if}
  {#if mode === 'admin' && latest?.status === 'menunggu_review'}
    <div class="mt-3 grid gap-2.5"><label class="grid gap-1 text-xs font-semibold text-slate-600">Catatan pemeriksaan<textarea class="min-h-16 rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal" bind:value={note} maxlength="2000" disabled={busy}></textarea></label><div class="flex flex-wrap gap-2"><Button size="sm" disabled={busy} onclick={() => change('sesuai')}>Sesuai</Button><Button size="sm" variant="secondary" disabled={busy || !note.trim()} onclick={() => change('perlu_revisi')}>Perlu revisi</Button></div></div>
  {/if}
  {#if history.length > 1}<details class="mt-3 border-t border-slate-100 pt-2 text-xs"><summary>Riwayat versi ({history.length - 1})</summary><ul class="mt-2 grid gap-2">{#each history.filter(v => v.id !== latest?.id) as version}<li class="min-w-0"><strong>Versi {version.version} · {reportStatusLabels[version.status]}</strong>{#if version.format === 'file'}<a class="block break-all text-blue-700 underline" target="_blank" rel="noopener" href={`/api/pencairan/${campusId}/pelaporan/${version.id}`}>{version.originalName}</a>{:else}<details><summary>{version.title}</summary><p class="whitespace-pre-wrap break-words">{version.body}</p></details>{/if}{#if version.note}<p class="whitespace-pre-wrap">{version.note}</p>{/if}</li>{/each}</ul></details>{/if}
</section>
