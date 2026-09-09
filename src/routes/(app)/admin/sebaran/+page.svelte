<script lang="ts">
  import { onDestroy } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { mapCampuses, progressBands, regionSummary, type ProgressBand } from '$lib/map';
  import { number } from '$lib/domain';
  import { INDONESIA_PATHS } from '$lib/indonesia-map';
  import Icon from '$lib/components/Icon.svelte';
  import Progress from '$lib/components/Progress.svelte';

  let region = $state('Semua wilayah');
  let band = $state<'all' | ProgressBand>('all');
  let search = $state('');
  let selectedId = $state('');
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let dragging = $state(false);
  let wheelZooming = $state(false);
  let dragPointer = -1;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragPanX = 0;
  let dragPanY = 0;
  let wheelFrame = 0;
  let wheelTarget = 1;
  let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined;
  let mapStage: HTMLDivElement;
  const allPoints = $derived(mapCampuses(app.data!));
  const regions = $derived(['Semua wilayah', ...new Set(allPoints.map(point => point.island))]);
  const visible = $derived(allPoints.filter(point =>
    (region === 'Semua wilayah' || point.island === region) &&
    (band === 'all' || point.band === band) &&
    `${point.name} ${point.acronym ?? ''} ${point.province}`.toLowerCase().includes(search.toLowerCase())
  ));
  const selected = $derived(visible.find(point => point.id === selectedId));
  const summaries = $derived(regionSummary(app.data!).filter(row => region === 'Semua wilayah' || row.island === region));
  const reached = $derived(visible.filter(point => point.band === 'reached').length);
  const average = $derived(visible.length ? visible.reduce((sum, point) => sum + point.score, 0) / visible.length : 0);
  const provinceCount = $derived(new Set(visible.map(point => point.province)).size);
  function panLimit(nextZoom = zoom) {
    if (!mapStage || nextZoom <= 1) return { x: 0, y: 0 };
    return {
      x: mapStage.clientWidth * (nextZoom - 1) / 2,
      y: mapStage.clientHeight * (nextZoom - 1) / 2
    };
  }

  function clampPan(nextX: number, nextY: number, nextZoom = zoom) {
    const limit = panLimit(nextZoom);
    panX = Math.max(-limit.x, Math.min(limit.x, nextX));
    panY = Math.max(-limit.y, Math.min(limit.y, nextY));
  }

  function setZoom(next: number) {
    const previous = zoom;
    zoom = Math.max(1, Math.min(3, Math.round(next * 10) / 10));
    wheelTarget = zoom;
    if (zoom === 1) clampPan(0, 0, zoom);
    else if (previous > 1) clampPan(panX * zoom / previous, panY * zoom / previous, zoom);
    else clampPan(panX, panY, zoom);
  }

  function wheelMap(event: WheelEvent) {
    // Keep wheel and trackpad pinch gestures inside the map, including at its
    // zoom limits. Otherwise the browser can scroll or zoom the whole page.
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    wheelTarget = Math.max(1, Math.min(3, wheelTarget + direction * 0.2));
    wheelZooming = true;
    if (wheelIdleTimer) clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => wheelZooming = false, 100);
    if (wheelFrame) return;
    wheelFrame = requestAnimationFrame(() => {
      wheelFrame = 0;
      setZoom(wheelTarget);
    });
  }

  function startPan(event: PointerEvent) {
    if (event.button !== 0 || zoom <= 1 || (event.target as Element).closest('button, a')) return;
    dragging = true;
    dragPointer = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragPanX = panX;
    dragPanY = panY;
    mapStage.setPointerCapture(event.pointerId);
  }

  function movePan(event: PointerEvent) {
    if (!dragging || event.pointerId !== dragPointer) return;
    clampPan(dragPanX + event.clientX - dragStartX, dragPanY + event.clientY - dragStartY);
  }

  function endPan(event: PointerEvent) {
    if (event.pointerId !== dragPointer) return;
    dragging = false;
    dragPointer = -1;
    if (mapStage.hasPointerCapture(event.pointerId)) mapStage.releasePointerCapture(event.pointerId);
  }

  function resetMap() {
    zoom = 1;
    wheelTarget = 1;
    clampPan(0, 0, 1);
  }

  onDestroy(() => {
    if (wheelFrame) cancelAnimationFrame(wheelFrame);
    if (wheelIdleTimer) clearTimeout(wheelIdleTimer);
  });
</script>

<svelte:head><title>Peta Persebaran · Digitalisasi DEB</title></svelte:head>

<div class="page-heading"><div><span class="eyebrow">PANDANGAN WILAYAH ADMIN</span><h1>Peta Persebaran Kampus</h1><p>Lihat jangkauan 40 kampus mitra dan progres simulasi program DEB di berbagai wilayah Indonesia.</p></div><span class="readonly"><Icon name="eye" size={15}/>Hanya baca</span></div>

<section class="map-stats" aria-label="Ringkasan persebaran">
  <article><span class="stat-icon green"><Icon name="campuses"/></span><div><small>Kampus ditampilkan</small><strong>{visible.length}<span>dari 40</span></strong><p>{region}</p></div></article>
  <article><span class="stat-icon blue"><Icon name="sebaran"/></span><div><small>Provinsi terjangkau</small><strong>{provinceCount}<span>provinsi</span></strong><p>Lokasi kampus pada filter aktif</p></div></article>
  <article><span class="stat-icon amber"><Icon name="target"/></span><div><small>Rata-rata progres</small><strong>{number(average)}<span>%</span></strong><p>Perhitungan data simulasi</p></div></article>
  <article><span class="stat-icon mint"><Icon name="check"/></span><div><small>Progres tertinggi</small><strong>{reached}<span>kampus</span></strong><p>Progres simulasi minimal 70%</p></div></article>
</section>

<section class="panel map-filters" aria-label="Penyaring peta">
  <div><strong>Jelajahi persebaran</strong><p>Filter akan memperbarui titik peta dan ringkasan wilayah.</p></div>
  <label class="search-field"><Icon name="search" size={17}/><input aria-label="Cari kampus di peta" placeholder="Cari kampus, singkatan, atau provinsi…" bind:value={search}/></label>
  <select aria-label="Filter wilayah peta" bind:value={region}>{#each regions as item}<option value={item}>{item}</option>{/each}</select>
</section>

<div class="map-layout">
  <section class="panel map-panel">
    <header><div><h2>Sebaran geografis</h2><p>Arahkan kursor lalu gulir untuk zoom. Klik dan geser untuk memindahkan peta.</p></div><span>{visible.length} titik aktif</span></header>
    <div bind:this={mapStage} class="map-stage" class:dragging class:wheel-zooming={wheelZooming} role="img" aria-label={`Peta Indonesia dengan ${visible.length} titik kampus mitra`} onwheel={wheelMap} onpointerdown={startPan} onpointermove={movePan} onpointerup={endPan} onpointercancel={endPan}>
      <div class="map-controls" aria-label="Kontrol pembesaran peta"><button aria-label="Perkecil peta" disabled={zoom <= 1} onclick={() => setZoom(zoom - .25)}>−</button><output aria-label="Tingkat pembesaran">{Math.round(zoom * 100)}%</output><button aria-label="Perbesar peta" disabled={zoom >= 3} onclick={() => setZoom(zoom + .25)}>+</button><button class="reset-zoom" aria-label="Atur ulang pembesaran" disabled={zoom === 1 && panX === 0 && panY === 0} onclick={resetMap}><Icon name="reset" size={14}/></button></div>
      <div class="map-world" style={`--zoom:${zoom};--pan-x:${panX}px;--pan-y:${panY}px`}>
      <svg class="archipelago" viewBox="0 0 1000 520" aria-hidden="true">
        <defs><linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dcecff"/><stop offset="1" stop-color="#b9d8ff"/></linearGradient></defs>
        {#each INDONESIA_PATHS as path}<path d={path}/>{/each}
      </svg>
      {#each visible as point}
        <button class="map-dot" class:selected={selected?.id === point.id} style={`left:${point.x}%;top:${point.y}%;--dot:${progressBands[point.band].color};--size:${8 + point.score / 24}px`} aria-label={`${point.name}, ${point.province}, progres ${number(point.score)} persen`} title={point.name} onclick={() => { selectedId = point.id; if (zoom > 1) zoom = Math.max(zoom, 1.5); }}><span></span></button>
      {/each}
      </div>
      {#if selected}<article class="map-card"><div class="map-card-top"><span class="map-avatar">{selected.initials}</span><button aria-label="Tutup detail titik" onclick={() => selectedId = ''}>×</button></div><strong>{selected.name}</strong><small>{selected.province} · {selected.island}</small><div class="row-between"><span>{progressBands[selected.band].label}</span><b>{number(selected.score)}%</b></div><Progress value={selected.score} label={`Progres ${selected.name}`}/><a href={`/admin/campuses/${selected.id}`}>Lihat detail kampus <Icon name="arrow" size={14}/></a></article>{/if}
    </div>
    <div class="map-legend">{#each Object.entries(progressBands) as [key, item]}<button class:active={band === key} onclick={() => band = band === key ? 'all' : key as ProgressBand}><i style={`--legend:${item.color}`}></i><span>{item.label}<small>{item.short} · {allPoints.filter(point => point.band === key).length} kampus</small></span></button>{/each}</div>
    <p class="map-note"><Icon name="faq" size={15}/>Ukuran titik mengikuti progres simulasi. Peta memperlihatkan lokasi kampus, bukan koordinat desa penerima program.</p>
  </section>

  <aside class="panel region-panel"><header><div><h2>Ringkasan wilayah</h2><p>Dikelompokkan per pulau atau kepulauan.</p></div><span>{summaries.length} wilayah</span></header><div class="region-list">{#each summaries as row}<button class:active={region === row.island} onclick={() => region = region === row.island ? 'Semua wilayah' : row.island}><span class="region-mark"><Icon name="sebaran" size={17}/></span><span><strong>{row.island}</strong><small>{row.provinces} provinsi · {row.campuses} kampus</small></span><b>{number(row.average)}%</b></button>{/each}</div><div class="region-foot"><strong>Tentang data peta</strong><p>Nama kampus berasal dari daftar proyek. Posisi dan seluruh nilai capaian masih bersifat simulasi untuk kebutuhan prototype.</p></div></aside>
</div>

<style>
  .readonly{display:flex;align-items:center;gap:7px;padding:9px 13px;border:1px solid #d9e4d3;border-radius:999px;background:#fff;color:#61735d;font-size:11px}.map-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin-bottom:22px}.map-stats article{display:flex;align-items:flex-start;gap:13px;padding:20px;background:#fff;border:1px solid #dfe7da;border-radius:12px}.stat-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;flex-shrink:0}.stat-icon.green{background:#eaf3e4;color:#4b7b39}.stat-icon.blue{background:#e7f1f5;color:#347b97}.stat-icon.amber{background:#fbf0d9;color:#a37523}.stat-icon.mint{background:#e4f2e8;color:#328153}.map-stats small{display:block;font-size:10px;color:#74826f}.map-stats strong{display:flex;align-items:baseline;gap:7px;font-size:26px;margin:5px 0 4px}.map-stats strong span{font-size:10px;font-weight:500;color:#71806b}.map-stats p{font-size:9px;color:#84917e}.map-filters{display:grid;grid-template-columns:minmax(210px,1fr) minmax(260px,1.5fr) 240px;align-items:center;gap:18px;padding:18px 20px;margin-bottom:22px}.map-filters strong{font-size:13px}.map-filters p{font-size:10px;color:#778473;margin-top:5px}.map-filters .search-field{width:100%}.map-filters input{min-width:0}.map-layout{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(270px,.72fr);gap:22px;align-items:start}.map-panel,.region-panel{min-width:0}.map-panel>header,.region-panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px;border-bottom:1px solid #e7ece3}.map-panel h2,.region-panel h2{font-size:15px}.map-panel header p,.region-panel header p{font-size:10px;color:#74816f;margin-top:5px}.map-panel header>span,.region-panel header>span{font-size:10px;color:#6a7b66;background:#f0f5ec;padding:7px 10px;border-radius:999px}.map-stage{position:relative;aspect-ratio:100/56;min-height:370px;overflow:hidden;background:radial-gradient(circle at 45% 45%,#fbfdfa,#f0f6ec);border-bottom:1px solid #e5ebe1;cursor:grab;touch-action:none;overscroll-behavior:contain}.map-stage.dragging{cursor:grabbing}.map-world{position:absolute;inset:0;transform:translate(var(--pan-x),var(--pan-y)) scale(var(--zoom));transform-origin:50% 50%;transition:transform .18s ease;will-change:transform}.map-stage.dragging .map-world,.map-stage.wheel-zooming .map-world{transition:none}.map-controls{position:absolute;top:14px;right:14px;display:flex;align-items:center;z-index:7;padding:4px;border:1px solid #d5e1cf;border-radius:10px;background:#fffffff0;box-shadow:0 5px 14px #29482912}.map-controls button,.map-controls output{display:grid;place-items:center;height:30px;min-width:30px;border:0;background:transparent;color:#456342;font-size:15px}.map-controls button{cursor:pointer;border-radius:7px}.map-controls button:hover:not(:disabled){background:#edf4e8}.map-controls button:disabled{opacity:.35;cursor:default}.map-controls output{min-width:48px;font-size:9px;border-inline:1px solid #e2e9dd}.map-controls .reset-zoom{margin-left:3px}.archipelago{position:absolute;inset:7% 3% 3%;width:94%;height:90%;filter:drop-shadow(0 4px 5px #335d3420)}.archipelago path{fill:url(#land);stroke:#9eb79a;stroke-width:2}.map-dot{position:absolute;width:var(--size);height:var(--size);min-width:13px;min-height:13px;transform:translate(-50%,-50%);border:2px solid #fff;border-radius:50%;background:var(--dot);box-shadow:0 2px 6px #1c3d2d45;cursor:pointer;z-index:2;transition:transform .15s}.map-dot:hover,.map-dot.selected{transform:translate(-50%,-50%) scale(1.38);z-index:4}.map-dot.selected{outline:3px solid #fff8;box-shadow:0 0 0 3px var(--dot),0 5px 14px #18382e55}.map-dot span{display:block}.map-card{position:absolute;left:20px;bottom:20px;width:min(250px,calc(100% - 40px));padding:16px;border:1px solid #d7e3d1;border-radius:12px;background:#fffffff2;backdrop-filter:blur(8px);box-shadow:0 12px 28px #2948291f;z-index:5}.map-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.map-avatar{display:grid;place-items:center;min-width:30px;height:30px;padding:0 7px;border-radius:8px;background:#eaf2e4;color:#4c743c;font-size:9px;font-weight:700}.map-card-top button{border:0;background:transparent;color:#70806b;font-size:20px;cursor:pointer}.map-card>strong{display:block;font-size:12px;line-height:1.6}.map-card>small{display:block;font-size:9px;color:#758170;margin:3px 0 12px}.map-card .row-between{font-size:10px;margin-bottom:7px}.map-card a{display:flex;align-items:center;gap:6px;color:#176f35;font-size:10px;font-weight:650;margin-top:12px}.map-legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:16px 20px}.map-legend button{display:flex;align-items:center;gap:8px;text-align:left;border:1px solid transparent;border-radius:8px;background:transparent;padding:8px;color:#465d43;cursor:pointer}.map-legend button:hover,.map-legend button.active{background:#f2f6ef;border-color:#d8e4d1}.map-legend i{width:11px;height:11px;border-radius:50%;background:var(--legend);flex-shrink:0}.map-legend span{font-size:9px}.map-legend small{display:block;color:#82907d;margin-top:3px}.map-note{display:flex;align-items:center;gap:8px;margin:0 20px 18px;padding:11px 13px;border-radius:8px;background:#f5f8f2;color:#6d7d68;font-size:9px}.region-list{padding:8px}.region-list button{width:100%;display:grid;grid-template-columns:35px minmax(0,1fr) auto;align-items:center;gap:10px;text-align:left;border:1px solid transparent;border-radius:9px;background:transparent;padding:12px;color:#385038;cursor:pointer}.region-list button:hover,.region-list button.active{background:#f1f6ed;border-color:#d9e5d2}.region-mark{width:32px;height:32px;display:grid;place-items:center;border-radius:8px;background:#eaf2e5;color:#5b7b4c}.region-list strong{font-size:11px}.region-list small{display:block;font-size:9px;color:#7b8976;margin-top:4px}.region-list b{font-size:11px}.region-foot{border-top:1px solid #e7ece3;padding:17px 20px;background:#fafcf9}.region-foot strong{font-size:10px}.region-foot p{font-size:9px;line-height:1.7;color:#788574;margin-top:7px}
  @media(max-width:1150px){.map-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.map-layout{grid-template-columns:1fr}.region-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.map-filters{grid-template-columns:1fr 1fr}.map-filters>div{grid-column:1/-1}}
  @media(max-width:700px){.page-heading{align-items:flex-start}.map-stats{gap:8px}.map-stats article{padding:13px;gap:9px}.stat-icon{width:32px;height:32px}.map-stats strong{font-size:21px}.map-stats p{display:none}.map-filters{grid-template-columns:1fr;padding:16px}.map-filters>div{grid-column:auto}.map-stage{min-height:310px;aspect-ratio:auto}.map-card{left:12px;bottom:12px;width:calc(100% - 24px)}.map-legend{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}.map-note{margin:0 12px 14px;line-height:1.6}.region-list{grid-template-columns:1fr}.map-panel>header,.region-panel>header{padding:17px}.readonly{align-self:flex-start}}
</style>
