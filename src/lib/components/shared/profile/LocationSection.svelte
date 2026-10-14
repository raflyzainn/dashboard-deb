<script lang="ts">
  import { reportError } from '$lib/feedback';
  // Program location: standard region, street detail and the map pin used by the dashboards.
  import type { ProgramProfile } from '$lib/types';
  import {
    REGION_KEYS,
    emptyRegion,
    formatCoordinates,
    mapsUrl,
    parseCoordinates,
    regionLine,
    type LatLng,
    type RegionValue
  } from '$lib/location';
  import EditableSection from '$lib/components/ui/EditableSection.svelte';
  import ReadField from '$lib/components/ui/ReadField.svelte';
  import RegionSelect from '$lib/components/ui/RegionSelect.svelte';
  import LocationPicker from '$lib/components/ui/LocationPicker.svelte';
  import NewTabLink from './NewTabLink.svelte';
  import { changedValues, isWebUrl, saveProgram, text } from './program-form';

  const TITLE = 'Lokasi program';
  const INPUT =
    'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#17365f] focus:outline-none focus:ring-2 disabled:bg-[#f5f9ff] disabled:text-[#64748b]';
  const INPUT_OK = 'border-[#cfe0f5] focus:border-[#075fc7] focus:ring-[#075fc7]/20';
  const INPUT_BAD = 'border-[#e0897b] focus:border-[#b3402e] focus:ring-[#b3402e]/20';
  const LABEL = 'mb-1.5 block text-[13px] font-semibold text-[#17365f]';
  const HINT = 'm-0 mt-1 text-[12px] text-[#64748b]';

  let { program, campusId, canEdit = true }: { program?: ProgramProfile; campusId: string; canEdit?: boolean } = $props();

  const uid = $props.id();

  // Records from before the standard address only hold free text. Their region starts empty
  // and the old text stays stored until a region is picked.
  const hasRegion = $derived(Boolean(text(program?.provinceId)));
  const storedRegion = $derived.by(() => {
    const region = emptyRegion();
    if (hasRegion) for (const key of REGION_KEYS) region[key] = text(program?.[key]);
    return region;
  });
  const storedPin = $derived(parseCoordinates(program?.coordinates));
  const storedMapUrl = $derived(text(program?.mapUrl).trim());
  const legacyProvince = $derived(hasRegion ? '' : text(program?.province).trim());
  const coordinateText = $derived(storedPin ? formatCoordinates(storedPin) : text(program?.coordinates).trim());
  const openMapUrl = $derived(storedPin ? mapsUrl(storedPin) : isWebUrl(storedMapUrl) ? storedMapUrl : '');

  let editing = $state(false);
  let saving = $state(false);
  let region = $state<RegionValue>(emptyRegion());
  let address = $state('');
  let pin = $state<LatLng | null>(null);
  let mapUrl = $state('');
  let showErrors = $state(false);
  let linkInput = $state<HTMLInputElement>();

  const flatten = (area: RegionValue, street: string, point: LatLng | null, link: string) => ({
    ...area,
    address: street,
    coordinates: point ? formatCoordinates(point) : '',
    mapUrl: link
  });
  const baseline = $derived(flatten(storedRegion, text(program?.address), storedPin, storedMapUrl));
  const changes = $derived(changedValues(flatten(region, address, pin, mapUrl), baseline));
  const dirty = $derived(Object.keys(changes).length > 0);
  // An old link that was never a web address is only checked once it is edited.
  const linkError = $derived(
    changes.mapUrl && !isWebUrl(changes.mapUrl) ? 'Isi tautan yang diawali https://, atau kosongkan.' : ''
  );

  function start() {
    region = { ...storedRegion };
    address = text(program?.address);
    pin = storedPin ? { ...storedPin } : null;
    mapUrl = storedMapUrl;
    showErrors = false;
  }

  function discard() {
    region = emptyRegion();
    address = '';
    pin = null;
    mapUrl = '';
  }

  async function save() {
    if (linkError) {
      showErrors = true;
      reportError(linkError);
      linkInput?.focus();
      return false;
    }
    saving = true;
    const saved = await saveProgram(campusId, changes);
    saving = false;
    return saved;
  }
</script>

<div role="group" aria-label={TITLE}>
  <EditableSection
    title={TITLE}
    description="Alamat dan titik peta."
    icon="pin"
    bind:editing
    {canEdit}
    {saving}
    {dirty}
    onEdit={start}
    onSave={save}
    onCancel={discard}
  >
    {#snippet view()}
      <div class="grid gap-6 min-[900px]:grid-cols-2">
        <dl class="m-0 grid content-start gap-5">
          <ReadField label="Wilayah" value={hasRegion ? regionLine(storedRegion) : ''} empty="Wilayah belum dipilih" />
          {#if legacyProvince}<ReadField label="Provinsi" value={legacyProvince} />{/if}
          <ReadField label="Alamat lengkap" value={text(program?.address)} multiline />
          <ReadField label="Koordinat" value={coordinateText} />
          {#if storedMapUrl}
            <ReadField label="Tautan Google Maps" value={storedMapUrl}>
              {#if isWebUrl(storedMapUrl)}
                <a class="font-medium text-[#075fc7] underline underline-offset-2" href={storedMapUrl} target="_blank" rel="noopener noreferrer">{storedMapUrl}</a>
              {:else}{storedMapUrl}{/if}
            </ReadField>
          {/if}
        </dl>
        <div class="min-w-0">
          <LocationPicker value={storedPin} readonly height={260} />
          {#if openMapUrl}
            <div class="mt-3"><NewTabLink href={openMapUrl}>Buka di Google Maps</NewTabLink></div>
          {/if}
        </div>
      </div>
    {/snippet}
    {#snippet edit()}
      <div class="space-y-5">
        <RegionSelect bind:value={region} disabled={saving} />
        <div>
          <label class={LABEL} for={`${uid}-address`}>Alamat lengkap</label>
          <textarea
            id={`${uid}-address`}
            class={[INPUT, INPUT_OK, 'leading-[1.6]']}
            rows="3"
            maxlength="2000"
            aria-describedby={`${uid}-address-hint`}
            bind:value={address}
            disabled={saving}
          ></textarea>
          <p id={`${uid}-address-hint`} class={HINT}>Nama jalan, nomor, RT/RW, atau patokan.</p>
        </div>
        <div>
          <p class={['m-0', LABEL]}>Titik lokasi di peta</p>
          <LocationPicker bind:value={pin} />
        </div>
        <div>
          <label class={LABEL} for={`${uid}-map-url`}
            >Tautan Google Maps <span class="font-medium text-[#64748b]">(opsional)</span></label
          >
          <input
            id={`${uid}-map-url`}
            bind:this={linkInput}
            class={[INPUT, showErrors && linkError ? INPUT_BAD : INPUT_OK]}
            type="url"
            inputmode="url"
            autocomplete="off"
            maxlength="2000"
            placeholder="https://maps.app.goo.gl/..."
            aria-invalid={showErrors && linkError ? 'true' : undefined}
            aria-describedby={`${uid}-map-url-note`}
            bind:value={mapUrl}
            onblur={() => (showErrors = true)}
            disabled={saving}
          />
          <!-- Hint and message share one line, so the buttons below never move under the pointer. -->
          <p id={`${uid}-map-url-note`} class={showErrors && linkError ? 'm-0 mt-1 text-[12px] font-medium text-[#b3402e]' : HINT} role="status">
            {showErrors && linkError ? linkError : 'Tempel tautan lokasi dari Google Maps.'}
          </p>
        </div>
      </div>
    {/snippet}
  </EditableSection>
</div>
