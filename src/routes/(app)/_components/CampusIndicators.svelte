<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { average, progress, number, date, feedbackLabel } from '$lib/domain';
  import { latestSubmission, changedSinceSubmission, verificationLabel } from '$lib/verification';
  import type { CampusIndicator } from '$lib/types';
  import Icon from '$lib/components/Icon.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Empty from '$lib/components/Empty.svelte';
  import SubmissionStatus from '$lib/components/SubmissionStatus.svelte';

  let search = $state('');
  let category = $state('');
  let status = $state('all');
  let drafts = $state<Record<string, { current: number | undefined; note: string }>>({});
  let saving = $state('');
  let saveFailed = $state(false);
  const campusId = $derived(app.session!.campusId!);
  const campus = $derived(app.data!.campuses.find((c) => c.id === campusId));
  const indicators = $derived(app.data!.indicators.filter((i) => i.campusId === campusId));
  const latest = $derived(latestSubmission(app.data!, campusId));
  const changed = $derived(latest ? changedSinceSubmission(app.data!, latest) : false);
  const pending = $derived(latest?.status === 'pending');
  const disabled = $derived(
    pending || app.readOnly || app.stale || (!saving && (app.loading || app.busy))
  );
  const categories = $derived([...new Set(app.data!.definitions.map((d) => d.category))]);
  const achieved = $derived(indicators.filter((i) => i.current >= i.target).length);
  const score = $derived(average(indicators.map(progress)));
  const dirtyCount = $derived(indicators.filter(dirty).length);
  const saveLabel = $derived(
    saving
      ? 'Menyimpan…'
      : app.stale
        ? 'Muat ulang untuk memastikan data tersimpan'
        : saveFailed
          ? 'Gagal menyimpan. Coba simpan kembali.'
          : dirtyCount
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
            ? i.current >= i.target
            : status === 'progress'
              ? i.current < i.target
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
    return !!draft && (draft.current !== item.current || draft.note !== item.note);
  }
  function edit(item: CampusIndicator) {
    saveFailed = false;
    app.toast = '';
    return (drafts[item.id] ||= { current: item.current, note: item.note });
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
    if (!dirtyCount && !saving) return;
    if (
      willUnload ||
      !window.confirm('Ada perubahan indikator yang belum disimpan. Tinggalkan halaman?')
    )
      cancel();
  });
</script>

{#snippet saveIcon()}
  {#if saving}<span class="save-spinner" aria-hidden="true"></span>
  {:else}<Icon
      name={saveFailed || app.stale ? 'alert' : dirtyCount ? 'clock' : 'save'}
      size={17}
    />{/if}
{/snippet}

<div class="campus-indicators">
  <header class="indicator-heading">
    <div>
      <h1>Indikator Baseline</h1>
      <p>
        Catat perkembangan indikator DEB {campus?.name || 'kampus Anda'}. Lengkapi nilai aktual dan
        catatan sebelum mengirim verifikasi.
      </p>
    </div>
    <div class="heading-status">
      <span class="heading-tag"><Icon name="indicators" size={15} />DEB Putih</span>
      <span
        class="save-status"
        class:save-error={saveFailed || app.stale}
        role="status"
        aria-label="Status penyimpanan"
      >
        {@render saveIcon()}{saveLabel}
      </span>
    </div>
  </header>

  <section class="status-strip" aria-label="Ringkasan status indikator">
    <div class="status-labels">
      <Badge tone={pending ? 'blue' : latest?.status === 'approved' && !changed ? 'green' : 'amber'}
        >{submissionLabel}</Badge
      >
      <span><Icon name="indicators" size={15} />{indicators.length} indikator tersedia</span>
    </div>
    <p>
      {dirtyCount
        ? `${dirtyCount} indikator memiliki perubahan belum disimpan.`
        : 'Perubahan disimpan otomatis setelah 2 detik tanpa ketikan.'}
    </p>
  </section>

  {#if latest}<p class="submission-history">
      Pengajuan #{latest.version} · Dikirim {date(latest.submittedAt)}{#if latest.reviewedAt}
        · Ditinjau {date(latest.reviewedAt)}{/if}
    </p>{/if}
  {#if latest?.decisionNote}<aside class="review-note">
      <Icon name="questions" size={18} />
      <div>
        <strong>Catatan Admin PF</strong>
        <p class="pre-wrap">{latest.decisionNote}</p>
      </div>
    </aside>{/if}

  <section class="indicator-summary" aria-label="Ringkasan capaian indikator">
    <div class="summary-heading">
      <h2>Capaian Indikator</h2>
      <span>{number(score)}%</span>
    </div>
    <div class="summary-grid">
      <div class="summary-metric">
        <span>Indikator tersedia</span><strong
          >{indicators.length}<small> / {app.data!.definitions.length}</small></strong
        >
        <p>indikator aktif untuk kampus Anda</p>
      </div>
      <div class="summary-metric">
        <span>Capaian rata-rata</span><strong>{number(score)}<small>%</small></strong>
        <p>terhadap target masing-masing indikator</p>
      </div>
      <div class="summary-metric">
        <span>Belum mencapai target</span><strong
          >{indicators.length - achieved}<small> indikator</small></strong
        >
        <p>{achieved} indikator sudah mencapai target</p>
      </div>
    </div>
    <div
      class="meter"
      role="progressbar"
      aria-label="Capaian rata-rata indikator"
      aria-valuenow={Math.round(score)}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span style:width={`${score}%`}></span>
    </div>
    <p class="summary-help">
      Ringkasan menggunakan nilai yang sudah disimpan. Baseline dan target ditetapkan oleh Admin PF;
      nilai nol tetap merupakan nilai aktual yang valid.
    </p>
  </section>

  <div class="indicator-filters">
    <div class="search-field">
      <Icon name="search" size={17} /><input
        aria-label="Cari indikator"
        placeholder="Cari indikator…"
        bind:value={search}
      />
    </div>
    <select aria-label="Filter bidang indikator" bind:value={category}
      ><option value="">Semua bidang</option>{#each categories as item}<option>{item}</option
        >{/each}</select
    >
    <select aria-label="Filter status indikator" bind:value={status}
      ><option value="all">Semua status</option><option value="achieved">Tercapai</option><option
        value="progress">Dalam proses</option
      ><option value="revision">Perlu tindak lanjut</option></select
    >
  </div>

  {#each categories as group}
    {@const grouped = rows.filter((i) => definition(i.definitionId).category === group)}
    {#if grouped.length}<section class="indicator-group" aria-label={group}>
        <header class="group-heading">
          <h2>{group}</h2>
          <span>{grouped.length} indikator</span>
        </header>
        {#each grouped as item (item.id)}
          {@const d = definition(item.definitionId)}
          {@const draft = drafts[item.id]}
          {@const feedback = comments(item.id)}
          {@const revising = feedback.some((f) => f.requiresRevision && f.state !== 'closed')}
          <article class="indicator-card" aria-label={`Indikator: ${d.name}`}>
            <header class="card-heading">
              <div>
                <h3>{d.name}</h3>
                <p>{d.description || `Satuan: ${d.unit}`}</p>
              </div>
              <Badge
                tone={dirty(item) || revising
                  ? 'amber'
                  : item.current >= item.target
                    ? 'green'
                    : 'blue'}
                >{dirty(item)
                  ? 'Belum disimpan'
                  : revising
                    ? 'Perlu tindak lanjut'
                    : item.current >= item.target
                      ? 'Tercapai'
                      : 'Dalam proses'}</Badge
              >
            </header>
            <form
              onsubmit={(event) => {
                event.preventDefault();
                void save(item);
              }}
            >
              <div class="card-fields">
                <div class="field">
                  <label for={`actual-${item.id}`}>Nilai aktual</label>
                  <div class="unit-input">
                    <input
                      id={`actual-${item.id}`}
                      aria-label={`Nilai aktual ${d.name}`}
                      type="number"
                      min="0"
                      step="any"
                      required
                      {disabled}
                      value={draft ? draft.current : item.current}
                      oninput={(event) => {
                        const value = event.currentTarget.valueAsNumber;
                        edit(item).current = Number.isNaN(value) ? undefined : value;
                      }}
                    /><span>{d.unit}</span>
                  </div>
                  <small>Tersimpan: {number(item.current)} {d.unit}</small>
                </div>
                <div class="field">
                  <span class="field-label">Target indikator</span>
                  <div class="reference-value">{number(item.target)} <span>{d.unit}</span></div>
                  <small>Ditetapkan oleh Admin PF</small>
                </div>
                <div class="field">
                  <span class="field-label">Baseline &amp; capaian</span>
                  <div class="baseline-value">
                    Baseline <strong>{number(item.baseline)} {d.unit}</strong>
                  </div>
                  <div
                    class="meter"
                    class:achieved={item.current >= item.target}
                    role="progressbar"
                    aria-label={`Capaian ${d.name}`}
                    aria-valuenow={Math.round(progress(item))}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <span style:width={`${progress(item)}%`}></span>
                  </div>
                  <small
                    >{number(progress(item))}% dari target{#if item.current < item.target}
                      · kurang {number(item.target - item.current)} {d.unit}{/if}</small
                  >
                </div>
                <div class="field note-field">
                  <label for={`note-${item.id}`}>Catatan perkembangan</label><textarea
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
                    >Sertakan sumber atau konteks data untuk membantu verifikasi.</small
                  >
                </div>
              </div>
              <footer class="card-footer">
                <small><Icon name="clock" size={13} />Diperbarui {date(item.updatedAt)}</small>
                <div>
                  {#if dirty(item)}<button
                      type="button"
                      class="cancel-edit"
                      disabled={disabled || !!saving}
                      onclick={() => {
                        delete drafts[item.id];
                        saveFailed = false;
                      }}>Batal</button
                    >{/if}<button
                    class="save-indicator"
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
            {#if feedback.length}<div class="indicator-feedback" aria-label={`Feedback ${d.name}`}>
                {#each feedback as comment}<div
                    class="feedback-entry"
                    class:resolved={comment.state === 'closed'}
                  >
                    <div class="feedback-heading">
                      <span class="feedback-avatar">PF</span><strong>Admin PF</strong><Badge
                        tone={comment.state === 'closed'
                          ? 'green'
                          : comment.state === 'responded'
                            ? 'blue'
                            : 'amber'}
                        >{comment.requiresRevision
                          ? feedbackLabel[comment.state]
                          : 'Catatan'}</Badge
                      ><small>{date(comment.createdAt)}</small>
                    </div>
                    <p class="pre-wrap">{comment.text}</p>
                  </div>{/each}
              </div>{/if}
          </article>
        {/each}
      </section>{/if}
  {/each}
  {#if !rows.length}<div class="indicator-group">
      <Empty
        title="Tidak ada indikator yang cocok"
        description="Ubah pencarian, bidang, atau filter status."
      />
    </div>{/if}

  <div class="indicator-submit">
    <SubmissionStatus compact blocked={dirtyCount > 0 || !!saving}>
      {#snippet statusIcon()}
        <span
          class="save-status floating-save-icon"
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

<style>
  .heading-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }
  .save-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #397866;
  }
  .save-error {
    color: #b45309;
  }
  .floating-save-icon {
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #edf8f4;
  }
  .save-spinner {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    border: 2px solid #c9e5f8;
    border-top-color: #0284c7;
    border-radius: 50%;
    animation: saving-spin 0.8s linear infinite;
  }
  @keyframes saving-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .save-spinner {
      animation: none;
    }
  }
  .campus-indicators {
    --ink: #163e55;
    --muted: #658295;
    --line: #d8edf9;
    color: var(--ink);
    padding-bottom: 16px;
  }
  h1,
  h2,
  h3 {
    color: var(--ink);
  }
  .indicator-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
  }
  h1 {
    font-size: 24px;
    letter-spacing: -0.7px;
  }
  .indicator-heading p {
    max-width: 700px;
    font-size: 12px;
    color: var(--muted);
    margin-top: 8px;
    line-height: 1.8;
  }
  .heading-tag,
  .status-labels,
  .status-labels > span {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .heading-tag {
    padding: 7px 12px;
    border: 1px solid var(--line);
    border-radius: 20px;
    background: #f1faff;
    font-size: 11px;
    white-space: nowrap;
    color: #0278b3;
  }
  .status-strip,
  .indicator-summary,
  .indicator-group {
    background: white;
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: 0 2px 5px #0c4a6e05;
  }
  .status-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px 18px;
    margin-bottom: 16px;
  }
  .status-labels {
    flex-wrap: wrap;
    gap: 14px;
    font-size: 11px;
    color: var(--muted);
  }
  .status-strip p {
    color: var(--muted);
    font-size: 10px;
  }
  .indicator-summary {
    padding: 20px;
    margin-bottom: 18px;
  }
  .summary-heading,
  .group-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  h2 {
    font-size: 13px;
    letter-spacing: -0.15px;
  }
  .summary-heading > span,
  .group-heading > span {
    font-size: 11px;
    color: var(--muted);
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin: 16px 0;
  }
  .summary-metric {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 15px;
  }
  .summary-metric:first-child {
    border-left: 3px solid #0ea5e9;
  }
  .summary-metric > span {
    font-size: 11px;
    color: var(--muted);
  }
  .summary-metric > strong {
    display: block;
    font-size: 27px;
    line-height: 1.6;
    letter-spacing: -0.8px;
  }
  .summary-metric small {
    font-size: 12px;
    letter-spacing: 0;
    color: var(--muted);
    font-weight: 500;
  }
  .summary-metric p,
  .summary-help {
    font-size: 10px;
    color: var(--muted);
  }
  .summary-help {
    margin-top: 12px;
  }
  .submission-history {
    margin: -4px 0 16px;
    color: var(--muted);
    font-size: 11px;
  }
  .meter {
    height: 5px;
    border-radius: 10px;
    overflow: hidden;
    background: #e1f2fc;
  }
  .meter > span {
    display: block;
    height: 100%;
    background: #0284c7;
    border-radius: inherit;
  }
  .indicator-summary > .meter > span,
  .meter.achieved > span {
    background: #20a56a;
  }
  .indicator-filters {
    display: flex;
    gap: 10px;
    margin: 20px 0;
  }
  .indicator-filters .search-field {
    flex: 1;
    min-width: 0;
    max-width: none;
  }
  .indicator-filters select {
    width: auto;
    max-width: 250px;
    background: white;
    font-size: 11px;
    border-color: var(--line);
  }
  .indicator-group {
    padding: 18px;
    margin-bottom: 18px;
  }
  .group-heading {
    margin-bottom: 14px;
  }
  .indicator-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: #f6fbff;
    padding: 16px;
  }
  .indicator-card + .indicator-card {
    margin-top: 12px;
  }
  .card-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }
  .card-heading > div {
    min-width: 0;
  }
  h3 {
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .card-heading p {
    font-size: 10px;
    color: var(--muted);
    margin-top: 4px;
  }
  .card-fields {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr 1.6fr;
    gap: 20px;
  }
  .field {
    min-width: 0;
  }
  .field label,
  .field-label {
    display: block;
    font-size: 10px;
    color: var(--ink);
    font-weight: 650;
    margin: 0 0 8px;
  }
  .field small {
    display: block;
    margin-top: 6px;
    font-size: 10px;
    color: var(--muted);
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  .unit-input {
    display: flex;
    align-items: stretch;
    border: 1px solid #c9e5f8;
    border-radius: 7px;
    overflow: hidden;
    background: white;
  }
  .unit-input:focus-within {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
  }
  .unit-input input {
    min-width: 0;
    flex: 1;
    width: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    outline: none;
    margin: 0;
    padding: 10px;
    font-size: 12px;
    color: var(--ink);
    background: transparent;
  }
  .unit-input > span {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    background: #eaf6ff;
    font-size: 10px;
    padding: 0 9px;
    width: max-content;
    max-width: 60%;
    overflow-wrap: anywhere;
  }
  .reference-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    min-height: 39px;
    padding: 9px 10px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: #eef7fc;
    font-size: 12px;
  }
  .reference-value > span {
    font-size: 10px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .baseline-value {
    font-size: 10px;
    line-height: 1.8;
    margin-bottom: 12px;
    color: var(--muted);
  }
  .baseline-value strong {
    display: block;
    font-size: 12px;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .field textarea {
    display: block;
    width: 100%;
    min-height: 65px;
    resize: vertical;
    margin: 0;
    border: 1px solid #c9e5f8;
    border-radius: 7px;
    background: white;
    padding: 9px 10px;
    font-size: 11px;
    color: var(--ink);
  }
  .field textarea:focus {
    outline-color: #38bdf8;
    border-color: #38bdf8;
  }
  .field input:disabled,
  .field textarea:disabled {
    color: #607d90;
    cursor: not-allowed;
    background: #edf4f8;
  }
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
  }
  .card-footer > small,
  .card-footer > div {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .card-footer > small {
    font-size: 9px;
    color: var(--muted);
  }
  .save-indicator,
  .cancel-edit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: 1px solid #c9e5f8;
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 10px;
    font-weight: 600;
    background: white;
    color: #0278b3;
  }
  .save-indicator:enabled:hover {
    background: #0284c7;
    border-color: #0284c7;
    color: white;
  }
  .cancel-edit {
    border-color: transparent;
    background: transparent;
    color: var(--muted);
  }
  .indicator-feedback {
    margin-top: 14px;
  }
  .feedback-entry,
  .review-note {
    background: #fff6dc;
    border-left: 3px solid #e0ac49;
    padding: 12px 14px;
    border-radius: 0 8px 8px 0;
  }
  .feedback-entry + .feedback-entry {
    margin-top: 8px;
  }
  .feedback-entry.resolved {
    background: #edf9f2;
    border-color: #66b98b;
  }
  .feedback-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 10px;
  }
  .feedback-avatar {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background: #0ea5e9;
    color: white;
    font-size: 9px;
    font-weight: 700;
  }
  .feedback-heading small {
    font-size: 9px;
  }
  .feedback-entry p,
  .review-note p {
    font-size: 11px;
    margin-top: 8px;
  }
  .review-note {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .indicator-submit {
    position: sticky;
    bottom: 12px;
    z-index: 12;
    margin-top: 20px;
  }
  @media (max-width: 1150px) {
    .card-fields {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .note-field {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 700px) {
    h1 {
      font-size: 22px;
    }
    .indicator-heading {
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 10px;
    }
    .heading-status {
      align-items: flex-start;
    }
    .heading-tag {
      font-size: 9px;
      padding: 6px 8px;
    }
    .indicator-heading p {
      font-size: 11px;
    }
    .status-strip {
      padding: 12px;
    }
    .summary-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .summary-metric {
      padding: 12px;
    }
    .summary-metric > strong {
      font-size: 24px;
    }
    .indicator-summary {
      padding: 14px;
    }
    .indicator-filters {
      flex-wrap: wrap;
    }
    .indicator-filters .search-field {
      flex-basis: 100%;
    }
    .indicator-filters select {
      flex: 1;
      min-width: 0;
      max-width: none;
    }
    .indicator-group {
      padding: 12px;
    }
    .indicator-card {
      padding: 12px;
    }
    .card-heading {
      flex-wrap: wrap;
      gap: 8px;
    }
    .card-fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .card-fields > :nth-child(3),
    .note-field {
      grid-column: 1 / -1;
    }
    .card-footer {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .indicator-submit {
      bottom: 8px;
    }
  }
</style>
