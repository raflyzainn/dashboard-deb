<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { progress, number, date, feedbackLabel } from '$lib/domain';
  import type { CampusIndicator } from '$lib/types';
  import SubmissionStatus from '$lib/components/SubmissionStatus.svelte';
  import { latestSubmission } from '$lib/verification';
  import Icon from '$lib/components/Icon.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Empty from '$lib/components/Empty.svelte';
  let { campusId = '', embedded = false }: { campusId?: string; embedded?: boolean } = $props();
  let campus = $state('');
  $effect(() => { if (!app.data?.campuses.some(c => c.id === campus)) campus = app.data?.campuses[0]?.id || ''; });
  let search = $state('');
  let category = $state('Semua bidang');
  let status = $state('all');
  let selected = $state<CampusIndicator | null>(null);
  let current = $state<number | undefined>(0);
  let note = $state('');
  let feedback = $state('');
  let revision = $state(true);
  const isAdmin = $derived(app.session?.role === 'admin');
  const activeCampus = $derived(campusId || (isAdmin ? campus : app.session!.campusId!));
  const locked = $derived(!isAdmin && latestSubmission(app.data!, activeCampus)?.status === 'pending');
  const definition = (id: string) => app.data!.definitions.find(d => d.id === id)!;
  const rows = $derived(app.data!.indicators.filter(i => i.campusId === activeCampus).filter(i => {
    const d = definition(i.definitionId);
    const revising = app.data!.feedback.some(f => f.indicatorId === i.id && f.requiresRevision && f.state !== 'closed');
    return d.name.toLowerCase().includes(search.toLowerCase()) && (category === 'Semua bidang' || d.category === category) && (status === 'all' || (status === 'revision' ? revising : status === 'achieved' ? i.current >= i.target : i.current < i.target));
  }));
  const comments = $derived(selected ? app.data!.feedback.filter(f => f.indicatorId === selected!.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) : []);
  function open(item: CampusIndicator) { selected = item; current = item.current; note = item.note; feedback = ''; revision = true; app.error = ''; }
  async function save() {
    if (current === undefined || current === null) { app.error = 'Nilai aktual wajib diisi.'; return; }
    if (await app.mutate(() => dataService.updateIndicator(selected!.id, current!, note), 'Indikator berhasil diperbarui.')) selected = null;
  }
  async function comment() { if (await app.mutate(() => dataService.addFeedback(selected!.id, feedback, revision), 'Feedback berhasil dikirim.')) feedback = ''; }
</script>
{#if !embedded}<div class="page-heading"><div><span class="eyebrow">CAPAIAN PROGRAM</span><h1>Indikator DEB Putih</h1><p>{isAdmin ? 'Tinjau perkembangan kampus dan berikan arahan yang sesuai.' : 'Catat perkembangan nyata, satu indikator setiap langkah.'}</p></div><Badge tone="green">{app.data!.definitions.length} indikator simulasi</Badge></div>{/if}
{#if !isAdmin && !embedded}<SubmissionStatus/>{/if}
{#if isAdmin}<div class="info-note"><Icon name="verifikasi"/><span><strong>Data isian kampus ? Baca saja</strong><br/>Admin meninjau dan memberi feedback. Perbaikan nilai hanya dilakukan oleh kampus.</span></div>{/if}
<section class="panel"><div class="toolbar"><div class="search-field"><Icon name="search" size={18}/><input aria-label="Cari indikator" placeholder="Cari indikator…" bind:value={search}/></div>{#if isAdmin && !campusId}<select aria-label="Pilih kampus" bind:value={campus}>{#each app.data!.campuses as c}<option value={c.id}>{c.name}</option>{/each}</select>{/if}<select aria-label="Filter status indikator" bind:value={status}><option value="all">Semua status</option><option value="achieved">Tercapai</option><option value="progress">Dalam proses</option><option value="revision">Perlu tindak lanjut</option></select></div><div class="tabs category-tabs">{#each ['Semua bidang', ...new Set(app.data!.definitions.map(d => d.category))] as c}<button class:active={category === c} onclick={() => category = c}>{c}</button>{/each}</div>
{#if rows.length}<div class="table-scroll"><table><thead><tr><th>INDIKATOR</th><th>BASELINE</th><th>TARGET</th><th>AKTUAL</th><th>PROGRES</th><th>STATUS</th><th>AKSI</th></tr></thead><tbody>{#each rows as i}{@const d = definition(i.definitionId)}{@const revise = app.data!.feedback.some(f => f.indicatorId === i.id && f.requiresRevision && f.state !== 'closed')}<tr><td><strong class="table-title">{d.name}</strong><small class="table-subtitle">{d.category} · {d.unit}</small></td><td>{number(i.baseline)}</td><td>{number(i.target)}</td><td><strong>{number(i.current)}</strong></td><td class="progress-cell"><Progress value={progress(i)} showValue/></td><td><div class="badge-stack"><Badge tone={i.current >= i.target ? 'green' : 'neutral'}>{i.current >= i.target ? 'Tercapai' : 'Dalam proses'}</Badge>{#if revise}<Badge tone="amber">Perlu tindak lanjut</Badge>{/if}</div></td><td><button class="button secondary small" disabled={app.loading} aria-label={`Lihat ${d.name}`} onclick={() => open(i)}><Icon name={isAdmin ? 'eye' : 'edit'} size={15}/>Lihat</button></td></tr>{/each}</tbody></table></div><div class="table-foot">{rows.length} indikator · Baseline dan target adalah referensi simulasi.</div>{:else}<Empty title="Tidak ada indikator yang cocok" description="Ubah pencarian, bidang, atau filter status."/>{/if}</section>
{#if selected}<Modal title={definition(selected.definitionId).name} onclose={() => { if (!app.busy) selected = null; }} wide><p class="muted">{definition(selected.definitionId).description}</p><div class="mini-stats"><div><small>Baseline</small><strong>{selected.baseline}</strong></div><div><small>Target</small><strong>{selected.target}</strong></div><div><small>Satuan</small><strong>{definition(selected.definitionId).unit}</strong></div></div>{#if !isAdmin}<form onsubmit={(e) => { e.preventDefault(); save(); }}><label>Nilai aktual<input readonly={app.readOnly || locked || app.busy} type="number" min="0" step="any" required bind:value={current}/></label><label>Catatan perkembangan<textarea readonly={app.readOnly || locked || app.busy} rows="3" maxlength="5000" bind:value={note} placeholder="Periode data, kegiatan, dan hasil yang dicapai…"></textarea></label><button class="button" disabled={app.readOnly || app.loading || locked || app.busy}>{app.busy ? 'Menyimpan…' : 'Simpan perubahan'}</button></form>{:else}{@const actual = app.data!.indicators.find(i => i.id === selected!.id)!}<div class="info-note"><Icon name="indicators"/><div><strong>Nilai aktual: {number(actual.current)}</strong><p>{actual.note || 'Belum ada catatan dari kampus.'}</p><small>Diperbarui {date(actual.updatedAt)}</small></div></div>{/if}<div class="section-divider"></div><h3>Feedback Admin PF <span class="count">{comments.length}</span></h3>{#if comments.length}<div class="feedback-list">{#each comments as f}<article class="feedback-card"><div class="row-between"><strong>Admin PF</strong><Badge tone={f.state === 'closed' ? 'green' : f.state === 'responded' ? 'blue' : 'amber'}>{f.requiresRevision ? feedbackLabel[f.state] : 'Catatan'}</Badge></div><p class="pre-wrap">{f.text}</p><div class="row-between"><small>{date(f.createdAt)}</small>{#if isAdmin && f.state !== 'closed'}<button class="text-link" disabled={app.readOnly || app.loading || (app.busy)} onclick={() => app.mutate(() => dataService.closeFeedback(f.id), 'Feedback ditandai selesai.')}><Icon name="check" size={15}/>Tandai selesai</button>{/if}</div></article>{/each}</div>{:else}<p class="muted">Belum ada feedback untuk indikator ini.</p>{/if}{#if isAdmin}<form class="feedback-form" onsubmit={(e) => { e.preventDefault(); comment(); }}><label>Feedback baru<textarea readonly={app.readOnly} rows="3" required maxlength="5000" bind:value={feedback} placeholder="Tuliskan arahan atau masukan untuk kampus…"></textarea></label><label class="checkbox-label"><input type="checkbox" bind:checked={revision}/>Minta revisi data</label><button class="button" disabled={app.readOnly || app.loading || (app.busy)}>{app.busy ? 'Mengirim…' : 'Kirim feedback'}</button></form>{/if}</Modal>{/if}
