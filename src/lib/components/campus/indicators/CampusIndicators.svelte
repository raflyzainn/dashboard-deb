<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { average, hasTarget, progress, number, date, feedbackLabel } from '$lib/domain';
  import { latestSubmission, changedSinceSubmission, verificationLabel } from '$lib/verification';
  import type { CampusIndicator, ProgramProfile } from '$lib/types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import SubmissionStatus from '$lib/components/shared/indicators/SubmissionStatus.svelte';

  let search = $state('');
  let category = $state('');
  let status = $state('all');
  let drafts = $state<Record<string, { current: number | undefined; note: string }>>({});
  const readinessFields = [
    ['existingEbt', 'EBT eksisting'],
    ['socialMapping', 'Pemetaan sosial'],
    ['conflict', 'Potensi konflik'],
    ['ikm', 'IKM DEB SoBI'],
    ['institution', 'Kelembagaan'],
    ['landPermit', 'Perizinan lahan'],
    ['siteSurvey', 'Site survey'],
    ['interventionSummary', 'Ringkasan kebutuhan intervensi'],
    ['intervention', 'Kebutuhan intervensi']
  ] as const;
  type ReadinessKey = (typeof readinessFields)[number][0];
  let readinessDraft = $state<Partial<Pick<ProgramProfile, ReadinessKey>>>({});
  let readinessTimer: ReturnType<typeof setTimeout> | undefined;
  let saving = $state('');
  let saveFailed = $state(false);
  const campusId = $derived(app.session!.campusId!);
  const campus = $derived(app.data!.campuses.find((c) => c.id === campusId));
  const indicators = $derived(app.data!.indicators.filter((i) => i.campusId === campusId));
  const latest = $derived(latestSubmission(app.data!, campusId));
  const changed = $derived(latest ? changedSinceSubmission(app.data!, latest) : false);
  const pending = $derived(latest?.status === 'pending');
  const disabled = $derived(
    app.data?.period?.state === 'archived' ||
      pending ||
      app.readOnly ||
      app.stale ||
      (!saving && (app.loading || app.busy))
  );
  const categories = $derived([...new Set(app.data!.definitions.map((d) => d.category))]);
  const achieved = $derived(indicators.filter((i) => hasTarget(i) && i.current >= i.target).length);
  const score = $derived(average(indicators.map(progress)));
  const dirtyCount = $derived(indicators.filter(dirty).length);
  const readinessDirty = $derived(Object.keys(readinessDraft).length > 0);
  const allDirtyCount = $derived(dirtyCount + Number(readinessDirty));
  const saveLabel = $derived(
    saving
      ? 'Menyimpan…'
      : app.stale
        ? 'Muat ulang untuk memastikan data tersimpan'
        : saveFailed
          ? 'Gagal menyimpan. Coba simpan kembali.'
          : allDirtyCount
            ? Object.values(drafts).some(
                (d) => d.current === undefined || !Number.isFinite(d.current) || d.current < 0
              )
              ? 'Lengkapi nilai aktual agar tersimpan'
              : 'Menunggu untuk menyimpan…'
            : 'Semua perubahan tersimpan'
  );
  const submissionLabel = $derived(
    pending
      ? verificationLabel.pending
      : changed
        ? 'Perubahan belum dikirim'
        : latest
          ? verificationLabel[latest.status]
          : 'Belum dikirim'
  );
  const rows = $derived(
    indicators.filter((i) => {
      const d = definition(i.definitionId);
      return (
        d &&
        (!category || d.category === category) &&
        `${d.name} ${d.description}`
          .toLocaleLowerCase('id-ID')
          .includes(search.trim().toLocaleLowerCase('id-ID')) &&
        (status === 'all' ||
          (status === 'achieved'
            ? hasTarget(i) && i.current >= i.target
            : status === 'progress'
              ? !hasTarget(i) || i.current < i.target
              : comments(i.id).some((f) => f.requiresRevision && f.state !== 'closed')))
      );
    })
  );

  const definition = (id: string) => app.data!.definitions.find((d) => d.id === id)!;
  const comments = (id: string) =>
    app
      .data!.feedback.filter((f) => f.indicatorId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  function dirty(item: CampusIndicator) {
    const draft = drafts[item.id];
    return !!draft && (item.unfilled || draft.current !== item.current || draft.note !== item.note);
  }
  function edit(item: CampusIndicator) {
    saveFailed = false;
    app.toast = '';
    return (drafts[item.id] ||= {
      current: item.unfilled ? undefined : item.current,
      note: item.note
    });
  }
  const readinessValue = (key: ReadinessKey) => readinessDraft[key] ?? campus?.program?.[key] ?? '';
  function editReadiness(key: ReadinessKey, event: Event) {
    readinessDraft[key] = (event.currentTarget as HTMLTextAreaElement).value;
    saveFailed = false;
    app.toast = '';
    clearTimeout(readinessTimer);
    readinessTimer = setTimeout(() => void saveReadiness(), 2000);
  }
  async function saveReadiness() {
    if (disabled || saving || !readinessDirty) return;
    const values = Object.fromEntries(
      readinessFields.map(([key]) => [key, readinessValue(key)])
    ) as Partial<Pick<ProgramProfile, ReadinessKey>>;
    saving = 'readiness';
    const saved = await app.mutate(
      () => dataService.updateReadiness(campusId, values),
      'Indikator kesiapan tersimpan.'
    );
    if (saved && !app.stale) {
      for (const [key] of readinessFields) {
        if (readinessDraft[key] === values[key]) delete readinessDraft[key];
      }
      readinessDraft = { ...readinessDraft };
      if (readinessDirty) {
        clearTimeout(readinessTimer);
        readinessTimer = setTimeout(() => void saveReadiness(), 2000);
      }
    } else saveFailed = true;
    saving = '';
  }

  // One request at a time: app.mutate reloads the shared page after each write.
  $effect(() => {
    const changes = indicators.filter(dirty).map((item) => ({ item, ...drafts[item.id] }));
    if (disabled || saving || app.busy || app.loading || saveFailed) return;
    const next = changes.find(
      (draft) => draft.current !== undefined && Number.isFinite(draft.current) && draft.current >= 0
    );
    if (!next) return;
    const timer = setTimeout(() => void save(next.item), 2000);
    return () => clearTimeout(timer);
  });

  async function save(item: CampusIndicator) {
    const draft = drafts[item.id];
    if (disabled || saving || app.busy || app.loading || !draft || !dirty(item)) return;
    if (draft.current === undefined || !Number.isFinite(draft.current) || draft.current < 0) {
      app.error = 'Isi nilai aktual dengan angka nol atau lebih.';
      return;
    }
    saving = item.id;
    saveFailed = false;
    const current = draft.current,
      note = draft.note;
    const saved = await app.mutate(() => dataService.updateIndicator(item.id, current, note), '');
    if (saved && !app.stale) {
      // A response for an older value must never discard typing done while it was in flight.
      if (drafts[item.id]?.current === current && drafts[item.id]?.note === note) {
        delete drafts[item.id];
      }
      if (!dirtyCount) app.toast = 'Semua perubahan indikator tersimpan.';
    } else {
      saveFailed = true;
    }
    saving = '';
  }
  beforeNavigate(({ cancel, willUnload }) => {
    if (!allDirtyCount && !saving) return;
    if (
      willUnload ||
      !window.confirm('Ada perubahan indikator yang belum disimpan. Tinggalkan halaman?')
    )
      cancel();
  });
</script>

{#snippet saveIcon()}
  {#if saving}<span
      class="[&&]:w-[15px] [&&]:h-[15px] [&&]:shrink-0 [&&]:[border-top-color:#0284c7] [&&]:[border-right-color:rgb(201,_229,_248)] [&&]:[border-bottom-color:rgb(201,_229,_248)] [&&]:[border-left-color:rgb(201,_229,_248)] [&&]:[animation-duration:0.8s] [&&]:[animation-timing-function:linear] [&&]:[animation-delay:0s] [&&]:[animation-iteration-count:infinite] [&&]:[animation-direction:normal] [&&]:[animation-fill-mode:none] [&&]:[animation-play-state:running] [&&]:[animation-name:saving-spin] [&&]:[animation-timeline:auto] [&&]:[animation-range-start:normal] [&&]:[animation-range-end:normal] [&&]:border-[2px] [&&]:border-solid [&&]:rounded-[50%] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-duration:auto] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-timing-function:ease] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-delay:0s] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-iteration-count:1] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-direction:normal] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-fill-mode:none] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-play-state:running] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-name:none] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-timeline:auto] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-range-start:normal] [@media(prefers-reduced-motion:_reduce)]:[&&]:[animation-range-end:normal] [.status-labels>&]:flex [.status-labels>&]:items-center [.status-labels>&]:gap-y-[8px] [.status-labels>&]:gap-x-[8px] [.summary-heading>&]:text-[11px] [.summary-heading>&]:text-[color:var(--muted)] [.group-heading>&]:text-[11px] [.group-heading>&]:text-[color:var(--muted)] [.summary-metric>&]:text-[11px] [.summary-metric>&]:text-[color:var(--muted)] [.meter>&]:h-[100%] [.meter>&]:block [.meter>&]:[background-image:initial] [.meter>&]:[background-color:rgb(2,_132,_199)] [.meter>&]:rounded-[inherit] [.indicator-summary>.meter>&]:[background-image:initial] [.indicator-summary>.meter>&]:[background-color:rgb(32,_165,_106)] [.meter.achieved>&]:[background-image:initial] [.meter.achieved>&]:[background-color:rgb(32,_165,_106)] [.unit-input>&]:w-[max-content] [.unit-input>&]:shrink-0 [.unit-input>&]:flex [.unit-input>&]:items-center [.unit-input>&]:[background-image:initial] [.unit-input>&]:[background-color:rgb(234,_246,_255)] [.unit-input>&]:text-[10px] [.unit-input>&]:max-w-[60%] [.unit-input>&]:wrap-anywhere [.unit-input>&]:px-[9px] [.unit-input>&]:py-[0px] [.reference-value>&]:text-[10px] [.reference-value>&]:text-[color:var(--muted)] [.reference-value>&]:wrap-anywhere max-[700.01px]:[.card-fields>&:nth-child(3)]:[grid-column-start:1] max-[700.01px]:[.card-fields>&:nth-child(3)]:[grid-column-end:-1] save-spinner"
      aria-hidden="true"
    ></span>
  {:else}<Icon
      name={saveFailed || app.stale ? 'alert' : dirtyCount ? 'clock' : 'save'}
      size={17}
    />{/if}
{/snippet}

<div
  class="[&&]:[--ink:#163e55] [&&]:[--muted:#658295] [&&]:[--line:#d8edf9] [&&]:text-[color:var(--ink)] [&&]:pb-[16px] campus-indicators"
>
  <header
    class="[&&]:flex [&&]:justify-between [&&]:items-center [&&]:gap-y-[20px] [&&]:gap-x-[20px] [&&]:mb-[20px] max-[700.01px]:[&&]:items-start max-[700.01px]:[&&]:gap-y-[10px] max-[700.01px]:[&&]:gap-x-[10px] max-[700.01px]:[&&]:flex-wrap indicator-heading"
  >
    <div>
      <h1
        class="font-[650] [&&]:text-[color:var(--ink)] [&&]:text-[24px] [&&]:tracking-[-0.7px] leading-[1.3] m-[0px] max-[700.01px]:[&&]:text-[22px]"
      >
        Indikator Baseline
      </h1>
      <p
        class="[&&]:mt-[8px] mb-[0px] [&&]:leading-[1.8] [&&]:max-w-[700px] [&&]:text-[12px] [&&]:text-[color:var(--muted)] mx-[0px] max-[700.01px]:[&&]:text-[11px]"
      >
        Catat perkembangan indikator DEB {campus?.name || 'kampus Anda'}. Lengkapi nilai aktual dan
        catatan sebelum mengirim verifikasi.
      </p>
    </div>
    <div
      class="[&&]:flex [&&]:flex-col [&&]:items-end [&&]:gap-y-[10px] [&&]:gap-x-[10px] max-[700.01px]:[&&]:items-start heading-status"
    >
      <span
        class="[&&]:flex [&&]:items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:[background-image:initial] [&&]:[background-color:rgb(241,_250,_255)] [&&]:text-[11px] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:nowrap] [&&]:text-[#0278b3] [&&]:px-[12px] [&&]:py-[7px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[20px] max-[700.01px]:[&&]:text-[9px] max-[700.01px]:[&&]:px-[8px] max-[700.01px]:[&&]:py-[6px] heading-tag"
        ><Icon name="indicators" size={15} />DEB Putih</span
      >
      <span
        class="[&&]:flex [&&]:items-center [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:text-[11px] [&&]:text-[#397866] [&.save-error]:text-[#b45309] save-status"
        class:save-error={saveFailed || app.stale}
        role="status"
        aria-label="Status penyimpanan"
      >
        {@render saveIcon()}{saveLabel}
      </span>
    </div>
  </header>

  <section
    class="[&&]:[background-image:initial] [&&]:[background-color:white] [&&]:[box-shadow:0_2px_5px_#0c4a6e05] [&&]:flex [&&]:items-center [&&]:justify-between [&&]:flex-wrap [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:mb-[16px] [&&]:px-[18px] [&&]:py-[14px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[14px] max-[700.01px]:[&&]:p-[12px] status-strip"
    aria-label="Ringkasan status indikator"
  >
    <div
      class="[&&]:flex [&&]:items-center [&&]:gap-y-[14px] [&&]:gap-x-[14px] [&&]:flex-wrap [&&]:text-[11px] [&&]:text-[color:var(--muted)] status-labels"
    >
      <Badge tone={pending ? 'blue' : latest?.status === 'approved' && !changed ? 'green' : 'amber'}
        >{submissionLabel}</Badge
      >
      <span class="[&&]:flex [&&]:items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px]"
        ><Icon name="indicators" size={15} />{indicators.length} indikator tersedia</span
      >
    </div>
    <p class="leading-[1.8] [&&]:text-[color:var(--muted)] [&&]:text-[10px] m-[0px]">
      {allDirtyCount
        ? `${allDirtyCount} indikator memiliki perubahan belum disimpan.`
        : 'Perubahan disimpan otomatis setelah 2 detik tanpa ketikan.'}
    </p>
  </section>

  <section class="[background-color:white] mb-[18px] p-[20px] border border-[color:var(--line)] rounded-[14px]" aria-label="Indikator kesiapan rencana aksi">
    <h2 class="font-[650] text-[13px] text-[color:var(--ink)] m-[0px]">Indikator kesiapan rencana aksi</h2>
    <p class="text-[10px] text-[color:var(--muted)] leading-[1.8] mt-[6px] mb-[14px]">Lengkapi bukti dan kondisi program. Perubahan disimpan otomatis.</p>
    <div class="grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[12px] max-[700.01px]:grid-cols-[1fr]">{#each readinessFields as [key, label]}<article class="p-[14px] [background-color:white] border-2 border-[#b9d9f5] rounded-[9px]"><label class="block text-[11px] font-[650] text-[color:var(--ink)]" for={`readiness-${key}`}>{label}<span class="ml-1 text-[#dc2626]" aria-hidden="true">*</span></label><textarea id={`readiness-${key}`} aria-label={label} class="block w-full min-h-[76px] resize-y [background-color:rgb(250,_253,_255)] text-[11px] text-[color:var(--ink)] leading-[1.7] mt-[8px] px-[10px] py-[8px] border-2 border-[#9ecbf1] rounded-[7px] focus:border-[#1681df] focus:[box-shadow:0_0_0_3px_#1681df24] focus:outline-none disabled:opacity-60" rows={key === 'conflict' || key === 'intervention' ? 7 : 3} maxlength="5000" value={readinessValue(key)} oninput={(event) => editReadiness(key, event)} disabled={disabled}></textarea></article>{/each}</div>
  </section>

  {#if latest}<p
      class="[&&]:mt-[-4px] [&&]:mb-[16px] leading-[1.8] [&&]:text-[color:var(--muted)] [&&]:text-[11px] [&&]:mx-[0px] submission-history"
    >
      Pengajuan #{latest.version} · Dikirim {date(latest.submittedAt)}{#if latest.reviewedAt}
        · Ditinjau {date(latest.reviewedAt)}{/if}
    </p>{/if}
  {#if latest?.decisionNote}<aside
      class="[&&]:[background-image:initial] [&&]:[background-color:rgb(255,_246,_220)] [&&]:[border-left-width:3px] [&&]:[border-left-style:solid] [&&]:[border-left-color:rgb(224,_172,_73)] [&&]:[border-top-left-radius:0px] [&&]:[border-top-right-radius:8px] [&&]:[border-bottom-right-radius:8px] [&&]:[border-bottom-left-radius:0px] [&&]:flex [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:mb-[16px] [&&]:text-[12px] [&&]:px-[14px] [&&]:py-[12px] review-note"
    >
      <Icon name="questions" size={18} />
      <div>
        <strong class="font-[650]">Catatan Admin PF</strong>
        <p
          class="[&&]:mt-[8px] mb-[0px] leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere [&&]:text-[11px] mx-[0px] pre-wrap"
        >
          {latest.decisionNote}
        </p>
      </div>
    </aside>{/if}

  <section
    class="[&&]:[background-image:initial] [&&]:[background-color:white] [&&]:[box-shadow:0_2px_5px_#0c4a6e05] [&&]:mb-[18px] [&&]:p-[20px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[14px] max-[700.01px]:[&&]:p-[14px] indicator-summary"
    aria-label="Ringkasan capaian indikator"
  >
    <div
      class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[16px] [&&]:gap-x-[16px] summary-heading"
    >
      <h2
        class="font-[650] [&&]:text-[color:var(--ink)] [&&]:text-[13px] [&&]:tracking-[-0.15px] m-[0px]"
      >
        Capaian Indikator
      </h2>
      <span class="[&&]:text-[11px] [&&]:text-[color:var(--muted)]">{number(score)}%</span>
    </div>
    <div
      class="[&&]:grid [&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&]:gap-y-[14px] [&&]:gap-x-[14px] [&&]:mx-[0px] [&&]:my-[16px] max-[700.01px]:[&&]:grid-cols-[1fr] max-[700.01px]:[&&]:gap-y-[8px] max-[700.01px]:[&&]:gap-x-[8px] summary-grid"
    >
      <div
        class="[&&]:p-[15px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[12px] [&:first-child]:[border-left-width:3px] [&:first-child]:[border-left-style:solid] [&:first-child]:[border-left-color:rgb(14,_165,_233)] max-[700.01px]:[&&]:p-[12px] summary-metric"
      >
        <span class="[&&]:text-[11px] [&&]:text-[color:var(--muted)]">Indikator tersedia</span
        ><strong
          class="font-[650] [&&]:block [&&]:text-[27px] [&&]:leading-[1.6] [&&]:tracking-[-0.8px] max-[700.01px]:[&&]:text-[24px]"
          >{indicators.length}<small
            class="[&&]:text-[12px] [&&]:text-[color:var(--muted)] leading-[1.7] [&&]:tracking-[0] [&&]:font-[500]"
          >
            / {app.data!.definitions.length}</small
          ></strong
        >
        <p class="leading-[1.8] [&&]:text-[10px] [&&]:text-[color:var(--muted)] m-[0px]">
          indikator aktif untuk kampus Anda
        </p>
      </div>
      <div
        class="[&&]:p-[15px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[12px] [&:first-child]:[border-left-width:3px] [&:first-child]:[border-left-style:solid] [&:first-child]:[border-left-color:rgb(14,_165,_233)] max-[700.01px]:[&&]:p-[12px] summary-metric"
      >
        <span class="[&&]:text-[11px] [&&]:text-[color:var(--muted)]">Capaian rata-rata</span
        ><strong
          class="font-[650] [&&]:block [&&]:text-[27px] [&&]:leading-[1.6] [&&]:tracking-[-0.8px] max-[700.01px]:[&&]:text-[24px]"
          >{number(score)}<small
            class="[&&]:text-[12px] [&&]:text-[color:var(--muted)] leading-[1.7] [&&]:tracking-[0] [&&]:font-[500]"
            >%</small
          ></strong
        >
        <p class="leading-[1.8] [&&]:text-[10px] [&&]:text-[color:var(--muted)] m-[0px]">
          terhadap target masing-masing indikator
        </p>
      </div>
      <div
        class="[&&]:p-[15px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[12px] [&:first-child]:[border-left-width:3px] [&:first-child]:[border-left-style:solid] [&:first-child]:[border-left-color:rgb(14,_165,_233)] max-[700.01px]:[&&]:p-[12px] summary-metric"
      >
        <span class="[&&]:text-[11px] [&&]:text-[color:var(--muted)]">Belum mencapai target</span
        ><strong
          class="font-[650] [&&]:block [&&]:text-[27px] [&&]:leading-[1.6] [&&]:tracking-[-0.8px] max-[700.01px]:[&&]:text-[24px]"
          >{indicators.length - achieved}<small
            class="[&&]:text-[12px] [&&]:text-[color:var(--muted)] leading-[1.7] [&&]:tracking-[0] [&&]:font-[500]"
          >
            indikator</small
          ></strong
        >
        <p class="leading-[1.8] [&&]:text-[10px] [&&]:text-[color:var(--muted)] m-[0px]">
          {achieved} indikator sudah mencapai target
        </p>
      </div>
    </div>
    <div
      class="[&&]:h-[5px] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:[background-image:initial] [&&]:[background-color:rgb(225,_242,_252)] [&&]:rounded-[10px] meter"
      role="progressbar"
      aria-label="Capaian rata-rata indikator"
      aria-valuenow={Math.round(score)}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span
        class="w-[var(--progress)] [&&]:block [&&]:h-[100%] [&&&]:[background-image:initial] [&&&]:[background-color:rgb(32,_165,_106)] [&&]:rounded-[inherit]"
        style:--progress={`${score}%`}
      ></span>
    </div>
    <p
      class="[&&]:mt-[12px] mb-[0px] leading-[1.8] [&&]:text-[10px] [&&]:text-[color:var(--muted)] mx-[0px] summary-help"
    >
      Ringkasan menggunakan nilai yang sudah disimpan. Baseline dan target ditetapkan oleh Admin PF;
      nilai nol tetap merupakan nilai aktual yang valid.
    </p>
  </section>

  <div
    class="[&&]:flex [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:mx-[0px] [&&]:my-[20px] max-[700.01px]:[&&]:flex-wrap indicator-filters"
  >
    <div
      class="flex items-center [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#7b94b4] [&&&]:grow [&&&]:shrink [&&&]:[flex-basis:0%] [&&&]:min-w-[0] [&&&]:max-w-[none] px-[12px] py-[0px] border-[1px] border-solid border-[color:rgb(211,_226,_243)] rounded-[7px] [&_input]:[background-image:initial] [&_input]:[background-color:transparent] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:p-[10px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] [&:focus-within]:[outline-color:#7fc1ff] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&_input:focus]:[outline-color:initial] [&_input:focus]:[outline-style:none] [&_input:focus]:[outline-width:initial] max-[700.01px]:[&&&]:[flex-basis:100%] search-field"
    >
      <Icon name="search" size={17} /><input
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
        aria-label="Cari indikator"
        placeholder="Cari indikator…"
        bind:value={search}
      />
    </div>
    <select
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:white] text-[#17365f] [&&]:max-w-[250px] min-h-[37px] [&&]:w-[auto] px-[12px] py-[11px] border-[1px] border-solid [&&]:border-[color:var(--line)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:var(--line)] max-[700.01px]:[&&]:max-w-[none] max-[700.01px]:[&&]:grow max-[700.01px]:[&&]:shrink max-[700.01px]:[&&]:[flex-basis:0%] max-[700.01px]:[&&]:min-w-[0]"
      aria-label="Filter bidang indikator"
      bind:value={category}
      ><option value="">Semua bidang</option>{#each categories as item}<option>{item}</option
        >{/each}</select
    >
    <select
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:white] text-[#17365f] [&&]:max-w-[250px] min-h-[37px] [&&]:w-[auto] px-[12px] py-[11px] border-[1px] border-solid [&&]:border-[color:var(--line)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:var(--line)] max-[700.01px]:[&&]:max-w-[none] max-[700.01px]:[&&]:grow max-[700.01px]:[&&]:shrink max-[700.01px]:[&&]:[flex-basis:0%] max-[700.01px]:[&&]:min-w-[0]"
      aria-label="Filter status indikator"
      bind:value={status}
      ><option value="all">Semua status</option><option value="achieved">Tercapai</option><option
        value="progress">Dalam proses</option
      ><option value="revision">Perlu tindak lanjut</option></select
    >
  </div>

  {#each categories as group}
    {@const grouped = rows.filter((i) => definition(i.definitionId).category === group)}
    {#if grouped.length}<section
        class="[&&]:[background-image:initial] [&&]:[background-color:white] [&&]:[box-shadow:0_2px_5px_#0c4a6e05] [&&]:mb-[18px] [&&]:p-[18px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[14px] max-[700.01px]:[&&]:p-[12px] indicator-group"
        aria-label={group}
      >
        <header
          class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:mb-[14px] group-heading"
        >
          <h2
            class="font-[650] [&&]:text-[color:var(--ink)] [&&]:text-[13px] [&&]:tracking-[-0.15px] m-[0px]"
          >
            {group}
          </h2>
          <span class="[&&]:text-[11px] [&&]:text-[color:var(--muted)]"
            >{grouped.length} indikator</span
          >
        </header>
        {#each grouped as item (item.id)}
          {@const d = definition(item.definitionId)}
          {@const draft = drafts[item.id]}
          {@const feedback = comments(item.id)}
          {@const revising = feedback.some((f) => f.requiresRevision && f.state !== 'closed')}
          <article
            class="[&&]:[background-image:initial] [&&]:[background-color:rgb(246,_251,_255)] [&&]:p-[16px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[12px] max-[700.01px]:[&&]:p-[12px] [&+.indicator-card]:mt-[12px] indicator-card"
            aria-label={`Indikator: ${d.name}`}
          >
            <header
              class="[&&]:flex [&&]:items-start [&&]:justify-between [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:mb-[18px] max-[700.01px]:[&&]:gap-y-[8px] max-[700.01px]:[&&]:gap-x-[8px] max-[700.01px]:[&&]:flex-wrap card-heading"
            >
              <div class="[&&]:min-w-[0]">
                <h3
                  class="font-[650] [&&]:text-[color:var(--ink)] [&&]:text-[12px] leading-[1.5] [&&]:wrap-anywhere m-[0px]"
                >
                  {d.name}
                </h3>
                <p
                  class="[&&]:mt-[4px] mb-[0px] leading-[1.8] [&&]:text-[10px] [&&]:text-[color:var(--muted)] mx-[0px]"
                >
                  {d.description || `Satuan: ${d.unit}`}
                </p>
              </div>
              <Badge
                tone={dirty(item) || revising
                  ? 'amber'
                  : hasTarget(item) && item.current >= item.target
                    ? 'green'
                    : 'blue'}
                >{dirty(item)
                  ? 'Belum disimpan'
                  : item.unfilled
                    ? 'Belum diisi'
                    : revising
                      ? 'Perlu tindak lanjut'
                      : !hasTarget(item)
                        ? 'Target belum ditetapkan'
                        : item.current >= item.target
                        ? 'Tercapai'
                        : 'Dalam proses'}</Badge
              >
            </header>
            <form
              class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%]"
              onsubmit={(event) => {
                event.preventDefault();
                void save(item);
              }}
            >
              <div
                class="[&&]:grid [&&]:grid-cols-[1fr_1fr_1.2fr_1.6fr] [&&]:gap-y-[20px] [&&]:gap-x-[20px] max-[1150.01px]:[&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] max-[1150.01px]:[&&]:gap-y-[16px] max-[1150.01px]:[&&]:gap-x-[16px] max-[700.01px]:[&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[700.01px]:[&&]:gap-y-[14px] max-[700.01px]:[&&]:gap-x-[14px] card-fields"
              >
                <div
                  class="[&&]:min-w-[0] max-[700.01px]:[&:nth-child(3)]:[grid-column-start:1] max-[700.01px]:[&:nth-child(3)]:[grid-column-end:-1] field"
                >
                  <label
                    class="[&&]:block [&&]:text-[10px] [&&]:text-[color:var(--ink)] [&&]:font-[650] [&&]:mt-[0px] [&&]:mb-[8px] [&&]:mx-[0px]"
                    for={`actual-${item.id}`}>Nilai aktual <span class="text-[#dc2626]" aria-hidden="true">*</span></label
                  >
                  <div
                    class="[&&]:flex [&&]:items-stretch [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(201,_229,_248)] [&&]:rounded-[7px] [&:focus-within]:[outline-color:rgb(56,_189,_248)] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&:focus-within]:outline-offset-[2px] unit-input"
                  >
                    <input
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:text-[color:var(--ink)] max-w-[100%] [&&]:min-w-[0] [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] [&&]:w-[0] [&&]:[box-shadow:none] [&&]:[outline-color:initial] [&&]:[outline-style:none] [&&]:[outline-width:initial] [&&]:p-[10px] [&&]:m-[0px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[0px] [&:focus]:[outline-color:initial] [&:focus]:[outline-style:none] [&:focus]:[outline-width:initial] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:currentcolor] [&::placeholder]:text-[color:var(--ink)] [&:disabled]:[background-image:initial] [&:disabled]:[background-color:rgb(237,_244,_248)] [&:disabled]:text-[#607d90] [&:disabled]:cursor-not-allowed"
                      id={`actual-${item.id}`}
                      aria-label={`Nilai aktual ${d.name}`}
                      type="number"
                      min="0"
                      step="any"
                      required
                      {disabled}
                      value={draft ? draft.current : item.unfilled ? undefined : item.current}
                      oninput={(event) => {
                        const value = event.currentTarget.valueAsNumber;
                        edit(item).current = Number.isNaN(value) ? undefined : value;
                      }}
                    /><span
                      class="[&&]:flex [&&]:shrink-0 [&&]:items-center [&&]:[background-image:initial] [&&]:[background-color:rgb(234,_246,_255)] [&&]:text-[10px] [&&]:w-[max-content] [&&]:max-w-[60%] [&&]:wrap-anywhere [&&]:px-[9px] [&&]:py-[0px]"
                      >{d.unit}</span
                    >
                  </div>
                  <small
                    class="[&&]:text-[10px] [&&]:text-[color:var(--muted)] [&&]:leading-[1.7] [&&]:block [&&]:mt-[6px] [&&]:wrap-anywhere"
                    >{item.unfilled
                      ? 'Belum diisi'
                      : `Tersimpan: ${number(item.current)} ${d.unit}`}</small
                  >
                </div>
                <div
                  class="[&&]:min-w-[0] max-[700.01px]:[&:nth-child(3)]:[grid-column-start:1] max-[700.01px]:[&:nth-child(3)]:[grid-column-end:-1] field"
                >
                  <span
                    class="[&&]:block [&&]:text-[10px] [&&]:text-[color:var(--ink)] [&&]:font-[650] [&&]:mt-[0px] [&&]:mb-[8px] [&&]:mx-[0px] field-label"
                    >Target indikator</span
                  >
                  <div
                    class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:min-h-[39px] [&&]:[background-image:initial] [&&]:[background-color:rgb(238,_247,_252)] [&&]:text-[12px] [&&]:px-[10px] [&&]:py-[9px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[7px] reference-value"
                  >
                    {hasTarget(item) ? number(item.target) : 'Belum ditetapkan'}
                    <span class="[&&]:text-[10px] [&&]:text-[color:var(--muted)] [&&]:wrap-anywhere"
                      >{d.unit}</span
                    >
                  </div>
                  <small
                    class="[&&]:text-[10px] [&&]:text-[color:var(--muted)] [&&]:leading-[1.7] [&&]:block [&&]:mt-[6px] [&&]:wrap-anywhere"
                    >{hasTarget(item) ? 'Ditetapkan oleh Admin PF' : 'Belum ditetapkan oleh Admin PF'}</small
                  >
                </div>
                <div
                  class="[&&]:min-w-[0] max-[700.01px]:[&:nth-child(3)]:[grid-column-start:1] max-[700.01px]:[&:nth-child(3)]:[grid-column-end:-1] field"
                >
                  <span
                    class="[&&]:block [&&]:text-[10px] [&&]:text-[color:var(--ink)] [&&]:font-[650] [&&]:mt-[0px] [&&]:mb-[8px] [&&]:mx-[0px] field-label"
                    >Baseline &amp; capaian</span
                  >
                  <div
                    class="[&&]:text-[10px] [&&]:leading-[1.8] [&&]:mb-[12px] [&&]:text-[color:var(--muted)] baseline-value"
                  >
                    Baseline <strong
                      class="font-[650] [&&]:block [&&]:text-[12px] [&&]:text-[color:var(--ink)] [&&]:wrap-anywhere"
                      >{number(item.baseline)} {d.unit}</strong
                    >
                  </div>
                  <div
                    class="[&&]:h-[5px] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:[background-image:initial] [&&]:[background-color:rgb(225,_242,_252)] [&&]:rounded-[10px] meter"
                    class:achieved={hasTarget(item) && item.current >= item.target}
                    role="progressbar"
                    aria-label={`Capaian ${d.name}`}
                    aria-valuenow={Math.round(progress(item))}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <span
                      class="w-[var(--progress)] [&&]:block [&&]:h-[100%] [&&]:[background-image:initial] [&&]:[background-color:rgb(2,_132,_199)] [&&]:rounded-[inherit] [.meter.achieved>&]:[background-image:initial] [.meter.achieved>&]:[background-color:rgb(32,_165,_106)]"
                      style:--progress={`${progress(item)}%`}
                    ></span>
                  </div>
                  <small
                    class="[&&]:text-[10px] [&&]:text-[color:var(--muted)] [&&]:leading-[1.7] [&&]:block [&&]:mt-[6px] [&&]:wrap-anywhere"
                    >{hasTarget(item) ? `${number(progress(item))}% dari target` : 'Target belum ditetapkan'}{#if hasTarget(item) && item.current < item.target}
                      · kurang {number(item.target - item.current)} {d.unit}{/if}</small
                  >
                </div>
                <div
                  class="[&&]:min-w-[0] max-[1150.01px]:[&&]:[grid-column-start:1] max-[1150.01px]:[&&]:[grid-column-end:-1] max-[700.01px]:[&:nth-child(3)]:[grid-column-start:1] max-[700.01px]:[&:nth-child(3)]:[grid-column-end:-1] max-[700.01px]:[&&]:[grid-column-start:1] max-[700.01px]:[&&]:[grid-column-end:-1] field note-field"
                >
                  <label
                    class="[&&]:block [&&]:text-[10px] [&&]:text-[color:var(--ink)] [&&]:font-[650] [&&]:mt-[0px] [&&]:mb-[8px] [&&]:mx-[0px]"
                    for={`note-${item.id}`}>Catatan perkembangan <span class="text-[#dc2626]" aria-hidden="true">*</span></label
                  ><textarea
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:text-[color:var(--ink)] max-w-[100%] [&&]:[resize:vertical] [&&]:min-h-[65px] [&&]:block [&&]:w-[100%] [&&]:px-[10px] [&&]:py-[9px] [&&]:m-[0px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(201,_229,_248)] [&&]:rounded-[7px] [&:focus]:[outline-color:#38bdf8] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(56,_189,_248)] [&::placeholder]:text-[color:var(--ink)] [&:disabled]:[background-image:initial] [&:disabled]:[background-color:rgb(237,_244,_248)] [&:disabled]:text-[#607d90] [&:disabled]:cursor-not-allowed"
                    id={`note-${item.id}`}
                    aria-label={`Catatan perkembangan ${d.name}`}
                    rows="2"
                    maxlength="5000"
                    {disabled}
                    value={draft ? draft.note : item.note}
                    oninput={(event) => {
                      edit(item).note = event.currentTarget.value;
                    }}
                    placeholder="Periode data, kegiatan, dan hasil yang dicapai…"></textarea><small
                    class="[&&]:text-[10px] [&&]:text-[color:var(--muted)] [&&]:leading-[1.7] [&&]:block [&&]:mt-[6px] [&&]:wrap-anywhere"
                    >Sertakan sumber atau konteks data untuk membantu verifikasi.</small
                  >
                </div>
              </div>
              <footer
                class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:mt-[16px] max-[700.01px]:[&&]:items-start max-[700.01px]:[&&]:flex-wrap card-footer"
              >
                <small
                  class="[&&]:text-[9px] [&&]:text-[color:var(--muted)] leading-[1.7] [&&]:flex [&&]:items-center [&&]:gap-y-[7px] [&&]:gap-x-[7px]"
                  ><Icon name="clock" size={13} />Diperbarui {date(item.updatedAt)}</small
                >
                <div class="[&&]:flex [&&]:items-center [&&]:gap-y-[7px] [&&]:gap-x-[7px]">
                  {#if dirty(item)}<button
                      type="button"
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[600] [font-stretch:inherit] [&&]:text-[10px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[color:var(--muted)] [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[5px] [&&]:gap-x-[5px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:px-[10px] [&&]:py-[7px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:transparent] [&&]:rounded-[6px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] cancel-edit"
                      disabled={disabled || !!saving}
                      onclick={() => {
                        delete drafts[item.id];
                        saveFailed = false;
                      }}>Batal</button
                    >{/if}<button
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[600] [font-stretch:inherit] [&&]:text-[10px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#0278b3] [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[5px] [&&]:gap-x-[5px] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:px-[10px] [&&]:py-[7px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(201,_229,_248)] [&&]:rounded-[6px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:enabled:hover]:text-[white] [&:enabled:hover]:[background-image:initial] [&:enabled:hover]:[background-color:rgb(2,_132,_199)] [&:enabled:hover]:border-[color:rgb(2,_132,_199)] save-indicator"
                    disabled={disabled ||
                      !!saving ||
                      !dirty(item) ||
                      draft?.current === undefined ||
                      !Number.isFinite(draft.current) ||
                      draft.current < 0}
                    ><Icon name="check" size={14} />{saving === item.id
                      ? 'Menyimpan…'
                      : 'Simpan perubahan'}</button
                  >
                </div>
              </footer>
            </form>
            {#if feedback.length}<div
                class="[&&]:mt-[14px] indicator-feedback"
                aria-label={`Feedback ${d.name}`}
              >
                {#each feedback as comment}<div
                    class="[&&]:[background-image:initial] [&&]:[background-color:rgb(255,_246,_220)] [&&]:[border-left-width:3px] [&&]:[border-left-style:solid] [&&]:[border-left-color:rgb(224,_172,_73)] [&&]:[border-top-left-radius:0px] [&&]:[border-top-right-radius:8px] [&&]:[border-bottom-right-radius:8px] [&&]:[border-bottom-left-radius:0px] [&&]:px-[14px] [&&]:py-[12px] [&.resolved]:[background-image:initial] [&.resolved]:[background-color:rgb(237,_249,_242)] [&.resolved]:border-[color:rgb(102,_185,_139)] feedback-entry"
                    class:resolved={comment.state === 'closed'}
                  >
                    <div
                      class="[&&]:flex [&&]:items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:flex-wrap [&&]:text-[10px] feedback-heading"
                    >
                      <span
                        class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[25px] [&&]:h-[25px] [&&]:[background-image:initial] [&&]:[background-color:rgb(14,_165,_233)] [&&]:text-[white] [&&]:text-[9px] [&&]:font-[700] [&&]:rounded-[50%] feedback-avatar"
                        >PF</span
                      ><strong class="font-[650]">Admin PF</strong><Badge
                        tone={comment.state === 'closed'
                          ? 'green'
                          : comment.state === 'responded'
                            ? 'blue'
                            : 'amber'}
                        >{comment.requiresRevision
                          ? feedbackLabel[comment.state]
                          : 'Catatan'}</Badge
                      ><small class="[&&]:text-[9px] text-[color:var(--muted)] leading-[1.7]"
                        >{date(comment.createdAt)}</small
                      >
                    </div>
                    <p
                      class="[&&]:mt-[8px] mb-[0px] leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere [&&]:text-[11px] mx-[0px] pre-wrap"
                    >
                      {comment.text}
                    </p>
                  </div>{/each}
              </div>{/if}
          </article>
        {/each}
      </section>{/if}
  {/each}
  {#if !rows.length}<div
      class="[&&]:[background-image:initial] [&&]:[background-color:white] [&&]:[box-shadow:0_2px_5px_#0c4a6e05] [&&]:mb-[18px] [&&]:p-[18px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:var(--line)] [&&]:rounded-[14px] max-[700.01px]:[&&]:p-[12px] indicator-group"
    >
      <Empty
        title="Tidak ada indikator yang cocok"
        description="Ubah pencarian, bidang, atau filter status."
      />
    </div>{/if}

  <div
    class="[&&]:sticky [&&]:bottom-[12px] [&&]:z-[12] [&&]:mt-[20px] max-[700.01px]:[&&]:bottom-[8px] indicator-submit"
  >
    <SubmissionStatus compact blocked={dirtyCount > 0 || !!saving}>
      {#snippet statusIcon()}
        <span
          class="[&&]:flex [&&]:items-center [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:text-[11px] [&&]:text-[#397866] [&&]:justify-center [&&]:w-[28px] [&&]:h-[28px] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_248,_244)] [&&]:rounded-[50%] [&.save-error]:text-[#b45309] [.status-labels>&]:flex [.status-labels>&]:items-center [.status-labels>&]:gap-y-[8px] [.status-labels>&]:gap-x-[8px] [.summary-heading>&]:text-[11px] [.summary-heading>&]:text-[color:var(--muted)] [.group-heading>&]:text-[11px] [.group-heading>&]:text-[color:var(--muted)] [.summary-metric>&]:text-[11px] [.summary-metric>&]:text-[color:var(--muted)] [.meter>&]:block [.meter>&]:h-[100%] [.meter>&]:[background-image:initial] [.meter>&]:[background-color:rgb(2,_132,_199)] [.meter>&]:rounded-[inherit] [.indicator-summary>.meter>&]:[background-image:initial] [.indicator-summary>.meter>&]:[background-color:rgb(32,_165,_106)] [.meter.achieved>&]:[background-image:initial] [.meter.achieved>&]:[background-color:rgb(32,_165,_106)] [.unit-input>&]:flex [.unit-input>&]:items-center [.unit-input>&]:text-[10px] [.unit-input>&]:w-[max-content] [.unit-input>&]:[background-image:initial] [.unit-input>&]:[background-color:rgb(234,_246,_255)] [.unit-input>&]:shrink-0 [.unit-input>&]:max-w-[60%] [.unit-input>&]:wrap-anywhere [.unit-input>&]:px-[9px] [.unit-input>&]:py-[0px] [.reference-value>&]:text-[10px] [.reference-value>&]:text-[color:var(--muted)] [.reference-value>&]:wrap-anywhere max-[700.01px]:[.card-fields>&:nth-child(3)]:[grid-column-start:1] max-[700.01px]:[.card-fields>&:nth-child(3)]:[grid-column-end:-1] save-status floating-save-icon"
          class:save-error={saveFailed || app.stale}
          role="img"
          aria-label={saveLabel}
          title={saveLabel}
        >
          {@render saveIcon()}
        </span>
      {/snippet}
    </SubmissionStatus>
  </div>
</div>
