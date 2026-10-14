<script lang="ts">
  import { reportError } from '$lib/feedback';
  import { onMount, tick, untrack } from 'svelte';
  import type * as Leaflet from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { INDONESIA_BOUNDS, INDONESIA_CENTER, insideIndonesia, type LatLng } from '$lib/location';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  let {
    value = $bindable<LatLng | null>(null),
    readonly = false,
    height = 320,
    onchange
  }: { value?: LatLng | null; readonly?: boolean; height?: number; onchange?: () => void } = $props();

  const OUTSIDE = 'Koordinat berada di luar wilayah Indonesia. Periksa kembali lintang dan bujur.';
  const PIN_ZOOM = 15;
  // Inline pin, because the stock marker images do not survive bundling. The tip sits at 16,41.
  const PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42" aria-hidden="true" style="display:block;overflow:visible;filter:drop-shadow(0 3px 4px rgba(13,35,76,.35))"><path d="M16 41C16 41 30 26.5 30 15.5a14 14 0 1 0-28 0C2 26.5 16 41 16 41Z" fill="#075fc7" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>';

  const uid = $props.id();
  const point = $derived<LatLng | null>(
    value && Number.isFinite(value.lat) && Number.isFinite(value.lng) ? { lat: value.lat, lng: value.lng } : null
  );
  const showMap = $derived(!readonly || point !== null);

  let lib = $state.raw<typeof Leaflet | null>(null);
  let libFailed = $state(false);
  let container = $state<HTMLDivElement | null>(null);
  let mapReady = $state(false);
  let latText = $state('');
  let lngText = $state('');
  let message = $state('');
  let locating = $state(false);

  // Map objects stay outside the reactive graph.
  let map: Leaflet.Map | null = null;
  let marker: Leaflet.Marker | null = null;
  let markerLocked = false;
  let lastLocked: boolean | null = null;
  // Point placed through the map itself: the view must not jump for it.
  let quietPoint: LatLng | null = null;

  async function loadLibrary() {
    libFailed = false;
    try {
      const mod = (await import('leaflet')) as typeof Leaflet & { default?: typeof Leaflet };
      lib = mod.default ?? mod;
    } catch (error) {
      console.warn('LocationPicker: map library failed to load', error);
      libFailed = true;
      reportError('Peta belum dapat dimuat. Coba muat ulang atau isi lintang dan bujur secara manual.');
    }
  }

  onMount(() => {
    void loadLibrary();
  });

  function commit(next: LatLng | null, quiet = false): boolean {
    if (next && !insideIndonesia(next)) {
      message = reportError(OUTSIDE);
      return false;
    }
    message = '';
    const rounded = next ? { lat: Number(next.lat.toFixed(6)), lng: Number(next.lng.toFixed(6)) } : null;
    quietPoint = quiet ? rounded : null;
    value = rounded;
    onchange?.();
    return true;
  }

  async function refreshSize() {
    await tick();
    requestAnimationFrame(() => map?.invalidateSize());
  }

  function mountMap(L: typeof Leaflet, node: HTMLDivElement) {
    const start = point;
    const instance = L.map(node, {
      center: start ? [start.lat, start.lng] : [INDONESIA_CENTER.lat, INDONESIA_CENTER.lng],
      // A phone sized map needs one step less to show most of the country.
      zoom: start ? PIN_ZOOM : node.clientWidth < 560 ? 4 : 5,
      minZoom: 4,
      maxZoom: 19,
      scrollWheelZoom: !readonly
    });
    instance.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(instance);
    instance.on('click', (event: Leaflet.LeafletMouseEvent) => {
      if (readonly) return;
      const spot = event.latlng.wrap();
      commit({ lat: spot.lat, lng: spot.lng }, true);
    });
    // Covers the card switching modes and any parent that was hidden while the map was created.
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(node);

    map = instance;
    lastLocked = null;
    mapReady = true;
    void refreshSize();

    return () => {
      observer.disconnect();
      instance.remove();
      map = null;
      marker = null;
      mapReady = false;
    };
  }

  function createMarker(L: typeof Leaflet, target: Leaflet.Map, at: LatLng, locked: boolean) {
    const created = L.marker([at.lat, at.lng], {
      icon: L.divIcon({ html: PIN_SVG, className: '', iconSize: [32, 42], iconAnchor: [16, 41] }),
      draggable: !locked,
      interactive: !locked,
      keyboard: !locked,
      autoPan: true,
      title: locked ? '' : 'Geser pin untuk memindahkan lokasi'
    }).addTo(target);
    created.on('dragend', () => {
      const spot = created.getLatLng().wrap();
      const accepted = commit({ lat: spot.lat, lng: spot.lng }, true);
      if (!accepted && point) created.setLatLng([point.lat, point.lng]);
    });
    markerLocked = locked;
    return created;
  }

  function draw(at: LatLng | null, locked: boolean) {
    if (!map || !lib) return;
    if (marker && (!at || markerLocked !== locked)) {
      marker.remove();
      marker = null;
    }
    if (at) {
      if (marker) marker.setLatLng([at.lat, at.lng]);
      else marker = createMarker(lib, map, at, locked);
      const quiet = quietPoint !== null && quietPoint.lat === at.lat && quietPoint.lng === at.lng;
      if (!quiet) map.setView([at.lat, at.lng], Math.max(map.getZoom(), PIN_ZOOM));
    }
    quietPoint = null;
    if (locked) map.scrollWheelZoom.disable();
    else map.scrollWheelZoom.enable();
    if (lastLocked !== locked) {
      lastLocked = locked;
      void refreshSize();
    }
  }

  // Create the map once the library and the container both exist; remove it when either goes away.
  $effect(() => {
    const L = lib;
    const node = container;
    if (!L || !node) return;
    return untrack(() => mountMap(L, node));
  });

  // One way sync from the props to the pin and the inputs. Nothing here writes `value`, so it cannot loop.
  $effect(() => {
    const at = point;
    const locked = readonly;
    const ready = mapReady;
    untrack(() => {
      latText = at ? at.lat.toFixed(6) : '';
      lngText = at ? at.lng.toFixed(6) : '';
      if (ready) draw(at, locked);
    });
  });

  function applyInputs() {
    const latRaw = latText.trim();
    const lngRaw = lngText.trim();
    if (!latRaw && !lngRaw) {
      if (point) commit(null);
      else message = '';
      return;
    }
    // Wait for the second field before judging the pair.
    if (!latRaw || !lngRaw) return;
    const lat = Number(latRaw.replace(',', '.'));
    const lng = Number(lngRaw.replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      message = reportError('Isi lintang dan bujur dengan angka, contoh -7.556100 dan 110.831600.');
      return;
    }
    commit({ lat, lng });
  }

  function applyOnEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    // Keeps Enter from submitting a surrounding form while coordinates are typed.
    event.preventDefault();
    applyInputs();
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      message = reportError('Perangkat ini tidak dapat membaca lokasi. Klik peta atau isi lintang dan bujur.');
      return;
    }
    locating = true;
    message = '';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locating = false;
        commit({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        locating = false;
        console.warn('LocationPicker: geolocation failed', error.code, error.message);
        message = reportError(
          error.code === error.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Izinkan akses lokasi di peramban, lalu coba lagi.'
            : error.code === error.TIMEOUT
              ? 'Lokasi belum ditemukan. Coba lagi, atau klik peta untuk menandai lokasi.'
              : 'Lokasi tidak tersedia saat ini. Klik peta atau isi lintang dan bujur.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  const inputClass =
    'w-full rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm text-[#17365f] focus:border-[#075fc7] focus:outline-none focus:ring-2 focus:ring-[#075fc7]/20 disabled:bg-[#f5f9ff] disabled:text-[#64748b]';
  const labelClass = 'mb-1.5 block text-[13px] font-semibold text-[#17365f]';
</script>

<div class="w-full min-w-0">
  {#if showMap}
    <div
      class="relative isolate z-0 overflow-hidden rounded-xl border border-[#dce7f7] bg-[#e9f3ff]"
      style:height="{height}px"
    >
      <div bind:this={container} class="size-full" role="region" aria-label="Peta lokasi program"></div>
      {#if !lib}
        <div class="absolute inset-0 grid place-items-center px-4 text-center text-[13px] text-[#475569]">
          {#if libFailed}
            <p role="alert">
              Peta belum dapat dimuat.
              <button
                type="button"
                class="cursor-pointer rounded font-semibold text-[#075fc7] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55a9f2]"
                onclick={loadLibrary}>Coba lagi</button
              >
            </p>
          {:else}
            <p role="status">Memuat peta…</p>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div
      class="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-[#dce7f7] bg-[#f5f9ff] px-4 py-9 text-center"
    >
      <span class="grid size-11 place-items-center rounded-full bg-[#e9f3ff] text-[#075fc7]"><Icon name="pin" size={22} /></span>
      <p class="text-sm font-semibold text-[#17365f]">Lokasi belum ditandai</p>
    </div>
  {/if}

  {#if !readonly}
    <p class="mt-2 text-[13px] leading-snug text-[#64748b]">Klik peta atau geser pin ke lokasi program yang tepat.</p>

    <div class="mt-4 grid grid-cols-2 gap-3">
      <div class="min-w-0">
        <label class={labelClass} for="{uid}-lat">Lintang (latitude)</label>
        <input
          id="{uid}-lat"
          class={inputClass}
          type="number"
          step="any"
          min={INDONESIA_BOUNDS.minLat}
          max={INDONESIA_BOUNDS.maxLat}
          placeholder="-7.556100"
          value={latText}
          oninput={(event) => (latText = event.currentTarget.value)}
          onchange={applyInputs}
          onkeydown={applyOnEnter}
        />
      </div>
      <div class="min-w-0">
        <label class={labelClass} for="{uid}-lng">Bujur (longitude)</label>
        <input
          id="{uid}-lng"
          class={inputClass}
          type="number"
          step="any"
          min={INDONESIA_BOUNDS.minLng}
          max={INDONESIA_BOUNDS.maxLng}
          placeholder="110.831600"
          value={lngText}
          oninput={(event) => (lngText = event.currentTarget.value)}
          onchange={applyInputs}
          onkeydown={applyOnEnter}
        />
      </div>
    </div>

    {#if message}
      <p class="mt-2 text-[13px] leading-snug text-[#b3402e]" role="alert">{message}</p>
    {/if}

    <div class="mt-3 flex flex-wrap gap-2">
      <Button variant="secondary" icon="locate" loading={locating} onclick={useMyLocation}>Gunakan lokasi saya</Button>
      <Button variant="ghost" icon="trash" disabled={!point} onclick={() => commit(null)}>Hapus pin</Button>
    </div>
  {/if}
</div>
