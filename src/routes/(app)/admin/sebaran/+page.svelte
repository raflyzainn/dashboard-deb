<script lang="ts">
  import { onDestroy } from 'svelte';
  import { app } from '$lib/state.svelte';
  import {
    mapCampuses,
    layoutMapPoints,
    progressBands,
    regionSummary,
    type ProgressBand
  } from '$lib/map';
  import { number } from '$lib/domain';
  import { INDONESIA_PATHS } from '$lib/indonesia-map';
  import Icon from '$lib/components/Icon.svelte';
  import Progress from '$lib/components/Progress.svelte';

  let region = $state('Semua wilayah');
  let band = $state<'all' | ProgressBand>('all');
  let search = $state('');
  let selectedId = $state('');
  let stageWidth = $state(0);
  let stageHeight = $state(0);
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
  const regions = $derived(['Semua wilayah', ...new Set(allPoints.map((point) => point.island))]);
  const visible = $derived(
    allPoints.filter(
      (point) =>
        (region === 'Semua wilayah' || point.island === region) &&
        (band === 'all' || point.band === band) &&
        `${point.name} ${point.acronym ?? ''} ${point.province}`
          .toLowerCase()
          .includes(search.toLowerCase())
    )
  );
  const selected = $derived(visible.find((point) => point.id === selectedId));
  const markers = $derived(
    layoutMapPoints(visible, stageWidth * 0.94, stageWidth * 0.94 * 0.52, zoom, stageHeight)
  );
  const summaries = $derived(
    regionSummary(app.data!).filter((row) => region === 'Semua wilayah' || row.island === region)
  );
  const reached = $derived(visible.filter((point) => point.band === 'reached').length);
  const average = $derived(
    visible.length ? visible.reduce((sum, point) => sum + point.score, 0) / visible.length : 0
  );
  const provinceCount = $derived(new Set(visible.map((point) => point.province)).size);
  function panLimit(nextZoom = zoom) {
    if (!mapStage || nextZoom <= 1) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (stageWidth * 0.94 * nextZoom - stageWidth) / 2),
      y: Math.max(0, (stageWidth * 0.94 * 0.52 * nextZoom - stageHeight) / 2)
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
    else if (previous > 1) clampPan((panX * zoom) / previous, (panY * zoom) / previous, zoom);
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
    wheelIdleTimer = setTimeout(() => (wheelZooming = false), 100);
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
    if (mapStage.hasPointerCapture(event.pointerId))
      mapStage.releasePointerCapture(event.pointerId);
  }

  function resetMap() {
    zoom = 1;
    wheelTarget = 1;
    clampPan(0, 0, 1);
    selectedId = '';
  }

  // Keep a resized map within its bounds, including after rotating a phone.
  $effect(() => {
    const limit = panLimit();
    clampPan(
      Math.max(-limit.x, Math.min(limit.x, panX)),
      Math.max(-limit.y, Math.min(limit.y, panY))
    );
  });

  onDestroy(() => {
    if (wheelFrame) cancelAnimationFrame(wheelFrame);
    if (wheelIdleTimer) clearTimeout(wheelIdleTimer);
  });
</script>

<svelte:head><title>Peta Persebaran · Digitalisasi DEB</title></svelte:head>

<div
  class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:[&&]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
>
  <div>
    <span
      class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
      >PANDANGAN WILAYAH ADMIN</span
    >
    <h1
      class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
    >
      Peta Persebaran Kampus
    </h1>
    <p class="leading-[1.8] m-[0px]">
      Lihat jangkauan {app.data!.campuses.length} kampus mitra dan progres simulasi program DEB di berbagai
      wilayah Indonesia.
    </p>
  </div>
  <span
    class="[&&]:flex [&&]:items-center [&&]:gap-y-[7px] [&&]:gap-x-[7px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] text-[#52739b]! [&&]:text-[11px] [&&]:px-[13px] [&&]:py-[9px] [&&]:border-[1px] [&&]:border-solid border-[color:rgb(210,_227,_245)]! [&&]:rounded-[999px] max-[700.01px]:[&&]:[align-self:flex-start] readonly"
    ><Icon name="eye" size={15} />Hanya baca</span
  >
</div>

<p role="status" class="leading-[1.8] m-[0px] map-missing">
  {app.data!.campuses.length - allPoints.length} kampus belum dapat dipetakan karena koordinat kosong
  atau di luar area peta.
</p>
<section
  class="[&_small]:text-[#6680a0]! [&_p]:text-[#6680a0]! [&_strong]:text-[#183b68]! [&&]:grid [&&]:grid-cols-[repeat(4,_minmax(0,_1fr))] [&&]:gap-y-[15px] [&&]:gap-x-[15px] [&&]:mb-[22px] max-[1150.01px]:[&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[700.01px]:[&&]:gap-y-[8px] max-[700.01px]:[&&]:gap-x-[8px] map-stats"
  aria-label="Ringkasan persebaran"
>
  <article
    class="[&&]:flex [&&]:items-start [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:p-[20px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(223,_231,_218)] [&&]:rounded-[12px] max-[700.01px]:[&&]:gap-y-[9px] max-[700.01px]:[&&]:gap-x-[9px] max-[700.01px]:[&&]:p-[13px]"
  >
    <span
      class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[38px] [&&]:h-[38px] [&&]:[background-image:initial]! [&&]:[background-color:rgb(231,_243,_255)]! [&&]:text-[#1671ce]! [&&]:shrink-0 [&&]:rounded-[10px] max-[700.01px]:[&&]:w-[32px] max-[700.01px]:[&&]:h-[32px] max-[700.01px]:[&>svg]:w-[17px] max-[700.01px]:[&>svg]:h-[17px] stat-icon green"
      ><Icon name="campuses" /></span
    >
    <div>
      <small class="[&&]:text-[10px] [&&]:text-[#74826f] leading-[1.7] [&&]:block"
        >Kampus ditampilkan</small
      ><strong
        class="font-[650] [&&]:flex [&&]:items-baseline [&&]:gap-y-[7px] [&&]:gap-x-[7px] [&&]:text-[26px] [&&]:mt-[5px] [&&]:mb-[4px] [&&]:mx-[0px] max-[700.01px]:[&&]:text-[21px]"
        >{visible.length}<span class="[&&]:text-[10px] [&&]:font-[500] [&&]:text-[#71806b]"
          >dari {app.data!.campuses.length}</span
        ></strong
      >
      <p
        class="leading-[1.8] [&&]:text-[9px] [&&]:text-[#84917e] m-[0px] max-[700.01px]:[&&]:hidden"
      >
        {region}
      </p>
    </div>
  </article>
  <article
    class="[&&]:flex [&&]:items-start [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:p-[20px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(223,_231,_218)] [&&]:rounded-[12px] max-[700.01px]:[&&]:gap-y-[9px] max-[700.01px]:[&&]:gap-x-[9px] max-[700.01px]:[&&]:p-[13px]"
  >
    <span
      class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[38px] [&&]:h-[38px] [&&]:[background-image:initial]! [&&]:[background-color:rgb(231,_243,_255)]! [&&]:text-[#1671ce]! [&&]:shrink-0 [&&]:rounded-[10px] max-[700.01px]:[&&]:w-[32px] max-[700.01px]:[&&]:h-[32px] max-[700.01px]:[&>svg]:w-[17px] max-[700.01px]:[&>svg]:h-[17px] stat-icon blue"
      ><Icon name="sebaran" /></span
    >
    <div>
      <small class="[&&]:text-[10px] [&&]:text-[#74826f] leading-[1.7] [&&]:block"
        >Provinsi terjangkau</small
      ><strong
        class="font-[650] [&&]:flex [&&]:items-baseline [&&]:gap-y-[7px] [&&]:gap-x-[7px] [&&]:text-[26px] [&&]:mt-[5px] [&&]:mb-[4px] [&&]:mx-[0px] max-[700.01px]:[&&]:text-[21px]"
        >{provinceCount}<span class="[&&]:text-[10px] [&&]:font-[500] [&&]:text-[#71806b]"
          >provinsi</span
        ></strong
      >
      <p
        class="leading-[1.8] [&&]:text-[9px] [&&]:text-[#84917e] m-[0px] max-[700.01px]:[&&]:hidden"
      >
        Lokasi kampus pada filter aktif
      </p>
    </div>
  </article>
  <article
    class="[&&]:flex [&&]:items-start [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:p-[20px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(223,_231,_218)] [&&]:rounded-[12px] max-[700.01px]:[&&]:gap-y-[9px] max-[700.01px]:[&&]:gap-x-[9px] max-[700.01px]:[&&]:p-[13px]"
  >
    <span
      class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[38px] [&&]:h-[38px] [&&&]:[background-image:initial] [&&&]:[background-color:rgb(251,_240,_217)] [&&&]:text-[#a37523] [&&]:shrink-0 [&&]:rounded-[10px] max-[700.01px]:[&&]:w-[32px] max-[700.01px]:[&&]:h-[32px] max-[700.01px]:[&>svg]:w-[17px] max-[700.01px]:[&>svg]:h-[17px] stat-icon amber"
      ><Icon name="target" /></span
    >
    <div>
      <small class="[&&]:text-[10px] [&&]:text-[#74826f] leading-[1.7] [&&]:block"
        >Rata-rata progres</small
      ><strong
        class="font-[650] [&&]:flex [&&]:items-baseline [&&]:gap-y-[7px] [&&]:gap-x-[7px] [&&]:text-[26px] [&&]:mt-[5px] [&&]:mb-[4px] [&&]:mx-[0px] max-[700.01px]:[&&]:text-[21px]"
        >{number(average)}<span class="[&&]:text-[10px] [&&]:font-[500] [&&]:text-[#71806b]">%</span
        ></strong
      >
      <p
        class="leading-[1.8] [&&]:text-[9px] [&&]:text-[#84917e] m-[0px] max-[700.01px]:[&&]:hidden"
      >
        Perhitungan data simulasi
      </p>
    </div>
  </article>
  <article
    class="[&&]:flex [&&]:items-start [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:p-[20px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(223,_231,_218)] [&&]:rounded-[12px] max-[700.01px]:[&&]:gap-y-[9px] max-[700.01px]:[&&]:gap-x-[9px] max-[700.01px]:[&&]:p-[13px]"
  >
    <span
      class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[38px] [&&]:h-[38px] [&&]:[background-image:initial]! [&&]:[background-color:rgb(231,_243,_255)]! [&&]:text-[#1671ce]! [&&]:shrink-0 [&&]:rounded-[10px] max-[700.01px]:[&&]:w-[32px] max-[700.01px]:[&&]:h-[32px] max-[700.01px]:[&>svg]:w-[17px] max-[700.01px]:[&>svg]:h-[17px] stat-icon mint"
      ><Icon name="check" /></span
    >
    <div>
      <small class="[&&]:text-[10px] [&&]:text-[#74826f] leading-[1.7] [&&]:block"
        >Progres tertinggi</small
      ><strong
        class="font-[650] [&&]:flex [&&]:items-baseline [&&]:gap-y-[7px] [&&]:gap-x-[7px] [&&]:text-[26px] [&&]:mt-[5px] [&&]:mb-[4px] [&&]:mx-[0px] max-[700.01px]:[&&]:text-[21px]"
        >{reached}<span class="[&&]:text-[10px] [&&]:font-[500] [&&]:text-[#71806b]">kampus</span
        ></strong
      >
      <p
        class="leading-[1.8] [&&]:text-[9px] [&&]:text-[#84917e] m-[0px] max-[700.01px]:[&&]:hidden"
      >
        Progres simulasi minimal 70%
      </p>
    </div>
  </article>
</section>

<section
  class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:grid [&&]:grid-cols-[minmax(210px,_1fr)_minmax(260px,_1.5fr)_240px] [&&]:items-center [&&]:gap-y-[18px] [&&]:gap-x-[18px] [&&]:mb-[22px] [&&]:px-[20px] [&&]:py-[18px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[1150.01px]:[&&]:grid-cols-[1fr_1fr] max-[700.01px]:[&&]:grid-cols-[1fr] max-[700.01px]:[&&]:p-[16px] panel map-filters"
  aria-label="Penyaring peta"
>
  <div
    class="max-[1150.01px]:[&&]:[grid-column-start:1] max-[1150.01px]:[&&]:[grid-column-end:-1] max-[700.01px]:[&&]:[grid-column-start:auto] max-[700.01px]:[&&]:[grid-column-end:auto]"
  >
    <strong class="font-[650] [&&]:text-[13px]">Jelajahi persebaran</strong>
    <p class="[&&]:mt-[5px] mb-[0px] leading-[1.8] [&&]:text-[10px] [&&]:text-[#778473] mx-[0px]">
      Filter akan memperbarui titik peta dan ringkasan wilayah.
    </p>
  </div>
  <label
    class="flex items-center [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#7b94b4] grow shrink [flex-basis:0%] min-w-[200px] [&&&]:w-[100%] px-[12px] py-[0px] border-[1px] border-solid border-[color:rgb(211,_226,_243)] rounded-[7px] [&_input]:[background-image:initial] [&_input]:[background-color:transparent] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:p-[10px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] [&:focus-within]:[outline-color:#7fc1ff] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&_input:focus]:[outline-color:initial] [&_input:focus]:[outline-style:none] [&_input:focus]:[outline-width:initial] search-field"
    ><Icon name="search" size={17} /><input
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [&&]:min-w-[0] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
      aria-label="Cari kampus di peta"
      placeholder="Cari kampus, singkatan, atau provinsi…"
      bind:value={search}
    /></label
  >
  <select
    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[290px] min-h-[37px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
    aria-label="Filter wilayah peta"
    bind:value={region}
    >{#each regions as item}<option value={item}>{item}</option>{/each}</select
  >
</section>

<div
  class="[&&]:grid [&&]:grid-cols-[minmax(0,_1.8fr)_minmax(270px,_0.72fr)] [&&]:gap-y-[22px] [&&]:gap-x-[22px] [&&]:[align-items:start] max-[1150.01px]:[&&]:grid-cols-[1fr] map-layout"
>
  <section
    class="[background-image:initial] [background-color:white] [&&]:min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] [&_header_p]:text-[#6680a0]! [&_h2]:text-[#183b68]! [&_header>span]:text-[#3970aa]! [&_header>span]:[background-image:initial]! [&_header>span]:[background-color:rgb(234,_243,_255)]! panel map-panel"
  >
    <header
      class="[&&]:flex [&&]:items-start [&&]:justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(231,_236,_227)] [&&]:px-[22px] [&&]:py-[20px] max-[700.01px]:[&&]:p-[17px]"
    >
      <div>
        <h2 class="font-[650] text-[color:var(--navy)] [&&]:text-[15px] tracking-[-0.45px] m-[0px]">
          Sebaran geografis
        </h2>
        <p
          class="[&&]:mt-[5px] mb-[0px] leading-[1.8] [&&]:text-[10px] [&&]:text-[#74816f] mx-[0px]"
        >
          Ketuk titik untuk memilih kampus. Gunakan +/− untuk zoom, lalu geser peta.
        </p>
      </div>
      <span
        class="[&&]:text-[10px] [&&]:text-[#6a7b66] [&&]:[background-image:initial] [&&]:[background-color:rgb(240,_245,_236)] [&&]:px-[10px] [&&]:py-[7px] [&&]:rounded-[999px]"
        >{visible.length} kampus</span
      >
    </header>
    <div
      bind:this={mapStage}
      bind:clientWidth={stageWidth}
      bind:clientHeight={stageHeight}
      class="[&&]:relative [&&]:[aspect-ratio:100/56] [&&]:min-h-[370px] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [background-image:radial-gradient(circle_at_45%_45%,_rgb(251,_253,_255),_rgb(237,_245,_255))]! [background-color:initial]! [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(229,_235,_225)] [&&]:[cursor:grab] [&&]:[touch-action:none] [&&]:[overscroll-behavior-x:contain] [&&]:[overscroll-behavior-y:contain] [&.dragging]:[cursor:grabbing] max-[700.01px]:[&&]:[aspect-ratio:auto] max-[700.01px]:[&&]:min-h-[310px] map-stage"
      class:dragging
      class:wheel-zooming={wheelZooming}
      role="group"
      aria-label={`Peta Indonesia dengan ${visible.length} titik kampus mitra`}
      onwheel={wheelMap}
      onpointerdown={startPan}
      onpointermove={movePan}
      onpointerup={endPan}
      onpointercancel={endPan}
    >
      <div
        class="[&&]:absolute [&&]:top-[14px] [&&]:right-[14px] [&&]:flex [&&]:items-center [&&]:z-[7] [&&]:[background-image:initial] [&&]:[background-color:rgba(255,_255,_255,_0.94)] [&&]:[box-shadow:0_5px_14px_#29482912] [&&]:p-[4px] [&&]:border-[1px] [&&]:border-solid border-[color:rgb(200,_222,_244)]! [&&]:rounded-[10px] [&_button]:text-[#1767b8]! [&_output]:text-[#1767b8]! [&_button:hover:not(:disabled)]:[background-image:initial]! [&_button:hover:not(:disabled)]:[background-color:rgb(232,_243,_255)]! map-controls"
        aria-label="Kontrol pembesaran peta"
      >
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[15px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#456342] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:h-[40px] [&&]:min-w-[40px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[7px] [&:disabled]:cursor-default [&:disabled]:opacity-[0.35] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_244,_232)]"
          aria-label="Perkecil peta"
          disabled={zoom <= 1}
          onclick={() => setZoom(zoom - 0.25)}>−</button
        ><output
          class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:h-[40px] [&&]:min-w-[48px] [&&]:[border-top-width:0px] [&&]:[border-right-width:1px] [&&]:[border-bottom-width:0px] [&&]:[border-left-width:1px] [&&]:[border-top-style:none] [&&]:[border-right-style:solid] [&&]:[border-bottom-style:none] [&&]:[border-left-style:solid] [&&]:[border-top-color:currentcolor] [&&]:[border-right-color:rgb(226,_233,_221)] [&&]:[border-bottom-color:currentcolor] [&&]:[border-left-color:rgb(226,_233,_221)] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:text-[#456342] [&&]:text-[9px]"
          aria-label="Tingkat pembesaran">{Math.round(zoom * 100)}%</output
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[15px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#456342] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:h-[40px] [&&]:min-w-[40px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[7px] [&:disabled]:cursor-default [&:disabled]:opacity-[0.35] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_244,_232)]"
          aria-label="Perbesar peta"
          disabled={zoom >= 3}
          onclick={() => setZoom(zoom + 0.25)}>+</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[15px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#456342] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:h-[40px] [&&]:min-w-[40px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&&]:ml-[3px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[7px] [&:disabled]:cursor-default [&:disabled]:opacity-[0.35] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_244,_232)] reset-zoom"
          aria-label="Atur ulang pembesaran"
          disabled={zoom === 1 && panX === 0 && panY === 0}
          onclick={resetMap}><Icon name="reset" size={14} /></button
        >
      </div>
      <div
        class="[&&]:absolute [&&]:left-[3%] [&&]:top-[50%] [&&]:w-[94%] [&&]:[aspect-ratio:1000/520] [&&]:[transform:translate(var(--pan-x),_calc(-50%_+_var(--pan-y)))_scale(var(--zoom))] [&&]:[transform-origin:50%_50%] [&&]:[transition-behavior:normal] [&&]:[transition-duration:0.18s] [&&]:[transition-timing-function:ease] [&&]:[transition-delay:0s] [&&]:[transition-property:transform] [&&]:[will-change:transform] [.map-stage.dragging_&]:[transition-behavior:normal] [.map-stage.dragging_&]:[transition-duration:0s] [.map-stage.dragging_&]:[transition-timing-function:ease] [.map-stage.dragging_&]:[transition-delay:0s] [.map-stage.dragging_&]:[transition-property:none] [.map-stage.wheel-zooming_&]:[transition-behavior:normal] [.map-stage.wheel-zooming_&]:[transition-duration:0s] [.map-stage.wheel-zooming_&]:[transition-timing-function:ease] [.map-stage.wheel-zooming_&]:[transition-delay:0s] [.map-stage.wheel-zooming_&]:[transition-property:none] map-world"
        style={`--zoom:${zoom};--pan-x:${panX}px;--pan-y:${panY}px`}
      >
        <svg
          class="shrink-0 [&&]:absolute [&&]:top-[0px] [&&]:right-[0px] [&&]:bottom-[0px] [&&]:left-[0px] [&&]:w-[100%] [&&]:h-[100%] [filter:drop-shadow(0_4px_6px_#245b9d22)]! [&_path]:[stroke:#79a9d8]! archipelago"
          viewBox="0 0 1000 520"
          aria-hidden="true"
        >
          <defs
            ><linearGradient id="land" x1="0" y1="0" x2="1" y2="1"
              ><stop stop-color="#dcecff" /><stop offset="1" stop-color="#b9d8ff" /></linearGradient
            ></defs
          >
          {#each INDONESIA_PATHS as path}<path
              class="[&&]:[fill:url(#land)] [&&]:[stroke:#9eb79a] [&&]:[stroke-width:2]"
              d={path}
            />{/each}
        </svg>
        <svg
          class="shrink-0 [&&]:overflow-x-visible [&&]:overflow-y-visible [&&]:absolute [&&]:top-[0px] [&&]:right-[0px] [&&]:bottom-[0px] [&&]:left-[0px] [&&]:w-[100%] [&&]:h-[100%] [&&]:[pointer-events:none] marker-links"
          viewBox="0 0 1000 520"
          aria-hidden="true"
        >
          {#each markers as point (point.id)}
            {#if Math.abs(point.markerX - point.x) + Math.abs(point.markerY - point.y) > 0.01}
              <line
                class="[&&]:[stroke:#7796b8] [&&]:[stroke-width:1] [&&]:[stroke-opacity:0.65]"
                x1={point.x * 10}
                y1={point.y * 5.2}
                x2={point.markerX * 10}
                y2={point.markerY * 5.2}
                vector-effect="non-scaling-stroke"
              />
            {/if}
          {/each}
        </svg>
        {#each markers as point (point.id)}
          <button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer text-[inherit] [&&]:absolute [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[24px] [&&]:h-[24px] [&&]:[transform:translate(-50%,_-50%)_scale(calc(1_/_var(--zoom)))] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:z-[2] [&&]:p-[0px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[50%] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:rgb(20,_94,_232)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:2px] [&:focus-visible]:outline-offset-[1px] [&:hover]:z-[4] [&.selected]:z-[4] map-dot left-[var(--marker-x)] top-[var(--marker-y)]"
            class:selected={point.id === selectedId}
            style={`--marker-x:${point.markerX}%;--marker-y:${point.markerY}%;--dot:${progressBands[point.band].color};--size:13px`}
            aria-label={`${point.name}, ${point.province}, progres ${number(point.score)} persen`}
            title={point.name}
            onclick={() => (selectedId = point.id)}
            ><span
              class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[var(--size)] [&&]:h-[var(--size)] [&&]:[background-image:initial] [&&]:[background-color:var(--dot)] [&&]:[box-shadow:0_2px_6px_#1c3d2d45] [&&]:border-[2px] [&&]:border-solid [&&]:border-[color:rgb(255,_255,_255)] [&&]:rounded-[50%] [.map-dot.selected_&]:[outline-color:rgba(20,_94,_232,_0.3)] [.map-dot.selected_&]:[outline-style:solid] [.map-dot.selected_&]:[outline-width:3px]"
            ></span></button
          >
        {/each}
      </div>
    </div>
    {#if selected}<article
        class="[&&]:relative [&&]:w-[auto] [&&]:[background-image:initial] [&&]:[background-color:rgba(255,_255,_255,_0.95)] [&&]:[backdrop-filter:blur(8px)] [&&]:[box-shadow:0_12px_28px_#2948291f] [&&]:z-[5] [&&]:p-[16px] [&&]:mx-[20px] [&&]:my-[16px] [&&]:border-[1px] [&&]:border-solid border-[color:rgb(207,_226,_245)]! [&&]:rounded-[12px] [&_a]:text-[#075fc7]! max-[700.01px]:[&&]:w-[auto] max-[700.01px]:[&&]:m-[12px] map-card"
        aria-label="Detail kampus terpilih"
      >
        <div class="[&&]:flex [&&]:justify-between [&&]:items-center [&&]:mb-[9px] map-card-top">
          <span
            class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:min-w-[30px] [&&]:h-[30px] [background-image:initial]! [background-color:rgb(230,_242,_255)]! text-[#1768bd]! [&&]:text-[9px] [&&]:font-[700] [&&]:px-[7px] [&&]:py-[0px] [&&]:rounded-[8px] map-avatar"
            >{selected.initials}</span
          ><button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[20px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#70806b] [&&]:min-w-[44px] [&&]:min-h-[44px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
            aria-label="Tutup detail titik"
            onclick={() => {
              selectedId = '';
            }}>×</button
          >
        </div>
        <strong class="font-[650] [&&]:block [&&]:text-[12px] [&&]:leading-[1.6]"
          >{selected.name}</strong
        ><small
          class="[&&]:text-[9px] [&&]:text-[#758170] leading-[1.7] [&&]:block [&&]:mt-[3px] [&&]:mb-[12px] [&&]:mx-[0px]"
          >{selected.province} · {selected.island}</small
        >
        <div
          class="flex items-center justify-between gap-y-[12px] gap-x-[12px] [&&&]:text-[10px] [&&&]:mb-[7px] row-between"
        >
          <span>{progressBands[selected.band].label}</span><b>{number(selected.score)}%</b>
        </div>
        <Progress value={selected.score} label={`Progres ${selected.name}`} /><a
          class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#176f35] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&&]:flex [&&]:items-center [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:text-[10px] [&&]:font-[650] [&&]:mt-[12px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
          href={`/admin/campuses/${selected.id}`}
          >Lihat detail kampus <Icon name="arrow" size={14} /></a
        >
      </article>
    {/if}
    <div
      class="[&_button:hover]:[background-image:initial]! [&_button:hover]:[background-color:rgb(238,_246,_255)]! [&_button:hover]:border-[color:rgb(209,_229,_248)]! [&_button.active]:[background-image:initial]! [&_button.active]:[background-color:rgb(238,_246,_255)]! [&_button.active]:border-[color:rgb(209,_229,_248)]! [&_small]:text-[#6680a0]! [&_button]:text-[#183b68]! [&&]:grid [&&]:grid-cols-[repeat(4,_minmax(0,_1fr))] [&&]:gap-y-[9px] [&&]:gap-x-[9px] [&&]:px-[20px] [&&]:py-[16px] max-[700.01px]:[&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[700.01px]:[&&]:p-[12px] map-legend"
    >
      {#each Object.entries(progressBands) as [key, item]}<button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#465d43] [&&]:flex [&&]:items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:text-left [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:p-[8px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:transparent] [&&]:rounded-[8px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(242,_246,_239)] [&:hover]:border-[color:rgb(216,_228,_209)] [&.active]:[background-image:initial] [&.active]:[background-color:rgb(242,_246,_239)] [&.active]:border-[color:rgb(216,_228,_209)]"
          class:active={band === key}
          onclick={() => (band = band === key ? 'all' : (key as ProgressBand))}
          ><i
            class="[&&]:w-[11px] [&&]:h-[11px] [&&]:[background-image:initial] [&&]:[background-color:var(--legend)] [&&]:shrink-0 [&&]:rounded-[50%]"
            style={`--legend:${item.color}`}
          ></i><span class="[&&]:text-[9px]"
            >{item.label}<small
              class="text-[11px] [&&]:text-[#82907d] leading-[1.7] [&&]:block [&&]:mt-[3px]"
              >{item.short} · {allPoints.filter((point) => point.band === key).length} kampus</small
            ></span
          ></button
        >{/each}
    </div>
    <p
      class="[&&]:mt-[0px] [&&]:mb-[18px] leading-[1.8] [&&]:flex [&&]:items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [background-image:initial]! [background-color:rgb(245,_249,_255)]! text-[#5c789b]! [&&]:text-[9px] [&&]:px-[13px] [&&]:py-[11px] [&&]:mx-[20px] [&&]:rounded-[8px] max-[700.01px]:[&&]:mt-[0px] max-[700.01px]:[&&]:mb-[14px] max-[700.01px]:[&&]:leading-[1.6] max-[700.01px]:[&&]:mx-[12px] map-note"
    >
      <Icon name="faq" size={15} />Setiap titik mewakili satu kampus. Garis tipis menghubungkan
      titik yang direnggangkan ke lokasi aslinya.
    </p>
  </section>

  <aside
    class="[background-image:initial] [background-color:white] [&&]:min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] [&_header_p]:text-[#6680a0]! [&_h2]:text-[#183b68]! [&_header>span]:text-[#3970aa]! [&_header>span]:[background-image:initial]! [&_header>span]:[background-color:rgb(234,_243,_255)]! panel region-panel"
  >
    <header
      class="[&&]:flex [&&]:items-start [&&]:justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(231,_236,_227)] [&&]:px-[22px] [&&]:py-[20px] max-[700.01px]:[&&]:p-[17px]"
    >
      <div>
        <h2 class="font-[650] text-[color:var(--navy)] [&&]:text-[15px] tracking-[-0.45px] m-[0px]">
          Ringkasan wilayah
        </h2>
        <p
          class="[&&]:mt-[5px] mb-[0px] leading-[1.8] [&&]:text-[10px] [&&]:text-[#74816f] mx-[0px]"
        >
          Dikelompokkan per pulau atau kepulauan.
        </p>
      </div>
      <span
        class="[&&]:text-[10px] [&&]:text-[#6a7b66] [&&]:[background-image:initial] [&&]:[background-color:rgb(240,_245,_236)] [&&]:px-[10px] [&&]:py-[7px] [&&]:rounded-[999px]"
        >{summaries.length} wilayah</span
      >
    </header>
    <div
      class="[&_button:hover]:[background-image:initial]! [&_button:hover]:[background-color:rgb(238,_246,_255)]! [&_button:hover]:border-[color:rgb(209,_229,_248)]! [&_button.active]:[background-image:initial]! [&_button.active]:[background-color:rgb(238,_246,_255)]! [&_button.active]:border-[color:rgb(209,_229,_248)]! [&_small]:text-[#6680a0]! [&_button]:text-[#183b68]! [&&]:p-[8px] max-[1150.01px]:[&&]:grid max-[1150.01px]:[&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[700.01px]:[&&]:grid-cols-[1fr] region-list"
    >
      {#each summaries as row}<button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#385038] [&&]:w-[100%] [&&]:grid [&&]:grid-cols-[35px_minmax(0,_1fr)_auto] [&&]:items-center [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:text-left [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:p-[12px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:transparent] [&&]:rounded-[9px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(241,_246,_237)] [&:hover]:border-[color:rgb(217,_229,_210)] [&.active]:[background-image:initial] [&.active]:[background-color:rgb(241,_246,_237)] [&.active]:border-[color:rgb(217,_229,_210)]"
          class:active={region === row.island}
          onclick={() => (region = region === row.island ? 'Semua wilayah' : row.island)}
          ><span
            class="[&&]:w-[32px] [&&]:h-[32px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [background-image:initial]! [background-color:rgb(230,_242,_255)]! text-[#1768bd]! [&&]:rounded-[8px] region-mark"
            ><Icon name="sebaran" size={17} /></span
          ><span
            ><strong class="font-[650] [&&]:text-[11px]">{row.island}</strong><small
              class="[&&]:text-[9px] [&&]:text-[#7b8976] leading-[1.7] [&&]:block [&&]:mt-[4px]"
              >{row.provinces} provinsi · {row.campuses} kampus</small
            ></span
          ><b class="[&&]:text-[11px]">{number(row.average)}%</b></button
        >{/each}
    </div>
    <div
      class="[&&]:[border-top-width:1px] [&&]:[border-top-style:solid] [&&]:[border-top-color:rgb(231,_236,_227)] [background-image:initial]! [background-color:rgb(245,_249,_255)]! [&&]:px-[20px] [&&]:py-[17px] [&_p]:text-[#6680a0]! region-foot"
    >
      <strong class="font-[650] [&&]:text-[10px]">Tentang data peta</strong>
      <p
        class="[&&]:mt-[7px] mb-[0px] [&&]:leading-[1.7] [&&]:text-[9px] [&&]:text-[#788574] mx-[0px]"
      >
        Nama kampus berasal dari daftar proyek. Posisi dan seluruh nilai capaian masih bersifat
        simulasi untuk kebutuhan prototype.
      </p>
    </div>
  </aside>
</div>
