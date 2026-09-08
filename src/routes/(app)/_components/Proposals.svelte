<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import { onDestroy } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date, size } from '$lib/domain';
  import type { ProposalVersion } from '$lib/types';
  import Icon from '$lib/components/Icon.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Empty from '$lib/components/Empty.svelte';
  import ProposalCompare from '$lib/components/ProposalCompare.svelte';
  let { campusId = '', embedded = false }: { campusId?: string; embedded?: boolean } = $props();
  let campus = $state('campus-001');
  let search = $state('');
  let status = $state('all');
  let upload = $state(false);
  let file = $state<File | null>(null);
  let changes = $state('');
  let preview = $state<{ url: string; proposal: ProposalVersion } | null>(null);
  let fileLoading = $state(false);
  const isAdmin = $derived(app.session?.role === 'admin');
  const activeCampus = $derived(campusId || (isAdmin ? campus : app.session!.campusId!));
  const versions = $derived(app.data!.proposals.filter(p => p.campusId === activeCampus).sort((a,b) => b.version - a.version));
  const current = $derived(versions[0]);
  const campuses = $derived(app.data!.campuses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || (status === 'submitted' ? app.data!.proposals.some(p => p.campusId === c.id) : !app.data!.proposals.some(p => p.campusId === c.id)))));
  function closePreview() { if (preview) URL.revokeObjectURL(preview.url); preview = null; }
  onDestroy(closePreview);
  async function view(proposal: ProposalVersion) {
    fileLoading = true;
    try { const blob = await dataService.proposalFile(app.session!, proposal.id); closePreview(); preview = { url: URL.createObjectURL(blob), proposal }; }
    catch (e) { app.error = e instanceof Error ? e.message : 'PDF tidak dapat dibuka.'; }
    finally { fileLoading = false; }
  }
  async function save() {
    if (!file) { app.error = 'Pilih PDF untuk diunggah.'; return; }
    if (await app.mutate(() => dataService.uploadProposal(app.session!, file!, changes), 'Versi baru proposal berhasil diajukan.')) { upload = false; file = null; changes = ''; }
  }
</script>
{#snippet comparison()}
  {#key activeCampus}<ProposalCompare {versions} actor={app.session!} onview={view}/>{/key}
{/snippet}
{#if !embedded}<div class="page-heading"><div><span class="eyebrow">DOKUMEN PROGRAM</span><h1>Proposal kampus</h1><p>{isAdmin ? 'Ikuti perkembangan gagasan dan rencana kerja kampus mitra.' : 'Simpan rencana kerja Anda, lengkap dengan setiap jejak perubahannya.'}</p></div>{#if !isAdmin}<button class="button" onclick={() => { file = null; changes = ''; upload = true; }}><Icon name="plus" size={18}/>Unggah versi baru</button>{/if}</div>{/if}
{#if isAdmin && !campusId}<section class="panel proposal-selector"><div class="toolbar"><div class="search-field"><Icon name="search" size={18}/><input aria-label="Cari proposal kampus" bind:value={search} placeholder="Cari kampus…"/></div><select aria-label="Filter proposal" bind:value={status}><option value="all">Semua status</option><option value="submitted">Diajukan</option><option value="missing">Belum diunggah</option></select></div><div class="campus-picker"><label>Kampus yang ditinjau<select aria-label="Pilih kampus proposal" bind:value={campus}>{#each campuses as c}<option value={c.id}>{c.name} — {app.data!.proposals.some(p => p.campusId === c.id) ? 'Diajukan' : 'Belum diunggah'}</option>{/each}</select></label><span class="muted">{campuses.length} kampus sesuai filter</span></div>{#if !campuses.length}<Empty title="Kampus tidak ditemukan" description="Ubah kata pencarian atau status proposal."/>{:else if !campuses.some(c => c.id === campus)}<p class="inline-hint">Pilih kampus dari hasil filter untuk meninjau proposal.</p>{/if}</section>{/if}
{#if !isAdmin || campusId || campuses.some(c => c.id === campus)}<div class="proposal-grid"><div><section class="panel"><div class="panel-heading"><div><h2>Proposal terbaru</h2><p>{app.data!.campuses.find(c => c.id === activeCampus)?.name}</p></div><Badge tone={current ? 'green' : 'neutral'}>{current ? 'Diajukan' : 'Belum diunggah'}</Badge></div>{#if current}<div class="proposal-current"><div class="pdf-cover"><span>DEB PUTIH</span><Icon name="proposal" size={58}/><strong>PROPOSAL<br/>PROGRAM</strong><small>Versi {current.version}</small><div class="pdf-cover-line"></div></div><div class="proposal-info"><span class="eyebrow">DOKUMEN AKTIF · V{current.version}</span><h3>{current.filename}</h3><p>{date(current.createdAt)} · {size(current.size)} · PDF</p><div class="button-row"><button class="button" disabled={fileLoading} onclick={() => view(current)}><Icon name="eye" size={17}/>Lihat proposal</button>{#if !isAdmin}<button class="button secondary" onclick={() => { file = null; changes = ''; upload = true; }}><Icon name="upload" size={17}/>Perbarui</button>{/if}</div></div></div>{:else}<Empty title="Proposal belum diunggah" description={isAdmin ? 'Kampus ini belum mengajukan proposal.' : 'Mulai dengan mengunggah rencana kerja dalam format PDF.'} icon="proposal"/>{/if}</section><section class="panel history-panel"><div class="panel-heading"><div><h2>Riwayat versi</h2><p>Setiap perubahan adalah bagian dari perjalanan.</p></div><span class="count">{versions.length} versi</span></div>{#if versions.length}<div class="version-list">{#each versions as v, index}<article class="version-item"><div class="version-node"><Icon name="proposal" size={19}/></div><div class="version-content"><div class="row-between"><div><strong>Versi {v.version}</strong>{#if index === 0}<Badge tone="green">Terbaru</Badge>{/if}</div><button class="text-link" disabled={fileLoading} aria-label={`Lihat proposal versi ${v.version}`} onclick={() => view(v)}>Lihat PDF<Icon name="arrow" size={15}/></button></div><small>{date(v.createdAt)} · {size(v.size)}</small><div class="change-box"><span>{v.simulated ? 'RINGKASAN PERUBAHAN · SIMULASI' : 'CATATAN PERUBAHAN MANUAL'}</span><p class="pre-wrap">{v.changes}</p></div></div></article>{/each}</div>{:else}<Empty title="Belum ada riwayat" description="Versi proposal akan muncul setelah unggahan pertama."/>{/if}</section></div><aside class="panel guidance"><div class="guidance-icon"><Icon name="leaf" size={25}/></div><h3>Rencana yang terus bertumbuh.</h3><p>Perbarui proposal saat ada perkembangan. Versi sebelumnya tetap tersimpan, sehingga perjalanan program mudah ditelusuri.</p><div class="section-divider"></div><h4>Sebelum mengunggah</h4><ul><li>Gunakan dokumen berformat PDF.</li><li>Ukuran file maksimal 10 MB.</li><li>Tulis ringkasan perubahan yang jelas.</li><li>Gunakan dokumen simulasi untuk demo.</li></ul><div class="info-note"><Icon name="faq" size={17}/><span>Catatan perubahan diisi manual. Gunakan perbandingan versi di bawah untuk meninjau perubahan teks PDF.</span></div></aside></div>{/if}
{#if !isAdmin || campusId || campuses.some(c => c.id === campus)}{@render comparison()}{/if}
{#if upload}<Modal title="Unggah versi proposal baru" onclose={() => { if (!app.busy) upload = false; }}><form onsubmit={(e) => { e.preventDefault(); save(); }}><label class="upload-zone"><Icon name="upload" size={32}/><strong>Pilih dokumen proposal</strong><span>PDF · Maksimal 10 MB</span><input type="file" aria-label="File proposal PDF" accept=".pdf,application/pdf" required onchange={(e) => { file = e.currentTarget.files?.[0] || null; }}/></label>{#if file}<p class="file-selected"><Icon name="proposal" size={18}/>{file.name} · {size(file.size)}</p>{/if}<label>Catatan perubahan<textarea rows="4" required maxlength="5000" bind:value={changes} placeholder="Apa yang ditambahkan, diperbarui, atau dihapus pada versi ini?"></textarea></label><p class="muted">Versi lama tetap tersimpan. File hanya disimpan di browser ini.</p><div class="dialog-actions"><button type="button" class="button secondary" disabled={app.busy} onclick={() => upload = false}>Batal</button><button class="button" disabled={app.busy}>{app.busy ? 'Menyimpan…' : 'Ajukan versi baru'}</button></div></form></Modal>{/if}
{#if preview}<Modal title={`Proposal versi ${preview.proposal.version}`} onclose={closePreview} wide><div class="row-between preview-heading"><p>{preview.proposal.filename}</p><a class="button secondary small" href={preview.url} download={preview.proposal.filename}><Icon name="download" size={16}/>Unduh PDF</a></div><iframe class="pdf-preview" src={preview.url} title={`Pratinjau ${preview.proposal.filename}`}></iframe><p class="muted">Jika pratinjau tidak didukung browser, gunakan Unduh PDF.</p></Modal>{/if}
