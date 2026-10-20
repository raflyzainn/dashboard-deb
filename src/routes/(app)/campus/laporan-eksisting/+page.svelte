<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import Icon from '$lib/components/ui/Icon.svelte';
  import PillarIcon from '$lib/components/shared/laporan-eksisting/PillarIcon.svelte';
  import { PILLARS, PHOTOS, TEXT_LIMIT, PHOTO_LIMIT, PHOTO_MB, VIDEO_MB, VIDEO_KIND, photoKind, laporanMissing, laporanEditable, laporanStatusLabel, emptyLaporan, type LaporanWorkspace, type PhotoKey } from '$lib/laporan-eksisting';

  const campusId = $derived(app.session?.campusId || '');
  let ws = $state<LaporanWorkspace | null>(null);
  let draft = $state(emptyLaporan());
  let baseline = $state('');
  let loading = $state(true), busy = $state(false), uploading = $state(''), error = $state(''), notice = $state('');
  let videoError = $state(''), videoWarning = $state('');

  const serialized = $derived(JSON.stringify({ ...Object.fromEntries(PILLARS.map(p => [p.key, draft[p.key]])), foto: draft.foto, video: draft.video }));
  const dirty = $derived(Boolean(ws && baseline && serialized !== baseline));
  const status = $derived(ws?.laporan.status || 'draft');
  const editable = $derived(laporanEditable(status) && !app.readOnly);
  const missing = $derived(laporanMissing(draft));
  const total = PILLARS.length + PHOTOS.length + 1;
  const tone: Record<string, string> = { revision: 'bg-orange-100 text-orange-900 ring-1 ring-orange-400', approved: 'bg-green-50 text-green-800 ring-1 ring-green-300', pending: 'bg-blue-50 text-blue-800 ring-1 ring-blue-200', draft: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300' };
  const fileUrl = (id: string) => `/api/laporan-eksisting/${campusId}/files/${id}`;

  function apply(next: LaporanWorkspace) {
    ws = next;
    draft = JSON.parse(JSON.stringify(next.laporan));
    baseline = JSON.stringify({ ...Object.fromEntries(PILLARS.map(p => [p.key, draft[p.key]])), foto: draft.foto, video: draft.video });
  }
  async function load(id: string) {
    loading = true; error = '';
    try { apply(await dataService.api.get<LaporanWorkspace>(`/api/laporan-eksisting/${id}`)); }
    catch (e) { error = e instanceof Error ? e.message : 'Laporan belum dapat dimuat.'; }
    finally { loading = false; }
  }
  $effect(() => { if (campusId) void load(campusId); });

  async function post(action: 'save' | 'submit') {
    const body = action === 'save'
      ? { action, expectedRevision: ws!.laporan.revision, laporan: { ...Object.fromEntries(PILLARS.map(p => [p.key, draft[p.key]])), foto: draft.foto, video: draft.video } }
      : { action, expectedRevision: ws!.laporan.revision };
    apply(await dataService.api.post<LaporanWorkspace>(`/api/laporan-eksisting/${campusId}`, body));
  }
  async function save() {
    if (!ws || !editable) return;
    busy = true; error = ''; notice = '';
    try { await post('save'); notice = 'Draf tersimpan.'; }
    catch (e) { error = e instanceof Error ? e.message : 'Laporan belum tersimpan.'; }
    finally { busy = false; }
  }
  async function submit() {
    if (!ws || !editable || missing.length) return;
    if (!window.confirm('Kirim Laporan Eksisting ke PF? Isian terkunci sampai PF selesai memeriksa.')) return;
    busy = true; error = ''; notice = '';
    try { if (dirty) await post('save'); await post('submit'); videoError = ''; videoWarning = ''; notice = 'Laporan terkirim dan menunggu pemeriksaan PF.'; }
    catch (e) { error = e instanceof Error ? e.message : 'Laporan belum terkirim.'; }
    finally { busy = false; }
  }

  async function uploadFile(file: File, kind: string) {
    const form = new FormData(); form.set('file', file); form.set('kind', kind); form.set('operationId', crypto.randomUUID());
    return (await dataService.api.post<{ id: string }>(`/api/laporan-eksisting/${campusId}/files`, form)).id;
  }
  /** Uploads, then saves the draft right away so a chosen file is never lost. */
  async function afterUpload(change: () => void) {
    change();
    await post('save');
  }
  async function addPhotos(event: Event, key: PhotoKey) {
    const input = event.currentTarget as HTMLInputElement, files = [...(input.files || [])]; input.value = '';
    if (!files.length || !ws) return;
    const room = PHOTO_LIMIT - draft.foto[key].length;
    if (files.length > room) { error = `Maksimal ${PHOTO_LIMIT} foto per kategori.`; return; }
    const big = files.find(f => f.size > PHOTO_MB * 1024 * 1024);
    if (big) { error = `${big.name} lebih dari ${PHOTO_MB} MB. Perkecil ukurannya lalu unggah lagi.`; return; }
    uploading = key; error = ''; notice = '';
    try {
      const ids: string[] = [];
      for (const file of files) ids.push(await uploadFile(file, photoKind(key)));
      await afterUpload(() => { draft.foto[key] = [...draft.foto[key], ...ids]; });
      notice = 'Foto tersimpan.';
    } catch (e) { error = e instanceof Error ? e.message : 'Foto belum terunggah.'; }
    finally { uploading = ''; }
  }
  async function removePhoto(key: PhotoKey, id: string) {
    if (!window.confirm('Hapus foto ini dari laporan?')) return;
    busy = true; error = '';
    try { await afterUpload(() => { draft.foto[key] = draft.foto[key].filter(x => x !== id); }); notice = 'Foto dihapus dari laporan.'; }
    catch (e) { error = e instanceof Error ? e.message : 'Foto belum terhapus.'; }
    finally { busy = false; }
  }
  /** Reads width, height and duration in the browser before sending, so a portrait video is refused at once. */
  function videoMeta(file: File) {
    return new Promise<{ width: number; height: number; duration: number }>((resolve, reject) => {
      const el = document.createElement('video'), src = URL.createObjectURL(file);
      el.preload = 'metadata';
      el.onloadedmetadata = () => { resolve({ width: el.videoWidth, height: el.videoHeight, duration: el.duration }); URL.revokeObjectURL(src); };
      el.onerror = () => { reject(new Error('Video tidak dapat dibaca. Pastikan formatnya MP4.')); URL.revokeObjectURL(src); };
      el.src = src;
    });
  }
  async function addVideo(event: Event) {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
    if (!file || !ws) return;
    videoError = ''; videoWarning = ''; error = ''; notice = '';
    if (!file.name.toLowerCase().endsWith('.mp4')) { videoError = 'Video harus berupa MP4.'; return; }
    if (file.size > VIDEO_MB * 1024 * 1024) { videoError = `Video lebih dari ${VIDEO_MB} MB. Perpendek atau kompres video, lalu unggah lagi.`; return; }
    try {
      const meta = await videoMeta(file);
      if (meta.width <= meta.height) { videoError = 'Video harus landscape (mendatar). Rekam ulang dengan ponsel dimiringkan, lalu unggah lagi.'; return; }
      if (meta.duration > 120) { videoError = 'Durasi video maksimal 2 menit.'; return; }
      if (Math.min(meta.width, meta.height) < 1080) videoWarning = `Resolusi video ${meta.width} × ${meta.height}, di bawah 1080p. Unggah versi resolusi lebih tinggi bila ada.`;
    } catch (e) { videoError = e instanceof Error ? e.message : 'Video tidak dapat dibaca.'; return; }
    uploading = 'video';
    try { const id = await uploadFile(file, VIDEO_KIND); await afterUpload(() => { draft.video = id; }); notice = 'Video tersimpan.'; }
    catch (e) { videoError = e instanceof Error ? e.message : 'Video belum terunggah.'; }
    finally { uploading = ''; }
  }
  async function removeVideo() {
    if (!window.confirm('Hapus video ini dari laporan?')) return;
    busy = true; error = ''; videoWarning = '';
    try { await afterUpload(() => { draft.video = ''; }); notice = 'Video dihapus dari laporan.'; }
    catch (e) { error = e instanceof Error ? e.message : 'Video belum terhapus.'; }
    finally { busy = false; }
  }

  const confirmLeave = () => !dirty || window.confirm('Perubahan Laporan Eksisting belum disimpan. Tinggalkan perubahan ini?');
  beforeNavigate(n => { if (dirty && !confirmLeave()) n.cancel(); });
  function beforeUnload(e: BeforeUnloadEvent) { if (dirty) { e.preventDefault(); e.returnValue = ''; } }
</script>

<svelte:window onbeforeunload={beforeUnload} />
<svelte:head><title>Laporan Eksisting · Desa Energi Berdikari</title></svelte:head>

<div class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 [&>*]:min-w-0">
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex max-w-3xl flex-col gap-1.5">
      <span class="text-xs font-bold tracking-[0.06em] text-[#3975b7]">PRA-COACHING</span>
      <h1 class="m-0 text-[29px] font-bold leading-[1.3] tracking-[-0.01em] text-[var(--navy)] max-[700px]:text-[23px]">Laporan Eksisting</h1>
      <p class="text-sm leading-relaxed text-slate-600">Isi sekali sebelum coaching. Laporan menjadi bahan diskusi bottleneck pada sesi coaching.</p>
    </div>
    {#if ws}
      <div class="flex flex-wrap items-center gap-3">
        <span class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold {tone[status]}">{#if status === 'revision'}<Icon name="alert" size={16} />{:else if status === 'approved'}<Icon name="check" size={16} />{/if}{laporanStatusLabel(status)}</span>
        {#if editable}<span class="text-[13px] text-slate-600">{total - missing.length} dari {total} bagian lengkap</span>{/if}
      </div>
    {/if}
  </header>

  {#if loading && !ws}
    <div class="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Memuat laporan">{#each [0, 1] as _}<div class="h-96 animate-pulse rounded-2xl bg-slate-200/70"></div>{/each}</div>
  {:else if !ws}
    <div class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">{error}<button type="button" class="ml-3 font-semibold underline" onclick={() => load(campusId)}>Coba lagi</button></div>
  {:else}
    {#if status === 'revision'}
      <div class="flex items-start gap-2 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950" role="status"><Icon name="alert" size={18} /><div><strong>Laporan perlu revisi.</strong>{#if ws.laporan.note}{' '}Catatan PF: {ws.laporan.note}{/if}<p class="mt-1">Perbaiki isian, lalu kirim ulang ke PF.</p></div></div>
    {:else if status === 'pending'}
      <p class="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900" role="status">Laporan sudah dikirim dan sedang diperiksa PF. Isian terkunci sampai pemeriksaan selesai.</p>
    {:else if status === 'approved'}
      <p class="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">Laporan dinyatakan Sesuai oleh PF.{#if ws.laporan.note}{' '}Catatan PF: {ws.laporan.note}{/if}</p>
    {/if}
    {#if error}<p class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>{/if}
    {#if notice}<p class="rounded-xl bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>{/if}

    <div class="flex flex-wrap items-start gap-5">
      <section aria-labelledby="pilar-title" class="flex min-w-0 flex-[1_1_520px] flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div class="flex items-center gap-2.5"><span class="rounded-lg bg-[var(--navy)] px-2.5 py-1 text-xs font-bold text-white">Bagian 1</span><h2 id="pilar-title" class="text-lg font-bold text-slate-900">Infografis 4 Pilar</h2></div>
        <p class="-mt-2 text-[13px] text-slate-600">Satu deskripsi per pilar tentang kondisi DEB saat ini.</p>
        {#each PILLARS as p}
          <div class="flex flex-col gap-1.5">
            <label for={`pilar-${p.key}`} class="flex items-center gap-2.5">
              <span class="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-[#0066B2]"><PillarIcon pillar={p.key} /></span>
              <span class="flex flex-col"><strong class="text-[15px] text-slate-900">{p.label}</strong><span class="text-xs text-slate-600">{p.hint}</span></span>
            </label>
            <textarea id={`pilar-${p.key}`} rows="4" maxlength={TEXT_LIMIT} placeholder={p.placeholder} disabled={!editable || busy} bind:value={draft[p.key]}
              class="resize-y rounded-lg border bg-white p-3 text-sm leading-6 text-slate-900 disabled:bg-slate-50 disabled:text-slate-700 {editable && !draft[p.key].trim() ? 'border-orange-300' : 'border-slate-300'}"></textarea>
            <span class="flex justify-between text-xs">{#if editable && !draft[p.key].trim()}<span class="font-semibold text-orange-800">Belum diisi</span>{:else}<span></span>{/if}<span class="text-slate-500">{draft[p.key].length.toLocaleString('id-ID')}/{TEXT_LIMIT.toLocaleString('id-ID')}</span></span>
          </div>
        {/each}
      </section>

      <section aria-labelledby="media-title" class="flex min-w-0 flex-[1_1_420px] flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div class="flex items-center gap-2.5"><span class="rounded-lg bg-[var(--navy)] px-2.5 py-1 text-xs font-bold text-white">Bagian 2</span><h2 id="media-title" class="text-lg font-bold text-slate-900">Foto dan Video DEB Eksisting</h2></div>

        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-2 text-[var(--navy)]"><PillarIcon pillar="foto" size={20} /><strong class="text-[15px] text-slate-900">Foto</strong><span class="text-xs text-slate-600">JPG, PNG, atau WebP, maksimal {PHOTO_MB} MB per foto. Minimal 1 foto per kategori.</span></div>
          {#each PHOTOS as p}
            {@const ids = draft.foto[p.key]}
            <div class="flex flex-col gap-2 rounded-xl border p-3 {editable && !ids.length ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}">
              <div class="flex items-center justify-between gap-2"><strong class="text-[13px] text-slate-900">{p.label}</strong><span class="text-xs font-semibold {ids.length ? 'text-green-800' : 'text-orange-800'}">{ids.length ? `${ids.length} foto` : 'Belum ada foto'}</span></div>
              {#if ids.length || editable}
                <ul class="grid grid-cols-3 gap-2">
                  {#each ids as id, i (id)}
                    <li class="relative">
                      <a href={fileUrl(id)} target="_blank" rel="noopener" class="block"><img src={fileUrl(id)} alt={`${p.label} ${i + 1}`} loading="lazy" class="aspect-[4/3] w-full rounded-lg bg-slate-100 object-cover" /></a>
                      {#if editable}<button type="button" class="absolute right-1 top-1 grid size-7 cursor-pointer place-items-center rounded-full bg-white/95 text-slate-700 shadow hover:text-red-700" aria-label={`Hapus ${p.label} ${i + 1}`} disabled={busy || !!uploading} onclick={() => removePhoto(p.key, id)}><Icon name="close" size={14} /></button>{/if}
                    </li>
                  {/each}
                  {#if editable && ids.length < PHOTO_LIMIT}
                    <li>
                      <label class="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-400 bg-white p-2 text-center text-xs font-semibold text-slate-700 hover:border-[#0066B2] hover:text-[#0066B2] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-500 {uploading === p.key ? 'pointer-events-none opacity-60' : ''}">
                        <Icon name="plus" size={18} />{uploading === p.key ? 'Mengunggah…' : 'Tambah foto'}
                        <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple class="sr-only" disabled={busy || !!uploading} onchange={e => addPhotos(e, p.key)} aria-label={`Tambah foto ${p.label}`} />
                      </label>
                    </li>
                  {/if}
                </ul>
              {/if}
            </div>
          {/each}
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-2 text-[var(--navy)]"><PillarIcon pillar="video" size={20} /><strong class="text-[15px] text-slate-900">Video</strong><span class="text-xs text-slate-600">Video singkat kondisi lapangan DEB.</span></div>
          <ul class="grid gap-1 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">
            <li><strong>Wajib landscape (mendatar).</strong> Miringkan ponsel saat merekam.</li>
            <li><strong>Resolusi tinggi</strong>, minimal 1080p (1920 × 1080).</li>
            <li>MP4, maksimal {VIDEO_MB} MB dan 2 menit.</li>
          </ul>
          {#if videoError}<p class="flex items-start gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-[13px] text-orange-950" role="alert"><Icon name="alert" size={18} />{videoError}</p>{/if}
          {#if videoWarning}<p class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-[13px] text-blue-900" role="status">{videoWarning}</p>{/if}
          {#if draft.video}
            <!-- svelte-ignore a11y_media_has_caption: video kondisi lapangan dari kampus tidak memiliki berkas subtitle. -->
            <video class="aspect-video w-full rounded-xl bg-slate-900" controls preload="metadata" src={fileUrl(draft.video)} aria-label="Video kondisi lapangan DEB"></video>
            {#if editable}
              <div class="flex flex-wrap justify-end gap-2">
                <button type="button" class="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-red-300 hover:text-red-700" disabled={busy || !!uploading} onclick={removeVideo}>Hapus video</button>
                <label class="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-[#0066B2] bg-white px-4 text-sm font-semibold text-[#0066B2] hover:bg-blue-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-500">{uploading === 'video' ? 'Mengunggah…' : 'Ganti video'}<input type="file" accept=".mp4,video/mp4" class="sr-only" disabled={busy || !!uploading} onchange={addVideo} /></label>
              </div>
            {/if}
          {:else if editable}
            <label class="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-400 bg-slate-50 p-4 text-center hover:border-[#0066B2] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-500 {uploading === 'video' ? 'pointer-events-none opacity-60' : ''}">
              <svg width="56" height="36" viewBox="0 0 56 36" fill="none" stroke="#475569" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="52" height="32" rx="5" /><path d="m23 12 11 6-11 6z" /></svg>
              <strong class="text-sm text-slate-900">{uploading === 'video' ? 'Mengunggah video…' : 'Pilih video landscape'}</strong>
              <span class="text-xs text-slate-600">Bingkai mendatar seperti di atas</span>
              <span class="inline-flex min-h-11 items-center rounded-lg border border-[#0066B2] bg-white px-4 text-sm font-semibold text-[#0066B2]">Unggah video</span>
              <input type="file" accept=".mp4,video/mp4" class="sr-only" disabled={busy || !!uploading} onchange={addVideo} aria-label="Unggah video landscape" />
            </label>
          {:else}
            <p class="text-sm text-slate-600">Belum ada video.</p>
          {/if}
        </div>
      </section>
    </div>

    {#if editable}
      <div class="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <span class="mr-auto text-[13px] {missing.length ? 'text-orange-800' : 'text-green-800'}">{missing.length ? `Lengkapi ${missing.join(', ')} sebelum mengirim.` : 'Semua bagian lengkap. Laporan siap dikirim.'}</span>
        <button type="button" class="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-[#0066B2] disabled:cursor-not-allowed disabled:opacity-60" disabled={busy || !!uploading || !dirty} onclick={save}>Simpan draf</button>
        <button type="button" class="min-h-11 cursor-pointer rounded-lg bg-[#0066B2] px-5 text-sm font-semibold text-white hover:bg-[#015a9a] disabled:cursor-not-allowed disabled:bg-slate-400" disabled={busy || !!uploading || missing.length > 0} onclick={submit}>{status === 'revision' ? 'Kirim ulang ke PF' : 'Kirim ke PF'}</button>
      </div>
    {/if}
  {/if}
</div>
