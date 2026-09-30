<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { onChange } from '$lib/realtime.svelte';
  import { pollVisible } from '$lib/polling';
  import { campusGreeting } from '$lib/campus-greeting';
  import { campusUploadBlockedReason, KINDS, KIND_LABEL, KIND_SHORT } from '$lib/pencairan';
  import type { KartuData } from '$lib/components/admin/pencairan/kartu-types';
  import Icon from '$lib/components/ui/Icon.svelte';

  let greeting = $state(campusGreeting(new Date()));
  let data = $state<KartuData | null>(null);
  let error = $state('');
  let loadGeneration = 0;

  async function load(campusId: string) {
    const generation = ++loadGeneration;
    try {
      const next = await dataService.api.get<KartuData>(`/api/pencairan/${campusId}`);
      if (generation === loadGeneration) { data = next; error = ''; }
    } catch (e) {
      if (generation === loadGeneration) error = e instanceof Error ? e.message : 'Progres belum dapat dimuat.';
    }
  }

  const uploadActions = $derived.by(() => {
    if (!data) return [];
    const actions: { kind: (typeof KINDS)[number]; state: 'perlu_revisi' | 'belum_ada' }[] = [];
    for (const state of ['perlu_revisi', 'belum_ada'] as const) {
      for (const kind of KINDS) {
        if (data.readiness.items[kind] !== state) continue;
        const doc = data.documents.find(d => d.kind === kind) || null;
        const signed = doc?.versions.find(v => v.id === doc.currentVersionId)?.signed;
        if (!signed && !campusUploadBlockedReason(kind, state, doc, Boolean(data.disbursement.paidAt))) actions.push({ kind, state });
      }
    }
    return actions;
  });
  const waitingPf = $derived(data ? KINDS.filter(k => ['menunggu_review', 'perlu_konfirmasi'].includes(data!.readiness.items[k])) : []);

  $effect(() => {
    const campusId = app.session?.campusId;
    ++loadGeneration;
    data = null;
    error = '';
    if (campusId) void load(campusId);
  });
  $effect(() => {
    const campusId = app.session?.campusId;
    if (campusId) return onChange(() => void load(campusId), { campus: campusId });
  });
  $effect(() => pollVisible(async () => { greeting = campusGreeting(new Date()); }, 60000, true));
</script>

<svelte:head><title>Beranda · Desa Energi Berdikari</title></svelte:head>

<div class="mx-auto grid w-full max-w-4xl gap-6 py-4 sm:py-10">
  <section class="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-6 sm:p-10">
    <img src="/logo-pf.png" alt="Pertamina Foundation" class="mb-8 h-10 w-auto" />
    <p class="text-xs font-bold uppercase tracking-widest text-[#3975b7]">Desa Energi Berdikari</p>
    <h1 class="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{greeting}, {app.session?.name}.</h1>
    <p class="mt-5 max-w-2xl text-base leading-7 text-slate-600">Pantau pencairan dana kampus Anda di sini.</p>
  </section>

  <section aria-labelledby="pencairan-title" class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
    <div class="flex items-start gap-4">
      <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0066B2]"><Icon name="payments" size={23} /></span>
      <div>
        <h2 id="pencairan-title" class="text-lg font-bold text-slate-900">Saat ini: proses pencairan dana</h2>
        {#if app.session?.campusId}<p class="mt-2 text-sm leading-6 text-slate-600">Pantau status pencairan, lihat catatan pemeriksa, dan lengkapi dokumen awal atau revisi kampus Anda melalui halaman Pencairan Dana.</p>{/if}
        {#if !app.session?.campusId}
          <p class="mt-2 text-sm leading-6 text-slate-600">Akun ini belum terhubung ke kampus. Hubungi admin program.</p>
        {:else if error}
          <p class="mt-2 text-sm leading-6 text-slate-600" role="status">{error === 'Kampus ini tidak termasuk penerima gelombang pertama.' ? 'Belum ada penetapan pencairan untuk kampus Anda.' : 'Progres belum dapat dimuat. Buka Pencairan Dana untuk mencoba lagi.'}</p>
        {:else if !data}
          <p class="mt-2 text-sm leading-6 text-slate-600" role="status">Memuat progres pencairan…</p>
        {:else if import.meta.env.MODE==='mockup'}
          <p class="mt-3 text-sm text-slate-600">{(data as any)?.journey?.status==='menunggu'?'Pengajuan sedang diperiksa PF. Anda dapat melihat data dan dokumen yang dikirim.':(data as any)?.journey?.status==='revisi'?'Ada catatan perbaikan dari PF. Lanjutkan pada bagian yang perlu direvisi.':(data as any)?.journey?.status==='selesai'?'Pengajuan disetujui. Lanjutkan dokumen bertanda tangan.':'Lengkapi SK, data program, RAB, administrasi, dan PKS. Draf dapat dilanjutkan kapan saja.'}</p>
          <a href="/campus/pencairan" class="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#0066B2] px-5 py-3 text-sm font-semibold text-white">{(data as any)?.journey?.status==='menunggu'?'Lihat pengajuan':(data as any)?.journey?.status==='revisi'?'Perbaiki pengajuan':(data as any)?.journey?'Lanjutkan pengajuan':'Mulai pengajuan'}</a>
        {:else if uploadActions.length}
          <p class="mt-2 text-sm leading-6 text-slate-600">Selesaikan revisi lebih dulu, lalu lengkapi dokumen yang belum diunggah.</p>
        {:else if data.readiness.state === 'dibayar'}
          <p class="mt-2 text-sm leading-6 text-slate-600">Pencairan Tahap 1 telah dibayar. Lihat detail progres di Pencairan Dana.</p>
        {:else if data.readiness.lengkap}
          <p class="mt-2 text-sm leading-6 text-slate-600">Dokumen Tahap 1 sudah lengkap. Pantau proses berikutnya di Pencairan Dana.</p>
        {:else}
          <p class="mt-2 text-sm leading-6 text-slate-600">Belum ada unggahan yang perlu Anda lakukan saat ini. Pantau status pemeriksaan PF di Pencairan Dana.</p>
        {/if}
      </div>
    </div>
    {#if app.session?.campusId && data}<h3 class="mt-5 text-sm font-semibold text-slate-800">Yang perlu dilakukan</h3>{/if}
    {#if uploadActions.length}
      <div class="mt-3 grid gap-5">
        {#each [{ state: 'perlu_revisi', title: 'Perlu revisi', action: 'Revisi' }, { state: 'belum_ada', title: 'Belum diunggah', action: 'Unggah' }] as group}
          {@const items = uploadActions.filter(item => item.state === group.state)}
          {#if items.length}
            <section aria-label={`${group.title}, ${items.length} dokumen`}>
              <h3 class="mb-2 text-sm font-semibold text-slate-700">{group.title} <span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{items.length}</span></h3>
              <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50" aria-label={`${group.title}`}>
                {#each items as action (action.kind)}
                  <li class="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                    <p class="text-sm font-medium text-slate-900">{KIND_LABEL[action.kind]}</p>
                    <a href={`/campus/pencairan?butir=${action.kind}`} aria-label={`${group.action} ${KIND_LABEL[action.kind]}`} class="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#0066B2] hover:bg-blue-50">{group.action} <Icon name="arrow" size={14} /></a>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
        {/each}
      </div>
      {#if waitingPf.length === 1}<p class="mt-3 text-sm text-slate-600">{KIND_SHORT[waitingPf[0]]} sedang menunggu pemeriksaan PF.</p>{:else if waitingPf.length > 1}<p class="mt-3 text-sm text-slate-600">{waitingPf.length} dokumen menunggu pemeriksaan PF.</p>{/if}
    {:else if app.session?.campusId}
      {#if data?.disbursement.paidAt}<p class="mt-2 text-sm text-slate-600">Tahap 1 sudah dibayar. Tidak ada dokumen yang perlu Anda kirim.</p>
      {:else if waitingPf.length}<p class="mt-2 text-sm text-slate-600">Menunggu pemeriksaan PF untuk {waitingPf.map(k => KIND_SHORT[k]).join(', ')}. Tidak perlu mengunggah ulang.</p>
      {:else if data?.readiness.lengkap}<p class="mt-2 text-sm text-slate-600">Dokumen Tahap 1 sudah lengkap. PF melanjutkan prosesnya.</p>
      {:else}<p class="mt-2 text-sm text-slate-600">Belum ada dokumen yang perlu Anda kirim. Pantau langkah yang dikelola PF di Pencairan Dana.</p>{/if}
      <a href="/campus/pencairan" class="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0066B2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#015a9a]">Lihat progres <Icon name="arrow" size={16} /></a>
    {/if}
    <p class="mt-4 text-xs leading-relaxed text-slate-500">Untuk kembali ke Beranda atau keluar, buka dropdown akun di kanan atas.</p>
  </section>
</div>
