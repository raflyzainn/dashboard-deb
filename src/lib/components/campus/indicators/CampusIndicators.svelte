<script lang="ts">
  import { tick } from 'svelte';
  import { beforeNavigate, goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import { dataService, READ_ONLY_MESSAGE } from '$lib/data/service';
  import { average, hasTarget, progress, number, date, feedbackLabel } from '$lib/domain';
  import { latestSubmission, changedSinceSubmission, verificationLabel } from '$lib/verification';
  import type { CampusIndicator, ProgramProfile } from '$lib/types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import EditableSection from '$lib/components/ui/EditableSection.svelte';
  import ReadField from '$lib/components/ui/ReadField.svelte';
  import SubmissionStatus from '$lib/components/shared/indicators/SubmissionStatus.svelte';

  type Draft = { current: number | undefined; note: string };
  const VALUE_RULE = 'Isi nilai aktual dengan angka nol atau lebih.';
  const RETRY = 'Belum tersimpan. Coba simpan kembali.';
  const RELOAD = 'Muat ulang halaman untuk memastikan data tersimpan.';
  const term = 'm-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#64748b]';

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

  let search = $state('');
  let category = $state('');
  let status = $state('all');
  // The list opens read only. Drafts exist only while it is being edited.
  let editing = $state(false);
  let drafts = $state<Record<string, Draft>>({});
  let moneyText = $state<Record<string, string>>({});
  let rowErrors = $state<Record<string, string>>({});
  let readinessEditing = $state(false);
  let readinessDraft = $state<Partial<Pick<ProgramProfile, ReadinessKey>>>({});
  let saving = $state<'' | 'indicators' | 'readiness'>('');
  let discardTarget = $state<'' | 'indicators' | 'readiness'>('');
  let leaveTo = $state<URL | null>(null);
  let leaving = false;

  const isMoney = (unit: string) => unit.startsWith('Rp');
  const unitLabel = (unit: string) =>
    unit.startsWith('Rp/') ? `per ${unit.slice(3)}` : isMoney(unit) ? '' : unit;
  const amount = (value: number, unit: string, digits = 20) =>
    `${isMoney(unit) ? 'Rp ' : ''}${value.toLocaleString('id-ID', { maximumFractionDigits: digits })}`;
  const withUnit = (value: number, unit: string, digits = 20) =>
    `${amount(value, unit, digits)} ${unitLabel(unit)}`.trim();
  const rupiah = (value: number | undefined) => (value === undefined ? '' : amount(value, 'Rp'));
  const savedValue = (item: CampusIndicator) => (item.unfilled ? undefined : item.current);
  const valid = (draft: Draft) =>
    draft.current !== undefined && Number.isFinite(draft.current) && draft.current >= 0;

  const campusId = $derived(app.session!.campusId!);
  const campus = $derived(app.data!.campuses.find((c) => c.id === campusId));
  const indicators = $derived(app.data!.indicators.filter((i) => i.campusId === campusId));
  const latest = $derived(latestSubmission(app.data!, campusId));
  const changed = $derived(latest ? changedSinceSubmission(app.data!, latest) : false);
  const pending = $derived(latest?.status === 'pending');
  const archived = $derived(app.data?.period?.state === 'archived');
  // Locked states hide the edit actions; waiting only pauses them.
  const locked = $derived(archived || pending || app.readOnly);
  const waiting = $derived(!saving && (app.loading || app.busy));
  const disabled = $derived(locked || app.stale || waiting);
  const canEdit = $derived(!locked && !app.stale);
  const lockedReason = $derived(
    archived
      ? 'Arsip periode ini hanya dapat dibaca. Pilih periode aktif untuk mengisi data.'
      : pending
        ? 'Data yang dikirim sedang diperiksa Admin PF. Nilai indikator dikunci sampai ada keputusan.'
        : app.readOnly
          ? READ_ONLY_MESSAGE
          : app.stale
            ? 'Muat ulang halaman untuk melanjutkan perubahan.'
            : ''
  );
  const editingNow = $derived(editing && !locked);
  const categories = $derived([...new Set(app.data!.definitions.map((d) => d.category))]);
  const achieved = $derived(indicators.filter((i) => hasTarget(i) && i.current >= i.target).length);
  const score = $derived(average(indicators.map(progress)));
  const dirtyCount = $derived(indicators.filter(dirty).length);
  const errorCount = $derived(Object.keys(rowErrors).length);
  const readinessDirty = $derived(
    readinessFields.some(
      ([key]) => readinessDraft[key] !== undefined && readinessDraft[key] !== readinessSaved(key)
    )
  );
  const readinessFilled = $derived(
    readinessFields.filter(([key]) => readinessSaved(key).trim()).length
  );
  const unsaved = $derived(dirtyCount > 0 || readinessDirty);
  const submissionLabel = $derived(
    pending
      ? verificationLabel.pending
      : changed
        ? 'Perubahan belum dikirim'
        : latest
          ? verificationLabel[latest.status]
          : 'Belum dikirim'
  );
  const stripHint = $derived(
    dirtyCount
      ? `${dirtyCount} indikator diubah dan belum disimpan.`
      : readinessDirty
        ? 'Indikator kesiapan diubah dan belum disimpan.'
        : canEdit && !editingNow
          ? 'Tekan "Ubah data indikator" untuk memperbarui nilai.'
          : ''
  );
  const barLabel = $derived(
    saving === 'indicators'
      ? 'Menyimpan perubahan...'
      : app.stale
        ? RELOAD
        : errorCount
          ? `${errorCount} indikator belum tersimpan`
          : dirtyCount
            ? `${dirtyCount} indikator diubah`
            : 'Belum ada perubahan'
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

  function definition(id: string) {
    return app.data!.definitions.find((d) => d.id === id)!;
  }
  function comments(id: string) {
    return app
      .data!.feedback.filter((f) => f.indicatorId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  function dirty(item: CampusIndicator) {
    const draft = drafts[item.id];
    return !!draft && (draft.current !== savedValue(item) || draft.note !== item.note);
  }
  function draftFor(item: CampusIndicator) {
    delete rowErrors[item.id];
    return (drafts[item.id] ||= { current: savedValue(item), note: item.note });
  }
  function editValue(item: CampusIndicator, unit: string, input: HTMLInputElement) {
    if (!isMoney(unit)) {
      const value = input.valueAsNumber;
      draftFor(item).current = Number.isNaN(value) ? undefined : value;
      return;
    }
    const raw = input.value.replace(/^Rp\s*/i, '').replace(/\./g, '');
    if (!/^\d*(,\d*)?$/.test(raw)) {
      input.value = moneyText[item.id] ?? rupiah(savedValue(item));
      return;
    }
    const [whole, fraction] = raw.split(',');
    const formatted =
      raw === ''
        ? ''
        : `Rp ${(whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${fraction === undefined ? '' : ',' + fraction}`;
    moneyText[item.id] = formatted;
    input.value = formatted;
    draftFor(item).current = raw === '' || raw === ',' ? undefined : Number(raw.replace(',', '.'));
  }

  // A toast from an earlier save must not linger over a new form or dialog.
  function quiet() {
    app.toast = '';
    app.error = '';
  }
  function startEdit() {
    quiet();
    rowErrors = {};
    editing = true;
  }
  function resetIndicators() {
    drafts = {};
    moneyText = {};
    rowErrors = {};
    editing = false;
  }
  function cancelEdit() {
    if (saving) return;
    quiet();
    if (dirtyCount) discardTarget = 'indicators';
    else resetIndicators();
  }
  function discard() {
    if (discardTarget === 'indicators') resetIndicators();
    else {
      readinessDraft = {};
      readinessEditing = false;
    }
    discardTarget = '';
  }
  // A failed row may be hidden by the filters, so clear them before scrolling to it.
  async function reveal(id: string) {
    if (!rows.some((row) => row.id === id)) {
      search = '';
      category = '';
      status = 'all';
    }
    await tick();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(`indicator-${id}`)
      ?.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
  }

  async function save(item: CampusIndicator) {
    const draft = drafts[item.id];
    if (!draft || !dirty(item)) return true;
    if (!valid(draft)) {
      rowErrors[item.id] = VALUE_RULE;
      return false;
    }
    const current = draft.current!,
      note = draft.note;
    const saved = await app.mutate(() => dataService.updateIndicator(item.id, current, note), '');
    if (saved && !app.stale) {
      delete drafts[item.id];
      delete moneyText[item.id];
      return true;
    }
    // The message stays on the row, so the page level banner is not needed.
    rowErrors[item.id] = app.stale ? RELOAD : app.error || RETRY;
    app.error = '';
    return false;
  }
  // One request at a time: app.mutate reloads the shared page after each write.
  async function saveAll() {
    if (disabled || saving) return;
    const targets = indicators.filter(dirty);
    rowErrors = {};
    if (!targets.length) return;
    const invalid = targets.filter((item) => !valid(drafts[item.id]));
    if (invalid.length) {
      for (const item of invalid) rowErrors[item.id] = VALUE_RULE;
      void reveal(invalid[0].id);
      return;
    }
    saving = 'indicators';
    for (const item of targets) {
      await save(item);
      if (app.stale) break;
    }
    saving = '';
    const failed = targets.find((item) => rowErrors[item.id]);
    if (failed || app.stale) {
      if (failed) void reveal(failed.id);
      return;
    }
    resetIndicators();
    app.toast = `${targets.length} indikator tersimpan.`;
  }

  function readinessSaved(key: ReadinessKey) {
    return campus?.program?.[key] ?? '';
  }
  const readinessValue = (key: ReadinessKey) => readinessDraft[key] ?? readinessSaved(key);
  // EditableSection closes itself on "Batal"; unsaved text asks for confirmation first.
  function setReadinessEditing(value: boolean) {
    if (value) quiet();
    else if (readinessDirty) {
      quiet();
      discardTarget = 'readiness';
      return;
    } else readinessDraft = {};
    readinessEditing = value;
  }
  async function saveReadiness() {
    if (disabled || saving) return false;
    if (!readinessDirty) return true;
    const values = Object.fromEntries(
      readinessFields.map(([key]) => [key, readinessValue(key)])
    ) as Partial<Pick<ProgramProfile, ReadinessKey>>;
    saving = 'readiness';
    const saved = await app.mutate(
      () => dataService.updateReadiness(campusId, values),
      'Indikator kesiapan tersimpan.'
    );
    saving = '';
    if (!saved || app.stale) return false;
    readinessDraft = {};
    return true;
  }

  // Drafts cannot be saved once the data is locked, so drop them with the edit mode.
  $effect(() => {
    if (!locked) return;
    if (editing) resetIndicators();
    if (readinessEditing) {
      readinessDraft = {};
      readinessEditing = false;
    }
  });

  $effect(() => {
    if (!unsaved && !saving) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });
  beforeNavigate((navigation) => {
    if (leaving || (!unsaved && !saving)) return;
    // Closing the tab or reloading is handled by the beforeunload listener above.
    if (navigation.willUnload) return;
    navigation.cancel();
    if (saving || !navigation.to) return;
    quiet();
    leaveTo = navigation.to.url;
  });
  async function leave() {
    const target = leaveTo;
    leaveTo = null;
    if (!target) return;
    leaving = true;
    try {
      await goto(target);
    } finally {
      leaving = false;
    }
  }
</script>

{#snippet indicatorCard(item: CampusIndicator)}
  {@const d = definition(item.definitionId)}
  {@const draft = drafts[item.id]}
  {@const unit = unitLabel(d.unit)}
  {@const feedback = comments(item.id)}
  {@const revising = feedback.some((f) => f.requiresRevision && f.state !== 'closed')}
  {@const done = hasTarget(item) && item.current >= item.target}
  {@const edited = dirty(item)}
  {@const problem = rowErrors[item.id]}
  <article
    id={`indicator-${item.id}`}
    class={[
      'scroll-mt-24 rounded-xl border p-4 transition-colors sm:p-5',
      problem
        ? 'border-[#f3c6c0] bg-[#fffaf8]'
        : edited
          ? 'border-[#f0d48a] bg-[#fffdf5]'
          : 'border-[#dce7f7] bg-[#f5f9ff]'
    ]}
    aria-label={`Indikator: ${d.name}`}
  >
    <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div class="min-w-0 flex-1 basis-60">
        <h3 class="m-0 text-[15px] font-semibold leading-snug text-[#0d234c] [overflow-wrap:anywhere]">
          {d.name}
        </h3>
        <p class="m-0 mt-1 text-[13px] leading-[1.55] text-[#64748b]">
          {d.description || `Satuan: ${d.unit}`}
        </p>
      </div>
      <Badge tone={edited || revising ? 'amber' : done ? 'green' : 'blue'}
        >{edited
          ? 'Belum disimpan'
          : item.unfilled
            ? 'Belum diisi'
            : revising
              ? 'Perlu tindak lanjut'
              : !hasTarget(item)
                ? 'Target belum ditetapkan'
                : done
                  ? 'Tercapai'
                  : 'Dalam proses'}</Badge
      >
    </header>

    <dl class="m-0 mt-4 grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-[1.4fr_1fr_1fr_1.5fr]">
      <div class="col-span-2 min-w-0 lg:col-span-1">
        {#if editingNow}
          <dt class="m-0 text-[13px] font-semibold text-[#17365f]">
            <label for={`actual-${item.id}`}
              >Nilai aktual <span class="text-[#dc2626]" aria-hidden="true">*</span></label
            >
          </dt>
          <dd class="m-0 mt-2">
            <div
              class={[
                'flex items-stretch overflow-hidden rounded-lg border bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#55a9f2]',
                problem ? 'border-[#e0897c]' : 'border-[#cfe0f5]'
              ]}
            >
              <input
                class="w-0 min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-[#0d234c] outline-none disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#475569]"
                id={`actual-${item.id}`}
                aria-label={`Nilai aktual ${d.name}`}
                aria-invalid={problem ? 'true' : undefined}
                type={isMoney(d.unit) ? 'text' : 'number'}
                inputmode={isMoney(d.unit) ? 'decimal' : undefined}
                min="0"
                step="any"
                required
                disabled={disabled || !!saving}
                value={isMoney(d.unit)
                  ? (moneyText[item.id] ?? rupiah(draft ? draft.current : savedValue(item)))
                  : draft
                    ? draft.current
                    : savedValue(item)}
                oninput={(event) => editValue(item, d.unit, event.currentTarget)}
              />{#if unit}<span
                  class="flex max-w-[55%] shrink-0 items-center bg-[#e9f3ff] px-3 text-[13px] text-[#17365f] [overflow-wrap:anywhere]"
                  >{unit}</span
                >{/if}
            </div>
            <small class="mt-1.5 block text-[12px] leading-[1.55] text-[#64748b]"
              >{item.unfilled ? 'Belum diisi' : `Tersimpan: ${withUnit(item.current, d.unit)}`}</small
            >
          </dd>
        {:else}
          <dt class={term}>Nilai aktual</dt>
          <dd class="m-0 mt-1 [overflow-wrap:anywhere]">
            {#if item.unfilled}
              <span class="text-[15px] font-semibold text-[#94a3b8]">Belum diisi</span>
            {:else}
              <span class="text-[19px] font-bold leading-snug text-[#0d234c]"
                >{amount(item.current, d.unit)}</span
              >
              {#if unit}<span class="text-[13px] text-[#64748b]">{unit}</span>{/if}
            {/if}
          </dd>
        {/if}
      </div>
      <ReadField label="Baseline" value={withUnit(item.baseline, d.unit)} />
      <ReadField
        label="Target"
        value={hasTarget(item) ? withUnit(item.target, d.unit) : ''}
        empty="Belum ditetapkan"
      />
      <div class="col-span-2 min-w-0 lg:col-span-1">
        <dt class={term}>Capaian</dt>
        <dd class="m-0 mt-2">
          <div
            class="h-1.5 overflow-hidden rounded-full bg-[#dce9f8]"
            role="progressbar"
            aria-label={`Capaian ${d.name}`}
            aria-valuenow={Math.round(progress(item))}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span
              class={['block h-full rounded-full', done ? 'bg-[#1f9d63]' : 'bg-[#075fc7]']}
              style:width={`${progress(item)}%`}
            ></span>
          </div>
          <p class="m-0 mt-1.5 text-[13px] leading-[1.55] text-[#475569]">
            {#if !hasTarget(item)}
              Target belum ditetapkan
            {:else}
              <strong class="font-semibold text-[#17365f]">{number(progress(item))}%</strong> dari
              target{#if !done}, kurang {withUnit(item.target - item.current, d.unit, 2)}{/if}
            {/if}
          </p>
        </dd>
      </div>
      <div class="col-span-full min-w-0">
        {#if editingNow}
          <dt class="m-0 text-[13px] font-semibold text-[#17365f]">
            <label for={`note-${item.id}`}
              >Catatan perkembangan <span class="text-[#dc2626]" aria-hidden="true">*</span></label
            >
          </dt>
          <dd class="m-0 mt-2">
            <textarea
              class="block min-h-[68px] w-full resize-y rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm leading-[1.55] text-[#0d234c] placeholder:text-[#94a3b8] focus:border-[#55a9f2] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#55a9f2] disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#475569]"
              id={`note-${item.id}`}
              aria-label={`Catatan perkembangan ${d.name}`}
              rows="2"
              maxlength="5000"
              disabled={disabled || !!saving}
              value={draft ? draft.note : item.note}
              oninput={(event) => {
                draftFor(item).note = event.currentTarget.value;
              }}
              placeholder="Periode data, kegiatan, dan hasil yang dicapai"
            ></textarea>
            <small class="mt-1.5 block text-[12px] leading-[1.55] text-[#64748b]"
              >Sertakan sumber atau konteks data untuk membantu verifikasi.</small
            >
          </dd>
        {:else}
          <dt class={term}>Catatan perkembangan</dt>
          <dd
            class="m-0 mt-1 whitespace-pre-line text-sm leading-[1.6] text-[#17365f] [overflow-wrap:anywhere]"
          >
            {#if item.note.trim()}{item.note}{:else}<span class="text-[#94a3b8]"
                >Belum ada catatan</span
              >{/if}
          </dd>
        {/if}
      </div>
    </dl>

    {#if problem}
      <p
        class="m-0 mt-4 flex items-start gap-2 rounded-lg bg-[#fff0ec] px-3 py-2 text-[13px] font-medium leading-[1.5] text-[#b3402e]"
        role="alert"
      >
        <span class="mt-0.5"><Icon name="alert" size={15} /></span>{problem}
      </p>
    {/if}

    <footer class="mt-4 flex items-center gap-1.5 text-[12px] text-[#64748b]">
      <Icon name="clock" size={13} />Diperbarui {date(item.updatedAt)}
    </footer>

    {#if feedback.length}
      <div class="mt-4 grid gap-2" role="group" aria-label={`Feedback ${d.name}`}>
        {#each feedback as comment (comment.id)}
          <div
            class={[
              'rounded-r-lg border-l-[3px] px-3.5 py-3',
              comment.state === 'closed'
                ? 'border-[#66b98b] bg-[#edf9f2]'
                : 'border-[#e0ac49] bg-[#fff6dc]'
            ]}
          >
            <div class="flex flex-wrap items-center gap-2 text-[12px] text-[#17365f]">
              <span
                class="grid size-6 place-items-center rounded-full bg-[#075fc7] text-[10px] font-bold text-white"
                aria-hidden="true">PF</span
              ><strong class="font-semibold">Admin PF</strong><Badge
                tone={comment.state === 'closed'
                  ? 'green'
                  : comment.state === 'responded'
                    ? 'blue'
                    : 'amber'}
                >{comment.requiresRevision ? feedbackLabel[comment.state] : 'Catatan'}</Badge
              ><span class="text-[#64748b]">{date(comment.createdAt)}</span>
            </div>
            <p
              class="m-0 mt-2 whitespace-pre-wrap text-[13px] leading-[1.6] text-[#17365f] [overflow-wrap:anywhere]"
            >
              {comment.text}
            </p>
          </div>
        {/each}
      </div>
    {/if}
  </article>
{/snippet}

<div class="pb-4 text-[#17365f]">
  <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <h1 class="m-0 text-2xl font-bold leading-[1.3] tracking-[-0.01em] text-[#0d234c] max-sm:text-[22px]">
        Indikator Baseline
      </h1>
      <p class="m-0 mt-2 max-w-[700px] text-sm leading-[1.6] text-[#475569]">
        Pantau perkembangan indikator DEB {campus?.name || 'kampus Anda'}. Perbarui nilai aktual dan
        catatan, simpan, lalu kirim untuk verifikasi.
      </p>
    </div>
    <span
      class="flex items-center gap-2 whitespace-nowrap rounded-full border border-[#dce7f7] bg-[#f5f9ff] px-3 py-1.5 text-[13px] font-medium text-[#075fc7]"
      ><Icon name="indicators" size={15} />DEB Putih</span
    >
  </header>

  <section
    class="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-[#dce7f7] bg-white px-4 py-3"
    aria-label="Ringkasan status indikator"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#475569]">
      <Badge tone={pending ? 'blue' : latest?.status === 'approved' && !changed ? 'green' : 'amber'}
        >{submissionLabel}</Badge
      >
      <span class="flex items-center gap-2"
        ><Icon name="indicators" size={15} />{indicators.length} indikator tersedia</span
      >
    </div>
    <p class="m-0 text-[13px] leading-[1.6] text-[#64748b]" role="status">{stripHint}</p>
  </section>

  {#if latest}
    <p class="m-0 mb-4 text-[13px] leading-[1.6] text-[#64748b]">
      Pengajuan #{latest.version} · Dikirim {date(latest.submittedAt)}{#if latest.reviewedAt}
        · Ditinjau {date(latest.reviewedAt)}{/if}
    </p>
  {/if}
  {#if latest?.decisionNote}
    <aside
      class="mb-4 flex gap-2.5 rounded-r-lg border-l-[3px] border-[#e0ac49] bg-[#fff6dc] px-3.5 py-3 text-sm text-[#17365f]"
    >
      <span class="mt-0.5"><Icon name="questions" size={18} /></span>
      <div class="min-w-0">
        <strong class="font-semibold">Catatan Admin PF</strong>
        <p class="m-0 mt-1.5 whitespace-pre-wrap text-[13px] leading-[1.6] [overflow-wrap:anywhere]">
          {latest.decisionNote}
        </p>
      </div>
    </aside>
  {/if}

  <section
    class="mb-5 rounded-xl border border-[#dce7f7] bg-white p-5 max-sm:p-4"
    aria-label="Ringkasan capaian indikator"
  >
    <div class="flex items-center justify-between gap-4">
      <h2 class="m-0 text-[16px] font-bold text-[#0d234c]">Capaian Indikator</h2>
      <span class="text-[13px] font-semibold text-[#475569]">{number(score)}%</span>
    </div>
    <div class="my-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-l-[3px] border-[#dce7f7] border-l-[#075fc7] p-4 max-sm:p-3">
        <span class="text-[13px] text-[#475569]">Indikator tersedia</span>
        <strong class="block text-[26px] font-bold leading-[1.5] text-[#0d234c]"
          >{indicators.length}<small class="ml-1 text-sm font-medium text-[#64748b]"
            >/ {app.data!.definitions.length}</small
          ></strong
        >
        <p class="m-0 text-[13px] leading-[1.55] text-[#64748b]">indikator aktif untuk kampus Anda</p>
      </div>
      <div class="rounded-xl border border-[#dce7f7] p-4 max-sm:p-3">
        <span class="text-[13px] text-[#475569]">Capaian rata-rata</span>
        <strong class="block text-[26px] font-bold leading-[1.5] text-[#0d234c]"
          >{number(score)}<small class="text-sm font-medium text-[#64748b]">%</small></strong
        >
        <p class="m-0 text-[13px] leading-[1.55] text-[#64748b]">
          terhadap target masing-masing indikator
        </p>
      </div>
      <div class="rounded-xl border border-[#dce7f7] p-4 max-sm:p-3">
        <span class="text-[13px] text-[#475569]">Belum mencapai target</span>
        <strong class="block text-[26px] font-bold leading-[1.5] text-[#0d234c]"
          >{indicators.length - achieved}<small class="ml-1 text-sm font-medium text-[#64748b]"
            >indikator</small
          ></strong
        >
        <p class="m-0 text-[13px] leading-[1.55] text-[#64748b]">
          {achieved} indikator sudah mencapai target
        </p>
      </div>
    </div>
    <div
      class="h-1.5 overflow-hidden rounded-full bg-[#dce9f8]"
      role="progressbar"
      aria-label="Capaian rata-rata indikator"
      aria-valuenow={Math.round(score)}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span class="block h-full rounded-full bg-[#1f9d63]" style:width={`${score}%`}></span>
    </div>
    <p class="m-0 mt-3 text-[13px] leading-[1.6] text-[#64748b]">
      Ringkasan menggunakan nilai yang sudah disimpan. Baseline dan target ditetapkan oleh Admin PF.
      Nilai nol tetap merupakan nilai aktual yang valid.
    </p>
  </section>

  <section
    class={[
      'mb-4 rounded-xl border bg-white p-5 transition-colors max-sm:p-4',
      editingNow ? 'border-[#9cc3ef] ring-4 ring-[#e9f3ff]' : 'border-[#dce7f7]'
    ]}
    aria-label="Data indikator"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <span
          class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e9f3ff] text-[#075fc7]"
          aria-hidden="true"><Icon name="indicators" size={18} /></span
        >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="m-0 text-[16px] font-bold leading-snug text-[#0d234c]">Data indikator</h2>
            {#if editingNow}<span
                class="rounded-full bg-[#fff4d6] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]"
                >Sedang diubah</span
              >{/if}
          </div>
          <p class="m-0 mt-1 text-[13px] leading-[1.55] text-[#475569]">
            {editingNow
              ? 'Ubah nilai aktual dan catatan, lalu tekan Simpan perubahan.'
              : 'Nilai aktual, baseline, target, dan catatan setiap indikator.'}
          </p>
        </div>
      </div>
      {#if !editingNow}
        {#if canEdit}
          <div class="max-sm:w-full max-sm:[&>button]:w-full">
            <Button icon="edit" onclick={startEdit} disabled={waiting}>Ubah data indikator</Button>
          </div>
        {:else if lockedReason}
          <p
            class="m-0 flex max-w-[340px] items-start gap-2 text-[13px] leading-[1.55] text-[#64748b] max-sm:max-w-none"
          >
            <span class="mt-0.5"><Icon name="clock" size={15} /></span>{lockedReason}
          </p>
        {/if}
      {/if}
    </div>

    <div class="mt-4 flex flex-wrap gap-2.5">
      <div
        class="flex min-w-0 flex-1 basis-64 items-center gap-2 max-sm:basis-full rounded-lg border border-[#cfe0f5] bg-white px-3 text-[#64748b] focus-within:outline focus-within:outline-2 focus-within:outline-[#55a9f2]"
      >
        <Icon name="search" size={17} /><input
          class="w-full min-w-0 border-0 bg-transparent py-2.5 text-sm text-[#17365f] outline-none placeholder:text-[#64748b]"
          aria-label="Cari indikator"
          placeholder="Cari indikator"
          bind:value={search}
        />
      </div>
      <select
        class="min-h-[42px] min-w-0 rounded-lg border border-[#cfe0f5] bg-white px-3 text-[13px] text-[#17365f] focus:outline focus:outline-2 focus:outline-[#55a9f2] max-sm:flex-1 sm:max-w-[250px]"
        aria-label="Filter bidang indikator"
        bind:value={category}
        ><option value="">Semua bidang</option>{#each categories as item}<option>{item}</option
          >{/each}</select
      >
      <select
        class="min-h-[42px] min-w-0 rounded-lg border border-[#cfe0f5] bg-white px-3 text-[13px] text-[#17365f] focus:outline focus:outline-2 focus:outline-[#55a9f2] max-sm:flex-1 sm:max-w-[250px]"
        aria-label="Filter status indikator"
        bind:value={status}
        ><option value="all">Semua status</option><option value="achieved">Tercapai</option><option
          value="progress">Dalam proses</option
        ><option value="revision">Perlu tindak lanjut</option></select
      >
    </div>
  </section>

  {#each categories as group}
    {@const grouped = rows.filter((i) => definition(i.definitionId).category === group)}
    {#if grouped.length}
      <section
        class="mb-4 rounded-xl border border-[#dce7f7] bg-white p-5 max-sm:p-3"
        aria-label={group}
      >
        <header class="mb-3.5 flex items-center justify-between gap-4 max-sm:px-1 max-sm:pt-1">
          <h2 class="m-0 text-[15px] font-bold text-[#0d234c]">{group}</h2>
          <span class="text-[13px] text-[#64748b]">{grouped.length} indikator</span>
        </header>
        <div class="grid gap-3">
          {#each grouped as item (item.id)}
            {@render indicatorCard(item)}
          {/each}
        </div>
      </section>
    {/if}
  {/each}
  {#if !rows.length}
    <div class="mb-4 rounded-xl border border-[#dce7f7] bg-white p-5 max-sm:p-3">
      <Empty
        title="Tidak ada indikator yang cocok"
        description="Ubah pencarian, bidang, atau filter status."
      />
    </div>
  {/if}

  <div class="mt-5">
    <EditableSection
      title="Indikator kesiapan rencana aksi"
      description="Bukti dan kondisi program yang melengkapi pengajuan verifikasi."
      icon="target"
      bind:editing={() => readinessEditing, setReadinessEditing}
      {canEdit}
      {lockedReason}
      saving={saving === 'readiness'}
      dirty={readinessDirty}
      onSave={saveReadiness}
    >
      {#snippet badge()}
        <Badge tone={readinessFilled === readinessFields.length ? 'green' : 'amber'}
          >{readinessFilled} dari {readinessFields.length} terisi</Badge
        >
      {/snippet}
      {#snippet view()}
        <dl class="m-0 grid gap-x-8 gap-y-5 sm:grid-cols-2 sm:[&>*:last-child]:col-span-2">
          {#each readinessFields as [key, label] (key)}
            <ReadField {label} value={readinessSaved(key)} multiline />
          {/each}
        </dl>
      {/snippet}
      {#snippet edit()}
        <div class="grid gap-x-5 gap-y-4 sm:grid-cols-2 sm:[&>*:last-child]:col-span-2">
          {#each readinessFields as [key, label] (key)}
            <div class="min-w-0">
              <label class="block text-[13px] font-semibold text-[#17365f]" for={`readiness-${key}`}
                >{label} <span class="text-[#dc2626]" aria-hidden="true">*</span></label
              >
              <textarea
                id={`readiness-${key}`}
                aria-label={label}
                class="mt-2 block min-h-[76px] w-full resize-y rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm leading-[1.55] text-[#0d234c] focus:border-[#55a9f2] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[#55a9f2] disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#475569]"
                rows={key === 'conflict' || key === 'intervention' ? 7 : 3}
                maxlength="5000"
                disabled={disabled || !!saving}
                value={readinessValue(key)}
                oninput={(event) => {
                  readinessDraft[key] = event.currentTarget.value;
                }}
              ></textarea>
            </div>
          {/each}
        </div>
      {/snippet}
    </EditableSection>
  </div>

  <!-- While a form is open the submission card stays in the flow, so only one bar floats. -->
  <div
    class={editingNow || readinessEditing
      ? 'mt-5'
      : 'sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[12] mt-5'}
  >
    <SubmissionStatus compact blocked={unsaved || !!saving} />
  </div>

  {#if editingNow}
    <div class="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[12] mt-4">
      <div
        class={[
          'flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border bg-white px-4 py-3 shadow-[0_12px_32px_#0d234c29]',
          errorCount || app.stale ? 'border-[#f3c6c0]' : 'border-[#9cc3ef]'
        ]}
        role="region"
        aria-label="Simpan perubahan indikator"
      >
        <div class="mr-auto min-w-0 max-sm:basis-full">
          <p
            class={[
              'm-0 flex items-center gap-2 text-sm font-semibold',
              errorCount || app.stale ? 'text-[#b3402e]' : 'text-[#0d234c]'
            ]}
            role="status"
          >
            <Icon name={errorCount || app.stale ? 'alert' : dirtyCount ? 'edit' : 'check'} size={16} />
            {barLabel}
          </p>
          {#if errorCount && !saving}
            <p class="m-0 mt-0.5 text-[13px] leading-[1.5] text-[#475569]">
              Periksa pesan pada indikator yang ditandai, lalu simpan kembali.
            </p>
          {/if}
        </div>
        <Button variant="ghost" onclick={cancelEdit} disabled={!!saving}>Batal</Button>
        <div class="max-sm:flex-1 max-sm:[&>button]:w-full">
          <Button
            icon="save"
            loading={saving === 'indicators'}
            disabled={disabled || !dirtyCount}
            onclick={saveAll}>Simpan perubahan</Button
          >
        </div>
      </div>
    </div>
  {/if}
</div>

{#if discardTarget}
  <Modal title="Buang perubahan?" onclose={() => (discardTarget = '')}>
    <p class="m-0 text-sm leading-[1.6] text-[#475569]">
      {discardTarget === 'indicators'
        ? `${dirtyCount} indikator yang diubah belum disimpan.`
        : 'Perubahan indikator kesiapan belum disimpan.'}
      Perubahan tersebut akan hilang.
    </p>
    <div class="mt-5 flex flex-wrap justify-end gap-2 max-sm:flex-col">
      <Button variant="ghost" onclick={() => (discardTarget = '')}>Lanjut mengubah</Button>
      <Button variant="danger" icon="trash" onclick={discard}>Buang perubahan</Button>
    </div>
  </Modal>
{/if}

{#if leaveTo}
  <Modal title="Tinggalkan halaman?" onclose={() => (leaveTo = null)}>
    <p class="m-0 text-sm leading-[1.6] text-[#475569]">
      Perubahan yang belum disimpan akan hilang jika Anda meninggalkan halaman ini.
    </p>
    <div class="mt-5 flex flex-wrap justify-end gap-2 max-sm:flex-col">
      <Button variant="ghost" onclick={() => (leaveTo = null)}>Lanjut mengubah</Button>
      <Button variant="danger" onclick={leave}>Tinggalkan halaman</Button>
    </div>
  </Modal>
{/if}
