<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { campusStats, percent } from '$lib/domain';
  const CAMPUS_REGIONS = $derived([...new Set(app.data?.campuses.map(c => c.region) || [])].sort());
  import Icon from './Icon.svelte';
  import Progress from './Progress.svelte';
  import Badge from './Badge.svelte';
  import Empty from './Empty.svelte';
  let { compact = false }: { compact?: boolean } = $props();
  let search = $state('');
  let filter = $state('all');
  let region = $state('all');
  let page = $state(1);
  const rows = $derived((app.data?.campuses || []).map(c => ({ ...c, ...campusStats(app.data!, c.id) })).filter(c => `${c.name} ${c.acronym ?? ''} ${c.city ?? ''} ${c.region}`.toLowerCase().includes(search.toLowerCase()) && (region === 'all' || c.region === region) && (filter === 'all' || (filter === 'revision' ? c.revisions > 0 : !c.proposal))));
  const pages = $derived(Math.max(1, Math.ceil(rows.length / 10)));
  const visible = $derived(compact ? rows.slice(0, 5) : rows.slice((Math.min(page, pages) - 1) * 10, Math.min(page, pages) * 10));
</script>
{#if !compact}<div class="toolbar"><div class="search-field"><Icon name="search" size={18}/><input aria-label="Cari kampus" placeholder="Cari nama kampus…" bind:value={search} oninput={() => page = 1}/></div><select aria-label="Filter kampus" bind:value={filter} onchange={() => page = 1}><option value="all">Semua status</option><option value="revision">Perlu tindak lanjut</option><option value="missing">Belum ada proposal</option></select><select aria-label="Filter wilayah kampus" bind:value={region} onchange={() => page = 1}><option value="all">Semua wilayah</option>{#each CAMPUS_REGIONS as area}<option value={area}>{area}</option>{/each}</select><span class="muted">{rows.length} kampus</span></div>{/if}
{#if !visible.length}<Empty title="Kampus tidak ditemukan" description="Coba kata pencarian atau filter lainnya."/>{:else}<div class="table-scroll"><table><thead><tr><th>KAMPUS MITRA</th><th>PROGRES DEB</th><th>PROPOSAL</th><th>STATUS</th><th><span class="sr-only">Detail</span></th></tr></thead><tbody>{#each visible as row}<tr><td><a class="campus-name" href={`/admin/campuses/${row.id}`}><span class="table-avatar" style:font-size={row.initials.length > 4 ? "9px" : undefined}>{row.initials}</span><span><strong>{row.name}</strong><small>{row.acronym}{#if row.city} · {row.city}{/if}<br/>{row.region}</small></span></a></td><td class="progress-cell"><Progress value={row.progress} showValue/></td><td><Badge tone={row.proposal ? 'green' : 'neutral'}>{row.proposal ? 'Diajukan' : 'Belum diunggah'}</Badge></td><td>{#if row.revisions}<Badge tone="amber">Perlu tindak lanjut</Badge>{:else}<span class="muted">{row.progress >= 100 ? 'Tercapai' : 'Dalam proses'}</span>{/if}</td><td><a class="icon-button" href={`/admin/campuses/${row.id}`} aria-label={`Lihat ${row.name}, progres ${percent(row.progress)}`}><Icon name="chevron" size={18}/></a></td></tr>{/each}</tbody></table></div>{/if}
{#if !compact && rows.length}<div class="pagination"><span>Menampilkan {Math.min((Math.min(page, pages) - 1) * 10 + 1, rows.length)}–{Math.min(Math.min(page, pages) * 10, rows.length)} dari {rows.length} kampus</span><div><button class="button secondary small" disabled={page <= 1} onclick={() => page--}>Sebelumnya</button><span>{Math.min(page, pages)} / {pages}</span><button class="button secondary small" disabled={page >= pages} onclick={() => page++}>Berikutnya</button></div></div>{/if}

<style>.toolbar{flex-wrap:wrap;gap:12px}.toolbar select{max-width:260px}@media(max-width:700px){.toolbar select{max-width:100%}}</style>
